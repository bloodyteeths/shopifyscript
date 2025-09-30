# ProofKit SaaS Worker Infrastructure

A robust background worker system with tier-based processing, parallel task execution, and comprehensive monitoring.

## Overview

The worker infrastructure consists of four main components:

1. **Worker Pool Manager** (`services/worker-pool.js`) - Manages tier-based worker allocation and task execution
2. **Queue Manager** (`services/queue-manager.js`) - Handles job queuing, priority, persistence, and retry logic
3. **Job Monitor** (`services/job-monitor.js`) - Provides real-time monitoring, metrics, and alerting
4. **Enhanced Scheduler** (`jobs/scheduler.js`) - Integrates existing scheduling with worker pool capabilities

## Features

### Tier-Based Processing
- **Starter**: 1 worker, 2 concurrent jobs, priority 1, 2 retries
- **Pro**: 5 workers, 10 concurrent jobs, priority 2, 3 retries
- **Enterprise**: 10 workers, 25 concurrent jobs, priority 3, 5 retries

### Job Types Supported
- `optimization` - Performance and resource optimization
- `analysis` - Traffic and data analysis
- `reporting` - Report generation
- `anomaly_detection` - Anomaly detection and alerting
- `weekly_summary` - Weekly summary generation
- `health_check` - System health monitoring

### Priority Levels
- `CRITICAL` (5) - Immediate execution
- `URGENT` (4) - High priority
- `HIGH` (3) - Above normal priority
- `NORMAL` (2) - Default priority
- `LOW` (1) - Background tasks

### Monitoring & Alerting
- Real-time job status tracking
- Performance metrics collection
- Error rate monitoring
- Stuck job detection
- Queue backup alerts
- Performance degradation detection

## Quick Start

### 1. Initialize Database
```javascript
import { initializeDatabase } from './services/database-init.js';
await initializeDatabase();
```

### 2. Start Enhanced Scheduler
```javascript
import { jobScheduler } from './jobs/scheduler.js';

// Add tenants
jobScheduler.addTenant('tenant_pro_1');
jobScheduler.addTenant('tenant_enterprise_1');

// Start scheduler with worker pool integration
await jobScheduler.start();
```

### 3. Queue Custom Jobs
```javascript
// Queue a high-priority optimization job
const job = await jobScheduler.queueJob({
  type: 'optimization',
  tenantId: 'tenant_pro_1',
  data: {
    type: 'performance',
    metrics: ['page_speed', 'bundle_size']
  },
  priority: JOB_PRIORITIES.HIGH,
  metadata: { source: 'manual_trigger' }
});

console.log(`Job queued: ${job.id}`);
```

### 4. Monitor Status
```javascript
// Get comprehensive status
const status = jobScheduler.getStatus();
console.log('Worker Pool:', status.workerPool);
console.log('Queue Manager:', status.queueManager);
console.log('Job Monitor:', status.jobMonitor);
```

## Integration Points

### Existing Services
The worker infrastructure integrates with:
- `services/supabase-client.js` - Database operations and connection pooling
- `services/logger.js` - Comprehensive logging and observability
- `services/anomaly-detection.js` - Anomaly detection execution
- `jobs/weekly_summary.js` - Weekly summary generation

### Database Tables
The system creates and manages:
- `jobs` - Job persistence and state tracking
- `job_logs` - Detailed job execution history
- `performance_metrics` - System performance data
- `job_alerts` - Alert and notification history
- `tenant_subscriptions` - Tenant tier management
- `worker_metrics` - Worker performance tracking

## Configuration

Environment variables:
```bash
# Worker Pool Configuration
USE_WORKER_POOL=true
MAX_CONCURRENT_JOBS=50
ENABLE_JOB_PERSISTENCE=true

# Supabase Configuration (required)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
SUPABASE_ENABLED=true

# Logging Configuration
LOG_LEVEL=info
NODE_ENV=production
```

## Testing

Run the comprehensive test suite:
```bash
node test-worker-infrastructure.js
```

This will:
- Initialize the complete worker infrastructure
- Generate jobs for all tiers (Starter: 5, Pro: 15, Enterprise: 30)
- Execute jobs through the worker pool
- Monitor performance and collect metrics
- Generate a detailed performance report

### Sample Test Output
```
=== WORKER INFRASTRUCTURE TEST RESULTS ===

Summary:
  Duration: 45s
  Total Jobs: 50
  Completed: 48
  Failed: 2
  Success Rate: 96.00%
  Avg Processing Time: 2340ms
  Jobs/Second: 1.07

Recommendations:
  - System performance is optimal
```

## Health Monitoring

### Health Check Endpoint
```javascript
const health = await jobScheduler.workerPool.healthCheck();
console.log(health);
```

### Metrics Collection
The system automatically collects:
- Job throughput (jobs/minute)
- Error rates by tier and type
- Average processing times
- Queue sizes and backlog
- Worker utilization rates

### Alerting
Automatic alerts for:
- Jobs stuck for >5 minutes
- Error rate >10%
- Queue backup >100 jobs
- 2x processing time increase

## Performance Optimization

### Worker Scaling
Workers are automatically allocated based on tenant tier. Additional workers can be created on-demand when queues build up.

### Queue Management
- Priority-based job execution
- Exponential backoff retry logic
- Dead letter queue for failed jobs
- Dependency resolution

### Database Optimization
- Indexed queries for fast job lookup
- Automatic cleanup of old logs
- Connection pooling for high throughput
- Batch operations for efficiency

## Production Deployment

### Dependencies
- Node.js 18+
- Supabase database
- Redis (optional, for enhanced queue persistence)

### Scaling Considerations
- Monitor worker utilization per tier
- Adjust `maxWorkers` based on load patterns
- Implement database partitioning for high-volume tenants
- Consider worker pool distribution across multiple instances

### Monitoring & Observability
- Integrate with existing logging infrastructure
- Set up alerts for critical failures
- Monitor database performance impact
- Track tenant-specific metrics

## Troubleshooting

### Common Issues

**Jobs not processing:**
- Check `queueManager.isProcessing` status
- Verify database connectivity
- Review worker pool health

**High error rates:**
- Check job execution logs
- Verify external service dependencies
- Review retry configuration

**Performance degradation:**
- Monitor database connection pool
- Check worker resource utilization
- Review job complexity and duration

### Debug Mode
Enable detailed logging:
```bash
LOG_LEVEL=debug node your-app.js
```

## Future Enhancements

- Redis-based queue persistence for better scalability
- Cross-instance worker coordination
- Dynamic worker scaling based on load
- Advanced job scheduling with cron expressions
- Webhook notifications for job completion
- GraphQL subscriptions for real-time monitoring