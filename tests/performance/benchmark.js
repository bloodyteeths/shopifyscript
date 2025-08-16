#!/usr/bin/env node

import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import path from 'path';

/**
 * Performance Benchmark Suite for ProofKit
 * Measures and reports performance metrics for critical operations
 */

class PerformanceBenchmark {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      benchmarks: {},
      summary: {}
    };
  }

  async benchmark(name, fn, iterations = 1000) {
    console.log(`Running benchmark: ${name} (${iterations} iterations)`);
    
    const times = [];
    const memoryBefore = process.memoryUsage();
    
    // Warmup
    for (let i = 0; i < Math.min(10, iterations); i++) {
      await fn();
    }

    // Actual benchmark
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }

    const memoryAfter = process.memoryUsage();
    
    // Calculate statistics
    times.sort((a, b) => a - b);
    const stats = {
      iterations,
      min: times[0],
      max: times[times.length - 1],
      mean: times.reduce((sum, time) => sum + time, 0) / times.length,
      median: times[Math.floor(times.length / 2)],
      p95: times[Math.floor(times.length * 0.95)],
      p99: times[Math.floor(times.length * 0.99)],
      opsPerSecond: 1000 / (times.reduce((sum, time) => sum + time, 0) / times.length),
      memoryDelta: {
        heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
        external: memoryAfter.external - memoryBefore.external
      }
    };

    this.results.benchmarks[name] = stats;
    
    console.log(`  Mean: ${stats.mean.toFixed(2)}ms`);
    console.log(`  Median: ${stats.median.toFixed(2)}ms`);
    console.log(`  P95: ${stats.p95.toFixed(2)}ms`);
    console.log(`  Ops/sec: ${stats.opsPerSecond.toFixed(0)}`);
    console.log(`  Memory delta: ${(stats.memoryDelta.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log('');

    return stats;
  }

  async runAllBenchmarks() {
    console.log('ProofKit Performance Benchmark Suite');
    console.log('====================================');
    console.log('');

    // Benchmark: HMAC signature generation
    await this.benchmark('HMAC Signature Generation', () => {
      const crypto = require('crypto');
      const message = 'POST:TENANT_123:upsertconfig:' + Date.now();
      return crypto.createHmac('sha256', 'test-secret').update(message).digest('hex');
    }, 10000);

    // Benchmark: JSON parsing and stringification
    await this.benchmark('JSON Processing', () => {
      const data = {
        tenant: 'TEST_TENANT',
        config: {
          label: 'BENCHMARK_TEST',
          settings: {
            prop1: 'value1',
            prop2: 'value2',
            prop3: Array(100).fill('data')
          }
        }
      };
      return JSON.parse(JSON.stringify(data));
    }, 5000);

    // Benchmark: Data validation
    await this.benchmark('Data Validation', () => {
      const data = {
        name: 'Test Audience',
        criteria: {
          demographics: { age: ['25-34'], gender: 'all' },
          interests: ['technology', 'software'],
          behaviors: ['frequent_purchaser']
        }
      };
      
      // Simple validation logic
      const isValid = data.name && 
        data.criteria && 
        data.criteria.demographics &&
        Array.isArray(data.criteria.interests) &&
        data.criteria.interests.length > 0;
      
      return isValid;
    }, 20000);

    // Benchmark: Array operations
    await this.benchmark('Array Processing', () => {
      const data = Array(1000).fill().map((_, i) => ({
        id: i,
        value: Math.random(),
        category: i % 10
      }));
      
      return data
        .filter(item => item.value > 0.5)
        .map(item => ({ ...item, processed: true }))
        .reduce((acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + 1;
          return acc;
        }, {});
    }, 1000);

    // Benchmark: String operations
    await this.benchmark('String Processing', () => {
      const text = 'The quick brown fox jumps over the lazy dog'.repeat(100);
      return text
        .toLowerCase()
        .split(' ')
        .filter(word => word.length > 3)
        .join('_');
    }, 5000);

    // Benchmark: RegExp operations
    await this.benchmark('Regular Expression Matching', () => {
      const text = 'user@example.com, admin@test.org, support@company.net';
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      return text.match(emailRegex);
    }, 10000);

    // Benchmark: Date operations
    await this.benchmark('Date Operations', () => {
      const now = new Date();
      const timestamp = now.getTime();
      const isoString = now.toISOString();
      const formatted = now.toLocaleDateString();
      return { timestamp, isoString, formatted };
    }, 10000);

    // Benchmark: Promise handling
    await this.benchmark('Promise Resolution', async () => {
      const promises = Array(10).fill().map((_, i) => 
        new Promise(resolve => setTimeout(() => resolve(i), Math.random() * 5))
      );
      return Promise.all(promises);
    }, 100);

    // Generate summary
    this.generateSummary();
  }

  generateSummary() {
    const benchmarks = this.results.benchmarks;
    const names = Object.keys(benchmarks);
    
    this.results.summary = {
      totalBenchmarks: names.length,
      fastestOperation: names.reduce((fastest, name) => 
        benchmarks[name].mean < benchmarks[fastest].mean ? name : fastest
      ),
      slowestOperation: names.reduce((slowest, name) => 
        benchmarks[name].mean > benchmarks[slowest].mean ? name : slowest
      ),
      highestThroughput: names.reduce((highest, name) => 
        benchmarks[name].opsPerSecond > benchmarks[highest].opsPerSecond ? name : highest
      ),
      totalMemoryDelta: names.reduce((total, name) => 
        total + benchmarks[name].memoryDelta.heapUsed, 0
      )
    };

    console.log('Benchmark Summary');
    console.log('================');
    console.log(`Total benchmarks: ${this.results.summary.totalBenchmarks}`);
    console.log(`Fastest operation: ${this.results.summary.fastestOperation} (${benchmarks[this.results.summary.fastestOperation].mean.toFixed(2)}ms)`);
    console.log(`Slowest operation: ${this.results.summary.slowestOperation} (${benchmarks[this.results.summary.slowestOperation].mean.toFixed(2)}ms)`);
    console.log(`Highest throughput: ${this.results.summary.highestThroughput} (${benchmarks[this.results.summary.highestThroughput].opsPerSecond.toFixed(0)} ops/sec)`);
    console.log(`Total memory delta: ${(this.results.summary.totalMemoryDelta / 1024 / 1024).toFixed(2)}MB`);
  }

  async saveResults() {
    const filename = `benchmark-results-${Date.now()}.json`;
    const filepath = path.join(process.cwd(), filename);
    
    try {
      await fs.writeFile(filepath, JSON.stringify(this.results, null, 2));
      console.log(`\nResults saved to: ${filepath}`);
    } catch (error) {
      console.error('Failed to save results:', error.message);
    }
  }

  async compareWithBaseline(baselineFile) {
    if (!baselineFile) return;

    try {
      const baselineData = JSON.parse(await fs.readFile(baselineFile, 'utf8'));
      const baseline = baselineData.benchmarks;
      const current = this.results.benchmarks;

      console.log('\nComparison with Baseline');
      console.log('========================');

      Object.keys(current).forEach(name => {
        if (baseline[name]) {
          const currentMean = current[name].mean;
          const baselineMean = baseline[name].mean;
          const change = ((currentMean - baselineMean) / baselineMean) * 100;
          const symbol = change > 5 ? '📈' : change < -5 ? '📉' : '➡️';
          
          console.log(`${symbol} ${name}: ${change.toFixed(1)}% ${change > 0 ? 'slower' : 'faster'}`);
        }
      });
    } catch (error) {
      console.log('\nBaseline comparison skipped:', error.message);
    }
  }
}

// Run benchmarks if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const benchmark = new PerformanceBenchmark();
  
  try {
    await benchmark.runAllBenchmarks();
    await benchmark.saveResults();
    await benchmark.compareWithBaseline(process.argv[2]); // Optional baseline file
    
    console.log('\nBenchmark completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Benchmark failed:', error);
    process.exit(1);
  }
}

export default PerformanceBenchmark;