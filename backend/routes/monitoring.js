import express from "express";
import { verify } from "../utils/hmac.js";
import { getSupabaseClient, isSupabaseEnabled } from "../services/supabase-client.js";
import logger from "../services/logger.js";

const router = express.Router();

// GET /api/monitoring/ingestion - Ingestion status (row counts + latest timestamps)
router.get("/ingestion", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:ingestion_status`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    if (!isSupabaseEnabled()) {
      return res.json({
        ok: true,
        source: 'none',
        message: 'Supabase not configured',
        tables: {}
      });
    }

    const supabase = getSupabaseClient();
    // Set RLS context
    await supabase.rpc('set_config', { parameter: 'app.current_tenant_id', value: String(tenant) }).catch(() => {});

    async function getTableStatus(table, dateColumn) {
      try {
        // Count rows for tenant
        const { count, error: countError } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', String(tenant));

        if (countError) throw countError;

        // Latest date/timestamp
        let latest = null;
        const { data: latestRow, error: latestError } = await supabase
          .from(table)
          .select(`${dateColumn}`)
          .eq('tenant_id', String(tenant))
          .order(dateColumn, { ascending: false })
          .limit(1);

        if (!latestError && latestRow && latestRow.length > 0) {
          latest = latestRow[0][dateColumn];
        }

        return { count: count || 0, latest };
      } catch (error) {
        return { error: error.message };
      }
    }

    const [tenantMetrics, campaignMetrics, adGroupMetrics, searchTerms, runLogs] = await Promise.all([
      getTableStatus('tenant_metrics', 'date'),
      getTableStatus('campaign_metrics', 'date'),
      getTableStatus('ad_group_metrics', 'date'),
      getTableStatus('search_terms', 'date'),
      getTableStatus('run_logs', 'timestamp')
    ]);

    return res.json({
      ok: true,
      source: 'supabase',
      tables: {
        tenant_metrics: tenantMetrics,
        campaign_metrics: campaignMetrics,
        ad_group_metrics: adGroupMetrics,
        search_terms: searchTerms,
        run_logs: runLogs
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

export default router;

// Additional: GET /api/monitoring/logs - expose logger metrics
router.get("/logs", async (_req, res) => {
  try {
    const metrics = logger.getMetrics();
    return res.json({ ok: true, metrics, timestamp: new Date().toISOString() });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});
