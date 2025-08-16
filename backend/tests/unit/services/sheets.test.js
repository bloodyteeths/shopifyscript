import { jest } from '@jest/globals';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock dependencies before importing the service
const mockGetConnection = jest.fn();
const mockReleaseConnection = jest.fn();
const mockAddToBatch = jest.fn();
const mockExecuteBatch = jest.fn();
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDelete = jest.fn();
const mockInvalidate = jest.fn();
const mockRegisterTenant = jest.fn();

jest.unstable_mockModule('../../../services/sheets-pool.js', () => ({
  default: {
    getConnection: mockGetConnection,
    releaseConnection: mockReleaseConnection
  }
}));

jest.unstable_mockModule('../../../services/sheets-batch.js', () => ({
  default: {
    addToBatch: mockAddToBatch,
    executeBatch: mockExecuteBatch
  }
}));

jest.unstable_mockModule('../../../services/cache.js', () => ({
  default: {
    get: mockGet,
    set: mockSet,
    delete: mockDelete
  }
}));

jest.unstable_mockModule('../../../services/cache-invalidation.js', () => ({
  default: {
    invalidate: mockInvalidate
  }
}));

jest.unstable_mockModule('../../../services/tenant-registry.js', () => ({
  default: {
    registerTenant: mockRegisterTenant
  }
}));

const { OptimizedSheetsService } = await import('../../../services/sheets.js');

describe('OptimizedSheetsService', () => {
  let sheetsService;
  let mockDoc;
  let mockSheet;
  let mockConnection;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock objects
    mockSheet = {
      title: 'TestSheet',
      addRows: jest.fn(),
      getRows: jest.fn(),
      addRow: jest.fn(),
      headerValues: ['Timestamp', 'Event', 'Data', 'Status']
    };
    
    mockDoc = {
      sheetsByTitle: {
        TestSheet: mockSheet
      },
      addSheet: jest.fn()
    };
    
    mockConnection = {
      doc: mockDoc,
      tenantId: 'test-tenant',
      sheetId: 'test-sheet'
    };
    
    sheetsService = new OptimizedSheetsService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(sheetsService.defaultHeaders).toEqual({
        timestamp: 'Timestamp',
        event: 'Event',
        data: 'Data',
        status: 'Status'
      });
      
      expect(sheetsService.cacheConfig.defaultTtl).toEqual(300000); // 5 minutes
      expect(sheetsService.metrics.operations).toBe(0);
    });
  });

  describe('getSheet', () => {
    it('should return cached sheet if available', async () => {
      const cacheKey = 'sheet:test-tenant:test-sheet:TestSheet';
      mockGet.mockResolvedValue(mockSheet);
      
      const result = await sheetsService.getSheet('test-tenant', 'test-sheet', 'TestSheet');
      
      expect(mockGet).toHaveBeenCalledWith(cacheKey);
      expect(result).toBe(mockSheet);
      expect(sheetsService.metrics.cacheHits).toBe(1);
    });

    it('should fetch sheet from connection pool if not cached', async () => {
      const cacheKey = 'sheet:test-tenant:test-sheet:TestSheet';
      mockGet.mockResolvedValue(null);
      mockGetConnection.mockResolvedValue(mockConnection);
      
      const result = await sheetsService.getSheet('test-tenant', 'test-sheet', 'TestSheet');
      
      expect(mockGet).toHaveBeenCalledWith(cacheKey);
      expect(mockGetConnection).toHaveBeenCalledWith('test-tenant', 'test-sheet');
      expect(mockSet).toHaveBeenCalledWith(cacheKey, mockSheet, expect.any(Number));
      expect(mockReleaseConnection).toHaveBeenCalledWith(mockConnection);
      expect(result).toBe(mockSheet);
    });

    it('should create sheet if it does not exist', async () => {
      const cacheKey = 'sheet:test-tenant:test-sheet:NewSheet';
      mockGet.mockResolvedValue(null);
      mockGetConnection.mockResolvedValue(mockConnection);
      mockDoc.sheetsByTitle = {}; // Empty sheets
      
      const newSheet = { title: 'NewSheet', headerValues: [] };
      mockDoc.addSheet.mockResolvedValue(newSheet);
      
      const result = await sheetsService.getSheet('test-tenant', 'test-sheet', 'NewSheet');
      
      expect(mockDoc.addSheet).toHaveBeenCalledWith({
        title: 'NewSheet',
        headerValues: ['Timestamp', 'Event', 'Data', 'Status']
      });
      expect(result).toBe(newSheet);
    });

    it('should handle errors gracefully', async () => {
      mockGet.mockRejectedValue(new Error('Cache error'));
      mockGetConnection.mockRejectedValue(new Error('Connection error'));
      
      await expect(sheetsService.getSheet('test-tenant', 'test-sheet', 'TestSheet'))
        .rejects.toThrow('Connection error');
    });
  });

  describe('addRows', () => {
    it('should add rows using batch operations', async () => {
      const rows = [
        { Event: 'test1', Data: 'data1' },
        { Event: 'test2', Data: 'data2' }
      ];
      
      const processedRows = rows.map(row => ({
        ...row,
        Timestamp: expect.any(String),
        Status: 'active'
      }));
      
      mockAddToBatch.mockResolvedValue('batch-id');
      
      const result = await sheetsService.addRows('test-tenant', 'test-sheet', 'TestSheet', rows);
      
      expect(mockAddToBatch).toHaveBeenCalledWith('test-tenant', 'test-sheet', {
        type: 'addRows',
        sheetTitle: 'TestSheet',
        rows: expect.arrayContaining(processedRows)
      });
      
      expect(result).toBe('batch-id');
      expect(sheetsService.metrics.operations).toBe(1);
    });

    it('should handle single row input', async () => {
      const row = { Event: 'test', Data: 'data' };
      
      mockAddToBatch.mockResolvedValue('batch-id');
      
      await sheetsService.addRows('test-tenant', 'test-sheet', 'TestSheet', row);
      
      expect(mockAddToBatch).toHaveBeenCalledWith('test-tenant', 'test-sheet', {
        type: 'addRows',
        sheetTitle: 'TestSheet',
        rows: expect.arrayContaining([expect.objectContaining(row)])
      });
    });

    it('should add timestamps and default status', async () => {
      const row = { Event: 'test', Data: 'data' };
      
      await sheetsService.addRows('test-tenant', 'test-sheet', 'TestSheet', row);
      
      const expectedRow = expect.objectContaining({
        Event: 'test',
        Data: 'data',
        Timestamp: expect.any(String),
        Status: 'active'
      });
      
      expect(mockAddToBatch).toHaveBeenCalledWith('test-tenant', 'test-sheet', {
        type: 'addRows',
        sheetTitle: 'TestSheet',
        rows: [expectedRow]
      });
    });
  });

  describe('getRows', () => {
    it('should return cached rows if available', async () => {
      const cacheKey = 'rows:test-tenant:test-sheet:TestSheet';
      const cachedRows = [{ Event: 'cached', Data: 'data' }];
      mockGet.mockResolvedValue(cachedRows);
      
      const result = await sheetsService.getRows('test-tenant', 'test-sheet', 'TestSheet');
      
      expect(mockGet).toHaveBeenCalledWith(cacheKey);
      expect(result).toBe(cachedRows);
      expect(sheetsService.metrics.cacheHits).toBe(1);
    });

    it('should fetch rows from sheet if not cached', async () => {
      const cacheKey = 'rows:test-tenant:test-sheet:TestSheet';
      const sheetRows = [{ Event: 'fresh', Data: 'data' }];
      
      mockGet.mockResolvedValue(null);
      mockGetConnection.mockResolvedValue(mockConnection);
      mockSheet.getRows.mockResolvedValue(sheetRows);
      
      const result = await sheetsService.getRows('test-tenant', 'test-sheet', 'TestSheet');
      
      expect(mockSheet.getRows).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(cacheKey, sheetRows, expect.any(Number));
      expect(result).toBe(sheetRows);
    });

    it('should apply filters when provided', async () => {
      const filters = { Event: 'specific' };
      
      mockGet.mockResolvedValue(null);
      mockGetConnection.mockResolvedValue(mockConnection);
      mockSheet.getRows.mockResolvedValue([]);
      
      await sheetsService.getRows('test-tenant', 'test-sheet', 'TestSheet', filters);
      
      expect(mockSheet.getRows).toHaveBeenCalledWith(filters);
    });
  });

  describe('performance metrics', () => {
    it('should track operations count', async () => {
      mockAddToBatch.mockResolvedValue('batch-id');
      
      const initialCount = sheetsService.metrics.operations;
      
      await sheetsService.addRows('test-tenant', 'test-sheet', 'TestSheet', { Event: 'test' });
      
      expect(sheetsService.metrics.operations).toBe(initialCount + 1);
    });

    it('should track cache hits', async () => {
      mockGet.mockResolvedValue([]);
      
      const initialHits = sheetsService.metrics.cacheHits;
      
      await sheetsService.getRows('test-tenant', 'test-sheet', 'TestSheet');
      
      expect(sheetsService.metrics.cacheHits).toBe(initialHits + 1);
    });

    it('should return performance metrics', () => {
      const metrics = sheetsService.getMetrics();
      
      expect(metrics).toHaveProperty('operations');
      expect(metrics).toHaveProperty('cacheHits');
      expect(metrics).toHaveProperty('cacheHitRatio');
      expect(metrics).toHaveProperty('averageResponseTime');
    });
  });

  describe('cache invalidation', () => {
    it('should invalidate cache after write operations', async () => {
      mockAddToBatch.mockResolvedValue('batch-id');
      
      await sheetsService.addRows('test-tenant', 'test-sheet', 'TestSheet', { Event: 'test' });
      
      expect(mockInvalidate).toHaveBeenCalledWith('test-tenant', 'test-sheet', 'TestSheet');
    });
  });

  describe('error handling', () => {
    it('should handle connection pool errors', async () => {
      mockGetConnection.mockRejectedValue(new Error('Pool exhausted'));
      
      await expect(sheetsService.getSheet('test-tenant', 'test-sheet', 'TestSheet'))
        .rejects.toThrow('Pool exhausted');
    });

    it('should handle batch operation errors', async () => {
      mockAddToBatch.mockRejectedValue(new Error('Batch failed'));
      
      await expect(sheetsService.addRows('test-tenant', 'test-sheet', 'TestSheet', { Event: 'test' }))
        .rejects.toThrow('Batch failed');
    });

    it('should handle malformed input gracefully', async () => {
      await expect(sheetsService.addRows('test-tenant', 'test-sheet', 'TestSheet', null))
        .rejects.toThrow();
    });
  });
});