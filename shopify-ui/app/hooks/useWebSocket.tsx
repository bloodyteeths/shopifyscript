/**
 * React WebSocket Hook with Auto-reconnection
 *
 * Features:
 * - WebSocket connection management
 * - Auto-reconnection with exponential backoff
 * - Message handling and event dispatching
 * - Connection status tracking
 * - TypeScript interfaces for type safety
 * - Event subscription management
 * - Message queuing during disconnection
 * - Authentication handling
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
// @ts-expect-error moduleResolution mismatch with shopify-app-remix
import { useAuthenticatedFetch } from '@shopify/shopify-app-remix/react';

// WebSocket Event Types (matching backend)
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
} as const;

// Connection states
export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

// Message types
export interface WebSocketMessage {
  type: string;
  timestamp: number;
  priority?: number;
  [key: string]: any;
}

export interface OptimizationEvent extends WebSocketMessage {
  type: typeof WS_EVENTS.OPTIMIZATION_CREATED | typeof WS_EVENTS.OPTIMIZATION_APPLIED | typeof WS_EVENTS.OPTIMIZATION_FAILED;
  optimizationId: string;
  campaign?: string;
  details?: any;
}

export interface MetricsEvent extends WebSocketMessage {
  type: typeof WS_EVENTS.METRICS_UPDATED;
  metrics: {
    performance?: any;
    traffic?: any;
    conversions?: any;
  };
}

export interface SystemHealthEvent extends WebSocketMessage {
  type: typeof WS_EVENTS.SYSTEM_HEALTH;
  status: 'healthy' | 'degraded' | 'unhealthy';
  services?: Record<string, any>;
}

export interface CompetitorEvent extends WebSocketMessage {
  type: typeof WS_EVENTS.COMPETITOR_CHANGE;
  competitor: string;
  changes: any[];
}

export interface TrafficSpikeEvent extends WebSocketMessage {
  type: typeof WS_EVENTS.TRAFFIC_SPIKE;
  threshold: number;
  current: number;
  pages: string[];
}

export interface ScriptExecutedEvent extends WebSocketMessage {
  type: typeof WS_EVENTS.SCRIPT_EXECUTED;
  scriptId: string;
  status: 'success' | 'error';
  results?: any;
}

export interface ErrorEvent extends WebSocketMessage {
  type: typeof WS_EVENTS.ERROR_CRITICAL;
  error: string;
  service?: string;
  details?: any;
}

// Union type for all events
export type WSEvent =
  | OptimizationEvent
  | MetricsEvent
  | SystemHealthEvent
  | CompetitorEvent
  | TrafficSpikeEvent
  | ScriptExecutedEvent
  | ErrorEvent
  | WebSocketMessage;

// Event handler type
export type EventHandler<T = WSEvent> = (event: T) => void;

// Hook configuration
export interface UseWebSocketConfig {
  url?: string;
  tenantId?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  debug?: boolean;
}

// Hook state
export interface WebSocketState {
  connectionState: ConnectionState;
  lastConnected: Date | null;
  lastMessage: WSEvent | null;
  isAuthenticated: boolean;
  connectionId: string | null;
  reconnectAttempts: number;
  messageCount: number;
  error: string | null;
}

// Hook return type
export interface UseWebSocketReturn {
  // State
  state: WebSocketState;

  // Connection management
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;

  // Event handling
  subscribe: (events: string[] | string) => void;
  unsubscribe: () => void;
  on: <T = WSEvent>(eventType: string, handler: EventHandler<T>) => () => void;
  off: (eventType: string, handler: EventHandler) => void;

  // Message sending
  send: (message: any) => boolean;

  // Utilities
  isConnected: boolean;
  getMetrics: () => any;
}

/**
 * Custom hook for WebSocket connection management
 */
export function useWebSocket(config: UseWebSocketConfig = {}): UseWebSocketReturn {
  const {
    url = process.env.NODE_ENV === 'development' ? 'ws://localhost:8080' : 'wss://your-domain.com:8080',
    tenantId,
    autoConnect = true,
    reconnectInterval = 1000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
    debug = false
  } = config;

  const fetch = useAuthenticatedFetch();

  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const eventHandlersRef = useRef<Map<string, Set<EventHandler>>>(new Map());
  const messageQueueRef = useRef<any[]>([]);
  const subscribedEventsRef = useRef<string[]>([]);

  // State
  const [state, setState] = useState<WebSocketState>({
    connectionState: ConnectionState.DISCONNECTED,
    lastConnected: null,
    lastMessage: null,
    isAuthenticated: false,
    connectionId: null,
    reconnectAttempts: 0,
    messageCount: 0,
    error: null
  });

  // Derived state
  const isConnected = useMemo(() =>
    state.connectionState === ConnectionState.CONNECTED && state.isAuthenticated,
    [state.connectionState, state.isAuthenticated]
  );

  // Debug logging
  const log = useCallback((...args: any[]) => {
    if (debug) {
      console.log('[WebSocket]', ...args);
    }
  }, [debug]);

  // Get authentication data
  const getAuthData = useCallback(async () => {
    try {
      // Get current session from Shopify app
      const response = await fetch('/api/auth/session');
      const sessionData = await response.json();

      return {
        shopifySession: sessionData.session,
        tenantId: tenantId || generateTenantId(sessionData.session?.shop)
      };
    } catch (error) {
      log('Failed to get auth data:', error);
      throw new Error('Authentication data not available');
    }
  }, [fetch, tenantId, log]);

  // Generate tenant ID from shop domain
  const generateTenantId = useCallback((shopDomain: string) => {
    if (!shopDomain) return null;
    // Simple hash-based tenant ID generation (should match backend)
    const crypto = require('crypto');
    return crypto.createHash('md5').update(shopDomain).digest('hex').substring(0, 16);
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WSEvent = JSON.parse(event.data);

      log('Received message:', message);

      setState(prev => ({
        ...prev,
        lastMessage: message,
        messageCount: prev.messageCount + 1
      }));

      // Handle system messages
      switch (message.type) {
        case WS_EVENTS.CONNECTION_ACK:
          setState(prev => ({
            ...prev,
            connectionState: ConnectionState.CONNECTED,
            connectionId: message.connectionId,
            lastConnected: new Date(),
            reconnectAttempts: 0,
            error: null
          }));

          // Re-subscribe to events
          if (subscribedEventsRef.current.length > 0) {
            send({
              type: 'subscribe',
              events: subscribedEventsRef.current
            });
          }

          // Send queued messages
          messageQueueRef.current.forEach(queuedMessage => {
            send(queuedMessage);
          });
          messageQueueRef.current = [];

          log('Connection acknowledged');
          break;

        case 'auth_success':
          setState(prev => ({
            ...prev,
            isAuthenticated: true,
            error: null
          }));
          log('Authentication successful');
          break;

        case 'auth_error':
          setState(prev => ({
            ...prev,
            connectionState: ConnectionState.FAILED,
            error: message.message || 'Authentication failed'
          }));
          log('Authentication failed:', message.message);
          break;

        case WS_EVENTS.RATE_LIMIT_WARNING:
          log('Rate limit warning:', message.message);
          break;

        case WS_EVENTS.HEARTBEAT:
        case 'pong':
          // Reset heartbeat timer
          resetHeartbeat();
          break;

        default:
          // Dispatch to event handlers
          const handlers = eventHandlersRef.current.get(message.type);
          if (handlers) {
            handlers.forEach(handler => {
              try {
                handler(message);
              } catch (error) {
                log('Error in event handler:', error);
              }
            });
          }

          // Dispatch to wildcard handlers
          const wildcardHandlers = eventHandlersRef.current.get('*');
          if (wildcardHandlers) {
            wildcardHandlers.forEach(handler => {
              try {
                handler(message);
              } catch (error) {
                log('Error in wildcard event handler:', error);
              }
            });
          }
          break;
      }
    } catch (error) {
      log('Error parsing message:', error);
    }
  }, [log]);

  // Handle connection open
  const handleOpen = useCallback(async () => {
    log('WebSocket connected');

    setState(prev => ({
      ...prev,
      connectionState: ConnectionState.CONNECTED,
      error: null
    }));

    // Authenticate
    try {
      const authData = await getAuthData();
      send({
        type: 'auth',
        auth: authData
      });
    } catch (error) {
      log('Authentication failed:', error);
      setState(prev => ({
        ...prev,
        connectionState: ConnectionState.FAILED,
        error: 'Authentication failed'
      }));
    }
  }, [log, getAuthData]);

  // Handle connection close
  const handleClose = useCallback((event: CloseEvent) => {
    log('WebSocket closed:', event.code, event.reason);

    setState(prev => ({
      ...prev,
      connectionState: ConnectionState.DISCONNECTED,
      isAuthenticated: false,
      connectionId: null
    }));

    // Clear timers
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    // Auto-reconnect if not a manual disconnect
    if (event.code !== 1000 && state.reconnectAttempts < maxReconnectAttempts) {
      scheduleReconnect();
    }
  }, [log, state.reconnectAttempts, maxReconnectAttempts]);

  // Handle connection error
  const handleError = useCallback((event: Event) => {
    log('WebSocket error:', event);

    setState(prev => ({
      ...prev,
      connectionState: ConnectionState.FAILED,
      error: 'Connection error'
    }));
  }, [log]);

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setState(prev => ({
      ...prev,
      connectionState: ConnectionState.RECONNECTING,
      reconnectAttempts: prev.reconnectAttempts + 1
    }));

    const delay = reconnectInterval * Math.pow(2, state.reconnectAttempts);
    const maxDelay = 30000; // Max 30 seconds
    const actualDelay = Math.min(delay, maxDelay);

    log(`Reconnecting in ${actualDelay}ms (attempt ${state.reconnectAttempts + 1}/${maxReconnectAttempts})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, actualDelay);
  }, [reconnectInterval, state.reconnectAttempts, maxReconnectAttempts, log]);

  // Reset heartbeat timer
  const resetHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    heartbeatTimeoutRef.current = setTimeout(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        send({ type: 'ping' });
      }
    }, heartbeatInterval);
  }, [heartbeatInterval]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      log('Already connected');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      log('Already connecting');
      return;
    }

    log('Connecting to WebSocket:', url);

    setState(prev => ({
      ...prev,
      connectionState: ConnectionState.CONNECTING,
      error: null
    }));

    try {
      wsRef.current = new WebSocket(url);
      wsRef.current.onopen = handleOpen;
      wsRef.current.onmessage = handleMessage;
      wsRef.current.onclose = handleClose;
      wsRef.current.onerror = handleError;
    } catch (error) {
      log('Failed to create WebSocket:', error);
      setState(prev => ({
        ...prev,
        connectionState: ConnectionState.FAILED,
        error: 'Failed to create connection'
      }));
    }
  }, [url, log, handleOpen, handleMessage, handleClose, handleError]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    log('Disconnecting WebSocket');

    // Clear timers
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }

    // Close connection
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    setState(prev => ({
      ...prev,
      connectionState: ConnectionState.DISCONNECTED,
      isAuthenticated: false,
      connectionId: null,
      reconnectAttempts: 0
    }));
  }, [log]);

  // Reconnect
  const reconnect = useCallback(() => {
    log('Manual reconnect requested');

    setState(prev => ({
      ...prev,
      reconnectAttempts: 0
    }));

    disconnect();
    setTimeout(connect, 1000);
  }, [log, disconnect, connect]);

  // Send message
  const send = useCallback((message: any): boolean => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      log('WebSocket not connected, queueing message:', message);
      messageQueueRef.current.push(message);
      return false;
    }

    try {
      const payload = JSON.stringify(message);
      wsRef.current.send(payload);
      log('Sent message:', message);
      return true;
    } catch (error) {
      log('Failed to send message:', error);
      return false;
    }
  }, [log]);

  // Subscribe to events
  const subscribe = useCallback((events: string[] | string) => {
    const eventArray = Array.isArray(events) ? events : [events];
    subscribedEventsRef.current = eventArray;

    if (isConnected) {
      send({
        type: 'subscribe',
        events: eventArray
      });
    }

    log('Subscribed to events:', eventArray);
  }, [isConnected, send, log]);

  // Unsubscribe from events
  const unsubscribe = useCallback(() => {
    subscribedEventsRef.current = [];

    if (isConnected) {
      send({
        type: 'unsubscribe'
      });
    }

    log('Unsubscribed from all events');
  }, [isConnected, send, log]);

  // Add event handler
  const on = useCallback(<T = WSEvent>(eventType: string, handler: EventHandler<T>): (() => void) => {
    if (!eventHandlersRef.current.has(eventType)) {
      eventHandlersRef.current.set(eventType, new Set());
    }

    eventHandlersRef.current.get(eventType)!.add(handler as EventHandler);
    log('Added event handler for:', eventType);

    // Return cleanup function
    return () => {
      off(eventType, handler as EventHandler);
    };
  }, [log]);

  // Remove event handler
  const off = useCallback((eventType: string, handler: EventHandler) => {
    const handlers = eventHandlersRef.current.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        eventHandlersRef.current.delete(eventType);
      }
    }
    log('Removed event handler for:', eventType);
  }, [log]);

  // Get metrics
  const getMetrics = useCallback(() => {
    return {
      connectionState: state.connectionState,
      isConnected,
      isAuthenticated: state.isAuthenticated,
      reconnectAttempts: state.reconnectAttempts,
      messageCount: state.messageCount,
      lastConnected: state.lastConnected,
      queuedMessages: messageQueueRef.current.length,
      subscribedEvents: subscribedEventsRef.current.length,
      eventHandlers: eventHandlersRef.current.size
    };
  }, [state, isConnected]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Handle visibility change for reconnection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && state.connectionState === ConnectionState.DISCONNECTED) {
        log('Page became visible, reconnecting...');
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.connectionState, connect, log]);

  return {
    state,
    connect,
    disconnect,
    reconnect,
    subscribe,
    unsubscribe,
    on,
    off,
    send,
    isConnected,
    getMetrics
  };
}

export default useWebSocket;