var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: !0 });
};

// app/server/hmac.server.ts
var hmac_server_exports = {};
__export(hmac_server_exports, {
  backendFetch: () => backendFetch,
  backendFetchRaw: () => backendFetchRaw,
  backendFetchText: () => backendFetchText,
  sign: () => sign
});
import crypto from "crypto";
function sign(payload) {
  let secret = process.env.HMAC_SECRET || "change_me";
  return crypto.createHmac("sha256", secret).update(payload).digest("base64").replace(/=+$/, "");
}
async function backendFetch(pathname, method, body) {
  let base = (process.env.BACKEND_PUBLIC_URL || "http://localhost:3001/api").replace(/\/$/, ""), tenant = process.env.TENANT_ID || "TENANT_123", op = opKey(method, pathname), nonce = method === "POST" ? body?.nonce ?? Date.now() : void 0, payload = `${method}:${tenant}:${op}${nonce !== void 0 ? `:${nonce}` : ""}`, sig = sign(payload), sep = pathname.includes("?") ? "&" : "?", url = `${base}${pathname}${sep}tenant=${encodeURIComponent(tenant)}&sig=${encodeURIComponent(sig)}`, init = { method, headers: {} };
  method === "POST" && (init.headers["content-type"] = "application/json", init.body = JSON.stringify(body || {}));
  let res = await fetch(url, init), json7 = await res.json().catch(() => ({ ok: !1 }));
  return { status: res.status, json: json7 };
}
async function backendFetchRaw(pathname, method) {
  let base = (process.env.BACKEND_PUBLIC_URL || "http://localhost:3001/api").replace(/\/$/, ""), tenant = process.env.TENANT_ID || "TENANT_123", op = opKey(method, pathname), nonce = void 0, payload = `${method}:${tenant}:${op}${nonce !== void 0 ? `:${nonce}` : ""}`, sig = sign(payload), sep = pathname.includes("?") ? "&" : "?", url = `${base}${pathname}${sep}tenant=${encodeURIComponent(tenant)}&sig=${encodeURIComponent(sig)}`;
  return fetch(url, { method });
}
async function backendFetchText(pathname) {
  let base = (process.env.BACKEND_PUBLIC_URL || "http://localhost:3001/api").replace(/\/$/, ""), tenant = process.env.TENANT_ID || "TENANT_123", payload = `GET:${tenant}:script_raw`, sig = sign(payload), sep = pathname.includes("?") ? "&" : "?", url = `${base}${pathname}${sep}tenant=${encodeURIComponent(tenant)}&sig=${encodeURIComponent(sig)}`;
  return (await fetch(url)).text();
}
function opKey(method, pathname) {
  return pathname.includes("/autopilot/quickstart") ? "autopilot_quickstart" : pathname.includes("/connect/sheets/test") ? "sheets_test" : pathname.includes("/connect/sheets/save") ? "sheets_save" : pathname.includes("/promote/status") ? "promote_status" : pathname.includes("/insights/terms") ? "insights_terms" : pathname.includes("/run-logs") ? "run_logs" : pathname.includes("/insights/actions/apply") ? "insights_actions" : pathname.includes("/insights") ? "insights" : pathname.includes("/ads-script/raw") ? "script_raw" : pathname.includes("/summary") ? "summary_get" : pathname.includes("/diagnostics") ? "diagnostics" : pathname.endsWith("/config") ? "config" : pathname.includes("/upsertConfig") ? "upsertconfig" : pathname.includes("/jobs/autopilot_tick") ? "autopilot_tick" : pathname.includes("/cpc-ceilings/batch") ? "cpc_batch" : pathname.includes("/jobs/autopilot_tick") ? "autopilot_tick" : pathname.includes("/pixels/ingest") ? "pixel_ingest" : pathname.includes("/shopify/seo/preview") ? "seo_preview" : pathname.includes("/shopify/seo/apply") ? "seo_apply" : pathname.includes("/shopify/tags/batch") ? "tags_batch" : pathname.includes("/seed-demo") ? "seed_demo" : "unknown";
}
var init_hmac_server = __esm({
  "app/server/hmac.server.ts"() {
    "use strict";
  }
});

// app/entry.server.tsx
var entry_server_exports = {};
__export(entry_server_exports, {
  default: () => handleRequest
});
import { RemixServer } from "@remix-run/react";
import { renderToString } from "react-dom/server";
import { jsxDEV } from "react/jsx-dev-runtime";
function handleRequest(request, status, headers, context) {
  try {
    let markup = renderToString(/* @__PURE__ */ jsxDEV(RemixServer, { context, url: request.url }, void 0, !1, {
      fileName: "app/entry.server.tsx",
      lineNumber: 12,
      columnNumber: 35
    }, this));
    return headers.set("Content-Type", "text/html"), new Response("<!DOCTYPE html>" + markup, { status, headers });
  } catch (err) {
    try {
      console.error("SSR error:", err && (err.stack || err.message || String(err)));
    } catch {
    }
    let body = "<!DOCTYPE html><html><body><h1>Server Error</h1></body></html>";
    return headers.set("Content-Type", "text/html"), new Response(body, { status: 500, headers });
  }
}

// app/root.tsx
var root_exports = {};
__export(root_exports, {
  ErrorBoundary: () => ErrorBoundary,
  default: () => App,
  links: () => links
});
import { Links, Meta, Outlet, Scripts, ScrollRestoration, NavLink } from "@remix-run/react";

// node_modules/@shopify/polaris/build/esm/styles.css
var styles_default = "/build/_assets/styles-U2YDFDMP.css";

// app/root.tsx
import { AppProvider } from "@shopify/polaris";
import { jsxDEV as jsxDEV2 } from "react/jsx-dev-runtime";
var en = {}, links = () => [
  { rel: "stylesheet", href: styles_default }
];
function App() {
  return /* @__PURE__ */ jsxDEV2("html", { lang: "en", children: [
    /* @__PURE__ */ jsxDEV2("head", { children: [
      /* @__PURE__ */ jsxDEV2(Meta, {}, void 0, !1, {
        fileName: "app/root.tsx",
        lineNumber: 17,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV2(Links, {}, void 0, !1, {
        fileName: "app/root.tsx",
        lineNumber: 18,
        columnNumber: 9
      }, this)
    ] }, void 0, !0, {
      fileName: "app/root.tsx",
      lineNumber: 16,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV2("body", { children: [
      /* @__PURE__ */ jsxDEV2(AppProvider, { i18n: en, children: /* @__PURE__ */ jsxDEV2("div", { className: "Polaris-Page", style: { display: "flex", minHeight: "100vh" }, children: [
        /* @__PURE__ */ jsxDEV2("nav", { style: { width: 240, padding: 16, borderRight: "1px solid var(--p-color-border)" }, children: [
          /* @__PURE__ */ jsxDEV2("h3", { style: { marginBottom: 12 }, children: "Proofkit" }, void 0, !1, {
            fileName: "app/root.tsx",
            lineNumber: 24,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV2("ul", { style: { listStyle: "none", padding: 0, display: "grid", gap: 8 }, children: [
            /* @__PURE__ */ jsxDEV2("li", { children: /* @__PURE__ */ jsxDEV2(NavLink, { to: "/app/autopilot", children: "Autopilot" }, void 0, !1, {
              fileName: "app/root.tsx",
              lineNumber: 26,
              columnNumber: 21
            }, this) }, void 0, !1, {
              fileName: "app/root.tsx",
              lineNumber: 26,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV2("li", { children: /* @__PURE__ */ jsxDEV2(NavLink, { to: "/app/insights", children: "Insights" }, void 0, !1, {
              fileName: "app/root.tsx",
              lineNumber: 27,
              columnNumber: 21
            }, this) }, void 0, !1, {
              fileName: "app/root.tsx",
              lineNumber: 27,
              columnNumber: 17
            }, this)
          ] }, void 0, !0, {
            fileName: "app/root.tsx",
            lineNumber: 25,
            columnNumber: 15
          }, this)
        ] }, void 0, !0, {
          fileName: "app/root.tsx",
          lineNumber: 23,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV2("main", { style: { flex: 1, padding: 24 }, children: /* @__PURE__ */ jsxDEV2(Outlet, {}, void 0, !1, {
          fileName: "app/root.tsx",
          lineNumber: 31,
          columnNumber: 15
        }, this) }, void 0, !1, {
          fileName: "app/root.tsx",
          lineNumber: 30,
          columnNumber: 13
        }, this)
      ] }, void 0, !0, {
        fileName: "app/root.tsx",
        lineNumber: 22,
        columnNumber: 11
      }, this) }, void 0, !1, {
        fileName: "app/root.tsx",
        lineNumber: 21,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV2(ScrollRestoration, {}, void 0, !1, {
        fileName: "app/root.tsx",
        lineNumber: 35,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV2(Scripts, {}, void 0, !1, {
        fileName: "app/root.tsx",
        lineNumber: 36,
        columnNumber: 9
      }, this)
    ] }, void 0, !0, {
      fileName: "app/root.tsx",
      lineNumber: 20,
      columnNumber: 7
    }, this)
  ] }, void 0, !0, {
    fileName: "app/root.tsx",
    lineNumber: 15,
    columnNumber: 5
  }, this);
}
function ErrorBoundary() {
  return /* @__PURE__ */ jsxDEV2("pre", { style: { padding: 16, color: "#a00" }, children: "Something went wrong. Check the console for details." }, void 0, !1, {
    fileName: "app/root.tsx",
    lineNumber: 43,
    columnNumber: 10
  }, this);
}

// app/routes/app.insights.terms.csv.tsx
var app_insights_terms_csv_exports = {};
__export(app_insights_terms_csv_exports, {
  loader: () => loader
});
init_hmac_server();
async function loader({ request }) {
  let qs = new URL(request.url).searchParams.toString(), resp = await backendFetchRaw(`/insights/terms.csv?${qs}`, "GET"), buf = await resp.arrayBuffer();
  return new Response(Buffer.from(buf), {
    status: resp.status,
    headers: {
      "Content-Type": resp.headers.get("Content-Type") || "text/csv; charset=utf-8",
      "Content-Disposition": resp.headers.get("Content-Disposition") || 'attachment; filename="terms.csv"'
    }
  });
}

// app/routes/app.insights.terms.tsx
var app_insights_terms_exports = {};
__export(app_insights_terms_exports, {
  default: () => TermsExplorer,
  loader: () => loader2
});
import * as React from "react";
import { json } from "@remix-run/node";
import { useLoaderData, useSearchParams, Link, Form, useNavigation } from "@remix-run/react";
import { Fragment, jsxDEV as jsxDEV3 } from "react/jsx-dev-runtime";
async function loader2(args) {
  let url = new URL(args.request.url), w = url.searchParams.get("w") || "7d", q = url.searchParams.get("q") || "", campaign = url.searchParams.get("campaign") || "", min_clicks = url.searchParams.get("min_clicks") || "0", min_cost = url.searchParams.get("min_cost") || "0", sort = url.searchParams.get("sort") || "cost", dir = url.searchParams.get("dir") || "desc", page = url.searchParams.get("page") || "1", page_size = url.searchParams.get("page_size") || "50", { backendFetch: backendFetch2 } = await Promise.resolve().then(() => (init_hmac_server(), hmac_server_exports)), data = await backendFetch2(`/insights/terms?w=${w}&q=${encodeURIComponent(q)}&campaign=${encodeURIComponent(campaign)}&min_clicks=${min_clicks}&min_cost=${min_cost}&sort=${sort}&dir=${dir}&page=${page}&page_size=${page_size}&include_total=true`, "GET");
  return json(data.json || { ok: !1, rows: [] });
}
function TermsExplorer() {
  let data = useLoaderData(), [sp] = useSearchParams(), nav = useNavigation(), rows = data?.rows || [], [toast, setToast] = React.useState("");
  async function applyNegatives(terms) {
    let { backendFetch: backendFetch2 } = await Promise.resolve().then(() => (init_hmac_server(), hmac_server_exports)), actions = terms.map((t) => ({ type: "add_exact_negative", target: t })), r = await backendFetch2("/insights/actions/apply", "POST", { nonce: Date.now(), actions }), ok = r?.json?.ok, applied = r?.json?.applied?.length || 0, skipped = r?.json?.skipped?.length || 0;
    setToast(ok ? `Applied ${applied}, skipped ${skipped}` : "Failed to add negatives");
  }
  async function removeNegative(term) {
    let { backendFetch: backendFetch2 } = await Promise.resolve().then(() => (init_hmac_server(), hmac_server_exports)), r = await backendFetch2("/insights/actions/apply", "POST", { nonce: Date.now(), actions: [{ type: "remove_exact_negative", target: term }] }), ok = r?.json?.ok, applied = r?.json?.applied?.length || 0, skipped = r?.json?.skipped?.length || 0;
    setToast(ok ? `Applied ${applied}, skipped ${skipped}` : "Failed to remove");
  }
  let selected = React.useRef(/* @__PURE__ */ new Set()), toCsvHref = `/app/insights/terms.csv?${new URLSearchParams(Array.from(sp.entries())).toString()}`;
  return /* @__PURE__ */ jsxDEV3("div", { children: [
    /* @__PURE__ */ jsxDEV3("h1", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
      /* @__PURE__ */ jsxDEV3("span", { children: "Search Terms Explorer" }, void 0, !1, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 47,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV3(Link, { to: "/app/insights", children: "\u2190 Back to Insights" }, void 0, !1, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 48,
        columnNumber: 9
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/app.insights.terms.tsx",
      lineNumber: 46,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV3(Form, { method: "get", style: { display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 8, margin: "12px 0" }, children: [
      /* @__PURE__ */ jsxDEV3("input", { name: "q", placeholder: "term contains\u2026", defaultValue: sp.get("q") || "" }, void 0, !1, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 51,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV3("input", { name: "campaign", placeholder: "campaign contains\u2026", defaultValue: sp.get("campaign") || "" }, void 0, !1, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 52,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV3("select", { name: "w", defaultValue: sp.get("w") || "7d", children: [
        /* @__PURE__ */ jsxDEV3("option", { value: "24h", children: "24h" }, void 0, !1, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 54,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV3("option", { value: "7d", children: "7d" }, void 0, !1, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 55,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV3("option", { value: "30d", children: "30d" }, void 0, !1, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 56,
          columnNumber: 11
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 53,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV3("input", { name: "min_clicks", type: "number", step: "1", min: "0", defaultValue: sp.get("min_clicks") || "0" }, void 0, !1, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 58,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV3("input", { name: "min_cost", type: "number", step: "0.01", min: "0", defaultValue: sp.get("min_cost") || "0" }, void 0, !1, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 59,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV3("button", { type: "submit", disabled: nav.state !== "idle", children: "Filter" }, void 0, !1, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 60,
        columnNumber: 9
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/app.insights.terms.tsx",
      lineNumber: 50,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV3("div", { style: { margin: "8px 0", display: "flex", gap: 8, alignItems: "center" }, children: [
      /* @__PURE__ */ jsxDEV3(
        "button",
        {
          onClick: () => {
            let candidates = rows.filter((r) => !r.is_negative && selected.current.has(r.term)).map((r) => r.term);
            return applyNegatives(candidates);
          },
          disabled: nav.state !== "idle",
          children: "Add exact negative (selected)"
        },
        void 0,
        !1,
        {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 64,
          columnNumber: 9
        },
        this
      ),
      /* @__PURE__ */ jsxDEV3("a", { href: toCsvHref, children: /* @__PURE__ */ jsxDEV3("button", { type: "button", children: "Export CSV (current filters)" }, void 0, !1, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 71,
        columnNumber: 29
      }, this) }, void 0, !1, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 71,
        columnNumber: 9
      }, this),
      !!toast && /* @__PURE__ */ jsxDEV3("span", { role: "status", style: { fontSize: 12, opacity: 0.8 }, children: toast }, void 0, !1, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 72,
        columnNumber: 21
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/app.insights.terms.tsx",
      lineNumber: 63,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV3("table", { cellPadding: 6, style: { width: "100%", borderCollapse: "collapse" }, children: [
      /* @__PURE__ */ jsxDEV3("thead", { children: /* @__PURE__ */ jsxDEV3("tr", { children: [
        /* @__PURE__ */ jsxDEV3("th", { children: /* @__PURE__ */ jsxDEV3("input", { type: "checkbox", onChange: (e) => {
          e.currentTarget.checked ? rows.forEach((r) => selected.current.add(r.term)) : selected.current.clear();
        } }, void 0, !1, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 78,
          columnNumber: 17
        }, this) }, void 0, !1, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 78,
          columnNumber: 13
        }, this),
        ["term", "clicks", "cost", "conversions", "cpc", "cpa"].map((col) => {
          let is = (sp.get("sort") || "cost") === col, nextDir = is && (sp.get("dir") || "desc") === "desc" ? "asc" : "desc", u = new URLSearchParams(Array.from(sp.entries()));
          return u.set("sort", col), u.set("dir", nextDir), u.set("page", "1"), /* @__PURE__ */ jsxDEV3("th", { align: col === "term" ? "left" : "right", children: /* @__PURE__ */ jsxDEV3("a", { href: `?${u.toString()}`, style: { textDecoration: "none" }, children: [
            col.toUpperCase(),
            is ? sp.get("dir") === "asc" ? " \u25B2" : " \u25BC" : ""
          ] }, void 0, !0, {
            fileName: "app/routes/app.insights.terms.tsx",
            lineNumber: 88,
            columnNumber: 17
          }, this) }, col, !1, {
            fileName: "app/routes/app.insights.terms.tsx",
            lineNumber: 87,
            columnNumber: 22
          }, this);
        }),
        /* @__PURE__ */ jsxDEV3("th", { align: "right", children: "Action" }, void 0, !1, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 91,
          columnNumber: 13
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 77,
        columnNumber: 11
      }, this) }, void 0, !1, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 76,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV3("tbody", { children: [
        rows.map((r) => /* @__PURE__ */ jsxDEV3("tr", { children: [
          /* @__PURE__ */ jsxDEV3("td", { children: /* @__PURE__ */ jsxDEV3("input", { type: "checkbox", disabled: r.is_negative, onChange: (e) => {
            e.currentTarget.checked ? selected.current.add(r.term) : selected.current.delete(r.term);
          } }, void 0, !1, {
            fileName: "app/routes/app.insights.terms.tsx",
            lineNumber: 97,
            columnNumber: 19
          }, this) }, void 0, !1, {
            fileName: "app/routes/app.insights.terms.tsx",
            lineNumber: 97,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV3("td", { children: [
            r.term,
            r.is_negative && /* @__PURE__ */ jsxDEV3("span", { style: { marginLeft: 6, fontSize: 10, padding: "2px 6px", border: "1px solid #eee", borderRadius: 6 }, children: "NEGATIVE" }, void 0, !1, {
              fileName: "app/routes/app.insights.terms.tsx",
              lineNumber: 100,
              columnNumber: 35
            }, this)
          ] }, void 0, !0, {
            fileName: "app/routes/app.insights.terms.tsx",
            lineNumber: 98,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV3("td", { align: "right", children: r.clicks }, void 0, !1, {
            fileName: "app/routes/app.insights.terms.tsx",
            lineNumber: 102,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV3("td", { align: "right", children: [
            "$",
            Number(r.cost || 0).toFixed(2)
          ] }, void 0, !0, {
            fileName: "app/routes/app.insights.terms.tsx",
            lineNumber: 103,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV3("td", { align: "right", children: r.conversions }, void 0, !1, {
            fileName: "app/routes/app.insights.terms.tsx",
            lineNumber: 104,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV3("td", { align: "right", children: [
            "$",
            Number(r.cpc || 0).toFixed(2)
          ] }, void 0, !0, {
            fileName: "app/routes/app.insights.terms.tsx",
            lineNumber: 105,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV3("td", { align: "right", children: [
            "$",
            Number(r.cpa || 0).toFixed(2)
          ] }, void 0, !0, {
            fileName: "app/routes/app.insights.terms.tsx",
            lineNumber: 106,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV3("td", { align: "right", children: r.is_negative ? /* @__PURE__ */ jsxDEV3("button", { onClick: () => removeNegative(r.term), children: "Remove" }, void 0, !1, {
            fileName: "app/routes/app.insights.terms.tsx",
            lineNumber: 110,
            columnNumber: 21
          }, this) : /* @__PURE__ */ jsxDEV3("button", { onClick: () => applyNegatives([r.term]), children: "Add exact negative" }, void 0, !1, {
            fileName: "app/routes/app.insights.terms.tsx",
            lineNumber: 109,
            columnNumber: 21
          }, this) }, void 0, !1, {
            fileName: "app/routes/app.insights.terms.tsx",
            lineNumber: 107,
            columnNumber: 15
          }, this)
        ] }, r.term, !0, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 96,
          columnNumber: 13
        }, this)),
        !rows.length && /* @__PURE__ */ jsxDEV3("tr", { children: /* @__PURE__ */ jsxDEV3("td", { colSpan: 8, children: "No rows match your filters." }, void 0, !1, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 114,
          columnNumber: 32
        }, this) }, void 0, !1, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 114,
          columnNumber: 28
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 94,
        columnNumber: 9
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/app.insights.terms.tsx",
      lineNumber: 75,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV3("div", { style: { display: "flex", gap: 12, alignItems: "center", marginTop: 8 }, children: (() => {
      let total = data?.total || 0, page = data?.page || 1, pages = data?.pages || 1, prev = new URLSearchParams(Array.from(sp.entries()));
      prev.set("page", String(Math.max(1, page - 1)));
      let next = new URLSearchParams(Array.from(sp.entries()));
      return next.set("page", String(Math.min(pages, page + 1))), /* @__PURE__ */ jsxDEV3(Fragment, { children: [
        /* @__PURE__ */ jsxDEV3("span", { children: [
          page,
          " / ",
          pages,
          " (",
          total,
          " rows)"
        ] }, void 0, !0, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 125,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV3("a", { href: `?${prev.toString()}`, children: /* @__PURE__ */ jsxDEV3("button", { disabled: page <= 1, children: "Prev" }, void 0, !1, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 126,
          columnNumber: 47
        }, this) }, void 0, !1, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 126,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ jsxDEV3("a", { href: `?${next.toString()}`, children: /* @__PURE__ */ jsxDEV3("button", { disabled: page >= pages, children: "Next" }, void 0, !1, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 127,
          columnNumber: 47
        }, this) }, void 0, !1, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 127,
          columnNumber: 15
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 124,
        columnNumber: 13
      }, this);
    })() }, void 0, !1, {
      fileName: "app/routes/app.insights.terms.tsx",
      lineNumber: 118,
      columnNumber: 7
    }, this)
  ] }, void 0, !0, {
    fileName: "app/routes/app.insights.terms.tsx",
    lineNumber: 45,
    columnNumber: 5
  }, this);
}

// app/routes/local.autopilot.tsx
var local_autopilot_exports = {};
__export(local_autopilot_exports, {
  default: () => LocalAutopilot,
  loader: () => loader3
});
init_hmac_server();
import * as React2 from "react";
import { useLoaderData as useLoaderData2 } from "@remix-run/react";
import { jsxDEV as jsxDEV4 } from "react/jsx-dev-runtime";
async function loader3() {
  let diag = await backendFetch("/diagnostics", "GET"), status = await backendFetch("/promote/status", "GET");
  return { diag: diag.json || {}, status: status.json || {} };
}
function LocalAutopilot() {
  let { diag, status } = useLoaderData2(), [mode2, setMode] = React2.useState("protect"), [budget, setBudget] = React2.useState("3.00"), [cpc, setCpc] = React2.useState("0.20"), [url, setUrl] = React2.useState(""), [sheetId, setSheetId] = React2.useState(""), [tested, setTested] = React2.useState(!1), [toast, setToast] = React2.useState(""), [scriptCode, setScriptCode] = React2.useState(""), [showScript, setShowScript] = React2.useState(!1);
  async function run() {
    let body = { nonce: Date.now(), mode: mode2, daily_budget: Number(budget || 3), cpc_ceiling: Number(cpc || 0.2), final_url: url, start_in_minutes: 2, duration_minutes: 60 }, r = await backendFetch("/autopilot/quickstart", "POST", body);
    setToast(r.json?.ok ? "Scheduled" : "Failed");
  }
  async function testSheet() {
    let r = await backendFetch("/connect/sheets/test", "POST", { nonce: Date.now(), sheetId });
    setTested(!!r.json?.ok), setToast(r.json?.ok ? "Sheet OK" : "Sheet failed");
  }
  async function saveSheet() {
    let r = await backendFetch("/connect/sheets/save", "POST", { nonce: Date.now(), sheetId });
    setToast(r.json?.ok ? "Saved" : "Save failed");
  }
  async function loadScript() {
    let r = await backendFetch("/ads-script/raw", "GET");
    r.json?.ok && (setScriptCode(r.json.code || ""), setShowScript(!0));
  }
  return /* @__PURE__ */ jsxDEV4("div", { children: [
    /* @__PURE__ */ jsxDEV4("h1", { children: "Developer Preview: Autopilot" }, void 0, !1, {
      fileName: "app/routes/local.autopilot.tsx",
      lineNumber: 34,
      columnNumber: 7
    }, this),
    !diag?.sheets_ok && /* @__PURE__ */ jsxDEV4("section", { style: { border: "1px solid #eee", padding: 12 }, children: [
      /* @__PURE__ */ jsxDEV4("h3", { children: "Connect Sheets" }, void 0, !1, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 37,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV4("input", { value: sheetId, onChange: (e) => setSheetId(e.target.value), placeholder: "Google Sheet ID", style: { width: "100%" } }, void 0, !1, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 38,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV4("div", { style: { marginTop: 8, display: "flex", gap: 8 }, children: [
        /* @__PURE__ */ jsxDEV4("button", { onClick: testSheet, children: "Test" }, void 0, !1, {
          fileName: "app/routes/local.autopilot.tsx",
          lineNumber: 40,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV4("button", { disabled: !tested, onClick: saveSheet, children: "Save" }, void 0, !1, {
          fileName: "app/routes/local.autopilot.tsx",
          lineNumber: 41,
          columnNumber: 13
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 39,
        columnNumber: 11
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/local.autopilot.tsx",
      lineNumber: 36,
      columnNumber: 9
    }, this),
    toast && /* @__PURE__ */ jsxDEV4("p", { children: toast }, void 0, !1, {
      fileName: "app/routes/local.autopilot.tsx",
      lineNumber: 45,
      columnNumber: 17
    }, this),
    /* @__PURE__ */ jsxDEV4("section", { style: { border: "1px solid #eee", padding: 12 }, children: [
      /* @__PURE__ */ jsxDEV4("h3", { children: "Goal" }, void 0, !1, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 47,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV4("label", { children: [
        /* @__PURE__ */ jsxDEV4("input", { type: "radio", name: "goal", value: "protect", checked: mode2 === "protect", onChange: () => setMode("protect") }, void 0, !1, {
          fileName: "app/routes/local.autopilot.tsx",
          lineNumber: 48,
          columnNumber: 16
        }, this),
        " Protect"
      ] }, void 0, !0, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 48,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV4("br", {}, void 0, !1, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 48,
        columnNumber: 143
      }, this),
      /* @__PURE__ */ jsxDEV4("label", { children: [
        /* @__PURE__ */ jsxDEV4("input", { type: "radio", name: "goal", value: "grow", checked: mode2 === "grow", onChange: () => setMode("grow") }, void 0, !1, {
          fileName: "app/routes/local.autopilot.tsx",
          lineNumber: 49,
          columnNumber: 16
        }, this),
        " Grow"
      ] }, void 0, !0, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 49,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV4("br", {}, void 0, !1, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 49,
        columnNumber: 131
      }, this),
      /* @__PURE__ */ jsxDEV4("label", { children: [
        /* @__PURE__ */ jsxDEV4("input", { type: "radio", name: "goal", value: "scale", checked: mode2 === "scale", onChange: () => setMode("scale") }, void 0, !1, {
          fileName: "app/routes/local.autopilot.tsx",
          lineNumber: 50,
          columnNumber: 16
        }, this),
        " Scale"
      ] }, void 0, !0, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 50,
        columnNumber: 9
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/local.autopilot.tsx",
      lineNumber: 46,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV4("section", { style: { border: "1px solid #eee", padding: 12 }, children: [
      /* @__PURE__ */ jsxDEV4("h3", { children: "Budget & CPC" }, void 0, !1, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 53,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV4("input", { type: "number", step: "0.01", value: budget, onChange: (e) => setBudget(e.target.value), placeholder: "$ per day" }, void 0, !1, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 54,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV4("input", { type: "number", step: "0.01", value: cpc, onChange: (e) => setCpc(e.target.value), placeholder: "Max CPC" }, void 0, !1, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 55,
        columnNumber: 9
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/local.autopilot.tsx",
      lineNumber: 52,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV4("section", { style: { border: "1px solid #eee", padding: 12 }, children: [
      /* @__PURE__ */ jsxDEV4("h3", { children: "Landing URL" }, void 0, !1, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 58,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV4("input", { value: url, onChange: (e) => setUrl(e.target.value), placeholder: "https://example.com", style: { width: "100%" } }, void 0, !1, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 59,
        columnNumber: 9
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/local.autopilot.tsx",
      lineNumber: 57,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV4("div", { style: { marginTop: 8 }, children: [
      /* @__PURE__ */ jsxDEV4("button", { onClick: run, children: "Enable Autopilot" }, void 0, !1, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 62,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV4("button", { onClick: loadScript, style: { marginLeft: 8 }, children: "Copy Script" }, void 0, !1, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 63,
        columnNumber: 9
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/local.autopilot.tsx",
      lineNumber: 61,
      columnNumber: 7
    }, this),
    showScript && /* @__PURE__ */ jsxDEV4("section", { style: { border: "1px solid #eee", padding: 12, marginTop: 12 }, children: [
      /* @__PURE__ */ jsxDEV4("h3", { children: "Google Ads Script" }, void 0, !1, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 67,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV4("textarea", { readOnly: !0, value: scriptCode, style: { width: "100%", height: 240 } }, void 0, !1, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 68,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV4("div", { style: { marginTop: 8 }, children: /* @__PURE__ */ jsxDEV4("button", { onClick: () => {
        navigator.clipboard.writeText(scriptCode), setToast("Copied");
      }, children: "Copy" }, void 0, !1, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 70,
        columnNumber: 13
      }, this) }, void 0, !1, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 69,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV4("ol", { children: [
        /* @__PURE__ */ jsxDEV4("li", { children: "Google Ads \u2192 Tools \u2192 Bulk actions \u2192 Scripts \u2192 + New script" }, void 0, !1, {
          fileName: "app/routes/local.autopilot.tsx",
          lineNumber: 73,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV4("li", { children: "Paste, Authorize, then Preview first" }, void 0, !1, {
          fileName: "app/routes/local.autopilot.tsx",
          lineNumber: 74,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV4("li", { children: "If ok, Run once, then Schedule daily" }, void 0, !1, {
          fileName: "app/routes/local.autopilot.tsx",
          lineNumber: 75,
          columnNumber: 13
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 72,
        columnNumber: 11
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/local.autopilot.tsx",
      lineNumber: 66,
      columnNumber: 9
    }, this)
  ] }, void 0, !0, {
    fileName: "app/routes/local.autopilot.tsx",
    lineNumber: 33,
    columnNumber: 5
  }, this);
}

// app/routes/app.autopilot.tsx
var app_autopilot_exports = {};
__export(app_autopilot_exports, {
  action: () => action,
  default: () => Autopilot,
  loader: () => loader4
});
import * as React3 from "react";
import { useLoaderData as useLoaderData3, useFetcher, useNavigation as useNavigation2 } from "@remix-run/react";
import { json as json2 } from "@remix-run/node";
import { Fragment as Fragment2, jsxDEV as jsxDEV5 } from "react/jsx-dev-runtime";
async function loader4({ request }) {
  let { backendFetch: backendFetch2 } = await Promise.resolve().then(() => (init_hmac_server(), hmac_server_exports)), cfg = await backendFetch2("/config", "GET"), logs = await backendFetch2("/run-logs?limit=10", "GET");
  return json2({ cfg: cfg.json?.config || {}, logs: logs.json?.rows || [] });
}
async function action({ request }) {
  let form = await request.formData(), kind = String(form.get("kind") || ""), { backendFetch: backendFetch2, backendFetchText: backendFetchText2 } = await Promise.resolve().then(() => (init_hmac_server(), hmac_server_exports));
  if (kind === "save_basic") {
    let settings = {
      AP_OBJECTIVE: String(form.get("objective") || "protect"),
      AP_MODE: String(form.get("mode") || "auto"),
      AP_SCHEDULE: String(form.get("schedule") || "off"),
      AP_TARGET_CPA: String(form.get("target_cpa") || ""),
      daily_budget_cap_default: String(form.get("budget") || "3")
    }, r = await backendFetch2("/upsertConfig", "POST", { nonce: Date.now(), settings });
    return json2({ ok: !!r?.json?.ok, raw: r?.json });
  }
  if (kind === "run_preview") {
    let r = await backendFetch2("/jobs/autopilot_tick?force=1&dry=1", "POST", { nonce: Date.now() });
    return json2({ ok: !!r?.json?.ok, planned: r?.json?.planned || [], kpi: r?.json?.kpi, reasons: r?.json?.reasons || [] });
  }
  if (kind === "seed_demo") {
    let r = await backendFetch2("/seed-demo", "POST", { nonce: Date.now() });
    return json2({ ok: !!r?.json?.ok, seeded: r?.json?.seeded || null });
  }
  if (kind === "apply_plan") {
    let planStr = String(form.get("plan") || "[]"), plan = [];
    try {
      plan = JSON.parse(planStr);
    } catch {
    }
    let toAdd = plan.filter((p) => p?.type === "add_negative").map((p) => ({ action: "add_negative", term: p.term, match: p.match, scope: p.scope })), toCaps = plan.filter((p) => p?.type === "lower_cpc_ceiling").map((p) => ({ campaign: p.campaign || "*", value: p.amount })), results = {};
    if (toAdd.length) {
      let r1 = await backendFetch2("/insights/actions/apply", "POST", { actions: toAdd });
      results.negatives = r1?.json;
    }
    if (toCaps.length) {
      let r2 = await backendFetch2("/cpc-ceilings/batch", "POST", { nonce: Date.now(), items: toCaps });
      results.caps = r2?.json;
    }
    return json2({ ok: !0, results });
  }
  if (kind === "quickstart") {
    let body = {
      nonce: Date.now(),
      mode: String(form.get("mode") || "protect"),
      daily_budget: Number(form.get("budget") || 3),
      cpc_ceiling: Number(form.get("cpc") || 0.2),
      final_url: String(form.get("url") || "https://example.com"),
      start_in_minutes: 2,
      duration_minutes: 60
    }, r = await backendFetch2("/autopilot/quickstart", "POST", body);
    return json2(r.json || { ok: !1 });
  }
  if (kind === "script") {
    let code = await backendFetchText2("/ads-script/raw");
    return json2({ ok: !0, code });
  }
  return json2({ ok: !1 });
}
function Autopilot() {
  let { cfg, logs } = useLoaderData3(), fetcher = useFetcher(), nav = useNavigation2(), busy = fetcher.state !== "idle" || nav.state !== "idle", [plan, setPlan] = React3.useState([]), [toast, setToast] = React3.useState("");
  return React3.useEffect(() => {
    let d = fetcher.data;
    if (d && Array.isArray(d.planned))
      setPlan(d.planned), setToast(`Planned ${d.planned.length} action${d.planned.length !== 1 ? "s" : ""}`);
    else if (d && d.ok && d.seeded)
      try {
        let f = new FormData();
        f.set("kind", "run_preview"), fetcher.submit(f, { method: "post", replace: !0 });
      } catch {
      }
    else
      d && d.ok && d.results ? setToast("Applied plan") : d && d.ok && setToast("Saved");
  }, [fetcher.data]), /* @__PURE__ */ jsxDEV5("div", { style: { maxWidth: 720 }, children: [
    /* @__PURE__ */ jsxDEV5("h1", { children: "Autopilot" }, void 0, !1, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 98,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV5(fetcher.Form, { method: "post", style: { display: "grid", gap: 8 }, onSubmit: () => setPlan([]), children: [
      /* @__PURE__ */ jsxDEV5("input", { type: "hidden", name: "kind", value: "save_basic" }, void 0, !1, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 100,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV5("label", { children: [
        "Objective",
        /* @__PURE__ */ jsxDEV5("select", { name: "objective", defaultValue: cfg?.AP?.objective || "protect", children: [
          /* @__PURE__ */ jsxDEV5("option", { value: "grow", children: "Grow" }, void 0, !1, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 103,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV5("option", { value: "efficient", children: "Efficient" }, void 0, !1, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 104,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV5("option", { value: "protect", children: "Protect" }, void 0, !1, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 105,
            columnNumber: 13
          }, this)
        ] }, void 0, !0, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 102,
          columnNumber: 11
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 101,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV5("label", { children: [
        "Daily budget ",
        /* @__PURE__ */ jsxDEV5("input", { name: "budget", type: "number", step: "0.01", defaultValue: cfg?.daily_budget_cap_default || 3 }, void 0, !1, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 108,
          columnNumber: 29
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 108,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV5("label", { children: [
        "Automation",
        /* @__PURE__ */ jsxDEV5("select", { name: "mode", defaultValue: cfg?.AP?.mode || "auto", children: [
          /* @__PURE__ */ jsxDEV5("option", { value: "review", children: "Review" }, void 0, !1, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 111,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV5("option", { value: "auto", children: "Auto" }, void 0, !1, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 112,
            columnNumber: 13
          }, this)
        ] }, void 0, !0, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 110,
          columnNumber: 11
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 109,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV5("div", { children: /* @__PURE__ */ jsxDEV5("button", { type: "submit", disabled: busy, children: "Save" }, void 0, !1, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 116,
        columnNumber: 11
      }, this) }, void 0, !1, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 115,
        columnNumber: 9
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 99,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV5("div", { children: /* @__PURE__ */ jsxDEV5(fetcher.Form, { method: "post", replace: !0, style: { display: "inline-block", marginLeft: 8 }, children: [
      /* @__PURE__ */ jsxDEV5("input", { type: "hidden", name: "kind", value: "run_preview" }, void 0, !1, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 121,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV5("button", { type: "submit", disabled: busy, children: "Run now (preview)" }, void 0, !1, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 122,
        columnNumber: 11
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 120,
      columnNumber: 9
    }, this) }, void 0, !1, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 119,
      columnNumber: 7
    }, this),
    !!toast && /* @__PURE__ */ jsxDEV5("div", { style: { marginTop: 8, fontSize: 12, opacity: 0.8 }, children: toast }, void 0, !1, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 125,
      columnNumber: 19
    }, this),
    /* @__PURE__ */ jsxDEV5("h3", { style: { marginTop: 16 }, children: "Preview plan" }, void 0, !1, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 126,
      columnNumber: 7
    }, this),
    plan.length ? /* @__PURE__ */ jsxDEV5(Fragment2, { children: [
      /* @__PURE__ */ jsxDEV5("ul", { style: { margin: "8px 0" }, children: plan.map((a, i) => /* @__PURE__ */ jsxDEV5("li", { children: [
        /* @__PURE__ */ jsxDEV5("code", { children: a.type }, void 0, !1, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 130,
          columnNumber: 43
        }, this),
        " ",
        a.term ? `\u201C${a.term}\u201D` : "",
        " ",
        a.match ? `\u2022 ${a.match}` : "",
        " ",
        a.scope ? `@ ${a.scope}` : "",
        " ",
        a.amount ? `\u2192 ${a.amount}` : ""
      ] }, i, !0, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 130,
        columnNumber: 31
      }, this)) }, void 0, !1, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 129,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV5(fetcher.Form, { method: "post", replace: !0, children: [
        /* @__PURE__ */ jsxDEV5("input", { type: "hidden", name: "kind", value: "apply_plan" }, void 0, !1, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 133,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV5("input", { type: "hidden", name: "plan", value: JSON.stringify(plan) }, void 0, !1, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 134,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV5("button", { type: "submit", disabled: busy, children: "Apply plan" }, void 0, !1, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 135,
          columnNumber: 13
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 132,
        columnNumber: 11
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 128,
      columnNumber: 9
    }, this) : /* @__PURE__ */ jsxDEV5("div", { children: [
      /* @__PURE__ */ jsxDEV5("div", { children: "No pending actions. Click \u201CRun now (preview)\u201D." }, void 0, !1, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 140,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV5("div", { style: { marginTop: 8 }, children: [
        /* @__PURE__ */ jsxDEV5("strong", { children: "Status & Gating" }, void 0, !1, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 142,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV5("ul", { style: { margin: "4px 0", paddingLeft: "18px" }, children: (Array.isArray(fetcher.data?.reasons) ? fetcher.data.reasons : []).map((r, idx) => /* @__PURE__ */ jsxDEV5("li", { children: String(r || "") }, idx, !1, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 144,
          columnNumber: 122
        }, this)) }, void 0, !1, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 143,
          columnNumber: 13
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 141,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV5(fetcher.Form, { method: "post", replace: !0, children: [
        /* @__PURE__ */ jsxDEV5("input", { type: "hidden", name: "kind", value: "seed_demo" }, void 0, !1, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 148,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV5("button", { type: "submit", disabled: busy, style: { marginTop: 8 }, children: "Seed demo data" }, void 0, !1, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 149,
          columnNumber: 13
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 147,
        columnNumber: 11
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 139,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV5("h3", { style: { marginTop: 16 }, children: "Recent activity" }, void 0, !1, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 153,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV5("ul", { children: (logs || []).map((l, i) => /* @__PURE__ */ jsxDEV5("li", { children: [
      /* @__PURE__ */ jsxDEV5("code", { children: l.timestamp }, void 0, !1, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 154,
        columnNumber: 57
      }, this),
      " \u2014 ",
      l.message
    ] }, i, !0, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 154,
      columnNumber: 45
    }, this)) }, void 0, !1, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 154,
      columnNumber: 7
    }, this)
  ] }, void 0, !0, {
    fileName: "app/routes/app.autopilot.tsx",
    lineNumber: 97,
    columnNumber: 5
  }, this);
}

// app/routes/app.advanced.tsx
var app_advanced_exports = {};
__export(app_advanced_exports, {
  action: () => action2,
  default: () => Advanced,
  loader: () => loader5
});
import * as React4 from "react";
import { json as json3 } from "@remix-run/node";
import { useLoaderData as useLoaderData4, Form as Form2, useNavigation as useNavigation3 } from "@remix-run/react";
import { jsxDEV as jsxDEV6 } from "react/jsx-dev-runtime";
async function loader5({ request }) {
  let { backendFetch: backendFetch2 } = await Promise.resolve().then(() => (init_hmac_server(), hmac_server_exports)), cfg = await backendFetch2("/config", "GET");
  return json3({ cfg: cfg.json?.config || {} });
}
async function action2({ request }) {
  let fd = await request.formData(), settings = {
    AP_SCHEDULE: String(fd.get("schedule") || "off"),
    AP_TARGET_CPA: String(fd.get("target_cpa") || ""),
    AP_TARGET_ROAS: String(fd.get("target_roas") || ""),
    AP_DESIRED_KEYWORDS_PIPE: String(fd.get("desired_keywords") || "").split(/\r?\n|,|[|]/).map((s) => s.trim()).filter(Boolean).join("|"),
    AP_PLAYBOOK_PROMPT: String(fd.get("playbook") || "")
  }, { backendFetch: backendFetch2 } = await Promise.resolve().then(() => (init_hmac_server(), hmac_server_exports));
  if (await backendFetch2("/upsertConfig", "POST", { nonce: Date.now(), settings }), fd.get("save_caps") === "1") {
    let caps_campaign = fd.getAll("caps_campaign"), caps_value = fd.getAll("caps_value"), items = caps_campaign.map((c, i) => ({ campaign: c, value: Number(caps_value[i] || 0) })).filter((x) => !Number.isNaN(x.value));
    items.length && await backendFetch2("/cpc-ceilings/batch", "POST", { nonce: Date.now(), items });
  }
  if (fd.get("tick") === "1" && await backendFetch2("/jobs/autopilot_tick", "POST", { nonce: Date.now() }), fd.get("seo_preview") === "1") {
    let ids = String(fd.get("product_ids") || "").split(/\s|,|\|/).map((s) => s.trim()).filter(Boolean), strategy = String(fd.get("strategy") || "template"), templateTitle = String(fd.get("template_title") || ""), templateDescription = String(fd.get("template_description") || ""), r = await backendFetch2("/shopify/seo/preview", "POST", { nonce: Date.now(), productIds: ids, strategy, templateTitle, templateDescription });
    return json3({ ok: !0, preview: r.json?.proposals || [], dry: !0 });
  }
  if (fd.get("seo_apply") === "1") {
    let changes = JSON.parse(String(fd.get("changes_json") || "[]")), r = await backendFetch2("/shopify/seo/apply", "POST", { nonce: Date.now(), changes });
    return json3({ ok: r.json?.ok, applied: r.json?.applied || 0 });
  }
  if (fd.get("tags_apply") === "1") {
    let ids = String(fd.get("product_ids") || "").split(/\s|,|\|/).map((s) => s.trim()).filter(Boolean), add = String(fd.get("tags_add") || "").split(/,|\|/).map((s) => s.trim()).filter(Boolean), remove = String(fd.get("tags_remove") || "").split(/,|\|/).map((s) => s.trim()).filter(Boolean), r = await backendFetch2("/shopify/tags/batch", "POST", { nonce: Date.now(), productIds: ids, add, remove });
    return json3({ ok: r.json?.ok, updated: r.json?.updated || 0 });
  }
  return json3({ ok: !0 });
}
function Advanced() {
  let cfg = useLoaderData4()?.cfg || {}, nav = useNavigation3(), caps = cfg?.CPC_CEILINGS || {}, capRows = Object.entries(caps).map(([campaign, value]) => ({ campaign, value })), [preview, setPreview] = React4.useState([]);
  return /* @__PURE__ */ jsxDEV6("div", { style: { maxWidth: 920 }, children: [
    /* @__PURE__ */ jsxDEV6("h1", { children: "Advanced" }, void 0, !1, {
      fileName: "app/routes/app.advanced.tsx",
      lineNumber: 63,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV6(Form2, { method: "post", style: { display: "grid", gap: 16 }, children: [
      /* @__PURE__ */ jsxDEV6("fieldset", { style: { border: "1px solid #eee", padding: 12 }, children: [
        /* @__PURE__ */ jsxDEV6("legend", { children: "Schedule" }, void 0, !1, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 66,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV6("select", { name: "schedule", defaultValue: cfg?.AP?.schedule || "off", children: [
          /* @__PURE__ */ jsxDEV6("option", { value: "off", children: "Off" }, void 0, !1, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 68,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV6("option", { value: "hourly", children: "Hourly" }, void 0, !1, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 68,
            columnNumber: 45
          }, this),
          /* @__PURE__ */ jsxDEV6("option", { value: "daily", children: "Daily (9am)" }, void 0, !1, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 69,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV6("option", { value: "weekdays_9_18", children: "Weekdays 9\u201318" }, void 0, !1, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 69,
            columnNumber: 55
          }, this)
        ] }, void 0, !0, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 67,
          columnNumber: 11
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 65,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV6("fieldset", { style: { border: "1px solid #eee", padding: 12 }, children: [
        /* @__PURE__ */ jsxDEV6("legend", { children: "Targets" }, void 0, !1, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 74,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV6("label", { children: [
          "Target CPA ",
          /* @__PURE__ */ jsxDEV6("input", { name: "target_cpa", type: "number", step: "0.01", defaultValue: cfg?.AP?.target_cpa || "" }, void 0, !1, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 75,
            columnNumber: 29
          }, this)
        ] }, void 0, !0, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 75,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV6("label", { children: [
          "Target ROAS ",
          /* @__PURE__ */ jsxDEV6("input", { name: "target_roas", type: "number", step: "0.01", defaultValue: cfg?.AP?.target_roas || "" }, void 0, !1, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 76,
            columnNumber: 30
          }, this)
        ] }, void 0, !0, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 76,
          columnNumber: 11
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 73,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV6("fieldset", { style: { border: "1px solid #eee", padding: 12 }, children: [
        /* @__PURE__ */ jsxDEV6("legend", { children: "CPC ceilings (set 0 to effectively remove)" }, void 0, !1, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 80,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV6("div", { id: "caps", style: { display: "grid", gridTemplateColumns: "1fr 140px", gap: 8 }, children: [
          capRows.map((row, i) => /* @__PURE__ */ jsxDEV6(React4.Fragment, { children: [
            /* @__PURE__ */ jsxDEV6("input", { name: "caps_campaign", defaultValue: row.campaign, placeholder: "campaign (or *)" }, void 0, !1, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 84,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV6("input", { name: "caps_value", type: "number", step: "0.01", defaultValue: row.value }, void 0, !1, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 85,
              columnNumber: 17
            }, this)
          ] }, i, !0, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 83,
            columnNumber: 15
          }, this)),
          /* @__PURE__ */ jsxDEV6("input", { name: "caps_campaign", placeholder: "campaign (or *)" }, void 0, !1, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 88,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV6("input", { name: "caps_value", type: "number", step: "0.01", placeholder: "0.20" }, void 0, !1, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 89,
            columnNumber: 13
          }, this)
        ] }, void 0, !0, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 81,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV6("button", { type: "submit", name: "save_caps", value: "1", disabled: nav.state !== "idle", style: { marginTop: 8 }, children: "Save caps" }, void 0, !1, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 91,
          columnNumber: 11
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 79,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV6("fieldset", { style: { border: "1px solid #eee", padding: 12 }, children: [
        /* @__PURE__ */ jsxDEV6("legend", { children: "SEO & Keywords" }, void 0, !1, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 95,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV6("div", { style: { display: "grid", gap: 8 }, children: [
          /* @__PURE__ */ jsxDEV6("textarea", { name: "product_ids", rows: 3, placeholder: "Product IDs or handles (space/comma/| separated)" }, void 0, !1, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 97,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV6("div", { children: [
            /* @__PURE__ */ jsxDEV6("label", { children: [
              /* @__PURE__ */ jsxDEV6("input", { type: "radio", name: "strategy", value: "template", defaultChecked: !0 }, void 0, !1, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 99,
                columnNumber: 22
              }, this),
              " Template"
            ] }, void 0, !0, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 99,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV6("label", { children: [
              /* @__PURE__ */ jsxDEV6("input", { type: "radio", name: "strategy", value: "ai", style: { marginLeft: 12 } }, void 0, !1, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 100,
                columnNumber: 22
              }, this),
              " AI"
            ] }, void 0, !0, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 100,
              columnNumber: 15
            }, this)
          ] }, void 0, !0, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 98,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV6("input", { name: "template_title", placeholder: "Title template e.g., {{title}} | Free Shipping" }, void 0, !1, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 102,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV6("input", { name: "template_description", placeholder: "Description template e.g., Discover {{title}} by {{brand}}." }, void 0, !1, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 103,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV6("div", { style: { display: "flex", gap: 8 }, children: [
            /* @__PURE__ */ jsxDEV6("button", { type: "submit", name: "seo_preview", value: "1", disabled: nav.state !== "idle", children: "Preview" }, void 0, !1, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 105,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV6("button", { type: "submit", name: "seo_apply", value: "1", disabled: nav.state !== "idle", children: "Apply" }, void 0, !1, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 106,
              columnNumber: 15
            }, this)
          ] }, void 0, !0, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 104,
            columnNumber: 13
          }, this)
        ] }, void 0, !0, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 96,
          columnNumber: 11
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 94,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV6("fieldset", { style: { border: "1px solid #eee", padding: 12 }, children: [
        /* @__PURE__ */ jsxDEV6("legend", { children: "Desired keywords" }, void 0, !1, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 112,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV6("textarea", { name: "desired_keywords", rows: 4, placeholder: "One per line, comma, or |", children: (cfg?.AP?.desired_keywords || []).join(`
`) }, void 0, !1, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 113,
          columnNumber: 11
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 111,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV6("fieldset", { style: { border: "1px solid #eee", padding: 12 }, children: [
        /* @__PURE__ */ jsxDEV6("legend", { children: "AI playbook" }, void 0, !1, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 117,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV6("textarea", { name: "playbook", rows: 6, placeholder: "Guidance for Autopilot and SEO generation", children: cfg?.AP?.playbook_prompt || "" }, void 0, !1, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 118,
          columnNumber: 11
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 116,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV6("div", { children: /* @__PURE__ */ jsxDEV6("button", { type: "submit", name: "tick", value: "1", disabled: nav.state !== "idle", children: "Run now" }, void 0, !1, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 122,
        columnNumber: 11
      }, this) }, void 0, !1, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 121,
        columnNumber: 9
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/app.advanced.tsx",
      lineNumber: 64,
      columnNumber: 7
    }, this),
    Array.isArray(preview) && preview.length > 0 && /* @__PURE__ */ jsxDEV6("div", { style: { marginTop: 12 }, children: [
      /* @__PURE__ */ jsxDEV6("h3", { children: "Preview" }, void 0, !1, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 128,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV6("table", { cellPadding: 6, style: { width: "100%", borderCollapse: "collapse" }, children: [
        /* @__PURE__ */ jsxDEV6("thead", { children: /* @__PURE__ */ jsxDEV6("tr", { children: [
          /* @__PURE__ */ jsxDEV6("th", { align: "left", children: "Product" }, void 0, !1, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 130,
            columnNumber: 24
          }, this),
          /* @__PURE__ */ jsxDEV6("th", { align: "left", children: "Title" }, void 0, !1, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 130,
            columnNumber: 53
          }, this),
          /* @__PURE__ */ jsxDEV6("th", { align: "left", children: "Description" }, void 0, !1, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 130,
            columnNumber: 80
          }, this),
          /* @__PURE__ */ jsxDEV6("th", { align: "left", children: "Image alt" }, void 0, !1, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 130,
            columnNumber: 113
          }, this)
        ] }, void 0, !0, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 130,
          columnNumber: 20
        }, this) }, void 0, !1, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 130,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV6("tbody", { children: preview.map((p, i) => /* @__PURE__ */ jsxDEV6("tr", { children: [
          /* @__PURE__ */ jsxDEV6("td", { children: p.productId }, void 0, !1, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 132,
            columnNumber: 59
          }, this),
          /* @__PURE__ */ jsxDEV6("td", { children: p.title }, void 0, !1, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 132,
            columnNumber: 81
          }, this),
          /* @__PURE__ */ jsxDEV6("td", { children: p.description }, void 0, !1, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 132,
            columnNumber: 99
          }, this),
          /* @__PURE__ */ jsxDEV6("td", { children: p.images?.[0]?.altText || "" }, void 0, !1, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 132,
            columnNumber: 123
          }, this)
        ] }, i, !0, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 132,
          columnNumber: 47
        }, this)) }, void 0, !1, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 131,
          columnNumber: 13
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 129,
        columnNumber: 11
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/app.advanced.tsx",
      lineNumber: 127,
      columnNumber: 9
    }, this)
  ] }, void 0, !0, {
    fileName: "app/routes/app.advanced.tsx",
    lineNumber: 62,
    columnNumber: 5
  }, this);
}

// app/routes/app.insights.tsx
var app_insights_exports = {};
__export(app_insights_exports, {
  default: () => Insights,
  loader: () => loader6
});
import * as React5 from "react";
import { json as json4 } from "@remix-run/node";
import { useLoaderData as useLoaderData5, useNavigation as useNavigation4, useSearchParams as useSearchParams2, Link as Link2, useFetcher as useFetcher2 } from "@remix-run/react";
import { jsxDEV as jsxDEV7 } from "react/jsx-dev-runtime";
function SimpleChart({ data }) {
  return data?.length ? /* @__PURE__ */ jsxDEV7("div", { style: { height: 180, border: "1px solid #eee", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }, children: [
    "Chart: ",
    data.length,
    " points"
  ] }, void 0, !0, {
    fileName: "app/routes/app.insights.tsx",
    lineNumber: 8,
    columnNumber: 10
  }, this) : /* @__PURE__ */ jsxDEV7("div", { style: { height: 180, border: "1px solid #eee", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }, children: "No data" }, void 0, !1, {
    fileName: "app/routes/app.insights.tsx",
    lineNumber: 7,
    columnNumber: 29
  }, this);
}
async function loader6(args) {
  let w = new URL(args.request.url).searchParams.get("w") === "24h" ? "24h" : "7d", { backendFetch: backendFetch2 } = await Promise.resolve().then(() => (init_hmac_server(), hmac_server_exports)), r = await backendFetch2(`/insights?w=${w}`, "GET"), logs = await backendFetch2("/run-logs?limit=10", "GET"), base = { ok: !1, w, kpi: { clicks: 0, cost: 0, conversions: 0, impressions: 0, ctr: 0, cpc: 0, cpa: 0 }, top_terms: [], series: [], explain: [], logs: [] }, merged = r?.json?.ok ? { ...r.json, logs: logs.json?.rows || [] } : base;
  return json4(merged);
}
function Insights() {
  let data = useLoaderData5(), [sp] = useSearchParams2(), nav = useNavigation4(), fetcher = useFetcher2(), [toast, setToast] = React5.useState(""), w = sp.get("w") === "24h" ? "24h" : data?.w || "7d", k = data?.kpi || {}, terms = data?.top_terms || [], series = data?.series || [], explain = data?.explain || [], logs = data?.logs || [];
  return /* @__PURE__ */ jsxDEV7("div", { children: [
    /* @__PURE__ */ jsxDEV7("h1", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
      /* @__PURE__ */ jsxDEV7("span", { children: "Insights" }, void 0, !1, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 37,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV7("span", { style: { display: "inline-flex", gap: 8 }, children: [
        /* @__PURE__ */ jsxDEV7(Link2, { to: "/app/insights?w=7d", children: /* @__PURE__ */ jsxDEV7("button", { disabled: w === "7d" || nav.state !== "idle", children: "7d" }, void 0, !1, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 39,
          columnNumber: 41
        }, this) }, void 0, !1, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 39,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV7(Link2, { to: "/app/insights?w=24h", children: /* @__PURE__ */ jsxDEV7("button", { disabled: w === "24h" || nav.state !== "idle", children: "24h" }, void 0, !1, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 40,
          columnNumber: 42
        }, this) }, void 0, !1, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 40,
          columnNumber: 11
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 38,
        columnNumber: 9
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 36,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV7("div", { style: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12 }, children: [
      /* @__PURE__ */ jsxDEV7(Card, { label: "Clicks", value: k.clicks }, void 0, !1, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 44,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV7(Card, { label: "Cost", value: fmt(k.cost) }, void 0, !1, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 45,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV7(Card, { label: "Conv.", value: k.conversions }, void 0, !1, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 46,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV7(Card, { label: "Impr.", value: k.impressions }, void 0, !1, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 47,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV7(Card, { label: "CTR", value: pct(k.ctr) }, void 0, !1, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 48,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV7(Card, { label: "CPC", value: fmt(k.cpc) }, void 0, !1, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 49,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV7(Card, { label: "CPA", value: fmt(k.cpa) }, void 0, !1, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 50,
        columnNumber: 9
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 43,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV7("h3", { style: { marginTop: 16 }, children: [
      "Trend (",
      w,
      ")"
    ] }, void 0, !0, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 52,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV7(SimpleChart, { data: series }, void 0, !1, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 53,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV7("h3", { style: { marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
      /* @__PURE__ */ jsxDEV7("span", { children: [
        "Top search terms (",
        w,
        ")"
      ] }, void 0, !0, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 55,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV7(Link2, { to: `/app/insights/terms?w=${w}`, children: /* @__PURE__ */ jsxDEV7("button", { children: "View all terms" }, void 0, !1, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 56,
        columnNumber: 49
      }, this) }, void 0, !1, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 56,
        columnNumber: 9
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 54,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV7("h3", { style: { marginTop: 16 }, children: "Activity (last 10)" }, void 0, !1, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 58,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV7("ul", { children: [
      logs.map((l, i) => /* @__PURE__ */ jsxDEV7("li", { children: [
        /* @__PURE__ */ jsxDEV7("code", { children: l.timestamp }, void 0, !1, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 60,
          columnNumber: 50
        }, this),
        " \u2014 ",
        l.message
      ] }, i, !0, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 60,
        columnNumber: 38
      }, this)),
      !logs.length && /* @__PURE__ */ jsxDEV7("li", { children: "No recent activity." }, void 0, !1, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 61,
        columnNumber: 26
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 59,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV7("table", { cellPadding: 6, style: { width: "100%", borderCollapse: "collapse" }, children: [
      /* @__PURE__ */ jsxDEV7("thead", { children: /* @__PURE__ */ jsxDEV7("tr", { children: [
        /* @__PURE__ */ jsxDEV7("th", { align: "left", children: "Term" }, void 0, !1, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 64,
          columnNumber: 20
        }, this),
        /* @__PURE__ */ jsxDEV7("th", { align: "right", children: "Clicks" }, void 0, !1, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 64,
          columnNumber: 46
        }, this),
        /* @__PURE__ */ jsxDEV7("th", { align: "right", children: "Cost" }, void 0, !1, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 64,
          columnNumber: 75
        }, this),
        /* @__PURE__ */ jsxDEV7("th", { align: "right", children: "Conv." }, void 0, !1, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 64,
          columnNumber: 102
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 64,
        columnNumber: 16
      }, this) }, void 0, !1, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 64,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV7("tbody", { children: [
        terms.map((t, i) => /* @__PURE__ */ jsxDEV7("tr", { children: [
          /* @__PURE__ */ jsxDEV7("td", { children: t.term }, void 0, !1, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 68,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV7("td", { align: "right", children: t.clicks }, void 0, !1, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 69,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV7("td", { align: "right", children: fmt(t.cost) }, void 0, !1, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 70,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV7("td", { align: "right", children: t.conversions }, void 0, !1, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 71,
            columnNumber: 15
          }, this)
        ] }, i, !0, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 67,
          columnNumber: 13
        }, this)),
        !terms.length && /* @__PURE__ */ jsxDEV7("tr", { children: /* @__PURE__ */ jsxDEV7("td", { colSpan: 4, children: "Not enough data yet." }, void 0, !1, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 74,
          columnNumber: 33
        }, this) }, void 0, !1, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 74,
          columnNumber: 29
        }, this)
      ] }, void 0, !0, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 65,
        columnNumber: 9
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 63,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV7("h3", { style: { marginTop: 16 }, children: "Explain my spend" }, void 0, !1, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 77,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV7("ul", { children: [
      explain.map((e, i) => {
        let disabled = fetcher.state !== "idle", onApply = async () => {
          let { backendFetch: backendFetch2 } = await Promise.resolve().then(() => (init_hmac_server(), hmac_server_exports)), body = { nonce: Date.now(), actions: [] };
          if (e.action === "add_exact_negative")
            body.actions.push({ type: "add_exact_negative", target: e.target });
          else if (e.action === "lower_cpc_ceiling") {
            let cur = Number(data?.kpi?.cpc || 0), newCpc = Math.max(0, isFinite(cur) && cur > 0 ? cur * 0.8 : 0.15);
            body.actions.push({ type: "lower_cpc_ceiling", campaign: "*", amount: Number(newCpc.toFixed(2)) });
          } else
            return;
          let r = await backendFetch2("/insights/actions/apply", "POST", body);
          setToast(r?.json?.ok ? "Action applied" : "Action failed");
          try {
            let { backendFetch: bf } = await Promise.resolve().then(() => (init_hmac_server(), hmac_server_exports)), logs2 = await bf("/run-logs?limit=10", "GET");
            data.logs = logs2.json?.rows || [];
          } catch {
          }
        };
        return /* @__PURE__ */ jsxDEV7("li", { style: { marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
          /* @__PURE__ */ jsxDEV7("span", { children: [
            /* @__PURE__ */ jsxDEV7("b", { children: e.label }, void 0, !1, {
              fileName: "app/routes/app.insights.tsx",
              lineNumber: 103,
              columnNumber: 21
            }, this),
            " \u2014 ",
            e.reason,
            ". Suggest: ",
            /* @__PURE__ */ jsxDEV7("code", { children: e.action }, void 0, !1, {
              fileName: "app/routes/app.insights.tsx",
              lineNumber: 103,
              columnNumber: 61
            }, this),
            e.target ? ` (${e.target})` : ""
          ] }, void 0, !0, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 103,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV7("button", { onClick: onApply, disabled, style: { padding: "6px 10px", border: "1px solid #eee", borderRadius: 6 }, children: "Apply" }, void 0, !1, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 104,
            columnNumber: 15
          }, this)
        ] }, i, !0, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 102,
          columnNumber: 13
        }, this);
      }),
      !explain.length && /* @__PURE__ */ jsxDEV7("li", { children: "No high-confidence suggestions yet." }, void 0, !1, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 108,
        columnNumber: 29
      }, this)
    ] }, void 0, !0, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 78,
      columnNumber: 7
    }, this),
    !!toast && /* @__PURE__ */ jsxDEV7("div", { style: { marginTop: 6, fontSize: 12, opacity: 0.8 }, children: toast }, void 0, !1, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 110,
      columnNumber: 19
    }, this)
  ] }, void 0, !0, {
    fileName: "app/routes/app.insights.tsx",
    lineNumber: 35,
    columnNumber: 5
  }, this);
}
function Card({ label, value }) {
  return /* @__PURE__ */ jsxDEV7("div", { style: { border: "1px solid #eee", borderRadius: 8, padding: 12 }, children: [
    /* @__PURE__ */ jsxDEV7("div", { style: { fontSize: 12, opacity: 0.7 }, children: label }, void 0, !1, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 117,
      columnNumber: 5
    }, this),
    /* @__PURE__ */ jsxDEV7("div", { style: { fontSize: 20, fontWeight: 600 }, children: value ?? "\u2014" }, void 0, !1, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 118,
      columnNumber: 5
    }, this)
  ] }, void 0, !0, {
    fileName: "app/routes/app.insights.tsx",
    lineNumber: 116,
    columnNumber: 10
  }, this);
}
function fmt(n) {
  return typeof n == "number" ? `$${n.toFixed(2)}` : "\u2014";
}
function pct(n) {
  return typeof n == "number" ? `${(n * 100).toFixed(2)}%` : "\u2014";
}

// app/routes/_health.tsx
var health_exports = {};
__export(health_exports, {
  default: () => Health,
  loader: () => loader7
});
import { json as json5 } from "@remix-run/node";
import { jsxDEV as jsxDEV8 } from "react/jsx-dev-runtime";
var loader7 = () => json5({ ok: !0 });
function Health() {
  return /* @__PURE__ */ jsxDEV8("pre", { children: "OK" }, void 0, !1, {
    fileName: "app/routes/_health.tsx",
    lineNumber: 6,
    columnNumber: 10
  }, this);
}

// app/routes/_index.tsx
var index_exports = {};
__export(index_exports, {
  default: () => Index,
  loader: () => loader8
});
import { redirect } from "@remix-run/node";
async function loader8() {
  return redirect("/app/autopilot");
}
function Index() {
  return null;
}

// app/routes/health.tsx
var health_exports2 = {};
__export(health_exports2, {
  default: () => Health2,
  loader: () => loader9
});
import { json as json6 } from "@remix-run/node";
import { jsxDEV as jsxDEV9 } from "react/jsx-dev-runtime";
var loader9 = () => json6({ ok: !0 });
function Health2() {
  return /* @__PURE__ */ jsxDEV9("pre", { children: "OK" }, void 0, !1, {
    fileName: "app/routes/health.tsx",
    lineNumber: 6,
    columnNumber: 10
  }, this);
}

// server-assets-manifest:@remix-run/dev/assets-manifest
var assets_manifest_default = { entry: { module: "/build/entry.client-Z7CV5KIW.js", imports: ["/build/_shared/chunk-O4BRYNJ4.js", "/build/_shared/chunk-SY63TXKO.js", "/build/_shared/chunk-XGOTYLZ5.js", "/build/_shared/chunk-7P7RPFUO.js", "/build/_shared/chunk-UWV35TSL.js", "/build/_shared/chunk-U4FRFQSK.js", "/build/_shared/chunk-7M6SC7J5.js", "/build/_shared/chunk-PNG5AS42.js"] }, routes: { root: { id: "root", parentId: void 0, path: "", index: void 0, caseSensitive: void 0, module: "/build/root-JU5G7M2R.js", imports: void 0, hasAction: !1, hasLoader: !1, hasClientAction: !1, hasClientLoader: !1, hasErrorBoundary: !0 }, "routes/_health": { id: "routes/_health", parentId: "root", path: void 0, index: void 0, caseSensitive: void 0, module: "/build/routes/_health-ARCUVYH4.js", imports: ["/build/_shared/chunk-G7CHZRZX.js"], hasAction: !1, hasLoader: !0, hasClientAction: !1, hasClientLoader: !1, hasErrorBoundary: !1 }, "routes/_index": { id: "routes/_index", parentId: "root", path: void 0, index: !0, caseSensitive: void 0, module: "/build/routes/_index-WNXF34ES.js", imports: ["/build/_shared/chunk-G7CHZRZX.js"], hasAction: !1, hasLoader: !0, hasClientAction: !1, hasClientLoader: !1, hasErrorBoundary: !1 }, "routes/app.advanced": { id: "routes/app.advanced", parentId: "root", path: "app/advanced", index: void 0, caseSensitive: void 0, module: "/build/routes/app.advanced-ME4CO2YV.js", imports: ["/build/_shared/chunk-G7CHZRZX.js"], hasAction: !0, hasLoader: !0, hasClientAction: !1, hasClientLoader: !1, hasErrorBoundary: !1 }, "routes/app.autopilot": { id: "routes/app.autopilot", parentId: "root", path: "app/autopilot", index: void 0, caseSensitive: void 0, module: "/build/routes/app.autopilot-EHP7C53G.js", imports: ["/build/_shared/chunk-G7CHZRZX.js"], hasAction: !0, hasLoader: !0, hasClientAction: !1, hasClientLoader: !1, hasErrorBoundary: !1 }, "routes/app.insights": { id: "routes/app.insights", parentId: "root", path: "app/insights", index: void 0, caseSensitive: void 0, module: "/build/routes/app.insights-AARN5OSI.js", imports: ["/build/_shared/chunk-G7CHZRZX.js"], hasAction: !1, hasLoader: !0, hasClientAction: !1, hasClientLoader: !1, hasErrorBoundary: !1 }, "routes/app.insights.terms": { id: "routes/app.insights.terms", parentId: "routes/app.insights", path: "terms", index: void 0, caseSensitive: void 0, module: "/build/routes/app.insights.terms-LLH2WUNR.js", imports: void 0, hasAction: !1, hasLoader: !0, hasClientAction: !1, hasClientLoader: !1, hasErrorBoundary: !1 }, "routes/app.insights.terms.csv": { id: "routes/app.insights.terms.csv", parentId: "routes/app.insights.terms", path: "csv", index: void 0, caseSensitive: void 0, module: "/build/routes/app.insights.terms.csv-SMES4VNI.js", imports: void 0, hasAction: !1, hasLoader: !0, hasClientAction: !1, hasClientLoader: !1, hasErrorBoundary: !1 }, "routes/health": { id: "routes/health", parentId: "root", path: "health", index: void 0, caseSensitive: void 0, module: "/build/routes/health-3CDIJIAE.js", imports: ["/build/_shared/chunk-G7CHZRZX.js"], hasAction: !1, hasLoader: !0, hasClientAction: !1, hasClientLoader: !1, hasErrorBoundary: !1 }, "routes/local.autopilot": { id: "routes/local.autopilot", parentId: "root", path: "local/autopilot", index: void 0, caseSensitive: void 0, module: "/build/routes/local.autopilot-2DZMOTIO.js", imports: ["/build/_shared/chunk-UAAI4ZD4.js"], hasAction: !1, hasLoader: !0, hasClientAction: !1, hasClientLoader: !1, hasErrorBoundary: !1 } }, version: "a23dfe59", hmr: { runtime: "/build/_shared/chunk-7P7RPFUO.js", timestamp: 1755344240723 }, url: "/build/manifest-A23DFE59.js" };

// server-entry-module:@remix-run/dev/server-build
var mode = "development", assetsBuildDirectory = "public/build", future = { v3_fetcherPersist: !1, v3_relativeSplatPath: !1, v3_throwAbortReason: !1, v3_routeConfig: !1, v3_singleFetch: !1, v3_lazyRouteDiscovery: !1, unstable_optimizeDeps: !1 }, publicPath = "/build/", entry = { module: entry_server_exports }, routes = {
  root: {
    id: "root",
    parentId: void 0,
    path: "",
    index: void 0,
    caseSensitive: void 0,
    module: root_exports
  },
  "routes/app.insights.terms.csv": {
    id: "routes/app.insights.terms.csv",
    parentId: "routes/app.insights.terms",
    path: "csv",
    index: void 0,
    caseSensitive: void 0,
    module: app_insights_terms_csv_exports
  },
  "routes/app.insights.terms": {
    id: "routes/app.insights.terms",
    parentId: "routes/app.insights",
    path: "terms",
    index: void 0,
    caseSensitive: void 0,
    module: app_insights_terms_exports
  },
  "routes/local.autopilot": {
    id: "routes/local.autopilot",
    parentId: "root",
    path: "local/autopilot",
    index: void 0,
    caseSensitive: void 0,
    module: local_autopilot_exports
  },
  "routes/app.autopilot": {
    id: "routes/app.autopilot",
    parentId: "root",
    path: "app/autopilot",
    index: void 0,
    caseSensitive: void 0,
    module: app_autopilot_exports
  },
  "routes/app.advanced": {
    id: "routes/app.advanced",
    parentId: "root",
    path: "app/advanced",
    index: void 0,
    caseSensitive: void 0,
    module: app_advanced_exports
  },
  "routes/app.insights": {
    id: "routes/app.insights",
    parentId: "root",
    path: "app/insights",
    index: void 0,
    caseSensitive: void 0,
    module: app_insights_exports
  },
  "routes/_health": {
    id: "routes/_health",
    parentId: "root",
    path: void 0,
    index: void 0,
    caseSensitive: void 0,
    module: health_exports
  },
  "routes/_index": {
    id: "routes/_index",
    parentId: "root",
    path: void 0,
    index: !0,
    caseSensitive: void 0,
    module: index_exports
  },
  "routes/health": {
    id: "routes/health",
    parentId: "root",
    path: "health",
    index: void 0,
    caseSensitive: void 0,
    module: health_exports2
  }
};
export {
  assets_manifest_default as assets,
  assetsBuildDirectory,
  entry,
  future,
  mode,
  publicPath,
  routes
};
//# sourceMappingURL=index.js.map
