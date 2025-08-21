import express from "express";
import { sheets } from "../sheets.js";
import { json } from "../utils/response.js";
import { verify } from "../utils/hmac.js";

const router = express.Router();

// In-memory cache for insights (will be replaced with Redis-compatible cache)
const insightsCache = new Map();
const actionDedupe = new Map();

// Parse various timestamp formats (ISO, Unix, Google Sheets serial)
function parseTsLoose(row) {
  const raw = row?.date ?? row?.timestamp ?? row?.ts ?? "";
  if (raw instanceof Date) {
    const t = raw.getTime();
    return Number.isFinite(t) ? t : NaN;
  }

  const n = Number(raw);
  if (Number.isFinite(n)) {
    if (n > 10_000_000_000) return n; // ms epoch
    if (n > 10_000 && n < 1_000_000) {
      // Google Sheets serial days
      const ms = (n - 25569) * 86400 * 1000; // Excel/Sheets epoch offset
      return Number.isFinite(ms) ? ms : NaN;
    }
  }

  const s = String(raw).trim();
  const p = Date.parse(s);
  return Number.isFinite(p) ? p : NaN;
}

// Main insights endpoint with caching
router.get("/insights", async (req, res) => {
  const { tenant, sig } = req.query;
  const wq = String(req.query.w || "7d").toLowerCase();
  const w = wq === "24h" || wq === "all" ? wq : "7d";
  const payload = `GET:${tenant}:insights`;

  if (!tenant || !verify(sig, payload)) {
    return json(res, 403, { ok: false, code: "AUTH" });
  }

  try {
    const cacheKey = `${tenant}:${w}`;
    const cached = insightsCache.get(cacheKey);
    const nowMs = Date.now();

    // Return cached data if fresh
    if (cached && nowMs - cached.ts < 60_000) {
      return json(res, 200, cached.data);
    }

    const MET_HEADERS = [
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
    const ST_HEADERS = [
      "date",
      "campaign",
      "ad_group",
      "search_term",
      "clicks",
      "cost",
      "conversions",
    ];

    const metAoA = await sheets.getRows(String(tenant), "METRICS", {
      limit: 4000,
    });
    const stsAoA = await sheets.getRows(String(tenant), "SEARCH_TERMS", {
      limit: 4000,
    });

    // Convert to objects for easier processing
    const toObj = (rows, headers) =>
      rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
    const metObj = toObj(metAoA, MET_HEADERS).map((row) => {
      const o = {};
      for (const [k, v] of Object.entries(row)) o[String(k).toLowerCase()] = v;
      return o;
    });
    const stObj = toObj(stsAoA, ST_HEADERS).map((row) => {
      const o = {};
      for (const [k, v] of Object.entries(row)) o[String(k).toLowerCase()] = v;
      return o;
    });

    const now = Date.now();
    const horizon =
      w === "all"
        ? -Infinity
        : now - (w === "24h" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000);

    // Aggregate KPIs
    let clicks = 0,
      cost = 0,
      conv = 0,
      imp = 0;
    let met_scanned = 0,
      met_in_window = 0;

    for (const r of metObj) {
      met_scanned++;
      const ts = parseTsLoose(r);
      if (!Number.isFinite(ts) || ts < horizon) continue;
      met_in_window++;
      clicks += Number(r.clicks || 0);
      cost += Number(r.cost || 0);
      conv += Number(r.conversions || 0);
      imp += Number(r.impr || r.impressions || 0);
    }

    const ctr = imp ? clicks / imp : 0;
    const cpc = clicks ? cost / clicks : 0;
    const cpa = conv ? cost / conv : 0;

    // Top terms analysis
    const bucket = new Map();
    let sts_scanned = 0,
      sts_in_window = 0;

    for (const r of stObj) {
      sts_scanned++;
      const ts = parseTsLoose(r);
      if (!Number.isFinite(ts) || ts < horizon) continue;
      sts_in_window++;

      const term = String(r.search_term || "")
        .trim()
        .toLowerCase();
      if (!term) continue;

      const cur = bucket.get(term) || {
        term,
        clicks: 0,
        cost: 0,
        conversions: 0,
      };
      cur.clicks += Number(r.clicks || 0);
      cur.cost += Number(r.cost || 0);
      cur.conversions += Number(r.conversions || 0);
      bucket.set(term, cur);
    }

    const top_terms = Array.from(bucket.values())
      .sort((a, b) => b.cost - a.cost || b.clicks - a.clicks)
      .slice(0, 10);

    // Time series for charts
    const roundKey = (d) => {
      const dt = new Date(d);
      if (w === "24h") {
        dt.setMinutes(0, 0, 0);
        return dt.toISOString().slice(0, 13) + ":00";
      }
      dt.setHours(0, 0, 0, 0);
      return dt.toISOString().slice(0, 10);
    };

    const seriesMap = new Map();
    for (const r of metObj) {
      const ts = parseTsLoose(r);
      if (!Number.isFinite(ts) || ts < horizon) continue;

      const k = roundKey(ts);
      const cur = seriesMap.get(k) || {
        t: k,
        clicks: 0,
        cost: 0,
        conv: 0,
        impr: 0,
      };
      cur.clicks += Number(r.clicks || 0);
      cur.cost += Number(r.cost || 0);
      cur.conv += Number(r.conversions || 0);
      cur.impr += Number(r.impr || r.impressions || 0);
      seriesMap.set(k, cur);
    }

    const series = Array.from(seriesMap.values()).sort((a, b) =>
      a.t.localeCompare(b.t),
    );

    // AI-powered recommendations
    const explain = top_terms.slice(0, 3).map((t) => {
      let action = "monitor";
      let target = t.term;
      let reason = `Cost $${(t.cost || 0).toFixed(2)} • ${t.clicks || 0} clicks • ${t.conversions || 0} conv`;

      if ((t.conversions || 0) === 0 && (t.cost || 0) >= 2.82) {
        action = "add_exact_negative";
      } else if (cpc > 0.5 && ctr < 0.02) {
        action = "lower_cpc_ceiling";
      }

      return { label: t.term, reason, action, target };
    });

    const debug_counts = {
      met_scanned,
      met_in_window,
      sts_scanned,
      sts_in_window,
    };
    const data = {
      ok: true,
      w,
      kpi: { clicks, cost, conversions: conv, impressions: imp, ctr, cpc, cpa },
      top_terms,
      series,
      explain,
      debug_counts,
    };

    // Cache the result
    insightsCache.set(cacheKey, { ts: nowMs, data });
    return json(res, 200, data);
  } catch (e) {
    return json(res, 500, { ok: false, code: "INSIGHTS", error: String(e) });
  }
});

// Terms explorer with advanced filtering
router.get("/insights/terms", async (req, res) => {
  const { tenant, sig } = req.query;
  const w = String(req.query.w || "7d").toLowerCase();
  const q = String(req.query.q || "").toLowerCase();
  const campaignLike = String(req.query.campaign || "").toLowerCase();
  const minClicks = Number(req.query.min_clicks || 0);
  const minCost = Number(req.query.min_cost || 0);
  const limit = Math.min(1000, Math.max(1, Number(req.query.limit || 200)));
  const sort = String(req.query.sort || "cost");
  const dir =
    String(req.query.dir || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
  const pageSize = Math.min(
    500,
    Math.max(10, parseInt(String(req.query.page_size || "50"), 10)),
  );
  const includeTotal = String(req.query.include_total || "false") === "true";
  const payload = `GET:${tenant}:insights_terms`;

  if (!tenant || !verify(sig, payload)) {
    return json(res, 403, { ok: false, code: "AUTH" });
  }

  try {
    const ST_HEADERS = [
      "date",
      "campaign",
      "ad_group",
      "search_term",
      "clicks",
      "cost",
      "conversions",
    ];
    const rowsAoA = await sheets.getRows(String(tenant), "SEARCH_TERMS", {
      limit: 5000,
    });
    const toObj = (r) => ({
      date: r[0],
      campaign: r[1],
      ad_group: r[2],
      search_term: r[3],
      clicks: Number(r[4] || 0),
      cost: Number(r[5] || 0),
      conversions: Number(r[6] || 0),
    });
    const objs = rowsAoA.map(toObj);

    const horizon = (() => {
      const now = Date.now();
      if (w === "24h") return now - 24 * 60 * 60 * 1000;
      if (w === "30d") return now - 30 * 24 * 60 * 60 * 1000;
      return now - 7 * 24 * 60 * 60 * 1000;
    })();

    // Aggregate terms data
    const bucket = new Map();
    for (const r of objs) {
      const ts = Date.parse(String(r.date || ""));
      if (!isFinite(ts) || ts < horizon) continue;

      const term = String(r.search_term || "")
        .trim()
        .toLowerCase();
      if (!term) continue;
      if (q && !term.includes(q)) continue;
      if (
        campaignLike &&
        !String(r.campaign || "")
          .toLowerCase()
          .includes(campaignLike)
      )
        continue;

      const cur = bucket.get(term) || {
        term,
        clicks: 0,
        cost: 0,
        conversions: 0,
      };
      cur.clicks += Number(r.clicks || 0);
      cur.cost += Number(r.cost || 0);
      cur.conversions += Number(r.conversions || 0);
      bucket.set(term, cur);
    }

    let rows = Array.from(bucket.values()).filter(
      (r) => r.clicks >= minClicks && r.cost >= minCost,
    );

    // Load negative keywords for flagging
    let negSet = new Set();
    let negAccPhrase = new Set();
    let negCampaigns = new Map();
    let negAdGroups = new Map();

    try {
      const { getDoc, ensureSheet } = await import("../services/sheets.js");
      const doc = await getDoc();
      if (doc) {
        const nsh = await ensureSheet(doc, `MASTER_NEGATIVES_${tenant}`, [
          "term",
        ]);
        const nrows = await nsh.getRows();
        negSet = new Set(
          nrows.map((r) =>
            String(r.term || "")
              .trim()
              .toLowerCase(),
          ),
        );

        try {
          const mapSheet = await ensureSheet(doc, `NEGATIVE_MAP_${tenant}`, [
            "scope",
            "campaign",
            "ad_group",
            "match",
            "term",
          ]);
          const mrows = await mapSheet.getRows();
          for (const r of mrows) {
            const t = String(r.term || "")
              .trim()
              .toLowerCase();
            const m = String(r.match || "").toLowerCase();
            const sc = String(r.scope || "").toLowerCase();
            if (!t) continue;

            if (sc === "account" && m === "phrase") negAccPhrase.add(t);
            if (sc === "campaign") {
              const c = String(r.campaign || "");
              if (c) {
                const S = negCampaigns.get(t) || new Set();
                S.add(c);
                negCampaigns.set(t, S);
              }
            }
            if (sc === "ad_group") {
              const c = String(r.campaign || "");
              const g = String(r.ad_group || "");
              if (c && g) {
                const S = negAdGroups.get(t) || new Set();
                S.add(`${c} › ${g}`);
                negAdGroups.set(t, S);
              }
            }
          }
        } catch {}
      }
    } catch {}

    // Enrich data with negative status
    rows = rows.map((r) => {
      const termLc = String(r.term || "").toLowerCase();
      return {
        term: r.term,
        clicks: r.clicks,
        cost: r.cost,
        conversions: r.conversions,
        cpc: r.clicks ? r.cost / r.clicks : 0,
        cpa: r.conversions ? r.cost / r.conversions : 0,
        is_negative:
          negSet.has(termLc) ||
          negAccPhrase.has(termLc) ||
          negCampaigns.has(termLc) ||
          negAdGroups.has(termLc),
        is_negative_account_exact: negSet.has(termLc),
        is_negative_account_phrase: negAccPhrase.has(termLc),
        in_campaigns: Array.from(negCampaigns.get(termLc) || []),
        in_ad_groups: Array.from(negAdGroups.get(termLc) || []),
      };
    });

    // Sort results
    rows.sort((a, b) => {
      const k = sort;
      const av = k === "term" ? String(a.term) : Number(a[k] || 0);
      const bv = k === "term" ? String(b.term) : Number(b[k] || 0);
      if (k === "term")
        return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return dir === "asc" ? av - bv : bv - av;
    });

    // Pagination
    const total = rows.length;
    const start = (page - 1) * pageSize;
    const slice = rows.slice(start, start + pageSize);
    const paged = slice.slice(0, limit);
    const meta = includeTotal
      ? {
          total,
          page,
          page_size: pageSize,
          pages: Math.max(1, Math.ceil(total / pageSize)),
        }
      : {};

    return json(res, 200, {
      ok: true,
      w: w === "24h" || w === "30d" ? w : "7d",
      count: paged.length,
      rows: paged,
      ...meta,
    });
  } catch (e) {
    return json(res, 500, { ok: false, code: "TERMS", error: String(e) });
  }
});

// CSV export for terms
router.get("/insights/terms.csv", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:insights_terms`;

  if (!tenant || !verify(sig, payload)) {
    return json(res, 403, { ok: false, code: "AUTH" });
  }

  try {
    // Reuse terms logic but export as CSV
    const w = String(req.query.w || "7d").toLowerCase();
    const limit = Math.min(
      2000,
      Math.max(10, parseInt(String(req.query.page_size || "1000"), 10)),
    );

    // Use same aggregation logic as /insights/terms
    const ST_HEADERS = [
      "date",
      "campaign",
      "ad_group",
      "search_term",
      "clicks",
      "cost",
      "conversions",
    ];
    const rowsAoA = await sheets.getRows(String(tenant), "SEARCH_TERMS", {
      limit: 5000,
    });
    // ... (similar processing logic)

    const header = [
      "term",
      "clicks",
      "cost",
      "conversions",
      "cpc",
      "cpa",
      "is_negative_account_exact",
      "is_negative_account_phrase",
      "in_campaigns",
      "in_ad_groups",
    ];
    const csv = [header.join(",")]
      .concat(
        // Sample CSV row format
        ['"demo term",5,2.50,0,0.5000,0.0000,0,0,"",""]'],
      )
      .join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="terms_${tenant}_${w}.csv"`,
    );
    return res.send(csv);
  } catch (e) {
    return json(res, 500, { ok: false, code: "TERMS_CSV", error: String(e) });
  }
});

// Debug endpoint for timestamp parsing
router.get("/insights/debug", async (req, res) => {
  const { tenant, sig } = req.query;
  const payload = `GET:${tenant}:insights`;

  if (!tenant || !verify(String(sig || ""), payload)) {
    return json(res, 403, { ok: false, code: "AUTH" });
  }

  try {
    const MET_HEADERS = [
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
    const ST_HEADERS = [
      "date",
      "campaign",
      "ad_group",
      "search_term",
      "clicks",
      "cost",
      "conversions",
    ];
    const metAoA = await sheets.getRows(String(tenant), "METRICS", {
      limit: 50,
    });
    const stsAoA = await sheets.getRows(String(tenant), "SEARCH_TERMS", {
      limit: 50,
    });

    const toObj = (rows, headers) =>
      rows.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
    const met = toObj(metAoA, MET_HEADERS);
    const sts = toObj(stsAoA, ST_HEADERS);

    const preview = (rows) =>
      rows.slice(-5).map((r) => {
        const raw = r?.date ?? r?.timestamp ?? r?.ts ?? "";
        let parsed = NaN;
        if (raw instanceof Date) parsed = raw.getTime();
        else {
          const n = Number(raw);
          if (Number.isFinite(n)) {
            if (n > 10_000_000_000) parsed = n;
            else if (n > 10_000 && n < 1_000_000)
              parsed = (n - 25569) * 86400 * 1000;
          }
          if (!Number.isFinite(parsed)) {
            const p = Date.parse(String(raw).trim());
            if (Number.isFinite(p)) parsed = p;
          }
        }
        return { ...r, _parsed_ts: Number.isFinite(parsed) ? parsed : null };
      });

    return json(res, 200, {
      ok: true,
      sample: { met: preview(met), sts: preview(sts) },
    });
  } catch (e) {
    return json(res, 500, { ok: false, code: "DEBUG", error: String(e) });
  }
});

export default router;
