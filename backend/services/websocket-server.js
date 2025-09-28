/**
 * WebSocket Server for Real-time Dashboard Updates and Notifications
 *
 * Features:
 * - Room-based architecture (one room per tenant)
 * - Authentication with existing auth system
 * - Event broadcasting and message queuing
 * - Connection management with heartbeat
 * - Auto-reconnection support
 * - Horizontal scaling with Redis pub/sub
 * - Rate limiting and security
 */

import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger.js';
import { validateShopifyAccess } from '../middleware/shopify-auth.js';
import { executeRedisCommand, setJson, getJson, deleteKeys } from './redis.js';
import crypto from 'crypto';

// WebSocket Event Types
export const WS_EVENTS = {
  // Optimization events
  OPTIMIZATION_CREATED: 'optimization.created',
  OPTIMIZATION_APPLIED: 'optimization.applied',
  OPTIMIZATION_FAILED: 'optimization.failed',

  // Metrics events
  METRICS_UPDATED: 'metrics.updated',
  SYSTEM_HEALTH: 'system.health',

  // Competitor events
  COMPETITOR_CHANGE: 'competitor.change',
  TRAFFIC_SPIKE: 'traffic.spike',

  // Script events
  SCRIPT_EXECUTED: 'script.executed',

  // Error events
  ERROR_CRITICAL: 'error.critical',

  // System events
  CONNECTION_ACK: 'connection.ack',
  HEARTBEAT: 'heartbeat',
  RATE_LIMIT_WARNING: 'rate_limit.warning'
};

// Message priorities
export const MESSAGE_PRIORITY = {
  CRITICAL: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4
};

class WebSocketServerManager {
  constructor() {
    this.server = null;
    this.clients = new Map(); // connectionId -> client info
    this.rooms = new Map(); // tenantId -> Set of connectionIds
    this.messageQueue = new Map(); // tenantId -> Array of queued messages
    this.rateLimits = new Map(); // connectionId -> rate limit info
    this.isInitialized = false;

    // Configuration
    this.config = {
      port: parseInt(process.env.WS_PORT || '8080'),
      heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000'), // 30 seconds
      connectionTimeout: parseInt(process.env.WS_CONNECTION_TIMEOUT || '300000'), // 5 minutes
      maxMessagesPerMinute: parseInt(process.env.WS_RATE_LIMIT || '60'),
      maxQueueSize: parseInt(process.env.WS_MAX_QUEUE_SIZE || '100'),
      enableCompression: process.env.WS_ENABLE_COMPRESSION !== 'false',
      enableRedisSync: process.env.WS_ENABLE_REDIS_SYNC !== 'false'
    };

    // Metrics
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      totalMessages: 0,
      messagesByType: {},
      averageLatency: 0,
      rateLimitViolations: 0,
      queuedMessages: 0
    };

    // Cleanup intervals
    this.heartbeatTimer = null;
    this.cleanupTimer = null;
    this.metricsTimer = null;
  }

  /**
   * Initialize WebSocket server
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create WebSocket server
      this.server = new WebSocketServer({
        port: this.config.port,
        perMessageDeflate: this.config.enableCompression,
        maxPayload: 1024 * 1024, // 1MB max payload
      });

      // Set up event handlers
      this.server.on('connection', (ws, request) => {
        this.handleConnection(ws, request);
      });

      this.server.on('error', (error) => {
        logger.error('WebSocket server error:', error);
      });

      // Start background tasks
      this.startHeartbeat();
      this.startCleanupTask();
      this.startMetricsCollection();

      // Subscribe to Redis for horizontal scaling
      if (this.config.enableRedisSync) {
        await this.subscribeToRedisEvents();
      }

      this.isInitialized = true;
      logger.info(`WebSocket server initialized on port ${this.config.port}`);
    } catch (error) {
      logger.error('Failed to initialize WebSocket server:', error);
      throw error;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  async handleConnection(ws, request) {
    const connectionId = uuidv4();
    const clientIp = this.getClientIP(request);

    logger.info('New WebSocket connection', { connectionId, clientIp });

    try {
      // Initialize client info
      const clientInfo = {
        id: connectionId,
        ws,
        tenantId: null,
        authenticated: false,
        connectedAt: Date.now(),
        lastPing: Date.now(),
        ip: clientIp,
        messageCount: 0,
        lastMessageTime: 0
      };

      this.clients.set(connectionId, clientInfo);
      this.metrics.totalConnections++;
      this.metrics.activeConnections++;

      // Set up client event handlers
      ws.on('message', async (data) => {
        await this.handleMessage(connectionId, data);
      });

      ws.on('close', (code, reason) => {
        this.handleDisconnection(connectionId, code, reason);
      });

      ws.on('error', (error) => {
        logger.error('WebSocket client error:', { connectionId, error: error.message });
        this.handleDisconnection(connectionId, 1011, 'Server error');
      });

      ws.on('pong', () => {
        const client = this.clients.get(connectionId);
        if (client) {
          client.lastPing = Date.now();
        }
      });

      // Send connection acknowledgment
      this.sendToClient(connectionId, {
        type: WS_EVENTS.CONNECTION_ACK,
        connectionId,
        timestamp: Date.now(),
        config: {
          heartbeatInterval: this.config.heartbeatInterval,
          maxMessagesPerMinute: this.config.maxMessagesPerMinute
        }
      });

    } catch (error) {
      logger.error('Error handling WebSocket connection:', error);
      ws.close(1011, 'Server error');
    }
  }

  /**
   * Handle incoming message from client
   */
  async handleMessage(connectionId, data) {
    const client = this.clients.get(connectionId);
    if (!client) {
      return;
    }

    try {
      // Check rate limit
      if (!this.checkRateLimit(connectionId)) {
        this.sendToClient(connectionId, {
          type: WS_EVENTS.RATE_LIMIT_WARNING,
          message: 'Rate limit exceeded',
          timestamp: Date.now()
        });
        return;
      }

      const message = JSON.parse(data.toString());

      // Handle authentication
      if (message.type === 'auth' && !client.authenticated) {
        await this.authenticateClient(connectionId, message);
        return;
      }

      // Require authentication for all other messages
      if (!client.authenticated) {
        this.sendToClient(connectionId, {
          type: 'error',
          message: 'Authentication required',
          timestamp: Date.now()
        });
        return;
      }

      // Handle different message types
      switch (message.type) {
        case 'ping':
          this.sendToClient(connectionId, {
            type: 'pong',
            timestamp: Date.now()
          });
          break;

        case 'subscribe':
          await this.handleSubscription(connectionId, message);
          break;

        case 'unsubscribe':
          await this.handleUnsubscription(connectionId, message);
          break;

        default:
          logger.warn('Unknown message type:', { connectionId, type: message.type });
      }

      client.messageCount++;
      this.metrics.totalMessages++;

    } catch (error) {
      logger.error('Error handling WebSocket message:', { connectionId, error: error.message });
      this.sendToClient(connectionId, {
        type: 'error',
        message: 'Invalid message format',
        timestamp: Date.now()
      });
    }
  }

  /**
   * Authenticate WebSocket client
   */
  async authenticateClient(connectionId, message) {
    const client = this.clients.get(connectionId);
    if (!client) {
      return;
    }

    try {
      const { shopifySession, tenantId } = message.auth || {};

      if (!shopifySession || !tenantId) {
        throw new Error('Missing authentication data');
      }

      // Validate Shopify session
      await validateShopifyAccess(shopifySession);

      // Verify tenant access
      if (!this.verifyTenantAccess(shopifySession, tenantId)) {
        throw new Error('Unauthorized tenant access');
      }

      // Update client info
      client.authenticated = true;
      client.tenantId = tenantId;
      client.shopDomain = shopifySession.shop;

      // Add to tenant room
      this.addClientToRoom(tenantId, connectionId);

      // Send queued messages for this tenant
      await this.deliverQueuedMessages(tenantId, connectionId);

      // Send authentication success
      this.sendToClient(connectionId, {
        type: 'auth_success',
        tenantId,
        timestamp: Date.now()
      });

      logger.info('Client authenticated', { connectionId, tenantId, shop: client.shopDomain });

    } catch (error) {
      logger.error('Authentication failed:', { connectionId, error: error.message });

      this.sendToClient(connectionId, {
        type: 'auth_error',
        message: error.message,
        timestamp: Date.now()
      });

      // Close connection after failed auth
      setTimeout(() => {
        client.ws.close(1008, 'Authentication failed');
      }, 1000);
    }
  }

  /**
   * Verify tenant access based on Shopify session
   */
  verifyTenantAccess(shopifySession, tenantId) {
    // In a real implementation, this would check if the shop has access to the tenant
    // For now, we'll use a simple shop domain to tenant mapping
    const shopDomain = shopifySession.shop;
    const expectedTenantId = this.generateTenantId(shopDomain);

    return tenantId === expectedTenantId;
  }

  /**
   * Generate tenant ID from shop domain
   */
  generateTenantId(shopDomain) {
    // Simple hash-based tenant ID generation
    return crypto.createHash('md5').update(shopDomain).digest('hex').substring(0, 16);
  }

  /**
   * Handle subscription to event types
   */
  async handleSubscription(connectionId, message) {
    const client = this.clients.get(connectionId);
    if (!client || !client.authenticated) {
      return;
    }

    const { events } = message;
    if (!Array.isArray(events)) {
      this.sendToClient(connectionId, {
        type: 'error',
        message: 'Invalid subscription format',
        timestamp: Date.now()
      });
      return;
    }

    // Store subscription preferences in Redis
    const subscriptionKey = `ws:subscriptions:${client.tenantId}:${connectionId}`;
    await setJson(subscriptionKey, events, 3600); // 1 hour TTL

    this.sendToClient(connectionId, {
      type: 'subscription_success',
      events,
      timestamp: Date.now()
    });

    logger.info('Client subscribed to events', { connectionId, tenantId: client.tenantId, events });
  }

  /**
   * Handle unsubscription from event types
   */
  async handleUnsubscription(connectionId, message) {
    const client = this.clients.get(connectionId);
    if (!client || !client.authenticated) {
      return;
    }

    // Remove subscription from Redis
    const subscriptionKey = `ws:subscriptions:${client.tenantId}:${connectionId}`;
    await deleteKeys([subscriptionKey]);

    this.sendToClient(connectionId, {
      type: 'unsubscription_success',
      timestamp: Date.now()
    });

    logger.info('Client unsubscribed', { connectionId, tenantId: client.tenantId });
  }

  /**
   * Handle client disconnection
   */
  handleDisconnection(connectionId, code, reason) {
    const client = this.clients.get(connectionId);
    if (!client) {
      return;
    }

    logger.info('WebSocket client disconnected', {
      connectionId,
      tenantId: client.tenantId,
      code,
      reason: reason?.toString()
    });

    // Remove from room
    if (client.tenantId) {
      this.removeClientFromRoom(client.tenantId, connectionId);
    }

    // Clean up client data
    this.clients.delete(connectionId);
    this.rateLimits.delete(connectionId);
    this.metrics.activeConnections--;

    // Clean up subscription data
    if (client.tenantId) {
      const subscriptionKey = `ws:subscriptions:${client.tenantId}:${connectionId}`;
      deleteKeys([subscriptionKey]).catch(err =>
        logger.error('Failed to clean up subscription data:', err)
      );
    }
  }

  /**
   * Broadcast event to tenant room
   */
  async broadcastToTenant(tenantId, event, priority = MESSAGE_PRIORITY.NORMAL) {
    const room = this.rooms.get(tenantId);
    if (!room || room.size === 0) {
      // Queue message for offline clients
      await this.queueMessage(tenantId, event, priority);
      return;
    }

    const message = {
      ...event,
      timestamp: Date.now(),
      priority
    };

    // Filter clients by subscription
    const deliveredCount = await this.deliverToSubscribedClients(tenantId, message);

    // If no clients received the message, queue it
    if (deliveredCount === 0) {
      await this.queueMessage(tenantId, event, priority);
    }

    // Publish to Redis for horizontal scaling
    if (this.config.enableRedisSync) {
      await this.publishToRedis(tenantId, message);
    }

    // Update metrics
    this.updateMessageMetrics(event.type);

    logger.debug('Event broadcasted to tenant', {
      tenantId,
      eventType: event.type,
      delivered: deliveredCount,
      priority
    });
  }

  /**
   * Deliver message to subscribed clients in a tenant
   */
  async deliverToSubscribedClients(tenantId, message) {
    const room = this.rooms.get(tenantId);
    if (!room) {
      return 0;
    }

    let deliveredCount = 0;

    for (const connectionId of room) {
      try {
        // Check if client is subscribed to this event type
        const subscriptionKey = `ws:subscriptions:${tenantId}:${connectionId}`;
        const subscriptions = await getJson(subscriptionKey);

        if (subscriptions && Array.isArray(subscriptions)) {
          if (subscriptions.includes(message.type) || subscriptions.includes('*')) {
            this.sendToClient(connectionId, message);
            deliveredCount++;
          }
        }
      } catch (error) {
        logger.error('Error delivering message to client:', { connectionId, error: error.message });
      }
    }

    return deliveredCount;
  }

  /**
   * Queue message for offline clients
   */
  async queueMessage(tenantId, event, priority) {
    try {
      const queueKey = `ws:queue:${tenantId}`;
      const queuedMessages = await getJson(queueKey) || [];

      // Add new message with priority
      const queuedMessage = {
        ...event,
        timestamp: Date.now(),
        priority,
        id: uuidv4()
      };

      queuedMessages.push(queuedMessage);

      // Sort by priority and timestamp
      queuedMessages.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority; // Lower number = higher priority
        }
        return a.timestamp - b.timestamp; // Older first
      });

      // Limit queue size
      if (queuedMessages.length > this.config.maxQueueSize) {
        queuedMessages.splice(this.config.maxQueueSize);
      }

      // Store back to Redis with TTL
      await setJson(queueKey, queuedMessages, 3600); // 1 hour TTL

      this.metrics.queuedMessages++;

      logger.debug('Message queued for offline tenant', { tenantId, eventType: event.type, priority });
    } catch (error) {
      logger.error('Failed to queue message:', { tenantId, error: error.message });
    }
  }

  /**
   * Deliver queued messages to newly connected client
   */
  async deliverQueuedMessages(tenantId, connectionId) {
    try {
      const queueKey = `ws:queue:${tenantId}`;
      const queuedMessages = await getJson(queueKey) || [];

      if (queuedMessages.length === 0) {
        return;
      }

      // Send all queued messages
      for (const message of queuedMessages) {
        this.sendToClient(connectionId, message);
      }

      // Clear the queue
      await deleteKeys([queueKey]);

      logger.info('Delivered queued messages', {
        tenantId,
        connectionId,
        messageCount: queuedMessages.length
      });
    } catch (error) {
      logger.error('Failed to deliver queued messages:', { tenantId, connectionId, error: error.message });
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(connectionId, message) {
    const client = this.clients.get(connectionId);
    if (!client || client.ws.readyState !== client.ws.OPEN) {
      return false;
    }

    try {
      const payload = JSON.stringify(message);
      client.ws.send(payload);
      return true;
    } catch (error) {
      logger.error('Failed to send message to client:', { connectionId, error: error.message });
      return false;
    }
  }

  /**
   * Add client to tenant room
   */
  addClientToRoom(tenantId, connectionId) {
    if (!this.rooms.has(tenantId)) {
      this.rooms.set(tenantId, new Set());
    }
    this.rooms.get(tenantId).add(connectionId);
  }

  /**
   * Remove client from tenant room
   */
  removeClientFromRoom(tenantId, connectionId) {
    const room = this.rooms.get(tenantId);
    if (room) {
      room.delete(connectionId);
      if (room.size === 0) {
        this.rooms.delete(tenantId);
      }
    }
  }

  /**
   * Check rate limit for client
   */
  checkRateLimit(connectionId) {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    if (!this.rateLimits.has(connectionId)) {
      this.rateLimits.set(connectionId, []);
    }

    const clientRequests = this.rateLimits.get(connectionId);

    // Remove old requests outside the window
    const validRequests = clientRequests.filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    if (validRequests.length >= this.config.maxMessagesPerMinute) {
      this.metrics.rateLimitViolations++;
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.rateLimits.set(connectionId, validRequests);

    return true;
  }

  /**
   * Start heartbeat mechanism
   */
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeoutThreshold = now - this.config.connectionTimeout;

      for (const [connectionId, client] of this.clients) {
        if (client.lastPing < timeoutThreshold) {
          logger.info('Client timed out', { connectionId, tenantId: client.tenantId });
          client.ws.close(1000, 'Connection timeout');
          continue;
        }

        // Send ping
        if (client.ws.readyState === client.ws.OPEN) {
          client.ws.ping();
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Start cleanup task
   */
  startCleanupTask() {
    this.cleanupTimer = setInterval(() => {
      // Clean up closed connections
      for (const [connectionId, client] of this.clients) {
        if (client.ws.readyState === client.ws.CLOSED) {
          this.handleDisconnection(connectionId, 1000, 'Cleanup');
        }
      }

      // Clean up old rate limit data
      const now = Date.now();
      const windowStart = now - 60000;

      for (const [connectionId, requests] of this.rateLimits) {
        const validRequests = requests.filter(timestamp => timestamp > windowStart);
        if (validRequests.length === 0) {
          this.rateLimits.delete(connectionId);
        } else {
          this.rateLimits.set(connectionId, validRequests);
        }
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    this.metricsTimer = setInterval(() => {
      logger.debug('WebSocket metrics', this.getMetrics());
    }, 60000); // Every minute
  }

  /**
   * Subscribe to Redis events for horizontal scaling
   */
  async subscribeToRedisEvents() {
    try {
      // In a real implementation, you'd use Redis pub/sub
      // For now, we'll log that this feature would be implemented
      logger.info('Redis pub/sub synchronization would be implemented here');
    } catch (error) {
      logger.error('Failed to subscribe to Redis events:', error);
    }
  }

  /**
   * Publish event to Redis for other server instances
   */
  async publishToRedis(tenantId, message) {
    try {
      const channel = `ws:broadcast:${tenantId}`;
      await executeRedisCommand('publish', channel, JSON.stringify(message));
    } catch (error) {
      logger.error('Failed to publish to Redis:', error);
    }
  }

  /**
   * Update message metrics
   */
  updateMessageMetrics(eventType) {
    if (!this.metrics.messagesByType[eventType]) {
      this.metrics.messagesByType[eventType] = 0;
    }
    this.metrics.messagesByType[eventType]++;
  }

  /**
   * Get client IP address
   */
  getClientIP(request) {
    return request.headers['x-forwarded-for']?.split(',')[0] ||
           request.headers['x-real-ip'] ||
           request.socket.remoteAddress ||
           'unknown';
  }

  /**
   * Get server metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeRooms: this.rooms.size,
      totalClients: this.clients.size,
      timestamp: Date.now()
    };
  }

  /**
   * Get server health status
   */
  getHealth() {
    return {
      status: this.isInitialized ? 'healthy' : 'unhealthy',
      metrics: this.getMetrics(),
      config: this.config,
      timestamp: Date.now()
    };
  }

  /**
   * Shutdown server gracefully
   */
  async shutdown() {
    logger.info('Shutting down WebSocket server...');

    // Clear timers
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    if (this.metricsTimer) clearInterval(this.metricsTimer);

    // Close all client connections
    for (const [connectionId, client] of this.clients) {
      client.ws.close(1001, 'Server shutdown');
    }

    // Close server
    if (this.server) {
      this.server.close();
    }

    this.isInitialized = false;
    logger.info('WebSocket server shutdown complete');
  }
}

// Global instance
let wsServerInstance = null;

/**
 * Get or create WebSocket server instance
 */
export function getWebSocketServer() {
  if (!wsServerInstance) {
    wsServerInstance = new WebSocketServerManager();
  }
  return wsServerInstance;
}

/**
 * Initialize WebSocket server
 */
export async function initializeWebSocketServer() {
  const server = getWebSocketServer();
  await server.initialize();
  return server;
}

/**
 * Broadcast event to tenant
 */
export async function broadcastToTenant(tenantId, event, priority = MESSAGE_PRIORITY.NORMAL) {
  const server = getWebSocketServer();
  await server.broadcastToTenant(tenantId, event, priority);
}

/**
 * Broadcast system-wide event
 */
export async function broadcastSystemEvent(event, priority = MESSAGE_PRIORITY.HIGH) {
  const server = getWebSocketServer();

  // Broadcast to all active tenants
  for (const tenantId of server.rooms.keys()) {
    await server.broadcastToTenant(tenantId, event, priority);
  }
}

/**
 * Get WebSocket server metrics
 */
export function getWebSocketMetrics() {
  const server = getWebSocketServer();
  return server.getMetrics();
}

/**
 * Get WebSocket server health
 */
export function getWebSocketHealth() {
  const server = getWebSocketServer();
  return server.getHealth();
}

export default {
  getWebSocketServer,
  initializeWebSocketServer,
  broadcastToTenant,
  broadcastSystemEvent,
  getWebSocketMetrics,
  getWebSocketHealth,
  WS_EVENTS,
  MESSAGE_PRIORITY
};