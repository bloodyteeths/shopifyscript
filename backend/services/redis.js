import { createClient } from "redis";

// Connection pool management
class RedisConnectionPool {
  constructor() {
    this.clients = [];
    this.availableClients = [];
    this.maxConnections = Number(process.env.REDIS_MAX_CONNECTIONS || 10);
    this.minConnections = Number(process.env.REDIS_MIN_CONNECTIONS || 2);
    this.connectionTimeout = Number(process.env.REDIS_CONNECTION_TIMEOUT || 5000);
    this.retryAttempts = Number(process.env.REDIS_RETRY_ATTEMPTS || 3);
    this.retryDelay = Number(process.env.REDIS_RETRY_DELAY || 1000);
    
    // Enhanced Redis configuration
    this.redisConfig = {
      url: this.getRedisUrl(),
      socket: {
        connectTimeout: this.connectionTimeout,
        lazyConnect: true,
        keepAlive: 30000,
      },
      retryDelayOnFailover: 100,
      enableAutoPipelining: true, // Enable command pipelining
      maxRetriesPerRequest: this.retryAttempts,
      lazyConnect: true,
    };
    
    // Metrics
    this.metrics = {
      totalCommands: 0,
      successfulCommands: 0,
      failedCommands: 0,
      connectionPoolHits: 0,
      connectionPoolMisses: 0,
      avgResponseTime: 0,
      cacheHitRate: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
    
    this.initialize();
  }
  
  getRedisUrl() {
    // Prefer Vercel KV style first, then generic Redis
    const url = process.env.KV_URL || process.env.REDIS_URL;
    if (!url || url === "${REDIS_URL}") return null;
    return url;
  }
  
  async initialize() {
    if (!this.redisConfig.url) {
      console.warn('Redis URL not configured');
      return;
    }
    
    // Create minimum connections
    for (let i = 0; i < this.minConnections; i++) {
      try {
        const client = await this.createConnection();
        this.clients.push(client);
        this.availableClients.push(client);
      } catch (error) {
        console.error(`Failed to create Redis connection ${i}:`, error.message);
      }
    }
    
    console.log(`Redis connection pool initialized with ${this.clients.length} connections`);
  }
  
  async createConnection() {
    const client = createClient(this.redisConfig);
    
    client.on('error', (err) => {
      console.error('Redis Client Error', err);
      this.metrics.failedCommands++;
    });
    
    client.on('connect', () => {
      console.log('Redis client connected');
    });
    
    client.on('ready', () => {
      console.log('Redis client ready');
    });
    
    await client.connect();
    return client;
  }
  
  async getConnection() {
    // Try to get available connection
    if (this.availableClients.length > 0) {
      this.metrics.connectionPoolHits++;
      return this.availableClients.pop();
    }
    
    // Create new connection if under limit
    if (this.clients.length < this.maxConnections) {
      this.metrics.connectionPoolMisses++;
      try {
        const client = await this.createConnection();
        this.clients.push(client);
        return client;
      } catch (error) {
        console.error('Failed to create new Redis connection:', error.message);
        throw error;
      }
    }
    
    // Wait for available connection
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Redis connection pool timeout'));
      }, this.connectionTimeout);
      
      const checkForConnection = () => {
        if (this.availableClients.length > 0) {
          clearTimeout(timeout);
          resolve(this.availableClients.pop());
        } else {
          setTimeout(checkForConnection, 50);
        }
      };
      
      checkForConnection();
    });
  }
  
  releaseConnection(client) {
    if (client && client.isOpen) {
      this.availableClients.push(client);
    }
  }
  
  async executeCommand(command, ...args) {
    const startTime = Date.now();
    this.metrics.totalCommands++;
    
    let client;
    let retryCount = 0;
    
    while (retryCount <= this.retryAttempts) {
      try {
        client = await this.getConnection();
        const result = await client[command](...args);
        
        this.metrics.successfulCommands++;
        this.updateResponseTime(startTime);
        
        return result;
      } catch (error) {
        this.metrics.failedCommands++;
        
        if (retryCount < this.retryAttempts && this.isRetryableError(error)) {
          retryCount++;
          console.warn(`Redis command failed, retrying (${retryCount}/${this.retryAttempts}):`, error.message);
          
          // Exponential backoff
          await this.sleep(this.retryDelay * Math.pow(2, retryCount - 1));
        } else {
          throw error;
        }
      } finally {
        if (client) {
          this.releaseConnection(client);
        }
      }
    }
  }
  
  isRetryableError(error) {
    const retryablePatterns = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'connection',
      'timeout',
      'network',
    ];
    
    const errorMessage = error.message?.toLowerCase() || '';
    return retryablePatterns.some(pattern => errorMessage.includes(pattern));
  }
  
  updateResponseTime(startTime) {
    const responseTime = Date.now() - startTime;
    this.metrics.avgResponseTime = 
      (this.metrics.avgResponseTime * (this.metrics.successfulCommands - 1) + responseTime) / 
      this.metrics.successfulCommands;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      activeConnections: this.clients.length,
      availableConnections: this.availableClients.length,
      maxConnections: this.maxConnections,
      successRate: this.metrics.totalCommands > 0 
        ? (this.metrics.successfulCommands / this.metrics.totalCommands * 100).toFixed(2)
        : 0
    };
  }
}

// Global connection pool instance
const redisPool = new RedisConnectionPool();

// Legacy compatibility
let client;
let clientPromise;

function getRedisUrl() {
  return redisPool.getRedisUrl();
}

export async function getRedisClient() {
  if (client && client.isOpen) return client;
  if (clientPromise) return clientPromise;

  const url = getRedisUrl();
  if (!url) {
    throw new Error(
      "Redis URL not configured. Set KV_URL or REDIS_URL in environment.",
    );
  }

  client = createClient({ url });
  client.on("error", (err) => {
    console.error("Redis Client Error", err);
  });

  clientPromise = client.connect().then(() => client);
  return clientPromise;
}

// Enhanced Redis operations with connection pooling
export async function executeRedisCommand(command, ...args) {
  return redisPool.executeCommand(command, ...args);
}

export async function pingRedis() {
  try {
    const res = await redisPool.executeCommand('ping');
    return res;
  } catch (e) {
    // Fallback to legacy client
    try {
      const c = await getRedisClient();
      const res = await c.ping();
      return res;
    } catch (fallbackError) {
      throw e;
    }
  }
}

export async function getJson(key) {
  try {
    const raw = await redisPool.executeCommand('get', key);
    if (!raw) {
      redisPool.metrics.cacheMisses++;
      return null;
    }
    
    redisPool.metrics.cacheHits++;
    redisPool.metrics.cacheHitRate = 
      (redisPool.metrics.cacheHits / (redisPool.metrics.cacheHits + redisPool.metrics.cacheMisses) * 100);
    
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch (e) {
    // Fallback to legacy client
    const c = await getRedisClient();
    const raw = await c.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
}

export async function setJson(key, value, ttlSeconds) {
  try {
    const payload = typeof value === "string" ? value : JSON.stringify(value);
    if (ttlSeconds && Number(ttlSeconds) > 0) {
      await redisPool.executeCommand('set', key, payload, 'EX', Number(ttlSeconds));
      return "OK";
    }
    return redisPool.executeCommand('set', key, payload);
  } catch (e) {
    // Fallback to legacy client
    const c = await getRedisClient();
    const payload = typeof value === "string" ? value : JSON.stringify(value);
    if (ttlSeconds && Number(ttlSeconds) > 0) {
      await c.set(key, payload, { EX: Number(ttlSeconds) });
      return "OK";
    }
    return c.set(key, payload);
  }
}

// Advanced caching operations
export async function getMultipleJson(keys) {
  if (!keys || keys.length === 0) return {};
  
  try {
    const values = await redisPool.executeCommand('mget', ...keys);
    const result = {};
    
    keys.forEach((key, index) => {
      const value = values[index];
      if (value !== null) {
        redisPool.metrics.cacheHits++;
        try {
          result[key] = JSON.parse(value);
        } catch {
          result[key] = value;
        }
      } else {
        redisPool.metrics.cacheMisses++;
      }
    });
    
    redisPool.metrics.cacheHitRate = 
      (redisPool.metrics.cacheHits / (redisPool.metrics.cacheHits + redisPool.metrics.cacheMisses) * 100);
    
    return result;
  } catch (error) {
    console.error('Failed to get multiple keys from Redis:', error);
    return {};
  }
}

export async function setMultipleJson(keyValuePairs, ttlSeconds) {
  if (!keyValuePairs || Object.keys(keyValuePairs).length === 0) return;
  
  try {
    // Use pipeline for better performance
    const multi = [];
    
    Object.entries(keyValuePairs).forEach(([key, value]) => {
      const payload = typeof value === "string" ? value : JSON.stringify(value);
      if (ttlSeconds && Number(ttlSeconds) > 0) {
        multi.push(['set', key, payload, 'EX', Number(ttlSeconds)]);
      } else {
        multi.push(['set', key, payload]);
      }
    });
    
    // Execute all commands in a pipeline
    const results = await Promise.all(
      multi.map(cmd => redisPool.executeCommand(...cmd))
    );
    
    return results;
  } catch (error) {
    console.error('Failed to set multiple keys in Redis:', error);
    throw error;
  }
}

// Delete operations
export async function deleteKeys(keys) {
  if (!keys || keys.length === 0) return 0;
  
  try {
    return await redisPool.executeCommand('del', ...keys);
  } catch (error) {
    console.error('Failed to delete keys from Redis:', error);
    return 0;
  }
}

// Pattern-based operations
export async function deleteKeysByPattern(pattern) {
  try {
    const keys = await redisPool.executeCommand('keys', pattern);
    if (keys.length > 0) {
      return await deleteKeys(keys);
    }
    return 0;
  } catch (error) {
    console.error('Failed to delete keys by pattern:', error);
    return 0;
  }
}

// Health and metrics
export function getRedisMetrics() {
  return redisPool.getMetrics();
}

export async function getRedisHealth() {
  try {
    const ping = await pingRedis();
    const metrics = getRedisMetrics();
    
    return {
      healthy: ping === 'PONG',
      metrics,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

