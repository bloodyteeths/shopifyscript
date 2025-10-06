# RLS Quick Reference Guide

## For Developers

### 🔑 Key Concept
Row Level Security (RLS) ensures tenants can only access their own data. **You MUST set tenant context before querying tenant-isolated tables.**

---

## 🚀 Quick Start

### Backend Code (Node.js)

```javascript
import { createClient } from '@supabase/supabase-js';

// Service role client (bypasses RLS - use for admin operations)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// For tenant-isolated queries, set context first
async function getTenantJobs(tenantId) {
  // Set tenant context
  await supabaseAdmin.rpc('set_tenant_context', {
    p_tenant_id: tenantId
  });

  try {
    // Query - will only see tenant's data
    const { data, error } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('state', 'pending');

    return data;
  } finally {
    // Always clear context
    await supabaseAdmin.rpc('clear_tenant_context');
  }
}
```

### SQL Queries

```sql
-- Set context
SELECT set_tenant_context('tenant_12345');

-- Query (only sees tenant_12345's data)
SELECT * FROM jobs WHERE state = 'pending';

-- Clear context
SELECT clear_tenant_context();
```

---

## 📋 Tenant-Isolated Tables

**Always set context before querying these tables:**

- `jobs`, `job_logs`
- `campaign_metrics`, `ad_group_metrics`, `search_terms`
- `tenant_configs`, `tenant_subscriptions`, `tenant_metrics`
- `automation_rules`, `automation_execution_logs`, `bid_adjustment_history`
- `rsa_test_queue`, `rsa_test_actions`
- `security_events`, `security_audit_log`
- All other tables with `tenant_id` column

**Service role only (no tenant_id):**
- `performance_metrics`, `job_alerts`, `worker_metrics`

---

## ✅ Testing

```sql
-- Verify RLS is working
SELECT * FROM verify_rls_enabled();

-- Check current context
SELECT get_tenant_context();

-- Test tenant isolation
SELECT * FROM test_tenant_isolation('jobs', 'tenant_a', 'tenant_b');
```

---

## ⚠️ Common Mistakes

### ❌ DON'T: Query without setting context
```javascript
// WRONG - will return 0 rows or error
const jobs = await supabase.from('jobs').select('*');
```

### ✅ DO: Set context first
```javascript
// CORRECT
await supabase.rpc('set_tenant_context', { p_tenant_id: tenantId });
const jobs = await supabase.from('jobs').select('*');
await supabase.rpc('clear_tenant_context');
```

### ❌ DON'T: Forget to clear context
```javascript
// WRONG - context persists in connection pool
await supabase.rpc('set_tenant_context', { p_tenant_id: 'tenant_a' });
const jobs = await supabase.from('jobs').select('*');
// Forgot to clear - next request might use wrong context!
```

### ✅ DO: Use try/finally
```javascript
// CORRECT - always clears context
try {
  await supabase.rpc('set_tenant_context', { p_tenant_id: tenantId });
  const jobs = await supabase.from('jobs').select('*');
  return jobs;
} finally {
  await supabase.rpc('clear_tenant_context');
}
```

---

## 🛠️ Helper Functions

| Function | Purpose | Example |
|----------|---------|---------|
| `set_tenant_context(tenant_id)` | Set tenant context | `SELECT set_tenant_context('tenant_123');` |
| `clear_tenant_context()` | Clear tenant context | `SELECT clear_tenant_context();` |
| `get_tenant_context()` | Get current context | `SELECT get_tenant_context();` |
| `verify_rls_enabled()` | Check RLS status | `SELECT * FROM verify_rls_enabled();` |
| `test_tenant_isolation(table, t1, t2)` | Test isolation | `SELECT * FROM test_tenant_isolation('jobs', 'a', 'b');` |

---

## 🔒 Security

**✅ Protected:**
- Cross-tenant data access
- SQL injection targeting other tenants
- Application bugs exposing wrong data

**❌ NOT Protected (bypass RLS):**
- Service role key
- Database superuser
- Tables without RLS enabled

**Best Practice:** Use service role key only in backend, never expose to frontend.

---

## 📊 Monitoring

```sql
-- Check for RLS violations
SELECT COUNT(*) FROM security_events
WHERE event_type = 'RLS_POLICY_VIOLATION'
  AND timestamp > NOW() - INTERVAL '1 hour';

-- View recent violations
SELECT * FROM security_events
WHERE event_type = 'RLS_POLICY_VIOLATION'
ORDER BY timestamp DESC
LIMIT 10;
```

---

## 🐛 Debugging

### Issue: Empty result sets

```sql
-- Check context
SELECT get_tenant_context();
-- If NULL or empty, you forgot to set context

-- Check data exists
SELECT DISTINCT tenant_id FROM your_table;
-- Verify tenant_id matches your context
```

### Issue: "Policy violation" errors

```sql
-- Check RLS status
SELECT * FROM verify_rls_enabled() WHERE table_name = 'your_table';
-- Ensure rls_enabled = true and policy_count >= 1
```

### Issue: Can see other tenants' data

```sql
-- Verify RLS is enabled
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Verify policies exist
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

---

## 📚 Documentation

- **Testing Guide**: `RLS_TESTING_GUIDE.md`
- **Implementation Summary**: `RLS_IMPLEMENTATION_SUMMARY.md`
- **Test Scripts**: `RLS_TEST_SCRIPTS.sql`
- **Migration**: `013_comprehensive_rls_policies.sql`

---

## 💡 Pro Tips

1. **Always use service role key in backend** - Never expose it to frontend
2. **Set context per request** - Don't rely on persistent context
3. **Use try/finally blocks** - Ensure context is always cleared
4. **Monitor security events** - Set up alerts for RLS violations
5. **Test tenant isolation** - Run test scripts regularly
6. **Use connection pooling wisely** - Context is connection-specific

---

## 🆘 Need Help?

1. Run verification: `SELECT * FROM verify_rls_enabled();`
2. Check context: `SELECT get_tenant_context();`
3. Review security events for violations
4. Consult full testing guide for comprehensive tests

---

**Last Updated**: Migration 013 - Comprehensive RLS Policies
