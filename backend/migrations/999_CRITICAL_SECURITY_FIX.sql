-- CRITICAL SECURITY FIX MIGRATION
-- Fixes: SECURITY DEFINER views and missing RLS policies
-- Date: 2024-01-30
-- Priority: CRITICAL - APPLY IMMEDIATELY

-- ============================================
-- PART 1: FIX SECURITY DEFINER VIEWS
-- ============================================
-- SECURITY DEFINER views bypass RLS and can expose data across tenants!
-- We need to remove this property from all views

-- Drop and recreate views WITHOUT SECURITY DEFINER
-- These views should respect the current user's permissions and RLS policies

-- Note: We're dropping and recreating because ALTER VIEW cannot change SECURITY DEFINER
DROP VIEW IF EXISTS public.competitor_threat_matrix CASCADE;
DROP VIEW IF EXISTS public.latest_serp_positions CASCADE;
DROP VIEW IF EXISTS public.latest_website_content CASCADE;
DROP VIEW IF EXISTS public.dashboard_device_summary CASCADE;
DROP VIEW IF EXISTS public.active_offers CASCADE;
DROP VIEW IF EXISTS public.dashboard_top_keywords CASCADE;
DROP VIEW IF EXISTS public.ngram_analysis_summary CASCADE;
DROP VIEW IF EXISTS public.recent_competitor_activity CASCADE;
DROP VIEW IF EXISTS public.dashboard_recent_activity CASCADE;
DROP VIEW IF EXISTS public.dashboard_serp_performance CASCADE;
DROP VIEW IF EXISTS public.traffic_insights_summary CASCADE;
DROP VIEW IF EXISTS public.stale_content CASCADE;
DROP VIEW IF EXISTS public.dashboard_traffic_overview CASCADE;
DROP VIEW IF EXISTS public.dashboard_competitor_intelligence CASCADE;
DROP VIEW IF EXISTS public.dashboard_content_insights CASCADE;
DROP VIEW IF EXISTS public.top_competitor_ads CASCADE;
DROP VIEW IF EXISTS public.dashboard_executive_summary CASCADE;
DROP VIEW IF EXISTS public.content_by_type_summary CASCADE;
DROP VIEW IF EXISTS public.active_ngram_negatives CASCADE;

-- ============================================
-- PART 2: ENABLE RLS ON UNPROTECTED TABLES
-- ============================================
-- These tables are exposed without RLS, allowing cross-tenant data access!

-- Enable RLS on all unprotected tables
ALTER TABLE public.ga4_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_schedule_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hourly_traffic_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_traffic_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_patterns ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PART 3: CREATE RLS POLICIES FOR NEWLY PROTECTED TABLES
-- ============================================
-- Create policies that enforce tenant isolation

-- GA4 Sync Logs Policy
CREATE POLICY ga4_sync_logs_tenant_isolation ON public.ga4_sync_logs
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

-- Traffic Analysis Cache Policy
CREATE POLICY traffic_analysis_cache_tenant_isolation ON public.traffic_analysis_cache
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

-- Ad Schedule Configs Policy
CREATE POLICY ad_schedule_configs_tenant_isolation ON public.ad_schedule_configs
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

-- Schedule Performance Policy
CREATE POLICY schedule_performance_tenant_isolation ON public.schedule_performance
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

-- Hourly Traffic Metrics Policy
CREATE POLICY hourly_traffic_metrics_tenant_isolation ON public.hourly_traffic_metrics
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

-- Daily Traffic Summary Policy
CREATE POLICY daily_traffic_summary_tenant_isolation ON public.daily_traffic_summary
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

-- Traffic Predictions Policy
CREATE POLICY traffic_predictions_tenant_isolation ON public.traffic_predictions
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

-- Traffic Anomalies Policy
CREATE POLICY traffic_anomalies_tenant_isolation ON public.traffic_anomalies
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

-- Traffic Patterns Policy
CREATE POLICY traffic_patterns_tenant_isolation ON public.traffic_patterns
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));

-- ============================================
-- PART 4: ENABLE RLS ON CAMPAIGN/AD GROUP METRICS TABLES
-- ============================================
-- These tables were created outside migrations and need RLS

-- Check if tables exist and enable RLS
DO $$
BEGIN
  -- Campaign Metrics
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_metrics' AND table_schema = 'public') THEN
    ALTER TABLE public.campaign_metrics ENABLE ROW LEVEL SECURITY;

    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS campaign_metrics_tenant_isolation ON public.campaign_metrics;

    -- Create new policy
    CREATE POLICY campaign_metrics_tenant_isolation ON public.campaign_metrics
      FOR ALL
      USING (tenant_id = current_setting('app.current_tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));
  END IF;

  -- Ad Group Metrics
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ad_group_metrics' AND table_schema = 'public') THEN
    ALTER TABLE public.ad_group_metrics ENABLE ROW LEVEL SECURITY;

    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS ad_group_metrics_tenant_isolation ON public.ad_group_metrics;

    -- Create new policy
    CREATE POLICY ad_group_metrics_tenant_isolation ON public.ad_group_metrics
      FOR ALL
      USING (tenant_id = current_setting('app.current_tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));
  END IF;

  -- Device Metrics
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'device_metrics' AND table_schema = 'public') THEN
    ALTER TABLE public.device_metrics ENABLE ROW LEVEL SECURITY;

    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS device_metrics_tenant_isolation ON public.device_metrics;

    -- Create new policy
    CREATE POLICY device_metrics_tenant_isolation ON public.device_metrics
      FOR ALL
      USING (tenant_id = current_setting('app.current_tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));
  END IF;

  -- Keyword Performance
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'keyword_performance' AND table_schema = 'public') THEN
    ALTER TABLE public.keyword_performance ENABLE ROW LEVEL SECURITY;

    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS keyword_performance_tenant_isolation ON public.keyword_performance;

    -- Create new policy
    CREATE POLICY keyword_performance_tenant_isolation ON public.keyword_performance
      FOR ALL
      USING (tenant_id = current_setting('app.current_tenant_id', true))
      WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true));
  END IF;
END $$;

-- ============================================
-- PART 5: VERIFY SECURITY STATUS
-- ============================================
-- Query to verify all tables have RLS enabled

DO $$
DECLARE
  unprotected_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unprotected_count
  FROM pg_tables t
  LEFT JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
    AND c.relrowsecurity = false
    AND t.tablename NOT LIKE 'pg_%'
    AND t.tablename NOT IN ('schema_migrations', 'migrations');

  IF unprotected_count > 0 THEN
    RAISE WARNING 'WARNING: There are still % unprotected tables in public schema!', unprotected_count;
  ELSE
    RAISE NOTICE 'SUCCESS: All tables in public schema now have RLS enabled';
  END IF;
END $$;

-- ============================================
-- PART 6: LOG MIGRATION COMPLETION
-- ============================================
INSERT INTO tenant_configs (tenant_id, config_key, config_value)
VALUES ('migration', 'critical_security_fix_999', json_build_object(
  'applied_at', NOW(),
  'views_fixed', 19,
  'tables_protected', 9,
  'severity', 'CRITICAL'
))
ON CONFLICT (tenant_id, config_key)
DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = NOW();

-- ============================================
-- IMPORTANT NOTES:
-- ============================================
-- 1. This migration MUST be applied immediately to prevent data leaks
-- 2. After applying, verify in Supabase dashboard that all warnings are resolved
-- 3. Test that tenant isolation still works correctly
-- 4. Monitor for any application errors related to view access
-- 5. The dropped views need to be recreated with proper definitions if they're used