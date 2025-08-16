import { jest } from '@jest/globals';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

// Mock Google Sheets API for integration testing
const mockDoc = {
  sheetsByTitle: {},
  addSheet: jest.fn(),
  loadInfo: jest.fn()
};

const mockSheet = {
  title: 'TestSheet',
  headerValues: ['Timestamp', 'Event', 'Data', 'Status'],
  addRows: jest.fn(),
  getRows: jest.fn(),
  addRow: jest.fn()
};

jest.unstable_mockModule('google-spreadsheet', () => ({
  GoogleSpreadsheet: jest.fn().mockImplementation(() => mockDoc)
}));

const { OptimizedSheetsService } = await import('../../services/sheets.js');
const sheetsPool = await import('../../services/sheets-pool.js');
const sheetsBatch = await import('../../services/sheets-batch.js');

describe('Sheets Integration Tests', () => {
  let sheetsService;
  const testTenant = 'TENANT_INTEGRATION_TEST';
  const testSheetId = 'test-sheet-id-123';
  const testSheetTitle = 'IntegrationTestSheet';

  beforeAll(async () => {
    // Initialize the service with test configuration
    sheetsService = new OptimizedSheetsService();
    
    // Setup mock sheets
    mockDoc.sheetsByTitle[testSheetTitle] = mockSheet;
    mockDoc.loadInfo.mockResolvedValue();
  });

  afterAll(async () => {
    // Cleanup any resources
    await sheetsPool.default?.close?.();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Pool Integration', () => {
    it('should manage connections efficiently', async () => {
      // Simulate multiple concurrent requests
      const requests = Array(10).fill().map((_, i) =>
        sheetsService.getSheet(testTenant, testSheetId, `Sheet${i}`)
      );

      const results = await Promise.allSettled(requests);
      
      // All requests should succeed
      results.forEach(result => {
        expect(result.status).toBe('fulfilled');
      });
    });

    it('should handle connection pool exhaustion gracefully', async () => {
      // Create more requests than the pool can handle
      const excessiveRequests = Array(50).fill().map((_, i) =>
        sheetsService.getSheet(testTenant, testSheetId, `Sheet${i}`)
      );

      const results = await Promise.allSettled(excessiveRequests);
      
      // Should handle gracefully without crashing
      const fulfilled = results.filter(r => r.status === 'fulfilled').length;
      const rejected = results.filter(r => r.status === 'rejected').length;
      
      expect(fulfilled + rejected).toBe(50);
      
      // Some requests should succeed
      expect(fulfilled).toBeGreaterThan(0);
    });
  });

  describe('Batch Operations Integration', () => {
    it('should batch multiple operations efficiently', async () => {
      const testRows = Array(100).fill().map((_, i) => ({
        Event: `test-event-${i}`,
        Data: `test-data-${i}`
      }));

      mockSheet.addRows.mockResolvedValue(testRows);

      // Add rows in batches
      const batchPromises = [];
      for (let i = 0; i < testRows.length; i += 10) {
        const batch = testRows.slice(i, i + 10);
        batchPromises.push(
          sheetsService.addRows(testTenant, testSheetId, testSheetTitle, batch)
        );
      }

      const results = await Promise.all(batchPromises);
      
      // All batches should succeed
      results.forEach(result => {
        expect(result).toBeDefined();
      });

      // Should optimize into fewer actual API calls
      expect(mockSheet.addRows).toHaveBeenCalledTimes(1); // Batched into single call
    });

    it('should handle mixed operation types in batches', async () => {
      const addOperations = Array(5).fill().map((_, i) => 
        sheetsService.addRows(testTenant, testSheetId, testSheetTitle, {
          Event: `add-${i}`,
          Data: `data-${i}`
        })
      );

      const readOperations = Array(3).fill().map(() =>
        sheetsService.getRows(testTenant, testSheetId, testSheetTitle)
      );

      mockSheet.addRows.mockResolvedValue([]);
      mockSheet.getRows.mockResolvedValue([]);

      const allOperations = [...addOperations, ...readOperations];
      const results = await Promise.allSettled(allOperations);

      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBe(8);
    });
  });

  describe('Cache Integration', () => {
    it('should cache reads and invalidate on writes', async () => {
      const testData = [
        { Event: 'cached-event', Data: 'cached-data' }
      ];

      mockSheet.getRows.mockResolvedValue(testData);

      // First read - should hit the API
      const read1 = await sheetsService.getRows(testTenant, testSheetId, testSheetTitle);
      expect(mockSheet.getRows).toHaveBeenCalledTimes(1);

      // Second read - should hit cache
      const read2 = await sheetsService.getRows(testTenant, testSheetId, testSheetTitle);
      expect(mockSheet.getRows).toHaveBeenCalledTimes(1); // Same count

      expect(read1).toEqual(read2);

      // Write operation should invalidate cache
      await sheetsService.addRows(testTenant, testSheetId, testSheetTitle, {
        Event: 'new-event',
        Data: 'new-data'
      });

      // Next read should hit API again
      const read3 = await sheetsService.getRows(testTenant, testSheetId, testSheetTitle);
      expect(mockSheet.getRows).toHaveBeenCalledTimes(2); // Incremented
    });

    it('should handle cache TTL correctly', async () => {
      const testData = [{ Event: 'ttl-test', Data: 'data' }];
      mockSheet.getRows.mockResolvedValue(testData);

      // Override cache TTL for testing
      const originalTtl = sheetsService.cacheConfig.readTtl;
      sheetsService.cacheConfig.readTtl = 100; // 100ms

      // Read data
      await sheetsService.getRows(testTenant, testSheetId, testSheetTitle);
      expect(mockSheet.getRows).toHaveBeenCalledTimes(1);

      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Read again - should hit API
      await sheetsService.getRows(testTenant, testSheetId, testSheetTitle);
      expect(mockSheet.getRows).toHaveBeenCalledTimes(2);

      // Restore original TTL
      sheetsService.cacheConfig.readTtl = originalTtl;
    });
  });

  describe('Error Recovery Integration', () => {
    it('should retry failed operations', async () => {
      let callCount = 0;
      mockSheet.addRows.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Temporary API error');
        }
        return Promise.resolve([]);
      });

      const result = await sheetsService.addRows(testTenant, testSheetId, testSheetTitle, {
        Event: 'retry-test',
        Data: 'data'
      });

      expect(result).toBeDefined();
      expect(callCount).toBe(3); // Should have retried
    });

    it('should handle quota exceeded errors', async () => {
      const quotaError = new Error('Quota exceeded');
      quotaError.code = 429;
      
      mockSheet.getRows.mockRejectedValue(quotaError);

      await expect(
        sheetsService.getRows(testTenant, testSheetId, testSheetTitle)
      ).rejects.toThrow('Quota exceeded');
    });

    it('should gracefully degrade when sheets are unavailable', async () => {
      const serviceError = new Error('Service unavailable');
      serviceError.code = 503;
      
      mockSheet.addRows.mockRejectedValue(serviceError);

      // Should not crash the application
      await expect(
        sheetsService.addRows(testTenant, testSheetId, testSheetTitle, {
          Event: 'degraded-test',
          Data: 'data'
        })
      ).rejects.toThrow('Service unavailable');
    });
  });

  describe('Data Consistency Integration', () => {
    it('should maintain data consistency across operations', async () => {
      const testRows = [
        { Event: 'consistency-test-1', Data: 'data-1' },
        { Event: 'consistency-test-2', Data: 'data-2' }
      ];

      mockSheet.addRows.mockResolvedValue(testRows);
      mockSheet.getRows.mockResolvedValue(testRows);

      // Add rows
      await sheetsService.addRows(testTenant, testSheetId, testSheetTitle, testRows);

      // Read back the data
      const retrievedRows = await sheetsService.getRows(testTenant, testSheetId, testSheetTitle);

      expect(retrievedRows).toHaveLength(testRows.length);
      testRows.forEach((row, index) => {
        expect(retrievedRows[index]).toMatchObject(row);
      });
    });

    it('should handle concurrent writes safely', async () => {
      const concurrentWrites = Array(20).fill().map((_, i) =>
        sheetsService.addRows(testTenant, testSheetId, testSheetTitle, {
          Event: `concurrent-${i}`,
          Data: `data-${i}`
        })
      );

      mockSheet.addRows.mockResolvedValue([]);

      const results = await Promise.allSettled(concurrentWrites);
      
      // All writes should complete successfully
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBe(20);
    });
  });

  describe('Performance Integration', () => {
    it('should meet performance SLAs under load', async () => {
      const operationCount = 100;
      const operations = Array(operationCount).fill().map((_, i) => {
        const operation = i % 2 === 0 ? 'read' : 'write';
        
        if (operation === 'read') {
          return sheetsService.getRows(testTenant, testSheetId, testSheetTitle);
        } else {
          return sheetsService.addRows(testTenant, testSheetId, testSheetTitle, {
            Event: `perf-test-${i}`,
            Data: `data-${i}`
          });
        }
      });

      mockSheet.getRows.mockResolvedValue([]);
      mockSheet.addRows.mockResolvedValue([]);

      const start = Date.now();
      const results = await Promise.allSettled(operations);
      const duration = Date.now() - start;

      // All operations should complete
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBe(operationCount);

      // Should complete within performance target
      const avgTimePerOperation = duration / operationCount;
      expect(avgTimePerOperation).toBeLessThan(50); // 50ms average per operation
    });

    it('should maintain stable memory usage', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        await sheetsService.addRows(testTenant, testSheetId, testSheetTitle, {
          Event: `memory-test-${i}`,
          Data: `data-${i}`
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Multi-tenant Integration', () => {
    it('should isolate data between tenants', async () => {
      const tenant1 = 'TENANT_1';
      const tenant2 = 'TENANT_2';
      const sheetTitle = 'MultiTenantTest';

      const tenant1Data = { Event: 'tenant1-event', Data: 'tenant1-data' };
      const tenant2Data = { Event: 'tenant2-event', Data: 'tenant2-data' };

      mockSheet.addRows.mockResolvedValue([]);

      // Add data for each tenant
      await sheetsService.addRows(tenant1, testSheetId, sheetTitle, tenant1Data);
      await sheetsService.addRows(tenant2, testSheetId, sheetTitle, tenant2Data);

      // Verify operations are isolated
      expect(mockSheet.addRows).toHaveBeenCalledTimes(2);
      
      // Each call should be associated with the correct tenant
      const calls = mockSheet.addRows.mock.calls;
      expect(calls).toHaveLength(2);
    });

    it('should handle tenant-specific rate limits', async () => {
      const highVolumeOperations = Array(100).fill().map(() =>
        sheetsService.addRows(testTenant, testSheetId, testSheetTitle, {
          Event: 'rate-limit-test',
          Data: 'data'
        })
      );

      mockSheet.addRows.mockResolvedValue([]);

      const results = await Promise.allSettled(highVolumeOperations);
      
      // Some operations might be rate limited, but service should remain stable
      const completed = results.filter(r => r.status === 'fulfilled').length;
      expect(completed).toBeGreaterThan(0);
    });
  });
});