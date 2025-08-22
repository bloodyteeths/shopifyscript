import express from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { setupMiddleware, setupErrorHandling } from "./middleware/index.js";
import { json, logAccess } from "./utils/response.js";
import { verify, sign } from "./utils/hmac.js";
import {
  getValidatedHMACSecret,
  initializeHMACValidation,
} from "./utils/secret-validator.js";

// Import route modules
import configRoutes from "./routes/config.js";
import metricsRoutes from "./routes/metrics.js";
import insightsRoutes from "./routes/insights.js";
import audiencesRoutes from "./routes/audiences.js";
import aiRoutes from "./routes/ai.js";
import intentOSRoutes from "./routes/intent-os.js";
import * as alertsConfigRoutes from "./routes/alerts-config.js";
import sessionsRoutes from "./routes/sessions.js";

// Load environment configuration
dotenv.config();
try {
  dotenv.config({ path: path.resolve(process.cwd(), "backend", ".env") });
} catch {}

const app = express();
const PORT = Number(process.env.PORT || 3001);

// Initialize and validate HMAC secret on startup
initializeHMACValidation({
  allowWeakInDev: true,
  environment: process.env.NODE_ENV || "development",
});

const SECRET = getValidatedHMACSecret({
  allowWeakInDev: true,
  environment: process.env.NODE_ENV || "development",
});

// Setup middleware
setupMiddleware(app);

// Import sheet operations dynamically
async function getSheetOperations() {
  return await import("./sheets.js");
}

// ----- Core health and diagnostic endpoints -----
app.get("/api/health", (req, res) =>
  res.json({ ok: true, ts: new Date().toISOString() }),
);
app.get("/api/healthz", (req, res) =>
  json(res, 200, { ok: true, ts: new Date().toISOString() }),
);

app.get("/api/diagnostics", async (req, res) => {
  try {
    // Consider Sheets connected if SHEET_ID is present (single-master pattern).
    // Still attempt to auth to surface issues via optional hint fields.
    const sheetEnv = !!process.env.SHEET_ID;
    const { getDoc } = await getSheetOperations();
    const doc = await getDoc();
    const sheetsOk = sheetEnv || !!doc;
    const aiReady =
      (process.env.AI_PROVIDER || "").toLowerCase() === "google" &&
      !!process.env.GOOGLE_API_KEY;
    const hmacOk = !!process.env.HMAC_SECRET;

    res.json({
      ok: true,
      ai_ready: !!aiReady,
      sheets_ok: !!sheetsOk,
      hmac_ok: !!hmacOk,
      sheetsAuth: process.env.GOOGLE_SERVICE_EMAIL
        ? "service_account"
        : "unknown",
      serviceEmail: process.env.GOOGLE_SERVICE_EMAIL || null,
      cache: {
        insightsTTL: Number(process.env.INSIGHTS_CACHE_TTL_SEC || "60"),
        configTTL: Number(process.env.CONFIG_CACHE_TTL_SEC || "15"),
        runLogsTTL: Number(process.env.RUNLOGS_CACHE_TTL_SEC || "10"),
      },
    });
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e) });
  }
});

// ----- Route registration -----
app.use("/api", configRoutes);
app.use("/api", metricsRoutes);
app.use("/api", insightsRoutes);
app.use("/api/audiences", audiencesRoutes);
app.use("/api", aiRoutes);
app.use("/api/intent-os", intentOSRoutes);
app.use("/api", sessionsRoutes);

// ----- Remaining legacy endpoints (to be extracted later) -----

// CPC ceilings batch upsert (HMAC)
app.post("/api/cpc-ceilings/batch", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), items = [] } = req.body || {};
  const payload = `POST:${tenant}:cpc_batch:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return json(res, 403, { ok: false, code: "AUTH" });
  }

  try {
    const { upsertMapValue, appendRows } = await getSheetOperations();
    let n = 0;

    for (const it of Array.isArray(items) ? items : []) {
      const c = String(it.campaign || "*");
      const v = Number(it.value);
      if (!isFinite(v)) continue;
      await upsertMapValue(String(tenant), "CPC_CEILINGS", c, v);
      n++;
    }

    try {
      await appendRows(
        String(tenant),
        "RUN_LOGS",
        ["timestamp", "message"],
        [[new Date().toISOString(), `cpc_batch:${n}`]],
      );
    } catch {}

    return json(res, 200, { ok: true, upserted: n });
  } catch (e) {
    return json(res, 500, { ok: false, code: "CPC_BATCH", error: String(e) });
  }
});

// Intent OS: Apply/Revert overlays (audit only; no auto-publish)
app.post("/api/intent/apply", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), overlays = [] } = req.body || {};
  const payload = `POST:${tenant}:intentapply:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { appendRows } = await getSheetOperations();
    try {
      await appendRows(
        tenant,
        "RUN_LOGS",
        ["timestamp", "message"],
        [[new Date().toISOString(), `intent_apply:${overlays.length}`]],
      );
    } catch {}
    res.json({ ok: true, applied: overlays.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/api/intent/revert", async (req, res) => {
  const { tenant, sig } = req.query;
  const { nonce = Date.now(), overlays = [] } = req.body || {};
  const payload = `POST:${tenant}:intentrevert:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { appendRows } = await getSheetOperations();
    try {
      await appendRows(
        tenant,
        "RUN_LOGS",
        ["timestamp", "message"],
        [[new Date().toISOString(), `intent_revert:${overlays.length}`]],
      );
    } catch {}
    res.json({ ok: true, reverted: overlays.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Overlays (apply/revert/bulk) — snapshot-only; audit to RUN_LOGS
app.post("/api/overlays/apply", async (req, res) => {
  const { tenant, sig } = req.query;
  const {
    nonce = Date.now(),
    product_ids = [],
    collection_ids = [],
    channel = "google",
    fields = {},
  } = req.body || {};
  const payload = `POST:${tenant}:overlays_apply:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { appendRows } = await getSheetOperations();
    try {
      await appendRows(
        tenant,
        "OVERLAY_HISTORY",
        ["timestamp", "action", "selector", "channel", "fields_json"],
        [
          [
            new Date().toISOString(),
            "apply",
            product_ids.length
              ? `products:${product_ids.length}`
              : collection_ids.length
                ? `collections:${collection_ids.length}`
                : "none",
            channel,
            JSON.stringify(fields),
          ],
        ],
      );
    } catch {}
    try {
      await appendRows(
        tenant,
        "RUN_LOGS",
        ["timestamp", "message"],
        [[new Date().toISOString(), `overlay_apply:${channel}`]],
      );
    } catch {}
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/api/overlays/revert", async (req, res) => {
  const { tenant, sig } = req.query;
  const {
    nonce = Date.now(),
    product_ids = [],
    collection_ids = [],
    channel = "google",
  } = req.body || {};
  const payload = `POST:${tenant}:overlays_revert:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { appendRows } = await getSheetOperations();
    try {
      await appendRows(
        tenant,
        "OVERLAY_HISTORY",
        ["timestamp", "action", "selector", "channel", "fields_json"],
        [
          [
            new Date().toISOString(),
            "revert",
            product_ids.length
              ? `products:${product_ids.length}`
              : collection_ids.length
                ? `collections:${collection_ids.length}`
                : "none",
            channel,
            "{}",
          ],
        ],
      );
    } catch {}
    try {
      await appendRows(
        tenant,
        "RUN_LOGS",
        ["timestamp", "message"],
        [[new Date().toISOString(), `overlay_revert:${channel}`]],
      );
    } catch {}
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/api/overlays/bulk", async (req, res) => {
  const { tenant, sig } = req.query;
  const {
    nonce = Date.now(),
    select = "collection",
    value = "",
    channel = "google",
    fields = {},
  } = req.body || {};
  const payload = `POST:${tenant}:overlays_bulk:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { appendRows } = await getSheetOperations();
    try {
      await appendRows(
        tenant,
        "OVERLAY_HISTORY",
        ["timestamp", "action", "selector", "channel", "fields_json"],
        [
          [
            new Date().toISOString(),
            "apply_bulk",
            `${select}:${value}`,
            channel,
            JSON.stringify(fields),
          ],
        ],
      );
    } catch {}
    try {
      await appendRows(
        tenant,
        "RUN_LOGS",
        ["timestamp", "message"],
        [[new Date().toISOString(), `overlay_bulk:${select}:${value}`]],
      );
    } catch {}
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Seed demo data (DEV ONLY; HMAC)
app.post("/api/seed-demo", async (req, res) => {
  if ((process.env.NODE_ENV || "development") === "production") {
    return res.status(403).json({ ok: false, error: "forbidden" });
  }

  const { tenant, sig } = req.query;
  const { nonce = Date.now() } = req.body || {};
  const payload = `POST:${tenant}:seed_demo:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getDoc, ensureSheet } = await getSheetOperations();
    const doc = await getDoc();
    if (!doc) return res.status(500).json({ ok: false, error: "no_sheets" });

    const seeded = { tabs: [], rows: 0 };
    // Minimal tabs aligned to insights & planner readers
    const metHeaders = [
      "date",
      "level",
      "campaign",
      "ad_group",
      "id",
      "name",
      "clicks",
      "cost",
      "conversions",
      "impr",
      "ctr",
    ];
    const stHeaders = [
      "date",
      "campaign",
      "ad_group",
      "search_term",
      "clicks",
      "cost",
      "conversions",
    ];
    const runHeaders = ["timestamp", "message"];

    const metSheet = await ensureSheet(doc, `METRICS_${tenant}`, metHeaders);
    const stSheet = await ensureSheet(doc, `SEARCH_TERMS_${tenant}`, stHeaders);
    const rlSheet = await ensureSheet(doc, `RUN_LOGS_${tenant}`, runHeaders);

    try {
      await metSheet.clearRows();
      await metSheet.setHeaderRow(metHeaders);
    } catch {}
    try {
      await stSheet.clearRows();
      await stSheet.setHeaderRow(stHeaders);
    } catch {}
    try {
      await rlSheet.clearRows();
      await rlSheet.setHeaderRow(runHeaders);
    } catch {}

    const iso = new Date().toISOString().slice(0, 10);
    await metSheet.addRow({
      date: iso,
      level: "ad_group",
      campaign: "Demo Campaign",
      ad_group: "Demo AdGroup",
      id: "1",
      name: "Demo KW",
      clicks: "12",
      cost: "6.50",
      conversions: "1",
      impr: "120",
      ctr: "0.10",
    });
    await stSheet.addRow({
      date: iso,
      campaign: "Demo Campaign",
      ad_group: "Demo AdGroup",
      search_term: "demo shoes",
      clicks: "8",
      cost: "5.20",
      conversions: "0",
    });
    await rlSheet.addRow({
      timestamp: new Date().toISOString(),
      message: "seed_demo_data",
    });

    seeded.tabs.push(
      `METRICS_${tenant}`,
      `SEARCH_TERMS_${tenant}`,
      `RUN_LOGS_${tenant}`,
    );
    seeded.rows = 3;

    return res.json({ ok: true, seeded });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

// Summary (KPIs + Top terms)
app.get("/api/summary", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:summary_get`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getDoc, ensureSheet } = await getSheetOperations();
    const doc = await getDoc();
    if (!doc) {
      return res.json({
        ok: true,
        kpis: { spend: 0, clicks: 0, conv: 0, cpa: 0 },
        top_terms: [],
        last_run: null,
      });
    }

    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // KPIs
    const metrics = await ensureSheet(doc, `METRICS_${tenant}`, [
      "date",
      "level",
      "campaign",
      "ad_group",
      "id",
      "name",
      "clicks",
      "cost",
      "conversions",
      "impr",
      "ctr",
    ]);
    const mRows = await metrics.getRows();
    let spend = 0,
      clicks = 0,
      conv = 0;

    for (const r of mRows) {
      const ts = Date.parse(String(r.date || ""));
      if (isFinite(ts) && ts >= since) {
        clicks += Number(r.clicks || 0);
        spend += Number(r.cost || 0);
        conv += Number(r.conversions || 0);
      }
    }

    const cpa = conv > 0 ? spend / conv : 0;

    // Top terms
    const st = await ensureSheet(doc, `SEARCH_TERMS_${tenant}`, [
      "date",
      "campaign",
      "ad_group",
      "search_term",
      "clicks",
      "cost",
      "conversions",
    ]);
    const tr = await st.getRows();
    const map = new Map();

    for (const r of tr) {
      const term = String(r.search_term || "").trim();
      if (!term) continue;
      const ts = Date.parse(String(r.date || ""));
      if (!isFinite(ts) || ts < since) continue;
      const e = map.get(term) || { term, clicks: 0, cost: 0 };
      e.clicks += Number(r.clicks || 0);
      e.cost += Number(r.cost || 0);
      map.set(term, e);
    }

    const top_terms = Array.from(map.values())
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);

    res.json({
      ok: true,
      kpis: { spend, clicks, conv, cpa },
      top_terms,
      last_run: null,
    });
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e) });
  }
});

// Run logs (HMAC)
app.get("/api/run-logs", async (req, res) => {
  const { tenant, sig } = req.query;
  const limit = Math.min(200, Math.max(1, Number(req.query.limit || 10)));
  const payload = `GET:${tenant}:run_logs`;

  if (!tenant || !verify(sig, payload)) {
    return json(res, 403, { ok: false, code: "AUTH" });
  }

  try {
    const { getDoc, ensureSheet } = await getSheetOperations();
    const doc = await getDoc();
    if (!doc) return json(res, 200, { ok: true, rows: [] });

    const sh = await ensureSheet(doc, `RUN_LOGS_${tenant}`, [
      "timestamp",
      "message",
    ]);
    const rows = await sh.getRows();
    const out = rows.slice(Math.max(0, rows.length - limit)).map((r) => ({
      timestamp: String(r.timestamp || ""),
      message: String(r.message || ""),
    }));

    return json(res, 200, { ok: true, rows: out.reverse() });
  } catch (e) {
    return json(res, 500, { ok: false, code: "RUN_LOGS", error: String(e) });
  }
});

// Promote window
app.post("/api/promote/window", async (req, res) => {
  const { tenant, sig } = req.query;
  const {
    nonce = Date.now(),
    start_at = "now+2m",
    duration_minutes = 60,
  } = req.body || {};
  const payload = `POST:${tenant}:promote_window:${nonce}`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const startMs = (() => {
      if (String(start_at).startsWith("now+")) {
        const m = String(start_at).match(/now\+(\d+)m/i);
        return Date.now() + (m ? Number(m[1]) : 2) * 60 * 1000;
      }
      const t = Date.parse(String(start_at));
      return isFinite(t) ? t : Date.now() + 2 * 60 * 1000;
    })();

    const { schedulePromoteWindow } = await import("./jobs/promote_window.js");
    const out = await schedulePromoteWindow(
      String(tenant),
      startMs,
      Number(duration_minutes || 60),
    );

    try {
      const { appendRows } = await getSheetOperations();
      await appendRows(
        tenant,
        "RUN_LOGS",
        ["timestamp", "message"],
        [
          [
            new Date().toISOString(),
            `promote_window_scheduled:${duration_minutes}`,
          ],
        ],
      );
    } catch {}

    res.json(
      out.ok
        ? { ok: true }
        : { ok: false, error: out.error || "schedule_failed" },
    );
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Promote status (HMAC)
app.get("/api/promote/status", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:promote_status`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const { getDoc, ensureSheet, readConfigFromSheets } =
      await getSheetOperations();
    const doc = await getDoc();
    const now = Date.now();
    let start = null,
      end = null,
      state = "inactive";

    if (doc) {
      const meta = await ensureSheet(doc, `PROMOTE_WINDOW_${tenant}`, [
        "start_at_ms",
        "end_at_ms",
        "state",
      ]);
      const rows = await meta.getRows();
      if (rows.length) {
        start = Number(rows[0].start_at_ms || 0) || null;
        end = Number(rows[0].end_at_ms || 0) || null;
        if (start && now < start) state = "scheduled";
        else if (start && end && now >= start && now < end) state = "active";
        else state = "inactive";
      }
    }

    // Current PROMOTE flag
    let promote = false;
    let caps = {};
    let exclusions = [];

    try {
      const cfg = await readConfigFromSheets(String(tenant));
      promote = !!cfg?.PROMOTE;
      // optional: surface defaults as caps
      caps = {
        budgetCap: cfg?.daily_budget_cap_default,
        cpcCeiling: cfg?.cpc_ceiling_default,
      };
    } catch {}

    res.json({
      ok: true,
      now,
      window: { start, end, state },
      promote,
      caps,
      exclusions,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Pixels ingest (HMAC)
app.post("/api/pixels/ingest", async (req, res) => {
  const { tenant, sig } = req.query;
  const {
    nonce = Date.now(),
    shop = "",
    event = "",
    payload = {},
  } = req.body || {};
  const payloadSig = `POST:${tenant}:pixel_ingest:${nonce}`;

  if (!tenant || !verify(sig, payloadSig)) {
    return json(res, 403, { ok: false, code: "AUTH" });
  }

  try {
    // Minimal PII-safe logging
    const label = String(event || "").toLowerCase();
    let msg = `pixel:${label}`;

    try {
      if (
        label === "purchase_completed" ||
        label === "purchase" ||
        label === "checkout_completed"
      ) {
        const v = Number(
          payload?.value || payload?.amount || payload?.total || 0,
        );
        const items = Number(payload?.items || payload?.line_items || 0);
        msg += ` $${(v || 0).toFixed(2)} items=${items || 0}`;
      } else if (label === "cart_viewed") {
        const v = Number(payload?.value || 0);
        msg += ` $${(v || 0).toFixed(2)}`;
      } else if (label === "product_viewed") {
        const h = String(payload?.handle || payload?.product_handle || "");
        if (h) msg += ` ${h}`;
      } else if (label === "search_submitted") {
        const q = String(payload?.query || "");
        if (q) msg += ` q=${q.slice(0, 40)}`;
      }
    } catch {}

    try {
      const { appendRows } = await getSheetOperations();
      await appendRows(
        String(tenant),
        "RUN_LOGS",
        ["timestamp", "message"],
        [[new Date().toISOString(), msg]],
      );
    } catch {}

    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 500, { ok: false, code: "PIXEL", error: String(e) });
  }
});

// Ads Script delivery (HMAC)
app.get("/api/ads-script/raw", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:script_raw`;

  if (!tenant || !verify(sig, payload)) {
    return res.status(403).json({ ok: false, error: "auth" });
  }

  try {
    const tenantId = String(tenant || "default");
    const primary = path.resolve(process.cwd(), "ads-script", "master.gs");
    const fallback = path.resolve(
      process.cwd(),
      "backend",
      "ads-script",
      "master.gs",
    );
    const filePath = fs.existsSync(primary) ? primary : fallback;
    const raw = await fs.promises.readFile(filePath, "utf8");

    const out = raw
      .replace(
        /__BACKEND_URL__/g,
        (process.env.BACKEND_PUBLIC_URL || "http://localhost:3001/api").replace(
          /\/$/,
          "",
        ),
      )
      .replace(/__TENANT_ID__/g, tenantId)
      .replace(/__HMAC_SECRET__/g, process.env.HMAC_SECRET || "");

    res.set("content-type", "text/plain; charset=utf-8");
    return res.status(200).send(out);
  } catch (e) {
    return res.status(404).json({ ok: false, error: String(e) });
  }
});

// Alert Configuration Routes
app.get("/api/alerts/channels/:tenant", alertsConfigRoutes.getAlertChannels);
app.post("/api/alerts/channels/:tenant", alertsConfigRoutes.createAlertChannel);
app.put(
  "/api/alerts/channels/:tenant/:channelId",
  alertsConfigRoutes.updateAlertChannel,
);
app.delete(
  "/api/alerts/channels/:tenant/:channelId",
  alertsConfigRoutes.deleteAlertChannel,
);
app.post(
  "/api/alerts/channels/:tenant/:channelId/test",
  alertsConfigRoutes.testAlertChannel,
);

app.get(
  "/api/alerts/anomaly-settings/:tenant",
  alertsConfigRoutes.getAnomalySettings,
);
app.put(
  "/api/alerts/anomaly-settings/:tenant",
  alertsConfigRoutes.updateAnomalySettings,
);
app.post(
  "/api/alerts/anomaly-detection/:tenant/run",
  alertsConfigRoutes.runAnomalyDetection,
);
app.post("/api/alerts/suppress/:tenant", alertsConfigRoutes.suppressAlert);

app.post(
  "/api/alerts/weekly-summary/:tenant/generate",
  alertsConfigRoutes.generateWeeklySummary,
);
app.get("/api/alerts/history/:tenant", alertsConfigRoutes.getAlertHistory);

// Initialize Job Scheduler
const { jobScheduler } = await import("./jobs/scheduler.js");
jobScheduler.addTenant("default"); // Add default tenant
jobScheduler.start();

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Shutting down job scheduler...");
  jobScheduler.stop();
  process.exit(0);
});

// In-process pulse for promote window (no-op if no schedule)
const { tickPromoteWindow } = await import("./jobs/promote_window.js");
setInterval(() => {
  tickPromoteWindow("default").catch(() => {});
}, 60_000);

// Setup error handling (must be after all routes)
setupErrorHandling(app);

// Start server
app.listen(PORT, () => {
  console.log(`Proofkit backend on :${PORT}`);
  console.log(
    `Sheets auth: ${process.env.GOOGLE_SERVICE_EMAIL ? "service_account " + process.env.GOOGLE_SERVICE_EMAIL : "unknown"}`,
  );
});

export default app;
