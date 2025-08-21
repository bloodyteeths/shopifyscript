/**
 * CSV Export System Service
 * Generate Google Ads Customer Match format exports
 * Supports UI and API formats with secure data handling
 */

import crypto from "crypto";
import optimizedSheets from "./sheets.js";
import segmentEngine from "./segment-engine.js";

class CSVExportService {
  constructor() {
    this.exportFormats = {
      GOOGLE_ADS_UI: {
        name: "Google Ads UI Upload",
        headers: [
          "Email",
          "Phone",
          "First Name",
          "Last Name",
          "Country",
          "Zip",
        ],
        requiredFields: ["Email"],
        maxRows: 500000,
        description: "Format for manual upload via Google Ads UI",
      },
      GOOGLE_ADS_API: {
        name: "Google Ads API",
        headers: [
          "hashedEmail",
          "hashedPhoneNumber",
          "hashedFirstName",
          "hashedLastName",
          "countryCode",
          "postalCode",
        ],
        requiredFields: ["hashedEmail"],
        maxRows: 10000000,
        description: "Pre-hashed format for Google Ads API",
      },
      FACEBOOK_CUSTOM: {
        name: "Facebook Custom Audiences",
        headers: ["email", "phone", "fn", "ln", "country", "zip"],
        requiredFields: ["email"],
        maxRows: 1000000,
        description: "Format for Facebook Custom Audiences",
      },
      GENERIC_CSV: {
        name: "Generic CSV",
        headers: [
          "customer_id",
          "email_hash",
          "phone_hash",
          "total_spent",
          "order_count",
        ],
        requiredFields: ["customer_id"],
        maxRows: 1000000,
        description: "Generic export with customer data",
      },
    };

    // Metrics
    this.metrics = {
      exportsGenerated: 0,
      totalRowsExported: 0,
      avgExportTime: 0,
      errorCount: 0,
      lastExportTime: null,
    };

    // Active exports tracking
    this.activeExports = new Map();
  }

  /**
   * Generate customer match CSV export
   */
  async generateExport(tenantId, options = {}) {
    const {
      segmentKey = "all_customers",
      format = "GOOGLE_ADS_UI",
      fileName = null,
      includeHeaders = true,
      customHeaders = null,
      filters = {},
      maxRows = null,
    } = options;

    const exportId = this.generateExportId();
    const startTime = Date.now();

    try {
      // Check if export already in progress
      if (this.activeExports.has(`${tenantId}:${segmentKey}`)) {
        throw new Error("Export already in progress for this segment");
      }

      // Mark export as active
      this.activeExports.set(`${tenantId}:${segmentKey}`, {
        exportId,
        startTime,
        status: "running",
      });

      console.log(
        `Starting CSV export for tenant ${tenantId}, segment ${segmentKey}, format ${format}`,
      );

      // Validate format
      const formatConfig = this.exportFormats[format];
      if (!formatConfig) {
        throw new Error(`Unsupported export format: ${format}`);
      }

      // Load segment data
      let segmentData;
      if (segmentKey === "all_customers") {
        segmentData = await this.loadAllCustomers(
          tenantId,
          filters,
          maxRows || formatConfig.maxRows,
        );
      } else {
        segmentData = await this.loadSegmentData(
          tenantId,
          segmentKey,
          maxRows || formatConfig.maxRows,
        );
      }

      // Validate data availability
      if (!segmentData || segmentData.length === 0) {
        return {
          success: true,
          exportId,
          fileName: null,
          rowCount: 0,
          message: "No data available for export",
          executionTime: Date.now() - startTime,
        };
      }

      // Transform data for the specified format
      const transformedData = this.transformDataForFormat(
        segmentData,
        format,
        formatConfig,
      );

      // Validate required fields
      this.validateRequiredFields(transformedData, formatConfig);

      // Generate CSV content
      const csvContent = this.generateCSVContent(
        transformedData,
        customHeaders || formatConfig.headers,
        includeHeaders,
      );

      // Generate file name
      const finalFileName =
        fileName || this.generateFileName(tenantId, segmentKey, format);

      // Store export result (in production, this would upload to storage)
      const exportResult = await this.storeExport(tenantId, {
        exportId,
        fileName: finalFileName,
        segmentKey,
        format,
        content: csvContent,
        rowCount: transformedData.length,
        timestamp: new Date().toISOString(),
      });

      const executionTime = Date.now() - startTime;

      // Update metrics
      this.updateMetrics(startTime, transformedData.length);

      const result = {
        success: true,
        exportId,
        fileName: finalFileName,
        segmentKey,
        format: formatConfig.name,
        rowCount: transformedData.length,
        executionTime,
        downloadUrl: exportResult.url || null,
        expiresAt: exportResult.expiresAt || null,
      };

      console.log(`CSV export completed for tenant ${tenantId}:`, result);
      return result;
    } catch (error) {
      this.metrics.errorCount++;
      console.error(`CSV export failed for tenant ${tenantId}:`, error);
      throw error;
    } finally {
      this.activeExports.delete(`${tenantId}:${segmentKey}`);
    }
  }

  /**
   * Load all customers with optional filters
   */
  async loadAllCustomers(tenantId, filters = {}, maxRows = 100000) {
    try {
      const customers = await optimizedSheets.getRows(
        tenantId,
        "AUDIENCE_SEEDS",
        {
          limit: maxRows,
          useCache: true,
        },
      );

      // Apply basic filters
      return this.applyFilters(customers, filters);
    } catch (error) {
      throw new Error(`Failed to load customers: ${error.message}`);
    }
  }

  /**
   * Load segment data using segment engine
   */
  async loadSegmentData(tenantId, segmentKey, maxRows = 100000) {
    try {
      // Get segment definition
      const segments = await segmentEngine.getSegments(tenantId);
      const segment = segments.find((s) => s.segmentKey === segmentKey);

      if (!segment) {
        throw new Error(`Segment not found: ${segmentKey}`);
      }

      // Execute segment query
      const result = await segmentEngine.executeSegment(
        tenantId,
        segmentKey,
        segment.logic,
        {
          maxRows,
          useCache: true,
        },
      );

      return result.data;
    } catch (error) {
      throw new Error(`Failed to load segment data: ${error.message}`);
    }
  }

  /**
   * Apply filters to customer data
   */
  applyFilters(data, filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return data;
    }

    return data.filter((customer) => {
      // Min spend filter
      if (
        filters.minSpend &&
        Number(customer.total_spent || 0) < Number(filters.minSpend)
      ) {
        return false;
      }

      // Max spend filter
      if (
        filters.maxSpend &&
        Number(customer.total_spent || 0) > Number(filters.maxSpend)
      ) {
        return false;
      }

      // Min orders filter
      if (
        filters.minOrders &&
        Number(customer.order_count || 0) < Number(filters.minOrders)
      ) {
        return false;
      }

      // Date range filter
      if (filters.dateFrom || filters.dateTo) {
        const customerDate = new Date(
          customer.last_order_at || customer.created_at,
        );

        if (filters.dateFrom && customerDate < new Date(filters.dateFrom)) {
          return false;
        }

        if (filters.dateTo && customerDate > new Date(filters.dateTo)) {
          return false;
        }
      }

      // Category filter
      if (filters.category && customer.top_category !== filters.category) {
        return false;
      }

      return true;
    });
  }

  /**
   * Transform data for specific export format
   */
  transformDataForFormat(data, format, formatConfig) {
    const transformers = {
      GOOGLE_ADS_UI: this.transformForGoogleAdsUI.bind(this),
      GOOGLE_ADS_API: this.transformForGoogleAdsAPI.bind(this),
      FACEBOOK_CUSTOM: this.transformForFacebookCustom.bind(this),
      GENERIC_CSV: this.transformForGeneric.bind(this),
    };

    const transformer = transformers[format];
    if (!transformer) {
      throw new Error(`No transformer found for format: ${format}`);
    }

    return transformer(data, formatConfig);
  }

  /**
   * Transform for Google Ads UI format
   */
  transformForGoogleAdsUI(data, config) {
    return data
      .map((customer) => {
        // For UI upload, we need plain text data (not hashed)
        // Note: In production, you'd need actual email/phone data, not hashes
        const email =
          customer.email || this.unhashEmail(customer.email_hash) || "";
        const phone =
          customer.phone || this.unhashPhone(customer.phone_hash) || "";

        return {
          Email: email,
          Phone: this.formatPhoneForGoogleAds(phone),
          "First Name": customer.first_name || "",
          "Last Name": customer.last_name || "",
          Country: customer.country || "US",
          Zip: customer.zip || customer.postal_code || "",
        };
      })
      .filter((row) => row.Email); // Filter out rows without email
  }

  /**
   * Transform for Google Ads API format (pre-hashed)
   */
  transformForGoogleAdsAPI(data, config) {
    return data
      .map((customer) => {
        return {
          hashedEmail:
            customer.email_hash || this.hashForGoogleAds(customer.email),
          hashedPhoneNumber:
            customer.phone_hash ||
            this.hashForGoogleAds(this.formatPhoneForGoogleAds(customer.phone)),
          hashedFirstName: this.hashForGoogleAds(customer.first_name),
          hashedLastName: this.hashForGoogleAds(customer.last_name),
          countryCode: customer.country || "US",
          postalCode: customer.zip || customer.postal_code || "",
        };
      })
      .filter((row) => row.hashedEmail);
  }

  /**
   * Transform for Facebook Custom Audiences
   */
  transformForFacebookCustom(data, config) {
    return data
      .map((customer) => {
        const email =
          customer.email || this.unhashEmail(customer.email_hash) || "";
        const phone =
          customer.phone || this.unhashPhone(customer.phone_hash) || "";

        return {
          email: email.toLowerCase(),
          phone: this.formatPhoneForFacebook(phone),
          fn: (customer.first_name || "").toLowerCase(),
          ln: (customer.last_name || "").toLowerCase(),
          country: (customer.country || "us").toLowerCase(),
          zip: customer.zip || customer.postal_code || "",
        };
      })
      .filter((row) => row.email);
  }

  /**
   * Transform for generic CSV
   */
  transformForGeneric(data, config) {
    return data.map((customer) => {
      return {
        customer_id: customer.customer_id,
        email_hash: customer.email_hash,
        phone_hash: customer.phone_hash,
        total_spent: Number(customer.total_spent || 0).toFixed(2),
        order_count: Number(customer.order_count || 0),
        last_order_at: customer.last_order_at,
        top_category: customer.top_category,
        created_at: customer.created_at,
      };
    });
  }

  /**
   * Hash data for Google Ads (SHA-256)
   */
  hashForGoogleAds(data) {
    if (!data || typeof data !== "string") return "";

    const normalized = data.toLowerCase().trim();
    if (!normalized) return "";

    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  /**
   * Format phone number for Google Ads (E.164 format)
   */
  formatPhoneForGoogleAds(phone) {
    if (!phone) return "";

    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, "");

    // Add country code if missing (assume US)
    if (digits.length === 10) {
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith("1")) {
      return `+${digits}`;
    } else if (digits.length > 10) {
      return `+${digits}`;
    }

    return "";
  }

  /**
   * Format phone number for Facebook
   */
  formatPhoneForFacebook(phone) {
    if (!phone) return "";

    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, "");

    // Facebook expects numbers without country code prefix
    if (digits.length === 11 && digits.startsWith("1")) {
      return digits.substring(1);
    }

    return digits;
  }

  /**
   * Placeholder for unhashing email (not possible with one-way hash)
   */
  unhashEmail(emailHash) {
    // In production, you'd need to maintain a secure mapping
    // or use the original email data before hashing
    return null;
  }

  /**
   * Placeholder for unhashing phone (not possible with one-way hash)
   */
  unhashPhone(phoneHash) {
    // In production, you'd need to maintain a secure mapping
    // or use the original phone data before hashing
    return null;
  }

  /**
   * Validate required fields are present
   */
  validateRequiredFields(data, formatConfig) {
    if (!data || data.length === 0) return;

    const sample = data[0];
    const missingFields = formatConfig.requiredFields.filter(
      (field) => !Object.keys(sample).includes(field),
    );

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }

    // Check if required fields have values
    const emptyRequiredFields = formatConfig.requiredFields.filter((field) => {
      const values = data.map((row) => row[field]).filter(Boolean);
      return values.length === 0;
    });

    if (emptyRequiredFields.length > 0) {
      throw new Error(
        `Required fields have no values: ${emptyRequiredFields.join(", ")}`,
      );
    }
  }

  /**
   * Generate CSV content from data
   */
  generateCSVContent(data, headers, includeHeaders = true) {
    if (!data || data.length === 0) {
      return includeHeaders ? headers.join(",") + "\n" : "";
    }

    const lines = [];

    // Add headers
    if (includeHeaders) {
      lines.push(headers.join(","));
    }

    // Add data rows
    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header] || "";
        // Escape CSV values that contain commas, quotes, or newlines
        if (
          String(value).includes(",") ||
          String(value).includes('"') ||
          String(value).includes("\n")
        ) {
          return `"${String(value).replace(/"/g, '""')}"`;
        }
        return String(value);
      });

      lines.push(values.join(","));
    }

    return lines.join("\n");
  }

  /**
   * Generate export file name
   */
  generateFileName(tenantId, segmentKey, format) {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .split("T")[0];
    const formatSuffix = format.toLowerCase().replace(/_/g, "-");
    return `${tenantId}-${segmentKey}-${formatSuffix}-${timestamp}.csv`;
  }

  /**
   * Store export result (placeholder for actual storage)
   */
  async storeExport(tenantId, exportData) {
    try {
      // In production, this would upload to cloud storage (S3, GCS, etc.)
      // For now, store metadata in Google Sheets

      await optimizedSheets.addRow(tenantId, "AUDIENCE_EXPORT", {
        file_name: exportData.fileName,
        segment_key: exportData.segmentKey,
        format: exportData.format,
        row_count: exportData.rowCount,
        generated_at: exportData.timestamp,
        storage_url: `https://storage.example.com/${exportData.fileName}`, // Placeholder URL
      });

      return {
        url: `https://storage.example.com/${exportData.fileName}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      };
    } catch (error) {
      console.error("Failed to store export:", error);
      throw new Error(`Failed to store export: ${error.message}`);
    }
  }

  /**
   * Get export history for a tenant
   */
  async getExportHistory(tenantId, options = {}) {
    const { limit = 50, segmentKey = null } = options;

    try {
      const exports = await optimizedSheets.getRows(
        tenantId,
        "AUDIENCE_EXPORT",
        {
          limit,
          useCache: false, // Always get fresh data for history
        },
      );

      let filteredExports = exports;

      if (segmentKey) {
        filteredExports = exports.filter(
          (exp) => exp.segment_key === segmentKey,
        );
      }

      return filteredExports
        .sort((a, b) => new Date(b.generated_at) - new Date(a.generated_at))
        .map((exp) => ({
          fileName: exp.file_name,
          segmentKey: exp.segment_key,
          format: exp.format,
          rowCount: Number(exp.row_count || 0),
          generatedAt: exp.generated_at,
          downloadUrl: exp.storage_url,
        }));
    } catch (error) {
      console.error(
        `Failed to get export history for tenant ${tenantId}:`,
        error,
      );
      return [];
    }
  }

  /**
   * Get available export formats
   */
  getExportFormats() {
    return Object.entries(this.exportFormats).map(([key, config]) => ({
      key,
      name: config.name,
      description: config.description,
      headers: config.headers,
      requiredFields: config.requiredFields,
      maxRows: config.maxRows,
    }));
  }

  /**
   * Get export status
   */
  getExportStatus(tenantId, segmentKey = null) {
    if (segmentKey) {
      const activeExport = this.activeExports.get(`${tenantId}:${segmentKey}`);
      if (activeExport) {
        return {
          status: "running",
          exportId: activeExport.exportId,
          startTime: activeExport.startTime,
          duration: Date.now() - activeExport.startTime,
        };
      }
    }

    return {
      status: "idle",
      activeExports: this.activeExports.size,
      lastExportTime: this.metrics.lastExportTime,
    };
  }

  /**
   * Generate unique export ID
   */
  generateExportId() {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update service metrics
   */
  updateMetrics(startTime, rowCount) {
    const executionTime = Date.now() - startTime;

    this.metrics.exportsGenerated++;
    this.metrics.totalRowsExported += rowCount;
    this.metrics.lastExportTime = new Date().toISOString();

    // Update average execution time
    const avgTime = this.metrics.avgExportTime;
    this.metrics.avgExportTime =
      avgTime === 0 ? executionTime : (avgTime + executionTime) / 2;
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeExports: this.activeExports.size,
      supportedFormats: Object.keys(this.exportFormats).length,
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      activeExports: this.activeExports.size,
      metrics: this.getMetrics(),
      supportedFormats: Object.keys(this.exportFormats),
    };
  }
}

// Singleton instance
const csvExporter = new CSVExportService();

export default csvExporter;
export { CSVExportService };
