/**
 * Profit & Inventory-Aware Pacing Service
 * 
 * This service computes PACE_SIGNALS from SKU margin/stock data and manages
 * profit-aware budget reallocation and out-of-stock ad group management.
 * 
 * Core Features:
 * - Compute PACE_SIGNALS from margin and inventory data
 * - Reallocate budgets within min/max caps based on profitability
 * - Pause/cap ad groups mapped to out-of-stock SKUs
 * - Real-time inventory monitoring
 */

import logger from './logger.js';
import { getDoc, ensureSheet } from '../sheets.js';

export class ProfitPacer {
  constructor() {
    this.signals = new Map(); // Cache for PACE_SIGNALS
    this.lastUpdate = null;
    this.config = {
      // Default thresholds
      lowStockThreshold: 10,
      outOfStockThreshold: 0,
      highMarginThreshold: 0.3,
      lowMarginThreshold: 0.1,
      maxBudgetMultiplier: 2.0,
      minBudgetMultiplier: 0.1,
      signalTtlMs: 5 * 60 * 1000, // 5 minutes cache
    };
  }

  /**
   * Main entry point: Compute PACE_SIGNALS for a tenant
   */
  async computePaceSignals(tenant) {
    try {
      logger.info('Computing PACE_SIGNALS', { tenant });

      // Get margin and stock data
      const marginData = await this.getMarginData(tenant);
      const stockData = await this.getStockData(tenant);
      const adGroupSkuMap = await this.getAdGroupSkuMapping(tenant);
      
      // Compute signals for each SKU
      const signals = this.calculatePaceSignals(marginData, stockData, adGroupSkuMap);
      
      // Store signals to sheet
      await this.storePaceSignals(tenant, signals);
      
      // Cache signals
      this.signals.set(tenant, {
        signals,
        timestamp: Date.now()
      });
      
      this.lastUpdate = new Date();
      
      logger.info('PACE_SIGNALS computed successfully', { 
        tenant, 
        signalCount: signals.length,
        timestamp: this.lastUpdate
      });

      return { ok: true, signals, lastUpdate: this.lastUpdate };
      
    } catch (error) {
      logger.error('Failed to compute PACE_SIGNALS', { 
        tenant, 
        error: error.message 
      });
      return { ok: false, error: error.message };
    }
  }

  /**
   * Get margin data from SKU_MARGIN sheet
   */
  async getMarginData(tenant) {
    const doc = await getDoc();
    if (!doc) throw new Error('Google Sheets not accessible');

    const sheet = await ensureSheet(doc, `SKU_MARGIN_${tenant}`, ['sku', 'margin']);
    const rows = await sheet.getRows();
    
    const marginData = new Map();
    
    rows.forEach(row => {
      const sku = String(row.sku || '').trim();
      const margin = Number(row.margin || 0);
      
      if (sku && margin >= 0) {
        marginData.set(sku, margin);
      }
    });

    logger.debug('Loaded margin data', { 
      tenant, 
      skuCount: marginData.size 
    });

    return marginData;
  }

  /**
   * Get stock data from SKU_STOCK sheet
   */
  async getStockData(tenant) {
    const doc = await getDoc();
    if (!doc) throw new Error('Google Sheets not accessible');

    const sheet = await ensureSheet(doc, `SKU_STOCK_${tenant}`, ['sku', 'stock']);
    const rows = await sheet.getRows();
    
    const stockData = new Map();
    
    rows.forEach(row => {
      const sku = String(row.sku || '').trim();
      const stock = Number(row.stock || 0);
      
      if (sku && stock >= 0) {
        stockData.set(sku, stock);
      }
    });

    logger.debug('Loaded stock data', { 
      tenant, 
      skuCount: stockData.size 
    });

    return stockData;
  }

  /**
   * Get ad group to SKU mapping from ADGROUP_SKU_MAP sheet
   */
  async getAdGroupSkuMapping(tenant) {
    const doc = await getDoc();
    if (!doc) throw new Error('Google Sheets not accessible');

    const sheet = await ensureSheet(doc, `ADGROUP_SKU_MAP_${tenant}`, ['ad_group_id', 'sku']);
    const rows = await sheet.getRows();
    
    const mapping = new Map();
    
    rows.forEach(row => {
      const adGroupId = String(row.ad_group_id || '').trim();
      const sku = String(row.sku || '').trim();
      
      if (adGroupId && sku) {
        if (!mapping.has(adGroupId)) {
          mapping.set(adGroupId, []);
        }
        mapping.get(adGroupId).push(sku);
      }
    });

    logger.debug('Loaded ad group SKU mapping', { 
      tenant, 
      adGroupCount: mapping.size 
    });

    return mapping;
  }

  /**
   * Calculate PACE_SIGNALS based on margin and stock data
   */
  calculatePaceSignals(marginData, stockData, adGroupSkuMap) {
    const signals = [];
    
    // Process each ad group
    for (const [adGroupId, skus] of adGroupSkuMap) {
      let totalMargin = 0;
      let totalStock = 0;
      let avgMargin = 0;
      let minStock = Infinity;
      let skuCount = 0;
      
      // Aggregate metrics for all SKUs in this ad group
      for (const sku of skus) {
        const margin = marginData.get(sku) || 0;
        const stock = stockData.get(sku) || 0;
        
        totalMargin += margin;
        totalStock += stock;
        minStock = Math.min(minStock, stock);
        skuCount++;
      }
      
      if (skuCount === 0) continue;
      
      avgMargin = totalMargin / skuCount;
      minStock = minStock === Infinity ? 0 : minStock;
      
      // Calculate pace signal
      const signal = this.calculatePaceMultiplier(avgMargin, minStock, totalStock);
      
      // Determine action based on signal
      const action = this.determineAction(avgMargin, minStock, signal);
      
      signals.push({
        ad_group_id: adGroupId,
        skus: skus.join(','),
        avg_margin: Number(avgMargin.toFixed(3)),
        total_stock: totalStock,
        min_stock: minStock,
        pace_signal: Number(signal.toFixed(3)),
        action: action,
        timestamp: new Date().toISOString(),
        reason: this.getSignalReason(avgMargin, minStock, signal)
      });
    }
    
    // Sort by pace signal descending (highest priority first)
    signals.sort((a, b) => b.pace_signal - a.pace_signal);
    
    return signals;
  }

  /**
   * Calculate pace multiplier based on margin and stock
   */
  calculatePaceMultiplier(margin, minStock, totalStock) {
    const { 
      lowStockThreshold, 
      outOfStockThreshold, 
      highMarginThreshold, 
      lowMarginThreshold,
      maxBudgetMultiplier,
      minBudgetMultiplier
    } = this.config;
    
    // Base multiplier starts at 1.0
    let multiplier = 1.0;
    
    // Stock factor
    if (minStock <= outOfStockThreshold) {
      // Out of stock - drastically reduce or pause
      multiplier = minBudgetMultiplier;
    } else if (minStock <= lowStockThreshold) {
      // Low stock - moderate reduction
      const stockRatio = minStock / lowStockThreshold;
      multiplier *= (0.3 + 0.7 * stockRatio); // Scale between 0.3-1.0
    } else {
      // Good stock - slight boost
      multiplier *= 1.1;
    }
    
    // Margin factor
    if (margin >= highMarginThreshold) {
      // High margin - boost spending
      multiplier *= (1.0 + (margin - highMarginThreshold) * 2);
    } else if (margin <= lowMarginThreshold) {
      // Low margin - reduce spending
      multiplier *= (0.5 + (margin / lowMarginThreshold) * 0.5);
    }
    
    // Clamp to min/max bounds
    return Math.max(minBudgetMultiplier, Math.min(maxBudgetMultiplier, multiplier));
  }

  /**
   * Determine action based on pace signal
   */
  determineAction(margin, minStock, signal) {
    const { outOfStockThreshold, lowStockThreshold, lowMarginThreshold } = this.config;
    
    if (minStock <= outOfStockThreshold) {
      return 'PAUSE';
    } else if (minStock <= lowStockThreshold) {
      return 'REDUCE_BUDGET';
    } else if (signal >= 1.5) {
      return 'INCREASE_BUDGET';
    } else if (signal <= 0.5) {
      return 'REDUCE_BUDGET';
    } else if (margin <= lowMarginThreshold) {
      return 'MONITOR_MARGIN';
    } else {
      return 'MAINTAIN';
    }
  }

  /**
   * Get human-readable reason for the signal
   */
  getSignalReason(margin, minStock, signal) {
    const { outOfStockThreshold, lowStockThreshold, highMarginThreshold, lowMarginThreshold } = this.config;
    
    const reasons = [];
    
    if (minStock <= outOfStockThreshold) {
      reasons.push('Out of stock');
    } else if (minStock <= lowStockThreshold) {
      reasons.push(`Low stock (${minStock})`);
    }
    
    if (margin >= highMarginThreshold) {
      reasons.push(`High margin (${(margin * 100).toFixed(1)}%)`);
    } else if (margin <= lowMarginThreshold) {
      reasons.push(`Low margin (${(margin * 100).toFixed(1)}%)`);
    }
    
    if (signal >= 1.5) {
      reasons.push('Strong profit potential');
    } else if (signal <= 0.5) {
      reasons.push('Poor profit outlook');
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'Normal conditions';
  }

  /**
   * Store PACE_SIGNALS to sheet
   */
  async storePaceSignals(tenant, signals) {
    const doc = await getDoc();
    if (!doc) throw new Error('Google Sheets not accessible');

    const headers = [
      'ad_group_id', 'skus', 'avg_margin', 'total_stock', 'min_stock',
      'pace_signal', 'action', 'timestamp', 'reason'
    ];
    
    const sheet = await ensureSheet(doc, `PACE_SIGNALS_${tenant}`, headers);
    
    // Clear existing data
    await sheet.clearRows();
    await sheet.setHeaderRow(headers);
    
    // Add new signals
    for (const signal of signals) {
      await sheet.addRow(signal);
    }
    
    logger.info('PACE_SIGNALS stored to sheet', { 
      tenant, 
      signalCount: signals.length 
    });
  }

  /**
   * Get cached signals or compute if expired
   */
  async getPaceSignals(tenant, forceRefresh = false) {
    const cached = this.signals.get(tenant);
    const now = Date.now();
    
    if (!forceRefresh && cached && (now - cached.timestamp) < this.config.signalTtlMs) {
      logger.debug('Using cached PACE_SIGNALS', { tenant });
      return { ok: true, signals: cached.signals, cached: true };
    }
    
    return await this.computePaceSignals(tenant);
  }

  /**
   * Reallocate budgets based on PACE_SIGNALS
   */
  async reallocateBudgets(tenant, campaignBudgets, minBudget = 1.0, maxBudget = 100.0) {
    try {
      const { signals } = await this.getPaceSignals(tenant);
      if (!signals) {
        throw new Error('No PACE_SIGNALS available');
      }
      
      const reallocations = [];
      
      for (const signal of signals) {
        if (signal.action === 'PAUSE') {
          // Don't reallocate budget for paused ad groups
          continue;
        }
        
        // Find campaigns that contain this ad group
        // This would typically require campaign data, but for now we'll use the signal
        const currentBudget = campaignBudgets[signal.ad_group_id] || 10.0;
        const newBudget = Math.max(minBudget, Math.min(maxBudget, currentBudget * signal.pace_signal));
        
        if (Math.abs(newBudget - currentBudget) > 0.01) {
          reallocations.push({
            ad_group_id: signal.ad_group_id,
            current_budget: currentBudget,
            new_budget: Number(newBudget.toFixed(2)),
            pace_signal: signal.pace_signal,
            reason: signal.reason
          });
        }
      }
      
      logger.info('Budget reallocations computed', { 
        tenant, 
        reallocationCount: reallocations.length 
      });
      
      return { ok: true, reallocations };
      
    } catch (error) {
      logger.error('Failed to reallocate budgets', { 
        tenant, 
        error: error.message 
      });
      return { ok: false, error: error.message };
    }
  }

  /**
   * Get out-of-stock ad groups that should be paused
   */
  async getOutOfStockAdGroups(tenant) {
    try {
      const { signals } = await this.getPaceSignals(tenant);
      if (!signals) {
        throw new Error('No PACE_SIGNALS available');
      }
      
      const oosAdGroups = signals.filter(signal => 
        signal.action === 'PAUSE' || signal.min_stock <= this.config.outOfStockThreshold
      );
      
      logger.info('Out-of-stock ad groups identified', { 
        tenant, 
        oosCount: oosAdGroups.length 
      });
      
      return { ok: true, outOfStockAdGroups: oosAdGroups };
      
    } catch (error) {
      logger.error('Failed to get out-of-stock ad groups', { 
        tenant, 
        error: error.message 
      });
      return { ok: false, error: error.message };
    }
  }

  /**
   * Monitor inventory changes and trigger alerts
   */
  async monitorInventory(tenant, alertThresholds = {}) {
    try {
      const stockData = await this.getStockData(tenant);
      const alerts = [];
      
      const {
        criticalStock = 5,
        lowStock = 10,
        stockChangePercent = 20
      } = alertThresholds;
      
      for (const [sku, currentStock] of stockData) {
        if (currentStock <= 0) {
          alerts.push({
            sku,
            type: 'OUT_OF_STOCK',
            current_stock: currentStock,
            severity: 'CRITICAL',
            message: `SKU ${sku} is out of stock`
          });
        } else if (currentStock <= criticalStock) {
          alerts.push({
            sku,
            type: 'CRITICAL_STOCK',
            current_stock: currentStock,
            severity: 'HIGH',
            message: `SKU ${sku} has critical stock level: ${currentStock}`
          });
        } else if (currentStock <= lowStock) {
          alerts.push({
            sku,
            type: 'LOW_STOCK',
            current_stock: currentStock,
            severity: 'MEDIUM',
            message: `SKU ${sku} has low stock: ${currentStock}`
          });
        }
      }
      
      if (alerts.length > 0) {
        logger.warn('Inventory alerts generated', { 
          tenant, 
          alertCount: alerts.length 
        });
      }
      
      return { ok: true, alerts };
      
    } catch (error) {
      logger.error('Failed to monitor inventory', { 
        tenant, 
        error: error.message 
      });
      return { ok: false, error: error.message };
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('Profit pacer config updated', { config: this.config });
  }

  /**
   * Get current status and statistics
   */
  getStatus() {
    return {
      lastUpdate: this.lastUpdate,
      cachedTenants: Array.from(this.signals.keys()),
      config: this.config,
      signalCacheSize: this.signals.size
    };
  }
}

// Export singleton instance
export const profitPacer = new ProfitPacer();
export default profitPacer;