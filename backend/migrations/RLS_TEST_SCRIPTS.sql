-- ============================================================================
-- RLS COMPREHENSIVE TEST SCRIPTS
-- ============================================================================
-- Purpose: Test Row Level Security policies for all tenant-isolated tables
-- Usage: Run these tests after applying migration 013_comprehensive_rls_policies.sql
-- ============================================================================

-- ============================================================================
-- SECTION 1: SETUP AND VERIFICATION
-- ============================================================================

-- Verify RLS is enabled on all tables
SELECT '=== RLS STATUS VERIFICATION ===' AS test_section;
SELECT * FROM verify_rls_enabled()
ORDER BY table_name;

-- Expected: All tables should have rls_enabled = true and policy_count >= 1

-- ============================================================================
-- SECTION 2: CREATE TEST DATA
-- ============================================================================

SELECT '=== CREATING TEST DATA ===' AS test_section;

-- Clean up any existing test data first
DELETE FROM jobs WHERE id LIKE 'test_rls_%';
DELETE FROM job_logs WHERE job_id LIKE 'test_rls_%';
DELETE FROM campaign_metrics WHERE tenant_id LIKE 'test_tenant_%';
DELETE FROM ad_group_metrics WHERE tenant_id LIKE 'test_tenant_%';
DELETE FROM automation_execution_logs WHERE automation_id LIKE 'test_rls_%';

-- Create test tenants in tenant_subscriptions if not exist
INSERT INTO tenant_subscriptions (tenant_id, tier, status, shop_domain)
VALUES
  ('test_tenant_alice', 'pro', 'active', 'alice-shop.myshopify.com'),
  ('test_tenant_bob', 'enterprise', 'active', 'bob-shop.myshopify.com'),
  ('test_tenant_charlie', 'starter', 'active', 'charlie-shop.myshopify.com')
ON CONFLICT (tenant_id) DO NOTHING;

-- ============================================================================
-- SECTION 3: TEST JOBS TABLE ISOLATION
-- ============================================================================

SELECT '=== TESTING JOBS TABLE ISOLATION ===' AS test_section;

-- Set context to Alice
SELECT set_tenant_context('test_tenant_alice');

-- Insert jobs for Alice
INSERT INTO jobs (id, type, tenant_id, state, data, priority)
VALUES
  ('test_rls_job_alice_1', 'generate_ads', 'test_tenant_alice', 'pending', '{"campaign": "summer"}', 1),
  ('test_rls_job_alice_2', 'optimize_bids', 'test_tenant_alice', 'completed', '{"target_roas": 4.5}', 2),
  ('test_rls_job_alice_3', 'analyze_keywords', 'test_tenant_alice', 'running', '{"keywords": 100}', 1);

SELECT 'Alice inserted 3 jobs' AS status;

-- Set context to Bob
SELECT set_tenant_context('test_tenant_bob');

-- Insert jobs for Bob
INSERT INTO jobs (id, type, tenant_id, state, data, priority)
VALUES
  ('test_rls_job_bob_1', 'generate_ads', 'test_tenant_bob', 'pending', '{"campaign": "winter"}', 1),
  ('test_rls_job_bob_2', 'analyze_keywords', 'test_tenant_bob', 'running', '{"keywords": 50}', 2);

SELECT 'Bob inserted 2 jobs' AS status;

-- Test 1: Alice should only see her 3 jobs
SELECT set_tenant_context('test_tenant_alice');
SELECT
  'Alice SELECT test' AS test_name,
  COUNT(*) = 3 AS passed,
  COUNT(*) AS actual_count,
  3 AS expected_count
FROM jobs
WHERE id LIKE 'test_rls_job_%';

-- Test 2: Bob should only see his 2 jobs
SELECT set_tenant_context('test_tenant_bob');
SELECT
  'Bob SELECT test' AS test_name,
  COUNT(*) = 2 AS passed,
  COUNT(*) AS actual_count,
  2 AS expected_count
FROM jobs
WHERE id LIKE 'test_rls_job_%';

-- Test 3: Bob should NOT see Alice's jobs
SELECT set_tenant_context('test_tenant_bob');
SELECT
  'Bob cannot see Alice jobs test' AS test_name,
  COUNT(*) = 0 AS passed,
  COUNT(*) AS actual_count,
  0 AS expected_count
FROM jobs
WHERE tenant_id = 'test_tenant_alice';

-- Test 4: Try to INSERT job for Alice while in Bob's context (should fail)
SELECT set_tenant_context('test_tenant_bob');
DO $$
BEGIN
  BEGIN
    INSERT INTO jobs (id, type, tenant_id, state)
    VALUES ('test_rls_job_alice_4', 'test', 'test_tenant_alice', 'pending');
    RAISE NOTICE 'TEST FAILED: Bob was able to insert job for Alice!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST PASSED: Bob cannot insert job for Alice (expected behavior)';
  END;
END $$;

-- Test 5: Try to UPDATE Alice's job from Bob's context (should affect 0 rows)
SELECT set_tenant_context('test_tenant_bob');
UPDATE jobs SET state = 'cancelled' WHERE id = 'test_rls_job_alice_1';
SELECT
  'Bob cannot UPDATE Alice jobs test' AS test_name,
  (SELECT COUNT(*) = 0 FROM jobs WHERE id = 'test_rls_job_alice_1' AND state = 'cancelled') AS passed,
  'Job should not be cancelled' AS expected;

-- Test 6: Try to DELETE Alice's job from Bob's context (should affect 0 rows)
SELECT set_tenant_context('test_tenant_bob');
DELETE FROM jobs WHERE id = 'test_rls_job_alice_1';
SELECT
  'Bob cannot DELETE Alice jobs test' AS test_name,
  (SELECT COUNT(*) = 1 FROM jobs WHERE id = 'test_rls_job_alice_1') AS passed,
  'Job should still exist' AS expected;

-- ============================================================================
-- SECTION 4: TEST JOB_LOGS TABLE ISOLATION
-- ============================================================================

SELECT '=== TESTING JOB_LOGS TABLE ISOLATION ===' AS test_section;

-- Set context to Alice and insert logs
SELECT set_tenant_context('test_tenant_alice');
INSERT INTO job_logs (job_id, tenant_id, type, state, started_at, duration)
VALUES
  ('test_rls_job_alice_1', 'test_tenant_alice', 'generate_ads', 'completed', NOW(), 5000),
  ('test_rls_job_alice_2', 'test_tenant_alice', 'optimize_bids', 'completed', NOW(), 3000);

-- Set context to Bob and insert logs
SELECT set_tenant_context('test_tenant_bob');
INSERT INTO job_logs (job_id, tenant_id, type, state, started_at, duration)
VALUES
  ('test_rls_job_bob_1', 'test_tenant_bob', 'generate_ads', 'running', NOW(), NULL);

-- Test: Alice should only see her logs
SELECT set_tenant_context('test_tenant_alice');
SELECT
  'Alice job_logs SELECT test' AS test_name,
  COUNT(*) = 2 AS passed,
  COUNT(*) AS actual_count
FROM job_logs
WHERE job_id LIKE 'test_rls_job_%';

-- Test: Bob should only see his logs
SELECT set_tenant_context('test_tenant_bob');
SELECT
  'Bob job_logs SELECT test' AS test_name,
  COUNT(*) = 1 AS passed,
  COUNT(*) AS actual_count
FROM job_logs
WHERE job_id LIKE 'test_rls_job_%';

-- ============================================================================
-- SECTION 5: TEST CAMPAIGN_METRICS TABLE ISOLATION
-- ============================================================================

SELECT '=== TESTING CAMPAIGN_METRICS TABLE ISOLATION ===' AS test_section;

-- Set context to Alice and insert metrics
SELECT set_tenant_context('test_tenant_alice');
INSERT INTO campaign_metrics (tenant_id, campaign_id, campaign_name, date, clicks, cost, conversions)
VALUES
  ('test_tenant_alice', 'camp_alice_1', 'Summer Campaign', '2024-01-01', 100, 50.00, 5),
  ('test_tenant_alice', 'camp_alice_2', 'Fall Campaign', '2024-01-01', 200, 75.00, 8);

-- Set context to Bob and insert metrics
SELECT set_tenant_context('test_tenant_bob');
INSERT INTO campaign_metrics (tenant_id, campaign_id, campaign_name, date, clicks, cost, conversions)
VALUES
  ('test_tenant_bob', 'camp_bob_1', 'Winter Campaign', '2024-01-01', 150, 60.00, 6);

-- Test: Alice should only see her metrics
SELECT set_tenant_context('test_tenant_alice');
SELECT
  'Alice campaign_metrics SELECT test' AS test_name,
  COUNT(*) = 2 AS passed,
  COUNT(*) AS actual_count
FROM campaign_metrics
WHERE campaign_id LIKE 'camp_%';

-- Test: Bob should only see his metrics
SELECT set_tenant_context('test_tenant_bob');
SELECT
  'Bob campaign_metrics SELECT test' AS test_name,
  COUNT(*) = 1 AS passed,
  COUNT(*) AS actual_count
FROM campaign_metrics
WHERE campaign_id LIKE 'camp_%';

-- ============================================================================
-- SECTION 6: TEST AD_GROUP_METRICS TABLE ISOLATION
-- ============================================================================

SELECT '=== TESTING AD_GROUP_METRICS TABLE ISOLATION ===' AS test_section;

-- Set context to Alice and insert metrics
SELECT set_tenant_context('test_tenant_alice');
INSERT INTO ad_group_metrics (tenant_id, campaign_name, ad_group_id, ad_group_name, date, clicks, cost)
VALUES
  ('test_tenant_alice', 'Summer Campaign', 'ag_alice_1', 'Ad Group 1', '2024-01-01', 50, 25.00);

-- Set context to Bob and insert metrics
SELECT set_tenant_context('test_tenant_bob');
INSERT INTO ad_group_metrics (tenant_id, campaign_name, ad_group_id, ad_group_name, date, clicks, cost)
VALUES
  ('test_tenant_bob', 'Winter Campaign', 'ag_bob_1', 'Ad Group 1', '2024-01-01', 75, 35.00);

-- Test: Alice should only see her metrics
SELECT set_tenant_context('test_tenant_alice');
SELECT
  'Alice ad_group_metrics SELECT test' AS test_name,
  COUNT(*) = 1 AS passed,
  COUNT(*) AS actual_count
FROM ad_group_metrics
WHERE ad_group_id LIKE 'ag_%';

-- ============================================================================
-- SECTION 7: TEST AUTOMATION_EXECUTION_LOGS TABLE ISOLATION
-- ============================================================================

SELECT '=== TESTING AUTOMATION_EXECUTION_LOGS TABLE ISOLATION ===' AS test_section;

-- Set context to Alice and insert logs
SELECT set_tenant_context('test_tenant_alice');
INSERT INTO automation_execution_logs (tenant_id, automation_id, automation_type, activity_type, execution_status, metadata)
VALUES
  ('test_tenant_alice', 'test_rls_auto_1', 'bid_optimization', 'executed', 'completed', '{"optimized": 10}'),
  ('test_tenant_alice', 'test_rls_auto_2', 'budget_allocation', 'executed', 'completed', '{"reallocated": 5}');

-- Set context to Bob and insert logs
SELECT set_tenant_context('test_tenant_bob');
INSERT INTO automation_execution_logs (tenant_id, automation_id, automation_type, activity_type, execution_status, metadata)
VALUES
  ('test_tenant_bob', 'test_rls_auto_3', 'keyword_expansion', 'executed', 'running', '{"expanded": 20}');

-- Test: Automated isolation test
SELECT * FROM test_tenant_isolation(
  'automation_execution_logs',
  'test_tenant_alice',
  'test_tenant_bob'
);

-- ============================================================================
-- SECTION 8: TEST SERVICE ROLE BYPASS
-- ============================================================================

SELECT '=== TESTING SERVICE ROLE BYPASS ===' AS test_section;

-- Simulate service role context
-- Note: In actual usage, this comes from JWT. Here we test the mechanism.
-- You would need to actually use service role key in real tests.

SELECT
  'Service role bypass test' AS test_name,
  'This test requires actual service role JWT - see documentation' AS status,
  'Use Supabase client with SERVICE_ROLE_KEY to test' AS instructions;

-- In actual backend code with service role:
-- const supabaseAdmin = createClient(url, SERVICE_ROLE_KEY);
-- const { data } = await supabaseAdmin.from('jobs').select('*'); // Sees all jobs

-- ============================================================================
-- SECTION 9: TEST HELPER FUNCTIONS
-- ============================================================================

SELECT '=== TESTING HELPER FUNCTIONS ===' AS test_section;

-- Test set_tenant_context and get_tenant_context
SELECT set_tenant_context('test_tenant_alice');
SELECT
  'get_tenant_context test' AS test_name,
  get_tenant_context() = 'test_tenant_alice' AS passed,
  get_tenant_context() AS actual_value,
  'test_tenant_alice' AS expected_value;

-- Test clear_tenant_context
SELECT clear_tenant_context();
SELECT
  'clear_tenant_context test' AS test_name,
  get_tenant_context() IS NULL OR get_tenant_context() = '' AS passed,
  get_tenant_context() AS actual_value,
  'NULL or empty' AS expected_value;

-- ============================================================================
-- SECTION 10: CROSS-TABLE TENANT CONSISTENCY TESTS
-- ============================================================================

SELECT '=== TESTING CROSS-TABLE CONSISTENCY ===' AS test_section;

-- Set context to Alice
SELECT set_tenant_context('test_tenant_alice');

-- Test: Count records across multiple tables for Alice
WITH alice_data AS (
  SELECT
    (SELECT COUNT(*) FROM jobs WHERE id LIKE 'test_rls_%') AS jobs_count,
    (SELECT COUNT(*) FROM job_logs WHERE job_id LIKE 'test_rls_%') AS logs_count,
    (SELECT COUNT(*) FROM campaign_metrics WHERE campaign_id LIKE 'camp_%') AS metrics_count
)
SELECT
  'Alice cross-table consistency test' AS test_name,
  jobs_count = 3 AND logs_count = 2 AND metrics_count = 2 AS passed,
  jobs_count AS jobs_count,
  logs_count AS logs_count,
  metrics_count AS metrics_count
FROM alice_data;

-- Set context to Bob
SELECT set_tenant_context('test_tenant_bob');

-- Test: Count records across multiple tables for Bob
WITH bob_data AS (
  SELECT
    (SELECT COUNT(*) FROM jobs WHERE id LIKE 'test_rls_%') AS jobs_count,
    (SELECT COUNT(*) FROM job_logs WHERE job_id LIKE 'test_rls_%') AS logs_count,
    (SELECT COUNT(*) FROM campaign_metrics WHERE campaign_id LIKE 'camp_%') AS metrics_count
)
SELECT
  'Bob cross-table consistency test' AS test_name,
  jobs_count = 2 AND logs_count = 1 AND metrics_count = 1 AS passed,
  jobs_count AS jobs_count,
  logs_count AS logs_count,
  metrics_count AS metrics_count
FROM bob_data;

-- ============================================================================
-- SECTION 11: SECURITY EVENT MONITORING
-- ============================================================================

SELECT '=== CHECKING SECURITY EVENTS ===' AS test_section;

-- Check for any RLS violations during testing
SELECT
  COUNT(*) AS violation_count,
  CASE WHEN COUNT(*) = 0 THEN 'PASSED' ELSE 'FAILED' END AS status,
  'No RLS violations should have occurred' AS expected
FROM security_events
WHERE event_type = 'RLS_POLICY_VIOLATION'
  AND timestamp > NOW() - INTERVAL '10 minutes';

-- Show recent security events (if any)
SELECT
  event_type,
  risk_level,
  threat_description,
  table_name,
  operation,
  timestamp
FROM security_events
WHERE timestamp > NOW() - INTERVAL '10 minutes'
ORDER BY timestamp DESC
LIMIT 10;

-- ============================================================================
-- SECTION 12: PERFORMANCE BASELINE
-- ============================================================================

SELECT '=== PERFORMANCE BASELINE ===' AS test_section;

-- Test query performance with RLS
SELECT set_tenant_context('test_tenant_alice');

EXPLAIN ANALYZE
SELECT * FROM jobs
WHERE state = 'pending'
  AND id LIKE 'test_rls_%';

-- Note: Review the EXPLAIN output to ensure:
-- 1. Index on tenant_id is being used
-- 2. Query plan is efficient
-- 3. No full table scans

-- ============================================================================
-- SECTION 13: EDGE CASES
-- ============================================================================

SELECT '=== TESTING EDGE CASES ===' AS test_section;

-- Test 1: Query without tenant context set (should return empty)
SELECT clear_tenant_context();
SELECT
  'Query without context test' AS test_name,
  COUNT(*) = 0 AS passed,
  COUNT(*) AS actual_count,
  'Should return 0 rows when no context set' AS expected
FROM jobs
WHERE id LIKE 'test_rls_%';

-- Test 2: Try to set context to non-existent tenant
DO $$
BEGIN
  BEGIN
    PERFORM set_tenant_context('non_existent_tenant_xyz');
    -- Query with invalid tenant should return 0 rows
    IF (SELECT COUNT(*) FROM jobs WHERE id LIKE 'test_rls_%') = 0 THEN
      RAISE NOTICE 'TEST PASSED: Non-existent tenant returns 0 rows';
    ELSE
      RAISE NOTICE 'TEST FAILED: Non-existent tenant should return 0 rows';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST FAILED: Error with non-existent tenant: %', SQLERRM;
  END;
END $$;

-- Test 3: Context switching between multiple tenants
SELECT set_tenant_context('test_tenant_alice');
SELECT 'Alice context' AS step, COUNT(*) AS job_count FROM jobs WHERE id LIKE 'test_rls_%';

SELECT set_tenant_context('test_tenant_bob');
SELECT 'Bob context' AS step, COUNT(*) AS job_count FROM jobs WHERE id LIKE 'test_rls_%';

SELECT set_tenant_context('test_tenant_alice');
SELECT 'Back to Alice context' AS step, COUNT(*) AS job_count FROM jobs WHERE id LIKE 'test_rls_%';

-- ============================================================================
-- SECTION 14: CLEANUP TEST DATA
-- ============================================================================

SELECT '=== CLEANING UP TEST DATA ===' AS test_section;

-- Clear context before cleanup
SELECT clear_tenant_context();

-- Note: Cleanup requires service role or direct superuser access
-- In production testing, use service role client

-- For manual cleanup, set context for each tenant and delete
SELECT set_tenant_context('test_tenant_alice');
DELETE FROM job_logs WHERE job_id LIKE 'test_rls_%';
DELETE FROM jobs WHERE id LIKE 'test_rls_%';
DELETE FROM campaign_metrics WHERE campaign_id LIKE 'camp_%';
DELETE FROM ad_group_metrics WHERE ad_group_id LIKE 'ag_%';
DELETE FROM automation_execution_logs WHERE automation_id LIKE 'test_rls_%';

SELECT set_tenant_context('test_tenant_bob');
DELETE FROM job_logs WHERE job_id LIKE 'test_rls_%';
DELETE FROM jobs WHERE id LIKE 'test_rls_%';
DELETE FROM campaign_metrics WHERE campaign_id LIKE 'camp_%';
DELETE FROM ad_group_metrics WHERE ad_group_id LIKE 'ag_%';
DELETE FROM automation_execution_logs WHERE automation_id LIKE 'test_rls_%';

-- Clear context
SELECT clear_tenant_context();

SELECT 'Test data cleanup completed' AS status;

-- ============================================================================
-- SECTION 15: FINAL SUMMARY
-- ============================================================================

SELECT '=== TEST SUMMARY ===' AS test_section;

SELECT
  'RLS Implementation Tests Complete' AS summary,
  'Review all test results above' AS action,
  'All PASSED tests indicate proper RLS enforcement' AS success_criteria;

-- To verify all tests passed, check that:
-- ✓ All tables have RLS enabled
-- ✓ Tenant isolation prevents cross-tenant access
-- ✓ INSERT/UPDATE/DELETE protection works
-- ✓ Helper functions work correctly
-- ✓ No security events were logged
-- ✓ Performance is acceptable

-- ============================================================================
-- END OF TEST SCRIPTS
-- ============================================================================
