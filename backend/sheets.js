
/**
 * Google Sheets Helper - Optimized Multi-Tenant Infrastructure
 * Enhanced with connection pooling, smart batching, and caching
 */

// Import optimized service
import optimizedSheets from './services/sheets.js';
import tenantRegistry from './services/tenant-registry.js';

// Legacy compatibility functions for existing code
export async function getDoc() {
  try {
    // Initialize tenant registry if not already done
    if (!tenantRegistry.isInitialized) {
      await tenantRegistry.initialize();
    }
    
    // Use default tenant for backward compatibility
    const connection = await optimizedSheets.getTenantDoc('default');
    return connection.doc;
  } catch (error) {
    console.error('Google Sheets auth error:', error.message);
    return null;
  }
}

export async function getDocById(sheetId) {
  try {
    // For legacy compatibility, create a temporary tenant entry
    if (sheetId && sheetId !== process.env.SHEET_ID) {
      const tempTenantId = `temp_${sheetId.slice(-8)}`;
      tenantRegistry.addTenant(tempTenantId, { sheetId });
      
      const connection = await optimizedSheets.getTenantDoc(tempTenantId);
      return connection.doc;
    }
    
    // Use default tenant
    return await getDoc();
  } catch (error) {
    console.error('Google Sheets auth error (by id):', error.message);
    return null;
  }
}

export async function ensureSheet(doc, title, header) {
  try {
    // Extract tenant info from doc or use default
    const tenantId = 'default'; // Simplified for legacy compatibility
    
    // Use optimized service
    const sheetInfo = await optimizedSheets.ensureSheet(tenantId, title, header);
    
    // Return the actual sheet for backward compatibility
    return doc.sheetsByTitle[title];
  } catch (error) {
    console.error('ensureSheet error:', error.message);
    
    // Fallback to original logic if optimized service fails
    let sheet = doc.sheetsByTitle[title];
    if (!sheet) {
      sheet = await doc.addSheet({ title, headerValues: header });
    } else {
      try {
        await sheet.loadHeaderRow();
        if (!sheet._headerValues || sheet._headerValues.length === 0) {
          await sheet.setHeaderRow(header);
        }
      } catch (error) {
        if (header?.length) {
          await sheet.setHeaderRow(header);
        }
      }
    }
    return sheet;
  }
}

// Enhanced API functions using optimized infrastructure
export const sheets = {
  // Tenant-aware operations
  async getTenantDoc(tenantId) {
    return await optimizedSheets.getTenantDoc(tenantId);
  },

  async getRows(tenantId, sheetTitle, options = {}) {
    return await optimizedSheets.getRows(tenantId, sheetTitle, options);
  },

  async addRow(tenantId, sheetTitle, rowData) {
    return await optimizedSheets.addRow(tenantId, sheetTitle, rowData);
  },

  async addRows(tenantId, sheetTitle, rowsData) {
    return await optimizedSheets.addRows(tenantId, sheetTitle, rowsData);
  },

  async updateRow(tenantId, sheetTitle, row, rowId = null) {
    return await optimizedSheets.updateRow(tenantId, sheetTitle, row, rowId);
  },

  async deleteRow(tenantId, sheetTitle, row, rowId = null) {
    return await optimizedSheets.deleteRow(tenantId, sheetTitle, row, rowId);
  },

  async ensureSheet(tenantId, title, headers = null) {
    return await optimizedSheets.ensureSheet(tenantId, title, headers);
  },

  async getCachedData(tenantId, sheetTitle, ttl = null) {
    return await optimizedSheets.getCachedSheetData(tenantId, sheetTitle, ttl);
  },

  async bulkOperations(tenantId, operations) {
    return await optimizedSheets.bulkOperations(tenantId, operations);
  },

  async flushPending(tenantId) {
    return await optimizedSheets.flushPendingOperations(tenantId);
  },

  async clearCache(tenantId) {
    return await optimizedSheets.clearTenantCache(tenantId);
  },

  async getStats() {
    return await optimizedSheets.getStats();
  },

  async healthCheck(tenantId = 'default') {
    return await optimizedSheets.healthCheck(tenantId);
  }
};

// Export optimized service for direct access
export { optimizedSheets };
