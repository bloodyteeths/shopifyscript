-- Ads Autopilot AI - Anomaly Detection & Spend Pacing Helpers (PL/pgSQL)
-- Version: 014 (idempotent)

-- NOTE: Adjust cost_micros if your spend column is named differently.

-- ====================================================================
-- Helper: Map period to days
-- ====================================================================
DROP FUNCTION IF EXISTS public.ai_period_days(text);

CREATE OR REPLACE FUNCTION public.ai_period_days(p_period TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $fn$
BEGIN
  CASE UPPER(COALESCE(p_period, 'LAST_7_DAYS'))
    WHEN 'TODAY' THEN RETURN 1;
    WHEN 'YESTERDAY' THEN RETURN 2;
    WHEN 'LAST_7_DAYS' THEN RETURN 7;
    WHEN 'LAST_30_DAYS' THEN RETURN 30;
    WHEN 'LAST_90_DAYS' THEN RETURN 90;
    WHEN 'ALL_TIME' THEN RETURN 365;
    ELSE RETURN 7;
  END CASE;
END;
$fn$;

-- ====================================================================
-- Daily spend series for a tenant within period
-- ====================================================================
DROP FUNCTION IF EXISTS public.ai_daily_spend_series(text, text);

CREATE OR REPLACE FUNCTION public.ai_daily_spend_series(p_tenant TEXT, p_period TEXT)
RETURNS TABLE(d DATE, spend NUMERIC)
LANGUAGE plpgsql
STABLE
AS $series$
DECLARE
  v_days INTEGER := public.ai_period_days(p_period);
  v_start DATE := CURRENT_DATE - (v_days || ' days')::INTERVAL;
BEGIN
  RETURN QUERY
  WITH dates AS (
    SELECT generate_series(v_start, CURRENT_DATE, INTERVAL '1 day')::date AS d
  ), spend AS (
    SELECT date AS d, COALESCE(SUM(cost_micros) / 1000000.0, 0) AS spend
    FROM public.tenant_metrics
    WHERE tenant_id = p_tenant
      AND date >= v_start
    GROUP BY date
  )
  SELECT d.d, COALESCE(s.spend, 0) AS spend
  FROM dates d
  LEFT JOIN spend s ON s.d = d.d
  ORDER BY d.d;
END;
$series$;

-- ====================================================================
-- Anomaly detection via Z-score on daily spend
-- ====================================================================
DROP FUNCTION IF EXISTS public.ai_detect_spend_anomalies(text, text);

CREATE OR REPLACE FUNCTION public.ai_detect_spend_anomalies(p_tenant TEXT, p_period TEXT)
RETURNS TABLE(
  d DATE,
  spend NUMERIC,
  mean NUMERIC,
  stddev NUMERIC,
  zscore NUMERIC,
  severity TEXT,
  message TEXT
)
LANGUAGE plpgsql
STABLE
AS $anom$
DECLARE
  v_mean NUMERIC;
  v_std  NUMERIC;
BEGIN
  SELECT AVG(spend), STDDEV_SAMP(spend) INTO v_mean, v_std
  FROM public.ai_daily_spend_series(p_tenant, p_period);

  IF v_std IS NULL OR v_std = 0 THEN
    v_std := 0.00001; -- avoid divide by zero
  END IF;

  RETURN QUERY
  SELECT
    s.d,
    s.spend,
    v_mean AS mean,
    v_std  AS stddev,
    (s.spend - v_mean) / v_std AS zscore,
    CASE
      WHEN ABS((s.spend - v_mean) / v_std) >= 3 THEN 'high'
      WHEN ABS((s.spend - v_mean) / v_std) >= 2 THEN 'medium'
      ELSE 'low'
    END AS severity,
    CASE
      WHEN (s.spend - v_mean) / v_std > 2  THEN 'Spend above normal range'
      WHEN (s.spend - v_mean) / v_std < -2 THEN 'Spend below normal range'
      ELSE 'Within normal range'
    END AS message
  FROM public.ai_daily_spend_series(p_tenant, p_period) s
  ORDER BY s.d;
END;
$anom$;

-- ====================================================================
-- Spend pacing vs provided daily budget
-- ====================================================================
DROP FUNCTION IF EXISTS public.ai_spend_pacing(text, text, numeric);

CREATE OR REPLACE FUNCTION public.ai_spend_pacing(p_tenant TEXT, p_period TEXT, p_daily_budget NUMERIC)
RETURNS TABLE(
  d DATE,
  spend NUMERIC,
  target NUMERIC,
  variance NUMERIC,
  pace_percent NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
STABLE
AS $pace$
BEGIN
  RETURN QUERY
  SELECT
    s.d,
    s.spend,
    p_daily_budget AS target,
    s.spend - p_daily_budget AS variance,
    CASE WHEN p_daily_budget > 0 THEN ROUND((s.spend / p_daily_budget) * 100.0, 2) ELSE NULL END AS pace_percent,
    CASE
      WHEN p_daily_budget > 0 AND s.spend >= p_daily_budget * 1.10 THEN 'ahead'
      WHEN p_daily_budget > 0 AND s.spend <= p_daily_budget * 0.90 THEN 'behind'
      ELSE 'on_track'
    END AS status
  FROM public.ai_daily_spend_series(p_tenant, p_period) s
  ORDER BY s.d;
END;
$pace$;

-- ====================================================================
-- Comments
-- ====================================================================
COMMENT ON FUNCTION public.ai_detect_spend_anomalies(text, text)
  IS 'Returns daily spend anomalies using Z-score for a tenant and period';

COMMENT ON FUNCTION public.ai_spend_pacing(text, text, numeric)
  IS 'Returns day-level spend pacing vs provided daily budget for a tenant and period';

