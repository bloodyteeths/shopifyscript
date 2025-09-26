import {
  require_node
} from "/assets/_shared/chunk-5LF5TODQ.js";
import {
  Form,
  Link,
  useLoaderData,
  useNavigation,
  useSearchParams
} from "/assets/_shared/chunk-LWH66BJU.js";
import "/assets/_shared/chunk-Z7LCWUX7.js";
import {
  require_jsx_dev_runtime
} from "/assets/_shared/chunk-IFEKMGEG.js";
import {
  require_react
} from "/assets/_shared/chunk-HGNQ3YCE.js";
import {
  createHotContext
} from "/assets/_shared/chunk-GN6N4SDD.js";
import "/assets/_shared/chunk-FK5MLNU6.js";
import {
  __toESM
} from "/assets/_shared/chunk-R6OA4XCD.js";

// app/routes/app.insights.terms.tsx
var React = __toESM(require_react());
var import_node = __toESM(require_node());
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/app.insights.terms.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/app.insights.terms.tsx"
  );
  import.meta.hot.lastModified = "1758301317921.4207";
}
function TermsExplorer() {
  _s();
  const data = useLoaderData();
  const [sp] = useSearchParams();
  const nav = useNavigation();
  const rows = data?.rows || [];
  const [toast, setToast] = React.useState("");
  React.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 3e3);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const applyNegatives = React.useCallback(async (terms) => {
    if (isProcessing || !Array.isArray(terms) || terms.length === 0)
      return;
    setIsProcessing(true);
    try {
      const {
        backendFetch
      } = await import("/assets/_shared/hmac-UH5PTSKZ.js");
      const actions = terms.filter((t) => typeof t === "string" && t.trim()).map((t) => ({
        type: "add_exact_negative",
        target: t
      }));
      if (actions.length === 0) {
        setToast("No valid terms to process");
        return;
      }
      const r = await backendFetch("/insights/actions/apply", "POST", {
        nonce: Date.now(),
        actions
      });
      const ok = r?.json?.ok;
      const applied = r?.json?.applied?.length || 0;
      const skipped = r?.json?.skipped?.length || 0;
      setToast(ok ? `Applied ${applied}, skipped ${skipped}` : "Failed to add negatives");
    } catch (error) {
      console.error("Error applying negatives:", error);
      setToast("Failed to add negatives - network error");
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);
  const removeNegative = React.useCallback(async (term) => {
    if (isProcessing || !term || typeof term !== "string")
      return;
    setIsProcessing(true);
    try {
      const {
        backendFetch
      } = await import("/assets/_shared/hmac-UH5PTSKZ.js");
      const r = await backendFetch("/insights/actions/apply", "POST", {
        nonce: Date.now(),
        actions: [{
          type: "remove_exact_negative",
          target: term.trim()
        }]
      });
      const ok = r?.json?.ok;
      const applied = r?.json?.applied?.length || 0;
      const skipped = r?.json?.skipped?.length || 0;
      setToast(ok ? `Applied ${applied}, skipped ${skipped}` : "Failed to remove");
    } catch (error) {
      console.error("Error removing negative:", error);
      setToast("Failed to remove - network error");
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing]);
  const selected = React.useRef(/* @__PURE__ */ new Set());
  const [isProcessing, setIsProcessing] = React.useState(false);
  const spInit = new URLSearchParams(Array.from(sp.entries()));
  const toCsvHref = `/app/insights/terms.csv?${spInit.toString()}`;
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", { style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: "Search Terms Explorer" }, void 0, false, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 146,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, { to: "/app/insights", children: "\u2190 Back to Insights" }, void 0, false, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 147,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.insights.terms.tsx",
      lineNumber: 141,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Form, { method: "get", style: {
      display: "grid",
      gridTemplateColumns: "repeat(6,minmax(0,1fr))",
      gap: 8,
      margin: "12px 0"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { name: "q", placeholder: "term contains\u2026", defaultValue: sp.get("q") || "" }, void 0, false, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 155,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { name: "campaign", placeholder: "campaign contains\u2026", defaultValue: sp.get("campaign") || "" }, void 0, false, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 156,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("select", { name: "w", defaultValue: sp.get("w") || "7d", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "24h", children: "24h" }, void 0, false, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 158,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "7d", children: "7d" }, void 0, false, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 159,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "30d", children: "30d" }, void 0, false, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 160,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 157,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { name: "min_clicks", type: "number", step: "1", min: "0", defaultValue: sp.get("min_clicks") || "0" }, void 0, false, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 162,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { name: "min_cost", type: "number", step: "0.01", min: "0", defaultValue: sp.get("min_cost") || "0" }, void 0, false, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 163,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { type: "submit", disabled: nav.state !== "idle", children: "Filter" }, void 0, false, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 164,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.insights.terms.tsx",
      lineNumber: 149,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      margin: "8px 0",
      display: "flex",
      gap: 8,
      alignItems: "center"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: () => {
        const candidates = rows.filter((r) => r && !r.is_negative && selected.current.has(r.term)).map((r) => r.term);
        return applyNegatives(candidates);
      }, disabled: nav.state !== "idle" || isProcessing, children: isProcessing ? "Processing..." : "Add exact negative (selected)" }, void 0, false, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 175,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("a", { href: toCsvHref, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { type: "button", children: "Export CSV (current filters)" }, void 0, false, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 182,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 181,
        columnNumber: 9
      }, this),
      !!toast && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { role: "status", style: {
        fontSize: 12,
        opacity: 0.8
      }, children: toast }, void 0, false, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 184,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.insights.terms.tsx",
      lineNumber: 169,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("table", { cellPadding: 6, style: {
      width: "100%",
      borderCollapse: "collapse"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("thead", { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("th", { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "checkbox", onChange: (e) => {
          if (e.currentTarget.checked) {
            rows.forEach((r) => selected.current.add(r.term));
          } else {
            selected.current.clear();
          }
        } }, void 0, false, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 199,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 198,
          columnNumber: 13
        }, this),
        ["term", "clicks", "cost", "conversions", "cpc", "cpa"].map((col) => {
          const is = (sp.get("sort") || "cost") === col;
          const nextDir = is && (sp.get("dir") || "desc") === "desc" ? "asc" : "desc";
          const u = new URLSearchParams(Array.from(sp.entries()));
          u.set("sort", col);
          u.set("dir", nextDir);
          u.set("page", "1");
          return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("th", { align: col === "term" ? "left" : "right", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("a", { href: `?${u.toString()}`, style: {
            textDecoration: "none"
          }, children: [
            col.toUpperCase(),
            is ? sp.get("dir") === "asc" ? " \u25B2" : " \u25BC" : ""
          ] }, void 0, true, {
            fileName: "app/routes/app.insights.terms.tsx",
            lineNumber: 215,
            columnNumber: 21
          }, this) }, col, false, {
            fileName: "app/routes/app.insights.terms.tsx",
            lineNumber: 214,
            columnNumber: 20
          }, this);
        }),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("th", { align: "right", children: "Action" }, void 0, false, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 223,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 197,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 196,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("tbody", { children: [
        rows.map((r) => {
          if (!r || typeof r !== "object" || !r.term)
            return null;
          return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("td", { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "checkbox", disabled: r.is_negative, onChange: (e) => {
              if (e.currentTarget.checked)
                selected.current.add(r.term);
              else
                selected.current.delete(r.term);
            } }, void 0, false, {
              fileName: "app/routes/app.insights.terms.tsx",
              lineNumber: 231,
              columnNumber: 19
            }, this) }, void 0, false, {
              fileName: "app/routes/app.insights.terms.tsx",
              lineNumber: 230,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("td", { children: [
              r.term,
              r.is_negative && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
                marginLeft: 6,
                fontSize: 10,
                padding: "2px 6px",
                border: "1px solid #eee",
                borderRadius: 6
              }, children: "NEGATIVE" }, void 0, false, {
                fileName: "app/routes/app.insights.terms.tsx",
                lineNumber: 237,
                columnNumber: 37
              }, this)
            ] }, void 0, true, {
              fileName: "app/routes/app.insights.terms.tsx",
              lineNumber: 235,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("td", { align: "right", children: r.clicks }, void 0, false, {
              fileName: "app/routes/app.insights.terms.tsx",
              lineNumber: 247,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("td", { align: "right", children: [
              "$",
              Number(r.cost || 0).toFixed(2)
            ] }, void 0, true, {
              fileName: "app/routes/app.insights.terms.tsx",
              lineNumber: 248,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("td", { align: "right", children: r.conversions }, void 0, false, {
              fileName: "app/routes/app.insights.terms.tsx",
              lineNumber: 249,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("td", { align: "right", children: [
              "$",
              Number(r.cpc || 0).toFixed(2)
            ] }, void 0, true, {
              fileName: "app/routes/app.insights.terms.tsx",
              lineNumber: 250,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("td", { align: "right", children: [
              "$",
              Number(r.cpa || 0).toFixed(2)
            ] }, void 0, true, {
              fileName: "app/routes/app.insights.terms.tsx",
              lineNumber: 251,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("td", { align: "right", children: !r.is_negative ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: () => applyNegatives([r.term]), disabled: isProcessing, children: isProcessing ? "Processing..." : "Add exact negative" }, void 0, false, {
              fileName: "app/routes/app.insights.terms.tsx",
              lineNumber: 253,
              columnNumber: 37
            }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: () => removeNegative(r.term), disabled: isProcessing, children: isProcessing ? "Processing..." : "Remove" }, void 0, false, {
              fileName: "app/routes/app.insights.terms.tsx",
              lineNumber: 255,
              columnNumber: 33
            }, this) }, void 0, false, {
              fileName: "app/routes/app.insights.terms.tsx",
              lineNumber: 252,
              columnNumber: 17
            }, this)
          ] }, `row-${r.term}-${r.clicks || 0}`, true, {
            fileName: "app/routes/app.insights.terms.tsx",
            lineNumber: 229,
            columnNumber: 18
          }, this);
        }),
        !rows.length && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("tr", { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("td", { colSpan: 8, children: "No rows match your filters." }, void 0, false, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 262,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 261,
          columnNumber: 28
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 226,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.insights.terms.tsx",
      lineNumber: 192,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      display: "flex",
      gap: 12,
      alignItems: "center",
      marginTop: 8
    }, children: (() => {
      const total = data?.total || 0, page = data?.page || 1, pages = data?.pages || 1;
      const prev = new URLSearchParams(Array.from(sp.entries()));
      prev.set("page", String(Math.max(1, page - 1)));
      const next = new URLSearchParams(Array.from(sp.entries()));
      next.set("page", String(Math.min(pages, page + 1)));
      return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: [
          page,
          " / ",
          pages,
          " (",
          total,
          " rows)"
        ] }, void 0, true, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 282,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("a", { href: `?${prev.toString()}`, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { disabled: page <= 1, children: "Prev" }, void 0, false, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 286,
          columnNumber: 17
        }, this) }, void 0, false, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 285,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("a", { href: `?${next.toString()}`, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { disabled: page >= pages, children: "Next" }, void 0, false, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 289,
          columnNumber: 17
        }, this) }, void 0, false, {
          fileName: "app/routes/app.insights.terms.tsx",
          lineNumber: 288,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.insights.terms.tsx",
        lineNumber: 281,
        columnNumber: 16
      }, this);
    })() }, void 0, false, {
      fileName: "app/routes/app.insights.terms.tsx",
      lineNumber: 267,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/app.insights.terms.tsx",
    lineNumber: 140,
    columnNumber: 10
  }, this);
}
_s(TermsExplorer, "/10P/fcF3GUT+DNSt6HvPwCH4rQ=", false, function() {
  return [useLoaderData, useSearchParams, useNavigation];
});
_c = TermsExplorer;
var _c;
$RefreshReg$(_c, "TermsExplorer");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  TermsExplorer as default
};
//# sourceMappingURL=/assets/routes/app.insights.terms-46AOXUSP.js.map
