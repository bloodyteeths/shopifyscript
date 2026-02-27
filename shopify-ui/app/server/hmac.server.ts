import crypto from "crypto";
import { getServerShopName } from "../utils/shop-config";

// Secure HMAC secret validation for Shopify UI
function getValidatedSecret(): string {
  const secret = process.env.HMAC_SECRET;

  if (!secret) {
    throw new Error("HMAC_SECRET environment variable is required");
  }

  // Check for forbidden weak secrets
  const forbidden = [
    "change_me",
    "dev_secret",
    "test-secret",
    "secret",
    "password",
  ];
  const lowerSecret = secret.toLowerCase();

  for (const pattern of forbidden) {
    if (lowerSecret.includes(pattern)) {
      throw new Error(
        `HMAC_SECRET contains forbidden weak pattern: ${pattern}`,
      );
    }
  }

  // Length validation (more lenient for UI)
  if (secret.length < 16) {
    throw new Error(
      `HMAC_SECRET must be at least 16 characters (current: ${secret.length})`,
    );
  }

  return secret;
}

export function sign(payload: string): string {
  if (!payload || typeof payload !== "string") {
    throw new Error("HMAC payload must be a non-empty string");
  }

  const secret = getValidatedSecret();

  try {
    return crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64")
      .replace(/=+$/, "");
  } catch (error) {
    throw new Error(
      `HMAC signing failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function backendFetch(
  pathname: string,
  method: "GET" | "POST",
  body?: any,
  shopNameOverride?: string,
) {
  const cfgBase = (
    process.env.BACKEND_PUBLIC_URL ||
    "https://ads-autopilot-backend.vercel.app/api"
  ).replace(/\/$/, "");
  const baseHost = normalizeBackendBase(cfgBase);
  const base = /\/api$/.test(baseHost) ? baseHost : `${baseHost}/api`;

  // Use shop name from parameter, environment, or default
  const shopName = shopNameOverride || getServerShopName();
  const op = opKey(method, pathname);
  const nonce = method === "POST" ? (body?.nonce ?? Date.now()) : undefined;
  const payload = `${method}:${shopName}:${op}${nonce !== undefined ? `:${nonce}` : ""}`;
  const sig = sign(payload);
  const sep = pathname.includes("?") ? "&" : "?";
  const url = `${base}${pathname}${sep}tenant=${encodeURIComponent(shopName)}&sig=${encodeURIComponent(sig)}`;

  console.log(`🌐 backendFetch ${method} ${pathname} for shop: ${shopName}`);
  console.log(`🔗 URL: ${url.substring(0, url.indexOf("&sig="))}...`);
  if (method === "POST") {
    console.log(
      `📤 Body:`,
      Object.keys(body || {}).length > 0 ? Object.keys(body) : "empty",
    );
  }

  const init: any = { method, headers: {} };
  const bypass =
    process.env.BACKEND_PROTECTION_BYPASS ||
    process.env.VERCEL_PROTECTION_BYPASS ||
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (bypass) {
    init.headers["x-vercel-protection-bypass"] = bypass;
  }
  if (method === "POST") {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(body || {});
  }

  try {
    const res = await fetch(url, init);
    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    console.log(`📥 Response ${res.status} ${res.statusText} (${contentType})`);

    let json;
    if (isJson) {
      json = await res.json().catch((err) => {
        console.error(`❌ JSON parse error for ${pathname}:`, err.message);
        return { ok: false, error: "Invalid JSON response" };
      });
    } else {
      const text = await res.text();
      console.warn(
        `⚠️ Non-JSON response for ${pathname}:`,
        text.substring(0, 200),
      );
      json = { ok: false, error: "Non-JSON response", response: text };
    }

    if (!res.ok) {
      console.error(`❌ HTTP error ${res.status} for ${pathname}:`, json);
    } else if (json?.ok === false) {
      console.warn(`⚠️ Backend error for ${pathname}:`, json.error);
    } else {
      console.log(
        `✅ Success for ${pathname}:`,
        json?.ok ? "OK" : "Response received",
      );
    }

    return { status: res.status, json };
  } catch (fetchError) {
    const errMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
    console.error(`💥 Fetch error for ${pathname}:`, errMsg);
    return {
      status: 500,
      json: { ok: false, error: `Network error: ${errMsg}` },
    };
  }
}

export async function backendFetchRaw(
  pathname: string,
  method: "GET" | "POST",
  shopNameOverride?: string,
) {
  const cfgBase = (
    process.env.BACKEND_PUBLIC_URL ||
    "https://ads-autopilot-backend.vercel.app/api"
  ).replace(/\/$/, "");
  const baseHost = normalizeBackendBase(cfgBase);
  const base = /\/api$/.test(baseHost) ? baseHost : `${baseHost}/api`;
  const shopName = shopNameOverride || getServerShopName();
  const op = opKey(method, pathname);
  const nonce = undefined; // raw used for GET CSV
  const payload = `${method}:${shopName}:${op}${nonce !== undefined ? `:${nonce}` : ""}`;
  const sig = sign(payload);
  const sep = pathname.includes("?") ? "&" : "?";
  const url = `${base}${pathname}${sep}tenant=${encodeURIComponent(shopName)}&sig=${encodeURIComponent(sig)}`;
  const bypass =
    process.env.BACKEND_PROTECTION_BYPASS ||
    process.env.VERCEL_PROTECTION_BYPASS ||
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  const headers: Record<string, string> = {};
  if (bypass) {
    headers["x-vercel-protection-bypass"] = bypass;
  }
  return fetch(url, { method, headers });
}

export async function backendFetchText(
  pathname: string,
  method: "GET" | "POST" = "GET",
  body?: any,
  shopNameOverride?: string,
) {
  const cfgBase = (
    process.env.BACKEND_PUBLIC_URL ||
    "https://ads-autopilot-backend.vercel.app/api"
  ).replace(/\/$/, "");
  const baseHost = normalizeBackendBase(cfgBase);
  const base = /\/api$/.test(baseHost) ? baseHost : `${baseHost}/api`;
  const shopName = shopNameOverride || getServerShopName();
  const op = opKey(method, pathname);
  const nonce = method === "POST" ? (body?.nonce ?? Date.now()) : undefined;
  const payload = `${method}:${shopName}:${op}${nonce !== undefined ? `:${nonce}` : ""}`;
  const sig = sign(payload);
  const sep = pathname.includes("?") ? "&" : "?";
  const url = `${base}${pathname}${sep}tenant=${encodeURIComponent(shopName)}&sig=${encodeURIComponent(sig)}`;

  console.log(`🌐 backendFetchText calling URL: ${url}`);
  console.log(`🔑 HMAC payload: ${payload}`);

  const init: any = { method, headers: {} };
  const bypass =
    process.env.BACKEND_PROTECTION_BYPASS ||
    process.env.VERCEL_PROTECTION_BYPASS ||
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (bypass) {
    init.headers["x-vercel-protection-bypass"] = bypass;
  }
  if (method === "POST") {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(body || {});
  }

  const res = await fetch(url, init);
  const responseText = await res.text();

  console.log(
    `📥 Backend response: status=${res.status}, length=${responseText.length}, contentType=${res.headers.get("content-type")}`,
  );
  console.log(`📄 Response preview: ${responseText.slice(0, 200)}...`);

  return responseText;
}

// Normalize Vercel preview domains to production alias to avoid Preview Protection (401 HTML)
function normalizeBackendBase(rawBase: string): string {
  try {
    const url = new URL(rawBase);
    const host = url.host;
    // Matches: <project>-git-<branch>-<team>.vercel.app → <project>.vercel.app
    const m = host.match(/^(?<proj>[^.]+)-git-[^.]+-(?<rest>.+\.vercel\.app)$/);
    if (m && m.groups && m.groups.proj) {
      const prod = `${m.groups.proj}.vercel.app`;
      return `${url.protocol}//${prod}`;
    }
    return rawBase;
  } catch {
    return rawBase;
  }
}

function opKey(method: string, pathname: string): string {
  // Map UI proxy path → backend op key used for HMAC
  if (pathname.includes("/autopilot/quickstart")) return "autopilot_quickstart";
  if (pathname.includes("/connect/sheets/test")) return "sheets_test";
  if (pathname.includes("/connect/sheets/save")) return "sheets_save";
  if (pathname.includes("/promote/status")) return "promote_status";
  if (pathname.includes("/insights/tier-status")) return "tier_status";
  if (pathname.includes("/insights/terms")) return "insights_terms";
  if (pathname.includes("/run-logs")) return "run_logs";
  if (pathname.includes("/insights/actions/apply")) return "insights_actions";
  if (pathname.includes("/insights")) return "insights";
  if (pathname.includes("/ads-script/raw")) return "script_raw";
  if (pathname.includes("/summary")) return "summary_get";
  if (pathname.includes("/diagnostics")) return "diagnostics";
  if (pathname.endsWith("/config")) return "config";
  if (pathname.includes("/upsertConfig")) return "upsertconfig";
  if (pathname.includes("/jobs/autopilot_tick")) return "autopilot_tick";
  if (pathname.includes("/cpc-ceilings/batch")) return "cpc_batch";
  if (pathname.includes("/jobs/autopilot_tick")) return "autopilot_tick";
  if (pathname.includes("/security/pixel/token")) return "pixel_token";
  if (pathname.includes("/pixels/ingest")) return "pixel_ingest";
  if (pathname.includes("/shopify/seo/preview")) return "seo_preview";
  if (pathname.includes("/shopify/seo/apply")) return "seo_apply";
  if (pathname.includes("/shopify/tags/batch")) return "tags_batch";
  if (pathname.includes("/seed-demo")) return "seed_demo";
  if (pathname.includes("/sessions/store")) return "session_store";
  if (pathname.includes("/sessions/retrieve")) return "session_retrieve";
  if (pathname.includes("/sessions/delete")) return "session_delete";
  if (pathname.includes("/sessions/list")) return "session_list";
  if (pathname.includes("/google-ads/auth/url")) return "gads_auth_url";
  if (pathname.includes("/google-ads/connection-status")) return "gads_connection_status";
  if (pathname.includes("/google-ads/accounts/select")) return "gads_accounts_select";
  if (pathname.includes("/google-ads/accounts")) return "gads_accounts";
  if (pathname.includes("/google-ads/disconnect")) return "gads_disconnect";
  if (pathname.includes("/google-ads/quota")) return "gads_quota";
  if (pathname.includes("/google-ads/campaigns/analyze-url")) return "gads_campaigns_analyze_url";
  if (pathname.includes("/google-ads/campaigns/create")) return "gads_campaigns_create";
  if (pathname.includes("/google-ads/campaigns") && pathname.includes("/pause")) return "gads_campaign_pause";
  if (pathname.includes("/google-ads/campaigns") && pathname.includes("/enable")) return "gads_campaign_enable";
  if (pathname.includes("/google-ads/campaigns") && pathname.includes("/budget")) return "gads_campaign_budget";
  if (pathname.includes("/google-ads/campaigns") && pathname.includes("/negatives")) return "gads_campaign_negatives";
  if (pathname.includes("/google-ads/campaigns") && pathname.includes("/search-terms")) return "gads_search_terms";
  if (pathname.includes("/google-ads/campaigns") && pathname.includes("/keywords")) return "gads_keywords";
  if (pathname.includes("/google-ads/campaigns") && pathname.includes("/details")) return "gads_campaign_details";
  if (pathname.includes("/google-ads/campaigns") && pathname.includes("/auction-insights")) return "gads_auction_insights";
  if (pathname.includes("/google-ads/campaigns")) return "gads_campaigns";
  if (pathname.includes("/google-ads/metrics")) return "gads_metrics";
  if (pathname.includes("/google-ads/sync")) return "gads_sync";
  if (pathname.includes("/google-ads/optimize")) return "gads_optimize";
  if (pathname.includes("/google-ads/autopilot/status")) return "gads_autopilot_status";
  if (pathname.includes("/google-ads/autopilot/config")) return "gads_autopilot_config";
  if (pathname.includes("/google-ads/autopilot/history")) return "gads_autopilot_history";
  return "unknown";
}
