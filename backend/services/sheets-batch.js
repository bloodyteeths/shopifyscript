/**
 * Smart Batch Operations for Google Sheets - Performance Optimization
 * Combines multiple operations into efficient batch requests
 */

import sheetsPool from "./sheets-pool.js";

class SheetsBatchOperations {
  constructor() {
    this.pendingBatches = new Map(); // tenantId -> { operations: [], timer, callback }
    this.batchDelay = Number(process.env.SHEETS_BATCH_DELAY_MS || 100); // 100ms delay
    this.maxBatchSize = Number(process.env.SHEETS_MAX_BATCH_SIZE || 50);
    this.maxBatchWaitTime = Number(
      process.env.SHEETS_MAX_BATCH_WAIT_MS || 1000,
    ); // 1 second

    // Batch metrics
    this.metrics = {
      totalOperations: 0,
      batchedOperations: 0,
      batchesExecuted: 0,
      averageBatchSize: 0,
      timesSaved: 0, // Estimated API calls saved
      errors: 0,
    };
  }

  /**
   * Add operation to batch queue
   */
  async queueOperation(tenantId, sheetId, operation) {
    return new Promise((resolve, reject) => {
      const batchKey = `${tenantId}:${sheetId}`;

      if (!this.pendingBatches.has(batchKey)) {
        this.pendingBatches.set(batchKey, {
          operations: [],
          callbacks: [],
          tenantId,
          sheetId,
          timer: null,
          createdAt: Date.now(),
        });
      }

      const batch = this.pendingBatches.get(batchKey);
      batch.operations.push(operation);
      batch.callbacks.push({ resolve, reject });

      // Check if we should execute immediately
      if (batch.operations.length >= this.maxBatchSize) {
        this.executeBatch(batchKey);
      } else if (!batch.timer) {
        // Set timer for batch execution
        batch.timer = setTimeout(() => {
          this.executeBatch(batchKey);
        }, this.batchDelay);
      }

      // Force execution if batch is too old
      if (Date.now() - batch.createdAt > this.maxBatchWaitTime) {
        this.executeBatch(batchKey);
      }

      this.metrics.totalOperations++;
    });
  }

  /**
   * Execute batch of operations
   */
  async executeBatch(batchKey) {
    const batch = this.pendingBatches.get(batchKey);
    if (!batch || batch.operations.length === 0) return;

    // Clear timer and remove from pending
    if (batch.timer) {
      clearTimeout(batch.timer);
    }
    this.pendingBatches.delete(batchKey);

    const { operations, callbacks, tenantId, sheetId } = batch;
    this.metrics.batchedOperations += operations.length;
    this.metrics.batchesExecuted++;
    this.metrics.timesSaved += Math.max(0, operations.length - 1);

    try {
      const connection = await sheetsPool.getConnection(tenantId, sheetId);
      const results = await this.executeBatchOperations(
        connection.doc,
        operations,
      );
      connection.release();

      // Update average batch size
      this.metrics.averageBatchSize =
        this.metrics.batchedOperations / this.metrics.batchesExecuted;

      // Resolve all callbacks with their respective results
      callbacks.forEach((callback, index) => {
        if (results[index].success) {
          callback.resolve(results[index].data);
        } else {
          callback.reject(new Error(results[index].error));
        }
      });
    } catch (error) {
      this.metrics.errors++;

      // Reject all callbacks
      callbacks.forEach((callback) => {
        callback.reject(error);
      });
    }
  }

  /**
   * Execute batch operations on the document
   */
  async executeBatchOperations(doc, operations) {
    const results = [];
    const groupedOps = this.groupOperationsByType(operations);

    try {
      // Execute reads first (can be done in parallel)
      if (groupedOps.reads.length > 0) {
        const readResults = await this.executeReadBatch(doc, groupedOps.reads);
        results.push(...readResults);
      }

      // Execute writes (must be sequential for data consistency)
      if (groupedOps.writes.length > 0) {
        const writeResults = await this.executeWriteBatch(
          doc,
          groupedOps.writes,
        );
        results.push(...writeResults);
      }

      // Execute updates
      if (groupedOps.updates.length > 0) {
        const updateResults = await this.executeUpdateBatch(
          doc,
          groupedOps.updates,
        );
        results.push(...updateResults);
      }

      // Execute deletes last
      if (groupedOps.deletes.length > 0) {
        const deleteResults = await this.executeDeleteBatch(
          doc,
          groupedOps.deletes,
        );
        results.push(...deleteResults);
      }

      return results;
    } catch (error) {
      // Return error for all operations
      return operations.map(() => ({
        success: false,
        error: error.message,
      }));
    }
  }

  /**
   * Group operations by type for optimal execution
   */
  groupOperationsByType(operations) {
    const groups = {
      reads: [],
      writes: [],
      updates: [],
      deletes: [],
    };

    operations.forEach((op, index) => {
      const opWithIndex = { ...op, originalIndex: index };

      switch (op.type) {
        case "read":
        case "getRows":
        case "loadHeaderRow":
          groups.reads.push(opWithIndex);
          break;
        case "write":
        case "addRow":
        case "addRows":
          groups.writes.push(opWithIndex);
          break;
        case "update":
        case "updateRow":
        case "save":
          groups.updates.push(opWithIndex);
          break;
        case "delete":
        case "deleteRow":
          groups.deletes.push(opWithIndex);
          break;
        default:
          groups.reads.push(opWithIndex); // Default to read operation
      }
    });

    return groups;
  }

  /**
   * Execute batch of read operations
   */
  async executeReadBatch(doc, operations) {
    const results = [];
    const sheetOperations = new Map(); // Group by sheet

    // Group operations by sheet for efficiency
    operations.forEach((op) => {
      const sheetTitle = op.params.sheetTitle || op.params.sheet;
      if (!sheetOperations.has(sheetTitle)) {
        sheetOperations.set(sheetTitle, []);
      }
      sheetOperations.get(sheetTitle).push(op);
    });

    // Execute operations sheet by sheet
    for (const [sheetTitle, ops] of sheetOperations) {
      try {
        const sheet = doc.sheetsByTitle[sheetTitle];
        if (!sheet) {
          ops.forEach((op) => {
            results[op.originalIndex] = {
              success: false,
              error: `Sheet '${sheetTitle}' not found`,
            };
          });
          continue;
        }

        // Load header row once for all operations on this sheet
        await sheet.loadHeaderRow();

        // Execute read operations
        for (const op of ops) {
          try {
            let data;

            switch (op.type) {
              case "getRows":
                data = await sheet.getRows(op.params.options || {});
                break;
              case "loadHeaderRow":
                data = sheet.headerValues;
                break;
              case "read":
              default:
                data = await sheet.getRows({ limit: op.params.limit || 100 });
                break;
            }

            results[op.originalIndex] = {
              success: true,
              data: this.sanitizeSheetData(data),
            };
          } catch (error) {
            results[op.originalIndex] = {
              success: false,
              error: error.message,
            };
          }
        }
      } catch (error) {
        ops.forEach((op) => {
          results[op.originalIndex] = {
            success: false,
            error: error.message,
          };
        });
      }
    }

    return results;
  }

  /**
   * Execute batch of write operations
   */
  async executeWriteBatch(doc, operations) {
    const results = [];

    // Group by sheet for efficiency
    const sheetOperations = new Map();
    operations.forEach((op) => {
      const sheetTitle = op.params.sheetTitle || op.params.sheet;
      if (!sheetOperations.has(sheetTitle)) {
        sheetOperations.set(sheetTitle, []);
      }
      sheetOperations.get(sheetTitle).push(op);
    });

    for (const [sheetTitle, ops] of sheetOperations) {
      try {
        const sheet = doc.sheetsByTitle[sheetTitle];
        if (!sheet) {
          ops.forEach((op) => {
            results[op.originalIndex] = {
              success: false,
              error: `Sheet '${sheetTitle}' not found`,
            };
          });
          continue;
        }

        // Batch multiple rows into single addRows call when possible
        const addRowsOps = ops.filter(
          (op) => op.type === "addRows" || op.type === "addRow",
        );
        const otherOps = ops.filter(
          (op) => op.type !== "addRows" && op.type !== "addRow",
        );

        // Handle bulk row additions
        if (addRowsOps.length > 0) {
          try {
            const allRows = [];
            addRowsOps.forEach((op) => {
              if (op.type === "addRows" && Array.isArray(op.params.rows)) {
                allRows.push(...op.params.rows);
              } else if (op.type === "addRow" && op.params.row) {
                allRows.push(op.params.row);
              }
            });

            if (allRows.length > 0) {
              const addedRows = await sheet.addRows(allRows);

              // Map results back to original operations
              let rowIndex = 0;
              addRowsOps.forEach((op) => {
                const rowCount =
                  op.type === "addRows" ? op.params.rows.length : 1;
                const opRows = addedRows.slice(rowIndex, rowIndex + rowCount);
                rowIndex += rowCount;

                results[op.originalIndex] = {
                  success: true,
                  data: this.sanitizeSheetData(
                    opRows.length === 1 ? opRows[0] : opRows,
                  ),
                };
              });
            }
          } catch (error) {
            addRowsOps.forEach((op) => {
              results[op.originalIndex] = {
                success: false,
                error: error.message,
              };
            });
          }
        }

        // Handle other write operations
        for (const op of otherOps) {
          try {
            let data;

            switch (op.type) {
              case "write":
                if (op.params.rows) {
                  data = await sheet.addRows(op.params.rows);
                } else if (op.params.row) {
                  data = await sheet.addRow(op.params.row);
                }
                break;
              default:
                throw new Error(`Unknown write operation: ${op.type}`);
            }

            results[op.originalIndex] = {
              success: true,
              data: this.sanitizeSheetData(data),
            };
          } catch (error) {
            results[op.originalIndex] = {
              success: false,
              error: error.message,
            };
          }
        }
      } catch (error) {
        ops.forEach((op) => {
          results[op.originalIndex] = {
            success: false,
            error: error.message,
          };
        });
      }
    }

    return results;
  }

  /**
   * Execute batch of update operations
   */
  async executeUpdateBatch(doc, operations) {
    const results = [];

    for (const op of operations) {
      try {
        let data;

        switch (op.type) {
          case "updateRow":
            if (op.params.row && typeof op.params.row.save === "function") {
              await op.params.row.save();
              data = this.sanitizeSheetData(op.params.row);
            } else {
              throw new Error("Invalid row object for update");
            }
            break;
          case "save":
            if (op.params.row && typeof op.params.row.save === "function") {
              await op.params.row.save();
              data = this.sanitizeSheetData(op.params.row);
            } else {
              throw new Error("Invalid row object for save");
            }
            break;
          case "update":
          default:
            if (op.params.row && typeof op.params.row.save === "function") {
              await op.params.row.save();
              data = this.sanitizeSheetData(op.params.row);
            } else {
              throw new Error("Invalid update operation");
            }
            break;
        }

        results[op.originalIndex] = {
          success: true,
          data,
        };
      } catch (error) {
        results[op.originalIndex] = {
          success: false,
          error: error.message,
        };
      }
    }

    return results;
  }

  /**
   * Execute batch of delete operations
   */
  async executeDeleteBatch(doc, operations) {
    const results = [];

    // Sort delete operations by row index (descending) to avoid index shifting issues
    const sortedOps = [...operations].sort((a, b) => {
      const aIndex = a.params.row?._rowNumber || a.params.rowIndex || 0;
      const bIndex = b.params.row?._rowNumber || b.params.rowIndex || 0;
      return bIndex - aIndex; // Descending order
    });

    for (const op of sortedOps) {
      try {
        switch (op.type) {
          case "deleteRow":
            if (op.params.row && typeof op.params.row.delete === "function") {
              await op.params.row.delete();
            } else {
              throw new Error("Invalid row object for delete");
            }
            break;
          case "delete":
          default:
            if (op.params.row && typeof op.params.row.delete === "function") {
              await op.params.row.delete();
            } else {
              throw new Error("Invalid delete operation");
            }
            break;
        }

        results[op.originalIndex] = {
          success: true,
          data: null,
        };
      } catch (error) {
        results[op.originalIndex] = {
          success: false,
          error: error.message,
        };
      }
    }

    return results;
  }

  /**
   * Sanitize sheet data for safe serialization
   */
  sanitizeSheetData(data) {
    if (!data) return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeSheetData(item));
    }

    if (typeof data === "object" && data._sheet) {
      // Convert GoogleSpreadsheetRow to plain object
      const sanitized = {};

      // Copy row data
      if (data._rawData) {
        Object.keys(data._rawData).forEach((key) => {
          if (typeof data._rawData[key] !== "function") {
            sanitized[key] = data._rawData[key];
          }
        });
      }

      // Add row metadata
      if (data._rowNumber !== undefined) {
        sanitized._rowNumber = data._rowNumber;
      }

      return sanitized;
    }

    return data;
  }

  /**
   * Force execution of all pending batches
   */
  async flushAll() {
    const pendingKeys = Array.from(this.pendingBatches.keys());
    const promises = pendingKeys.map((key) => this.executeBatch(key));

    await Promise.allSettled(promises);
    return pendingKeys.length;
  }

  /**
   * Force execution of pending batches for a specific tenant
   */
  async flushTenant(tenantId) {
    const pendingKeys = Array.from(this.pendingBatches.keys()).filter((key) =>
      key.startsWith(`${tenantId}:`),
    );

    const promises = pendingKeys.map((key) => this.executeBatch(key));
    await Promise.allSettled(promises);

    return pendingKeys.length;
  }

  /**
   * Clear all pending batches
   */
  clear() {
    for (const batch of this.pendingBatches.values()) {
      if (batch.timer) {
        clearTimeout(batch.timer);
      }

      // Reject all pending callbacks
      batch.callbacks.forEach((callback) => {
        callback.reject(new Error("Batch operations cleared"));
      });
    }

    const count = this.pendingBatches.size;
    this.pendingBatches.clear();
    return count;
  }

  /**
   * Get batch statistics
   */
  getStats() {
    const pendingOps = Array.from(this.pendingBatches.values()).reduce(
      (sum, batch) => sum + batch.operations.length,
      0,
    );

    const tenantBatches = new Map();
    for (const [key, batch] of this.pendingBatches) {
      const tenantId = batch.tenantId;
      if (!tenantBatches.has(tenantId)) {
        tenantBatches.set(tenantId, { batches: 0, operations: 0 });
      }
      const stats = tenantBatches.get(tenantId);
      stats.batches++;
      stats.operations += batch.operations.length;
    }

    const efficiencyRate =
      this.metrics.totalOperations > 0
        ? (this.metrics.timesSaved / this.metrics.totalOperations) * 100
        : 0;

    return {
      batch: {
        maxBatchSize: this.maxBatchSize,
        batchDelay: this.batchDelay,
        maxBatchWaitTime: this.maxBatchWaitTime,
        pendingBatches: this.pendingBatches.size,
        pendingOperations: pendingOps,
      },
      metrics: {
        ...this.metrics,
        efficiencyRate: Number(efficiencyRate.toFixed(2)),
      },
      tenants: Object.fromEntries(tenantBatches),
    };
  }
}

// Singleton instance
const sheetsBatch = new SheetsBatchOperations();

export default sheetsBatch;
export { SheetsBatchOperations };
