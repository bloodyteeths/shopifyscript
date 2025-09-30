/**
 * AI Rate Limiter for Multi-Tenant Scaling
 * Prevents API quota exhaustion across multiple tenants
 */

class AIRateLimiter {
  constructor() {
    this.tenantQuotas = new Map();
    this.globalQuota = {
      maxPerMinute: 60,
      maxPerHour: 1500,
      maxPerDay: 20000
    };
    this.currentUsage = {
      minute: { count: 0, reset: Date.now() + 60000 },
      hour: { count: 0, reset: Date.now() + 3600000 },
      day: { count: 0, reset: Date.now() + 86400000 }
    };
  }

  /**
   * Check if AI call is allowed for tenant
   */
  async canMakeAICall(tenantId, callType = 'standard') {
    // Reset counters if needed
    this.resetCountersIfNeeded();

    // Check global limits
    if (!this.checkGlobalLimits()) {
      console.log(`⚠️ Global AI rate limit reached`);
      return false;
    }

    // Check tenant-specific limits
    const tenantQuota = this.getTenantQuota(tenantId);
    if (!this.checkTenantLimits(tenantId, tenantQuota)) {
      console.log(`⚠️ Tenant ${tenantId} AI rate limit reached`);
      return false;
    }

    // Reserve the quota
    this.incrementCounters(tenantId);
    return true;
  }

  /**
   * Get tenant quota based on plan
   */
  getTenantQuota(tenantId) {
    // In production, fetch from database
    // For now, use tier-based defaults
    const tenantPlan = this.getTenantPlan(tenantId);

    const quotas = {
      starter: { hourly: 5, daily: 50 },
      pro: { hourly: 20, daily: 200 },
      enterprise: { hourly: 100, daily: 1000 }
    };

    return quotas[tenantPlan] || quotas.starter;
  }

  /**
   * Get tenant plan (mock for now)
   */
  getTenantPlan(tenantId) {
    // In production: fetch from database
    // For testing: all tenants are starter
    return 'starter';
  }

  /**
   * Check global rate limits
   */
  checkGlobalLimits() {
    return (
      this.currentUsage.minute.count < this.globalQuota.maxPerMinute &&
      this.currentUsage.hour.count < this.globalQuota.maxPerHour &&
      this.currentUsage.day.count < this.globalQuota.maxPerDay
    );
  }

  /**
   * Check tenant-specific limits
   */
  checkTenantLimits(tenantId, quota) {
    const usage = this.tenantQuotas.get(tenantId) || { hourly: 0, daily: 0 };
    return usage.hourly < quota.hourly && usage.daily < quota.daily;
  }

  /**
   * Increment usage counters
   */
  incrementCounters(tenantId) {
    // Global counters
    this.currentUsage.minute.count++;
    this.currentUsage.hour.count++;
    this.currentUsage.day.count++;

    // Tenant counters
    const usage = this.tenantQuotas.get(tenantId) || { hourly: 0, daily: 0 };
    usage.hourly++;
    usage.daily++;
    this.tenantQuotas.set(tenantId, usage);
  }

  /**
   * Reset counters if time window expired
   */
  resetCountersIfNeeded() {
    const now = Date.now();

    // Reset minute counter
    if (now > this.currentUsage.minute.reset) {
      this.currentUsage.minute = { count: 0, reset: now + 60000 };
    }

    // Reset hour counter
    if (now > this.currentUsage.hour.reset) {
      this.currentUsage.hour = { count: 0, reset: now + 3600000 };
      // Reset all tenant hourly counters
      for (const [tenantId, usage] of this.tenantQuotas) {
        usage.hourly = 0;
        this.tenantQuotas.set(tenantId, usage);
      }
    }

    // Reset day counter
    if (now > this.currentUsage.day.reset) {
      this.currentUsage.day = { count: 0, reset: now + 86400000 };
      // Reset all tenant daily counters
      for (const [tenantId, usage] of this.tenantQuotas) {
        usage.daily = 0;
        this.tenantQuotas.set(tenantId, usage);
      }
    }
  }

  /**
   * Get current usage stats
   */
  getUsageStats() {
    this.resetCountersIfNeeded();
    return {
      global: {
        minute: `${this.currentUsage.minute.count}/${this.globalQuota.maxPerMinute}`,
        hour: `${this.currentUsage.hour.count}/${this.globalQuota.maxPerHour}`,
        day: `${this.currentUsage.day.count}/${this.globalQuota.maxPerDay}`
      },
      tenants: Array.from(this.tenantQuotas.entries()).map(([id, usage]) => ({
        tenantId: id,
        hourly: usage.hourly,
        daily: usage.daily
      }))
    };
  }

  /**
   * Priority queue for AI calls
   */
  async queueAICall(tenantId, callFunction, priority = 5) {
    // Higher priority = more important (1-10 scale)
    const maxRetries = 3;
    let attempts = 0;

    while (attempts < maxRetries) {
      if (await this.canMakeAICall(tenantId)) {
        try {
          return await callFunction();
        } catch (error) {
          console.error(`AI call failed for ${tenantId}:`, error);
          throw error;
        }
      }

      // Wait based on priority (higher priority = shorter wait)
      const waitTime = Math.max(1000, (11 - priority) * 1000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      attempts++;
    }

    throw new Error(`AI rate limit exceeded for tenant ${tenantId} after ${maxRetries} attempts`);
  }
}

// Singleton instance
let instance = null;

export function getAIRateLimiter() {
  if (!instance) {
    instance = new AIRateLimiter();
  }
  return instance;
}

export default { getAIRateLimiter };