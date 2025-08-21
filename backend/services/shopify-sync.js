/**
 * Shopify Data Ingestion Service
 * Secure data sync with SHA-256 PII hashing for GDPR compliance
 * Supports 1M+ customer records with optimized batching
 */

import crypto from "crypto";
import optimizedSheets from "./sheets.js";

class ShopifyDataIngestionService {
  constructor() {
    this.batchSize = Number(process.env.SHOPIFY_BATCH_SIZE || 1000);
    this.hashSalt =
      process.env.PII_HASH_SALT || "proofkit-default-salt-change-me";
    this.maxConcurrentSyncs = Number(process.env.SHOPIFY_MAX_CONCURRENT || 3);

    // Metrics
    this.metrics = {
      totalRecords: 0,
      processedRecords: 0,
      skippedRecords: 0,
      errorRecords: 0,
      lastSyncTime: null,
      avgProcessingTime: 0,
    };

    // Active sync tracking
    this.activeSyncs = new Map();
  }

  /**
   * Hash PII data using SHA-256 with salt for GDPR compliance
   */
  hashPII(data, type = "email") {
    if (!data || typeof data !== "string") return null;

    const normalizedData =
      type === "email" ? data.toLowerCase().trim() : data.trim();

    if (!normalizedData) return null;

    return crypto
      .createHash("sha256")
      .update(normalizedData + this.hashSalt)
      .digest("hex");
  }

  /**
   * Validate and normalize customer data
   */
  validateCustomerData(customer) {
    if (!customer || typeof customer !== "object") {
      return { valid: false, error: "Invalid customer object" };
    }

    const required = ["id"];
    for (const field of required) {
      if (!customer[field]) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }

    return { valid: true };
  }

  /**
   * Transform Shopify customer data for storage
   */
  transformCustomerData(customer) {
    const validation = this.validateCustomerData(customer);
    if (!validation.valid) {
      throw new Error(`Invalid customer data: ${validation.error}`);
    }

    // Extract and hash PII
    const emailHash = customer.email
      ? this.hashPII(customer.email, "email")
      : null;
    const phoneHash = customer.phone
      ? this.hashPII(customer.phone, "phone")
      : null;

    // Calculate customer metrics
    const totalSpent = Number(customer.total_spent || 0);
    const orderCount = Number(customer.orders_count || 0);
    const lastOrderAt = customer.last_order_date || customer.updated_at || null;

    // Extract product preferences
    const topCategory = this.extractTopCategory(customer.orders || []);
    const lastProductIds = this.extractLastProductIds(customer.orders || []);

    return {
      customer_id: String(customer.id),
      email_hash: emailHash,
      phone_hash: phoneHash,
      total_spent: totalSpent,
      order_count: orderCount,
      last_order_at: lastOrderAt,
      top_category: topCategory,
      last_product_ids_csv: lastProductIds.join(","),
      created_at: customer.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_batch_id: this.generateBatchId(),
    };
  }

  /**
   * Extract top category from customer orders
   */
  extractTopCategory(orders) {
    if (!Array.isArray(orders) || orders.length === 0) return "uncategorized";

    const categoryCount = new Map();

    orders.forEach((order) => {
      if (order.line_items && Array.isArray(order.line_items)) {
        order.line_items.forEach((item) => {
          const category = item.product_type || item.vendor || "general";
          categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
        });
      }
    });

    let topCategory = "general";
    let maxCount = 0;

    for (const [category, count] of categoryCount) {
      if (count > maxCount) {
        maxCount = count;
        topCategory = category;
      }
    }

    return topCategory.toLowerCase().slice(0, 50);
  }

  /**
   * Extract last 5 product IDs from recent orders
   */
  extractLastProductIds(orders) {
    if (!Array.isArray(orders) || orders.length === 0) return [];

    const productIds = [];
    const sortedOrders = orders
      .filter((o) => o.created_at)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    for (const order of sortedOrders) {
      if (order.line_items && Array.isArray(order.line_items)) {
        for (const item of order.line_items) {
          if (item.product_id && !productIds.includes(item.product_id)) {
            productIds.push(String(item.product_id));
            if (productIds.length >= 5) break;
          }
        }
      }
      if (productIds.length >= 5) break;
    }

    return productIds;
  }

  /**
   * Generate unique batch ID for tracking
   */
  generateBatchId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sync customer data to Google Sheets
   */
  async syncCustomers(tenantId, customers, options = {}) {
    const {
      validateOnly = false,
      skipDuplicates = true,
      batchSize = this.batchSize,
    } = options;

    if (this.activeSyncs.has(tenantId) && !options.force) {
      throw new Error(`Sync already in progress for tenant: ${tenantId}`);
    }

    const syncId = this.generateBatchId();
    const startTime = Date.now();

    try {
      this.activeSyncs.set(tenantId, {
        syncId,
        startTime,
        status: "running",
        totalRecords: customers.length,
      });

      // Validate input
      if (!Array.isArray(customers)) {
        throw new Error("Customers must be an array");
      }

      if (customers.length === 0) {
        return {
          success: true,
          syncId,
          processed: 0,
          skipped: 0,
          errors: 0,
          message: "No customers to sync",
        };
      }

      console.log(
        `Starting Shopify sync for tenant ${tenantId}: ${customers.length} customers`,
      );

      // Transform and validate customer data
      const transformedCustomers = [];
      const errors = [];

      for (let i = 0; i < customers.length; i++) {
        try {
          const transformed = this.transformCustomerData(customers[i]);
          if (validateOnly) {
            continue; // Skip storage in validation mode
          }
          transformedCustomers.push(transformed);
        } catch (error) {
          errors.push({
            index: i,
            customerId: customers[i]?.id || "unknown",
            error: error.message,
          });
        }
      }

      if (validateOnly) {
        return {
          success: true,
          syncId,
          validated: customers.length - errors.length,
          errors: errors.length,
          errorDetails: errors.slice(0, 10), // Return first 10 errors
        };
      }

      // Get existing customers for duplicate checking
      let existingCustomerIds = new Set();
      if (skipDuplicates) {
        try {
          const existingRows = await optimizedSheets.getRows(
            tenantId,
            "AUDIENCE_SEEDS",
            { limit: 100000 },
          );
          existingCustomerIds = new Set(
            existingRows.map((row) => row.customer_id).filter(Boolean),
          );
        } catch (error) {
          console.warn(`Could not load existing customers: ${error.message}`);
        }
      }

      // Filter out duplicates
      const newCustomers = transformedCustomers.filter((customer) => {
        if (skipDuplicates && existingCustomerIds.has(customer.customer_id)) {
          return false;
        }
        return true;
      });

      const skippedCount = transformedCustomers.length - newCustomers.length;

      // Process in batches
      let processedCount = 0;
      const batches = this.createBatches(newCustomers, batchSize);

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];

        try {
          await optimizedSheets.addRows(tenantId, "AUDIENCE_SEEDS", batch);
          processedCount += batch.length;

          // Update progress
          this.activeSyncs.get(tenantId).processed = processedCount;

          console.log(
            `Processed batch ${batchIndex + 1}/${batches.length}: ${batch.length} customers`,
          );

          // Rate limiting - small delay between batches
          if (batchIndex < batches.length - 1) {
            await this.delay(100);
          }
        } catch (error) {
          console.error(`Batch ${batchIndex + 1} failed:`, error.message);
          errors.push({
            batch: batchIndex + 1,
            size: batch.length,
            error: error.message,
          });
        }
      }

      // Update metrics
      this.updateMetrics(
        startTime,
        transformedCustomers.length,
        processedCount,
        skippedCount,
        errors.length,
      );

      const result = {
        success: true,
        syncId,
        processed: processedCount,
        skipped: skippedCount,
        errors: errors.length,
        totalTime: Date.now() - startTime,
        batchesProcessed: batches.length,
      };

      if (errors.length > 0) {
        result.errorDetails = errors.slice(0, 5); // Return first 5 errors
      }

      console.log(`Shopify sync completed for tenant ${tenantId}:`, result);
      return result;
    } catch (error) {
      console.error(`Shopify sync failed for tenant ${tenantId}:`, error);
      throw error;
    } finally {
      this.activeSyncs.delete(tenantId);
    }
  }

  /**
   * Sync product catalog with margin and stock data
   */
  async syncProducts(tenantId, products, options = {}) {
    const { validateOnly = false, batchSize = this.batchSize } = options;
    const startTime = Date.now();

    try {
      if (!Array.isArray(products) || products.length === 0) {
        return { success: true, processed: 0, message: "No products to sync" };
      }

      const transformedProducts = [];
      const errors = [];

      // Transform product data
      for (let i = 0; i < products.length; i++) {
        try {
          const product = products[i];

          // Process each variant as a separate SKU
          if (product.variants && Array.isArray(product.variants)) {
            for (const variant of product.variants) {
              const sku = variant.sku || `${product.id}-${variant.id}`;

              // Calculate margin (if cost is available)
              const cost = Number(variant.cost || 0);
              const price = Number(variant.price || 0);
              const margin =
                price > 0 && cost > 0
                  ? (((price - cost) / price) * 100).toFixed(2)
                  : "0";

              transformedProducts.push({
                sku,
                title: `${product.title} - ${variant.title || "Default"}`,
                price: price.toFixed(2),
                cost: cost.toFixed(2),
                margin,
                stock: Number(variant.inventory_quantity || 0),
                product_id: String(product.id),
                variant_id: String(variant.id),
                updated_at: new Date().toISOString(),
              });
            }
          } else {
            // Single product without variants
            const price = Number(product.price || 0);
            const cost = Number(product.cost || 0);
            const margin =
              price > 0 && cost > 0
                ? (((price - cost) / price) * 100).toFixed(2)
                : "0";

            transformedProducts.push({
              sku: product.sku || String(product.id),
              title: product.title,
              price: price.toFixed(2),
              cost: cost.toFixed(2),
              margin,
              stock: Number(product.inventory_quantity || 0),
              product_id: String(product.id),
              variant_id: "",
              updated_at: new Date().toISOString(),
            });
          }
        } catch (error) {
          errors.push({
            index: i,
            productId: products[i]?.id || "unknown",
            error: error.message,
          });
        }
      }

      if (validateOnly) {
        return {
          success: true,
          validated: transformedProducts.length,
          errors: errors.length,
          errorDetails: errors.slice(0, 10),
        };
      }

      // Sync margin data
      const marginData = transformedProducts.map((p) => ({
        sku: p.sku,
        margin: p.margin,
      }));
      const stockData = transformedProducts.map((p) => ({
        sku: p.sku,
        stock: p.stock,
      }));

      // Process in batches
      const marginBatches = this.createBatches(marginData, batchSize);
      const stockBatches = this.createBatches(stockData, batchSize);

      let processedCount = 0;

      // Sync margin data
      for (const batch of marginBatches) {
        await optimizedSheets.addRows(tenantId, "SKU_MARGIN", batch);
        processedCount += batch.length;
      }

      // Sync stock data
      for (const batch of stockBatches) {
        await optimizedSheets.addRows(tenantId, "SKU_STOCK", batch);
      }

      return {
        success: true,
        processed: processedCount,
        skus: transformedProducts.length,
        errors: errors.length,
        totalTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`Product sync failed for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Create batches from array
   */
  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Get sync status for a tenant
   */
  getSyncStatus(tenantId) {
    const activeSync = this.activeSyncs.get(tenantId);

    if (activeSync) {
      return {
        status: "running",
        syncId: activeSync.syncId,
        startTime: activeSync.startTime,
        totalRecords: activeSync.totalRecords,
        processed: activeSync.processed || 0,
        progress:
          activeSync.totalRecords > 0
            ? Math.round(
                ((activeSync.processed || 0) / activeSync.totalRecords) * 100,
              )
            : 0,
      };
    }

    return {
      status: "idle",
      lastSyncTime: this.metrics.lastSyncTime,
      totalRecords: this.metrics.totalRecords,
      processedRecords: this.metrics.processedRecords,
    };
  }

  /**
   * Update service metrics
   */
  updateMetrics(startTime, total, processed, skipped, errors) {
    const processingTime = Date.now() - startTime;

    this.metrics.totalRecords += total;
    this.metrics.processedRecords += processed;
    this.metrics.skippedRecords += skipped;
    this.metrics.errorRecords += errors;
    this.metrics.lastSyncTime = new Date().toISOString();

    // Update average processing time
    const avgTime = this.metrics.avgProcessingTime;
    this.metrics.avgProcessingTime =
      avgTime === 0 ? processingTime : (avgTime + processingTime) / 2;
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeSyncs: this.activeSyncs.size,
      batchSize: this.batchSize,
      maxConcurrentSyncs: this.maxConcurrentSyncs,
    };
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      activeSyncs: this.activeSyncs.size,
      metrics: this.getMetrics(),
    };
  }
}

// Singleton instance
const shopifySync = new ShopifyDataIngestionService();

export default shopifySync;
export { ShopifyDataIngestionService };
