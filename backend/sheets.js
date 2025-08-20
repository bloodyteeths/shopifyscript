
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
    
    // Use first available tenant - no hardcoded preferences
    const allTenants = tenantRegistry.getAllTenants();
    let targetTenantId = 'default';
    
    if (allTenants.length > 0) {
      // Use first tenant in registry, or create default if none exist
      targetTenantId = allTenants[0].id;
    } else if (process.env.SHEET_ID) {
      // Auto-register default tenant if we have a SHEET_ID but no tenants
      tenantRegistry.addTenant('default', {
        sheetId: process.env.SHEET_ID,
        name: 'Default Tenant',
        plan: 'starter'
      });
      targetTenantId = 'default';
    }
    
    const connection = await optimizedSheets.getTenantDoc(targetTenantId);
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
  console.log(`🔧 ensureSheet called for title: ${title}`);
  
  try {
    // Always use fallback logic for reliability
    let sheet = doc.sheetsByTitle[title];
    console.log(`📋 Checking for existing sheet "${title}": ${sheet ? 'found' : 'not found'}`);
    
    if (!sheet) {
      console.log(`➕ Creating new sheet "${title}" with headers:`, header);
      sheet = await doc.addSheet({ title, headerValues: header });
      console.log(`✅ Created sheet "${title}" successfully`);
    } else {
      console.log(`🔄 Sheet "${title}" exists, ensuring headers are set`);
      try {
        await sheet.loadHeaderRow();
        if (!sheet._headerValues || sheet._headerValues.length === 0) {
          console.log(`📝 Setting headers for existing sheet "${title}"`);
          await sheet.setHeaderRow(header);
        }
      } catch (error) {
        console.log(`⚠️ Header setup error for "${title}":`, error.message);
        if (header?.length) {
          await sheet.setHeaderRow(header);
        }
      }
    }
    
    console.log(`🎯 Returning sheet object for "${title}":`, !!sheet);
    return sheet;
  } catch (error) {
    console.error(`❌ ensureSheet failed for "${title}":`, error.message);
    throw error;
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
