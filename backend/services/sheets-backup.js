/**
 * Google Sheets Backup & Restore Service
 * Handles backup creation, storage, restoration, and maintenance
 */

import optimizedSheets from "./sheets.js";
import sheetsSchema from "./sheets-schema.js";
import tenantRegistry from "./tenant-registry.js";
import logger from "./logger.js";
import { createWriteStream, createReadStream, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { createGzip, createGunzip } from "zlib";
import { pipeline } from "stream/promises";

const BACKUP_DIR = process.env.BACKUP_DIR || "./backups";
const MAX_BACKUP_SIZE = 100 * 1024 * 1024; // 100MB
const COMPRESSION_ENABLED = process.env.BACKUP_COMPRESSION === "true";

class SheetsBackupService {
  constructor() {
    this.backupQueue = [];
    this.isProcessing = false;
    this.maxConcurrentBackups = 3;
    this.currentBackups = 0;

    // Metrics
    this.metrics = {
      backupsCreated: 0,
      backupsRestored: 0,
      backupsFailed: 0,
      bytesBackedUp: 0,
      bytesRestored: 0,
      compressionRatio: 0,
    };

    // Ensure backup directory exists
    this.ensureBackupDirectory();

    // Start backup processor
    this.startBackupProcessor();
  }

  /**
   * Ensure backup directory exists
   */
  ensureBackupDirectory() {
    if (!existsSync(BACKUP_DIR)) {
      mkdirSync(BACKUP_DIR, { recursive: true });
      logger.info(`Created backup directory: ${BACKUP_DIR}`);
    }
  }

  /**
   * Create full backup of tenant data
   */
  async createFullBackup(tenantId, options = {}) {
    const backupId = `full_${tenantId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    try {
      logger.info(`Starting full backup for tenant: ${tenantId}`, { backupId });

      const backupData = {
        backupId,
        tenantId,
        type: "full",
        timestamp,
        schemas: {},
        sheets: {},
        metadata: {
          version: sheetsSchema.getMetrics().schemaVersion,
          creator: "sheets-backup-service",
          options,
        },
      };

      // Get all schema definitions
      const schemas = sheetsSchema.schemaDefinitions;
      for (const [sheetName, schema] of schemas) {
        backupData.schemas[sheetName] = {
          version: schema.version,
          hash: schema.hash,
          headers: schema.headers,
          validations: schema.validations,
        };
      }

      // Backup each sheet
      for (const sheetName of schemas.keys()) {
        try {
          const sheetBackup = await this.backupSheet(tenantId, sheetName);
          backupData.sheets[sheetName] = sheetBackup;
        } catch (error) {
          logger.warn(`Failed to backup sheet: ${sheetName}`, {
            tenantId,
            backupId,
            error: error.message,
          });
          backupData.sheets[sheetName] = {
            error: error.message,
            timestamp: new Date().toISOString(),
          };
        }
      }

      // Save backup to file
      const backupPath = await this.saveBackupToFile(backupData);

      // Store backup metadata in sheets
      await this.storeBackupMetadata(tenantId, {
        backup_id: backupId,
        type: "full",
        file_path: backupPath,
        size_bytes: JSON.stringify(backupData).length,
        sheet_count: Object.keys(backupData.sheets).length,
        created_at: timestamp,
        status: "completed",
      });

      this.metrics.backupsCreated++;
      this.metrics.bytesBackedUp += JSON.stringify(backupData).length;

      logger.info(`Full backup completed for tenant: ${tenantId}`, {
        backupId,
        sheetCount: Object.keys(backupData.sheets).length,
        filePath: backupPath,
      });

      return {
        backupId,
        filePath: backupPath,
        sheetCount: Object.keys(backupData.sheets).length,
        timestamp,
      };
    } catch (error) {
      this.metrics.backupsFailed++;
      logger.error(`Full backup failed for tenant: ${tenantId}`, {
        backupId,
        error: error.message,
      });

      // Store failed backup metadata
      try {
        await this.storeBackupMetadata(tenantId, {
          backup_id: backupId,
          type: "full",
          size_bytes: 0,
          sheet_count: 0,
          created_at: timestamp,
          status: "failed",
          error: error.message,
        });
      } catch (metaError) {
        logger.error("Failed to store backup metadata", {
          error: metaError.message,
        });
      }

      throw error;
    }
  }

  /**
   * Backup individual sheet
   */
  async backupSheet(tenantId, sheetName) {
    try {
      // Get sheet info and data
      const sheetInfo = await optimizedSheets.ensureSheet(tenantId, sheetName);
      const rows = await optimizedSheets.getRows(tenantId, sheetName, {
        useCache: false,
      });

      return {
        info: sheetInfo,
        rows: rows,
        rowCount: rows.length,
        timestamp: new Date().toISOString(),
        checksum: this.calculateChecksum(rows),
      };
    } catch (error) {
      logger.error(`Failed to backup sheet: ${sheetName}`, {
        tenantId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Calculate checksum for data integrity
   */
  calculateChecksum(data) {
    const crypto = require("crypto");
    const hash = crypto.createHash("sha256");
    hash.update(JSON.stringify(data));
    return hash.digest("hex");
  }

  /**
   * Save backup data to file
   */
  async saveBackupToFile(backupData) {
    const filename = `${backupData.backupId}.json${COMPRESSION_ENABLED ? ".gz" : ""}`;
    const filePath = join(BACKUP_DIR, filename);

    try {
      const jsonData = JSON.stringify(backupData, null, 2);

      if (COMPRESSION_ENABLED) {
        // Compress backup
        const readStream = require("stream").Readable.from([jsonData]);
        const writeStream = createWriteStream(filePath);
        const gzipStream = createGzip({ level: 6 });

        await pipeline(readStream, gzipStream, writeStream);

        // Calculate compression ratio
        const originalSize = Buffer.byteLength(jsonData);
        const compressedSize = require("fs").statSync(filePath).size;
        this.metrics.compressionRatio = compressedSize / originalSize;
      } else {
        // Save uncompressed
        require("fs").writeFileSync(filePath, jsonData);
      }

      return filePath;
    } catch (error) {
      logger.error("Failed to save backup to file", {
        filePath,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Load backup data from file
   */
  async loadBackupFromFile(filePath) {
    try {
      if (!existsSync(filePath)) {
        throw new Error(`Backup file not found: ${filePath}`);
      }

      let data;

      if (filePath.endsWith(".gz")) {
        // Decompress backup
        const readStream = createReadStream(filePath);
        const gunzipStream = createGunzip();

        const chunks = [];
        await pipeline(readStream, gunzipStream, async function* (source) {
          for await (const chunk of source) {
            chunks.push(chunk);
          }
        });

        data = Buffer.concat(chunks).toString();
      } else {
        // Read uncompressed
        data = require("fs").readFileSync(filePath, "utf8");
      }

      return JSON.parse(data);
    } catch (error) {
      logger.error("Failed to load backup from file", {
        filePath,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Store backup metadata in sheets
   */
  async storeBackupMetadata(tenantId, metadata) {
    try {
      await optimizedSheets.ensureSheet(tenantId, "_proofkit_backups", [
        "backup_id",
        "type",
        "file_path",
        "size_bytes",
        "sheet_count",
        "created_at",
        "status",
        "error",
        "restored_at",
        "tenant_id",
      ]);

      await optimizedSheets.addRow(tenantId, "_proofkit_backups", {
        ...metadata,
        tenant_id: tenantId,
      });
    } catch (error) {
      logger.error("Failed to store backup metadata", {
        tenantId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(tenantId, backupId, options = {}) {
    try {
      logger.info(`Starting restore from backup: ${backupId}`, { tenantId });

      // Get backup metadata
      const backupRows = await optimizedSheets.getRows(
        tenantId,
        "_proofkit_backups",
      );
      const backupRecord = backupRows.find((row) => row.backup_id === backupId);

      if (!backupRecord) {
        throw new Error(`Backup not found: ${backupId}`);
      }

      if (backupRecord.status !== "completed") {
        throw new Error(
          `Backup is not in completed state: ${backupRecord.status}`,
        );
      }

      // Load backup data
      const backupData = await this.loadBackupFromFile(backupRecord.file_path);

      const restoreResults = {
        backupId,
        tenantId,
        timestamp: new Date().toISOString(),
        sheetsRestored: 0,
        rowsRestored: 0,
        errors: [],
      };

      // Validate backup data
      if (backupData.tenantId !== tenantId) {
        throw new Error("Backup tenant mismatch");
      }

      // Create backup before restore (if requested)
      if (options.createBackupBeforeRestore) {
        await this.createFullBackup(tenantId, { reason: "pre-restore-backup" });
      }

      // Restore schemas first
      for (const [sheetName, schemaData] of Object.entries(
        backupData.schemas,
      )) {
        try {
          // Update schema definition if needed
          if (sheetsSchema.schemaDefinitions.has(sheetName)) {
            const currentSchema = sheetsSchema.schemaDefinitions.get(sheetName);
            if (currentSchema.hash !== schemaData.hash) {
              logger.warn(`Schema hash mismatch for sheet: ${sheetName}`, {
                currentHash: currentSchema.hash,
                backupHash: schemaData.hash,
              });
            }
          }
        } catch (error) {
          restoreResults.errors.push({
            sheet: sheetName,
            type: "schema",
            error: error.message,
          });
        }
      }

      // Restore sheet data
      for (const [sheetName, sheetData] of Object.entries(backupData.sheets)) {
        if (sheetData.error) {
          restoreResults.errors.push({
            sheet: sheetName,
            type: "data",
            error: `Sheet was not backed up: ${sheetData.error}`,
          });
          continue;
        }

        try {
          await this.restoreSheet(tenantId, sheetName, sheetData, options);
          restoreResults.sheetsRestored++;
          restoreResults.rowsRestored += sheetData.rowCount || 0;
        } catch (error) {
          restoreResults.errors.push({
            sheet: sheetName,
            type: "data",
            error: error.message,
          });
        }
      }

      // Update backup metadata
      backupRecord.restored_at = new Date().toISOString();
      await optimizedSheets.updateRow(
        tenantId,
        "_proofkit_backups",
        backupRecord,
      );

      this.metrics.backupsRestored++;
      this.metrics.bytesRestored += JSON.stringify(backupData).length;

      logger.info(`Restore completed from backup: ${backupId}`, {
        tenantId,
        sheetsRestored: restoreResults.sheetsRestored,
        rowsRestored: restoreResults.rowsRestored,
        errors: restoreResults.errors.length,
      });

      return restoreResults;
    } catch (error) {
      logger.error(`Restore failed from backup: ${backupId}`, {
        tenantId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Restore individual sheet
   */
  async restoreSheet(tenantId, sheetName, sheetData, options = {}) {
    try {
      // Verify data integrity
      const calculatedChecksum = this.calculateChecksum(sheetData.rows);
      if (sheetData.checksum && calculatedChecksum !== sheetData.checksum) {
        throw new Error(`Data integrity check failed for sheet: ${sheetName}`);
      }

      // Ensure sheet exists with correct schema
      await sheetsSchema.ensureSheetWithSchema(tenantId, sheetName);

      if (options.clearBeforeRestore) {
        // Clear existing data
        const existingRows = await optimizedSheets.getRows(tenantId, sheetName);
        for (const row of existingRows) {
          await optimizedSheets.deleteRow(tenantId, sheetName, row);
        }
      }

      // Restore data in batches
      const batchSize = 100;
      const rows = sheetData.rows || [];

      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);

        // Validate each row against schema
        for (const row of batch) {
          try {
            sheetsSchema.validateRowData(sheetName, row);
          } catch (validationError) {
            logger.warn(`Row validation failed during restore`, {
              sheetName,
              tenantId,
              row: JSON.stringify(row),
              error: validationError.message,
            });

            if (!options.skipInvalidRows) {
              throw validationError;
            }
          }
        }

        // Insert batch
        await optimizedSheets.addRows(tenantId, sheetName, batch);
      }

      logger.info(`Sheet restored: ${sheetName}`, {
        tenantId,
        rowCount: rows.length,
      });
    } catch (error) {
      logger.error(`Failed to restore sheet: ${sheetName}`, {
        tenantId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * List available backups for tenant
   */
  async listBackups(tenantId, options = {}) {
    try {
      const { type, limit = 50, status = "completed" } = options;

      const backupRows = await optimizedSheets.getRows(
        tenantId,
        "_proofkit_backups",
      );

      let backups = backupRows.filter(
        (row) =>
          row.tenant_id === tenantId &&
          (status === "all" || row.status === status),
      );

      if (type) {
        backups = backups.filter((row) => row.type === type);
      }

      // Sort by creation date (newest first)
      backups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Limit results
      if (limit > 0) {
        backups = backups.slice(0, limit);
      }

      // Add file status
      backups.forEach((backup) => {
        if (backup.file_path) {
          backup.file_exists = existsSync(backup.file_path);
        }
      });

      return backups;
    } catch (error) {
      logger.error("Failed to list backups", {
        tenantId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Delete backup
   */
  async deleteBackup(tenantId, backupId) {
    try {
      const backupRows = await optimizedSheets.getRows(
        tenantId,
        "_proofkit_backups",
      );
      const backupRecord = backupRows.find((row) => row.backup_id === backupId);

      if (!backupRecord) {
        throw new Error(`Backup not found: ${backupId}`);
      }

      // Delete backup file
      if (backupRecord.file_path && existsSync(backupRecord.file_path)) {
        require("fs").unlinkSync(backupRecord.file_path);
      }

      // Delete backup record
      await optimizedSheets.deleteRow(
        tenantId,
        "_proofkit_backups",
        backupRecord,
      );

      logger.info(`Backup deleted: ${backupId}`, { tenantId });

      return { success: true };
    } catch (error) {
      logger.error(`Failed to delete backup: ${backupId}`, {
        tenantId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Queue backup for processing
   */
  queueBackup(tenantId, options = {}) {
    const backupTask = {
      id: `${tenantId}_${Date.now()}`,
      tenantId,
      options,
      createdAt: new Date().toISOString(),
    };

    this.backupQueue.push(backupTask);
    this.processBackupQueue();

    return backupTask.id;
  }

  /**
   * Start backup processor
   */
  startBackupProcessor() {
    setInterval(() => {
      this.processBackupQueue();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Process backup queue
   */
  async processBackupQueue() {
    if (this.isProcessing || this.currentBackups >= this.maxConcurrentBackups) {
      return;
    }

    const task = this.backupQueue.shift();
    if (!task) {
      return;
    }

    this.isProcessing = true;
    this.currentBackups++;

    try {
      await this.createFullBackup(task.tenantId, task.options);
    } catch (error) {
      logger.error("Queued backup failed", {
        taskId: task.id,
        tenantId: task.tenantId,
        error: error.message,
      });
    } finally {
      this.currentBackups--;
      this.isProcessing = false;
    }
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      queueSize: this.backupQueue.length,
      currentBackups: this.currentBackups,
      backupDirectory: BACKUP_DIR,
      compressionEnabled: COMPRESSION_ENABLED,
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics(),
    };

    try {
      // Check backup directory
      if (!existsSync(BACKUP_DIR)) {
        health.status = "unhealthy";
        health.error = "Backup directory not accessible";
      }

      // Check disk space (if available)
      try {
        const stats = require("fs").statSync(BACKUP_DIR);
        health.backupDirectoryExists = true;
      } catch (error) {
        health.status = "unhealthy";
        health.error = "Cannot access backup directory";
      }
    } catch (error) {
      health.status = "unhealthy";
      health.error = error.message;
    }

    return health;
  }
}

// Singleton instance
const sheetsBackup = new SheetsBackupService();

export default sheetsBackup;
export { SheetsBackupService };
