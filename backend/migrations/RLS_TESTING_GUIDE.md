# Row Level Security (RLS) Testing Guide

## Overview

This guide explains how to test and verify that Row Level Security policies are properly enforced across all tenant-isolated tables in the Ads Autopilot AI system.

## Tables Protected by RLS

### Queue and Job Management Tables
- `jobs` - Job queue entries
- `job_logs` - Job execution logs
- `performance_metrics` - System performance metrics (service role only)
- `job_alerts` - System alerts (service role only)
- `worker_metrics` - Worker pool metrics (service role only)

### Metrics and Analytics Tables
- `campaign_metrics` - Campaign-level performance data
- `ad_group_metrics` - Ad group-level performance data
- `search_terms` - Search terms analysis data
- `tenant_metrics` - Tenant-specific metrics
- `performance_metrics` - Performance tracking

### Configuration and Management Tables
- `tenant_configs` - Tenant configurations
- `tenant_subscriptions` - Subscription data
- `campaign_configs` - Campaign-specific settings
- `rsa_assets` - RSA ad assets

### Automation Tables
- `automation_rules` - Automation rule definitions
- `custom_bid_strategies` - Custom bidding strategies
- `automation_execution_logs` - Automation execution history
- `bid_adjustment_history` - Bid adjustment audit trail
- `automation_performance_metrics` - Automation effectiveness metrics
- `automation_alerts` - Automation-generated alerts

### Testing and Experiment Tables
- `rsa_test_queue` - RSA A/B test queue
- `rsa_test_performance_history` - Test performance snapshots
- `rsa_test_actions` - Test-triggered actions

### Security and Audit Tables
- `security_events` - Security event logs
- `security_audit_log` - Comprehensive audit trail
- `tenant_security_settings` - Per-tenant security configuration

### Logging Tables
- `run_logs` - General execution logs

## RLS Policy Structure

Each tenant-isolated table has two types of policies:

### 1. Tenant Isolation Policy
```sql
CREATE POLICY {table_name}_tenant_isolation ON {table_name}
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));
```

**Purpose**: Ensures users can only access data belonging to their tenant.

### 2. Service Role Bypass Policy
```sql
CREATE POLICY {table_name}_service_role_bypass ON {table_name}
  FOR ALL
  USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
```

**Purpose**: Allows backend services with service role key to bypass RLS for administrative operations.

## Setting Tenant Context

Before querying tenant-isolated tables, you MUST set the tenant context:

### Using Helper Function (Recommended)
```sql
-- Set tenant context
SELECT set_tenant_context('tenant_12345');

-- Perform queries (will only see tenant_12345's data)
SELECT * FROM jobs;
SELECT * FROM campaign_metrics;

-- Clear context when done
SELECT clear_tenant_context();
```

### Using Direct SET Command
```sql
-- Set tenant context
SET app.current_tenant_id = 'tenant_12345';

-- Perform queries
SELECT * FROM jobs WHERE state = 'pending';

-- Clear context
RESET app.current_tenant_id;
```

## Testing RLS Policies

### 1. Automated Verification

Run the built-in verification function to check RLS status:

```sql
-- Verify RLS is enabled on all tables
SELECT * FROM verify_rls_enabled();
```

**Expected Output:**
```
table_name                    | rls_enabled | policy_count
------------------------------|-------------|-------------
jobs                          | true        | 2
job_logs                      | true        | 2
campaign_metrics              | true        | 2
tenant_configs                | true        | 2
...
```

All tables should have:
- `rls_enabled = true`
- `policy_count >= 1` (typically 2: tenant isolation + service role bypass)

### 2. Test Tenant Isolation

Use the built-in test function to verify tenant isolation:

```sql
-- Test isolation between two tenants on the jobs table
SELECT * FROM test_tenant_isolation(
  'jobs',           -- table name
  'tenant_alice',   -- tenant 1
  'tenant_bob'      -- tenant 2
);
```

**Expected Output:**
```
test_name                              | passed | details
---------------------------------------|--------|----------------------------------
Tenant 1 can see own records          | true   | Tenant 1 sees 5 records
Tenant 2 can see own records          | true   | Tenant 2 sees 3 records
Tenant 2 cannot see Tenant 1 records  | true   | Tenant 2 sees 0 records from Tenant 1
```

### 3. Manual Testing Script

```sql
-- ============================================================================
-- MANUAL RLS TESTING SCRIPT
-- ============================================================================

-- Step 1: Create test data for two tenants
BEGIN;

-- Insert jobs for tenant_alice
SELECT set_tenant_context('tenant_alice');
INSERT INTO jobs (id, type, tenant_id, state, data)
VALUES
  ('job_alice_1', 'generate_ads', 'tenant_alice', 'pending', '{"campaign": "summer"}'),
  ('job_alice_2', 'optimize_bids', 'tenant_alice', 'completed', '{"target_roas": 4.5}');

-- Insert jobs for tenant_bob
SELECT set_tenant_context('tenant_bob');
INSERT INTO jobs (id, type, tenant_id, state, data)
VALUES
  ('job_bob_1', 'generate_ads', 'tenant_bob', 'pending', '{"campaign": "winter"}'),
  ('job_bob_2', 'analyze_keywords', 'tenant_bob', 'running', '{"keywords": 100}');

COMMIT;

-- Step 2: Test tenant isolation

-- Alice should only see her jobs (2 records)
SELECT set_tenant_context('tenant_alice');
SELECT id, type, tenant_id, state FROM jobs;
-- Expected: 2 rows (job_alice_1, job_alice_2)

-- Bob should only see his jobs (2 records)
SELECT set_tenant_context('tenant_bob');
SELECT id, type, tenant_id, state FROM jobs;
-- Expected: 2 rows (job_bob_1, job_bob_2)

-- Step 3: Test cross-tenant access prevention

-- While in Bob's context, try to query Alice's data
SELECT set_tenant_context('tenant_bob');
SELECT COUNT(*) FROM jobs WHERE tenant_id = 'tenant_alice';
-- Expected: 0 (RLS prevents seeing Alice's data)

-- Step 4: Test INSERT protection

-- While in Bob's context, try to insert data for Alice
SELECT set_tenant_context('tenant_bob');
INSERT INTO jobs (id, type, tenant_id, state)
VALUES ('job_alice_3', 'test', 'tenant_alice', 'pending');
-- Expected: ERROR - RLS policy violation (WITH CHECK constraint)

-- Step 5: Test UPDATE protection

-- While in Bob's context, try to update Alice's job
SELECT set_tenant_context('tenant_bob');
UPDATE jobs SET state = 'cancelled' WHERE id = 'job_alice_1';
-- Expected: 0 rows affected (RLS prevents access)

-- Step 6: Test DELETE protection

-- While in Bob's context, try to delete Alice's job
SELECT set_tenant_context('tenant_bob');
DELETE FROM jobs WHERE id = 'job_alice_1';
-- Expected: 0 rows affected (RLS prevents access)

-- Step 7: Clean up test data
SELECT clear_tenant_context();
DELETE FROM jobs WHERE id LIKE 'job_alice_%' OR id LIKE 'job_bob_%';

-- Step 8: Verify cleanup
SELECT COUNT(*) FROM jobs WHERE id LIKE 'job_alice_%' OR id LIKE 'job_bob_%';
-- Expected: 0
```

### 4. Service Role Testing

```sql
-- Test that service role can bypass RLS

-- Set context as service role (simulated - in practice this comes from JWT)
SET request.jwt.claims = '{"role": "service_role"}';

-- Service role should see ALL jobs regardless of tenant
SELECT tenant_id, COUNT(*) as job_count
FROM jobs
GROUP BY tenant_id
ORDER BY tenant_id;
-- Expected: All tenants' jobs visible

-- Clean up
RESET request.jwt.claims;
```

## Production Testing Checklist

Before deploying to production, verify:

- [ ] All sensitive tables have RLS enabled (`verify_rls_enabled()`)
- [ ] Tenant isolation works for SELECT operations
- [ ] Tenant isolation works for INSERT operations (WITH CHECK)
- [ ] Tenant isolation works for UPDATE operations
- [ ] Tenant isolation works for DELETE operations
- [ ] Service role can bypass RLS when needed
- [ ] No RLS policy violations logged in `security_events`
- [ ] Application code properly sets `app.current_tenant_id` before queries
- [ ] Connection pooling properly handles tenant context switching

## Common Issues and Solutions

### Issue 1: "no row-level security policy" Error

**Problem**: Query fails with RLS error even though policy exists.

**Solution**: Ensure tenant context is set:
```sql
SELECT set_tenant_context('your_tenant_id');
```

### Issue 2: Empty Result Sets

**Problem**: Query returns no rows even though data exists.

**Solution**:
1. Verify tenant context is set correctly
2. Check that `tenant_id` in data matches context:
```sql
SELECT get_tenant_context(); -- Check current context
SELECT DISTINCT tenant_id FROM your_table; -- Check available tenants
```

### Issue 3: Cross-Tenant Data Visible

**Problem**: Users can see other tenants' data.

**Solution**:
1. Verify RLS is enabled on the table
2. Check that policies are correctly defined
3. Ensure `tenant_id` column exists and is populated
```sql
SELECT * FROM verify_rls_enabled() WHERE table_name = 'your_table';
```

### Issue 4: Service Role Cannot Access Data

**Problem**: Backend service gets permission errors.

**Solution**: Ensure JWT contains service_role claim:
```javascript
// In Supabase client initialization
const supabase = createClient(url, SERVICE_ROLE_KEY); // Use service role key
```

### Issue 5: Connection Pool Issues

**Problem**: Tenant context bleeds across requests in connection pools.

**Solution**: Always set context at the start of each transaction:
```javascript
// In your backend code
async function withTenantContext(tenantId, callback) {
  await supabase.rpc('set_tenant_context', { p_tenant_id: tenantId });
  try {
    return await callback();
  } finally {
    await supabase.rpc('clear_tenant_context');
  }
}
```

## Security Event Monitoring

Monitor RLS violations and security events:

```sql
-- Check for RLS policy violations in the last 24 hours
SELECT
  event_id,
  tenant_id,
  threat_description,
  table_name,
  operation,
  timestamp
FROM security_events
WHERE event_type = 'RLS_POLICY_VIOLATION'
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

## Performance Considerations

### RLS Performance Impact

RLS adds a WHERE clause to every query, which can impact performance:

1. **Ensure indexes exist on tenant_id columns**
   ```sql
   CREATE INDEX idx_table_tenant_id ON table_name(tenant_id);
   ```

2. **Use covering indexes when possible**
   ```sql
   CREATE INDEX idx_jobs_tenant_state ON jobs(tenant_id, state) INCLUDE (created_at);
   ```

3. **Monitor query performance**
   ```sql
   -- Enable query timing
   EXPLAIN ANALYZE
   SELECT * FROM jobs WHERE state = 'pending';
   ```

### Best Practices

1. **Always set tenant context once per request/transaction**
   - Avoid setting it multiple times
   - Use connection pooling wisely

2. **Use service role key for backend operations**
   - Bypasses RLS overhead
   - Provides full access for administrative tasks

3. **Batch operations when possible**
   - RLS is evaluated per row
   - Batch inserts/updates are more efficient

4. **Monitor slow queries**
   - Use `pg_stat_statements` extension
   - Look for missing indexes on tenant_id

## Integration with Application Code

### Node.js/JavaScript Example

```javascript
import { createClient } from '@supabase/supabase-js';

// Service role client (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// User client (enforces RLS)
const supabaseUser = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Set tenant context for user operations
async function executeWithTenantContext(tenantId, operation) {
  // Set context
  await supabaseUser.rpc('set_tenant_context', {
    p_tenant_id: tenantId
  });

  try {
    // Execute operation
    const result = await operation(supabaseUser);
    return result;
  } finally {
    // Always clear context
    await supabaseUser.rpc('clear_tenant_context');
  }
}

// Usage example
const jobs = await executeWithTenantContext('tenant_123', async (client) => {
  const { data, error } = await client
    .from('jobs')
    .select('*')
    .eq('state', 'pending');

  if (error) throw error;
  return data;
});
```

### Python Example

```python
from supabase import create_client

# Service role client
supabase_admin = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)

# User client
supabase_user = create_client(
    os.getenv('SUPABASE_URL'),
    os.getenv('SUPABASE_ANON_KEY')
)

# Context manager for tenant isolation
class TenantContext:
    def __init__(self, client, tenant_id):
        self.client = client
        self.tenant_id = tenant_id

    def __enter__(self):
        self.client.rpc('set_tenant_context', {
            'p_tenant_id': self.tenant_id
        }).execute()
        return self.client

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.client.rpc('clear_tenant_context').execute()

# Usage
with TenantContext(supabase_user, 'tenant_123') as client:
    jobs = client.table('jobs') \
        .select('*') \
        .eq('state', 'pending') \
        .execute()
```

## Audit and Compliance

### Data Access Logging

All tenant access is logged in `security_audit_log`:

```sql
-- Query access logs for a specific tenant
SELECT
  timestamp,
  user_id,
  action_type,
  resource_type,
  resource_id,
  ip_address
FROM security_audit_log
WHERE tenant_id = 'your_tenant_id'
  AND timestamp > NOW() - INTERVAL '30 days'
ORDER BY timestamp DESC
LIMIT 100;
```

### Compliance Reports

Generate compliance reports showing tenant isolation:

```sql
-- Report: Verify no cross-tenant access in last 30 days
SELECT
  'Cross-Tenant Access Attempts' as report_type,
  COUNT(*) as incident_count,
  MIN(timestamp) as first_incident,
  MAX(timestamp) as last_incident
FROM security_events
WHERE event_type = 'RLS_POLICY_VIOLATION'
  AND timestamp > NOW() - INTERVAL '30 days';
```

## Support and Troubleshooting

For issues with RLS policies:

1. Run verification: `SELECT * FROM verify_rls_enabled();`
2. Check tenant context: `SELECT get_tenant_context();`
3. Review security events for violations
4. Verify table has `tenant_id` column populated
5. Ensure application uses correct Supabase client (service vs. user)

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- Migration file: `backend/migrations/013_comprehensive_rls_policies.sql`
