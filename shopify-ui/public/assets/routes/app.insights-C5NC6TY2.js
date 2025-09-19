import {
  Badge,
  Banner,
  Button,
  Card,
  Layout,
  Text,
  Tooltip
} from "/assets/_shared/chunk-LJFOIJQN.js";
import "/assets/_shared/chunk-QDIWRKG7.js";
import {
  require_node
} from "/assets/_shared/chunk-5LF5TODQ.js";
import {
  Link,
  useFetcher,
  useLoaderData,
  useNavigation,
  useRevalidator,
  useSearchParams
} from "/assets/_shared/chunk-APMZZZMT.js";
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

// app/routes/app.insights.tsx
var React2 = __toESM(require_react());
var import_node = __toESM(require_node());

// app/components/AnalyticsTier.tsx
var import_react = __toESM(require_react());
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/AnalyticsTier.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/AnalyticsTier.tsx"
  );
  import.meta.hot.lastModified = "1758229076648.9695";
}
function AnalyticsTier({
  tenant,
  data,
  onDataRefresh,
  onUpgrade
}) {
  _s();
  const [realTimeData, setRealTimeData] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(false);
  const [lastUpdate, setLastUpdate] = (0, import_react.useState)(/* @__PURE__ */ new Date());
  const tier = data.tierInfo?.tier || "starter";
  const isRealTimeEnabled = data.tierInfo?.realTimeEnabled || false;
  const refreshInterval = data.tierInfo?.refreshInterval || 3e5;
  (0, import_react.useEffect)(() => {
    if (!isRealTimeEnabled)
      return;
    const interval = setInterval(async () => {
      try {
        setLastUpdate(/* @__PURE__ */ new Date());
      } catch (error) {
        console.error("Real-time update failed:", error);
      }
    }, refreshInterval);
    return () => clearInterval(interval);
  }, [tenant, isRealTimeEnabled, refreshInterval]);
  const getTierBadgeColor = (tierName) => {
    switch (tierName) {
      case "starter":
        return "info";
      case "professional":
        return "success";
      case "enterprise":
        return "attention";
      default:
        return "info";
    }
  };
  const getTierDisplayName = (tierName) => {
    return tierName.charAt(0).toUpperCase() + tierName.slice(1);
  };
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(amount);
  };
  const formatNumber = (num) => {
    return new Intl.NumberFormat("en-US").format(num);
  };
  const renderBasicKPIs = () => {
    const {
      kpi
    } = data;
    return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Grid, { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Grid.Cell, { columnSpan: {
        xs: 6,
        sm: 3,
        md: 2,
        lg: 2,
        xl: 2
      }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingMd", children: "Clicks" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 97,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "heading2xl", as: "h2", children: formatNumber(kpi.clicks) }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 98,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", color: "subdued", children: "Total clicks" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 101,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 96,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 95,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 88,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Grid.Cell, { columnSpan: {
        xs: 6,
        sm: 3,
        md: 2,
        lg: 2,
        xl: 2
      }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingMd", children: "Cost" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 117,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "heading2xl", as: "h2", children: formatCurrency(kpi.cost) }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 118,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", color: "subdued", children: "Total spend" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 121,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 116,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 115,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 108,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Grid.Cell, { columnSpan: {
        xs: 6,
        sm: 3,
        md: 2,
        lg: 2,
        xl: 2
      }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingMd", children: "Conversions" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 137,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "heading2xl", as: "h2", children: formatNumber(kpi.conversions) }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 138,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", color: "subdued", children: "Total conversions" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 141,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 136,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 135,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 128,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Grid.Cell, { columnSpan: {
        xs: 6,
        sm: 3,
        md: 2,
        lg: 2,
        xl: 2
      }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingMd", children: "CTR" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 157,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "heading2xl", as: "h2", children: [
          (kpi.ctr * 100).toFixed(2),
          "%"
        ] }, void 0, true, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 158,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", color: "subdued", children: "Click-through rate" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 161,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 156,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 155,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 148,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Grid.Cell, { columnSpan: {
        xs: 6,
        sm: 3,
        md: 2,
        lg: 2,
        xl: 2
      }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingMd", children: "CPC" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 177,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "heading2xl", as: "h2", children: formatCurrency(kpi.cpc) }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 178,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", color: "subdued", children: "Cost per click" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 181,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 176,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 175,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 168,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Grid.Cell, { columnSpan: {
        xs: 6,
        sm: 3,
        md: 2,
        lg: 2,
        xl: 2
      }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingMd", children: "CPA" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 197,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "heading2xl", as: "h2", children: formatCurrency(kpi.cpa) }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 198,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", color: "subdued", children: "Cost per acquisition" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 201,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 196,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 195,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 188,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AnalyticsTier.tsx",
      lineNumber: 87,
      columnNumber: 12
    }, this);
  };
  const renderROASMetrics = () => {
    if (!data.roas?.basic)
      return null;
    const {
      basic,
      advanced
    } = data.roas;
    return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { sectioned: true, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { horizontal: true, alignment: "center", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingLg", children: "ROAS Analytics" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 218,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, { status: getTierBadgeColor(tier), children: getTierDisplayName(tier) }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 219,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 217,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Grid, { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Grid.Cell, { columnSpan: {
          xs: 6,
          sm: 3,
          md: 4,
          lg: 4,
          xl: 4
        }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingMd", children: "Basic ROAS" }, void 0, false, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 233,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "heading2xl", as: "h2", color: basic.roas >= 2 ? "success" : "critical", children: [
            basic.roas.toFixed(2),
            "x"
          ] }, void 0, true, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 234,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", color: "subdued", children: [
            "Revenue: ",
            formatCurrency(basic.revenue)
          ] }, void 0, true, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 237,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", color: "subdued", children: [
            "Profit: ",
            formatCurrency(basic.profit)
          ] }, void 0, true, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 240,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 232,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 225,
          columnNumber: 13
        }, this),
        advanced && tier !== "starter" && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Grid.Cell, { columnSpan: {
            xs: 6,
            sm: 3,
            md: 4,
            lg: 4,
            xl: 4
          }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { horizontal: true, alignment: "center", children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingMd", children: "LTV ROAS" }, void 0, false, {
                fileName: "app/components/AnalyticsTier.tsx",
                lineNumber: 256,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Tooltip, { content: "Lifetime Value based ROAS calculation", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { plain: true, monochrome: true, icon: ViewMajor }, void 0, false, {
                fileName: "app/components/AnalyticsTier.tsx",
                lineNumber: 258,
                columnNumber: 25
              }, this) }, void 0, false, {
                fileName: "app/components/AnalyticsTier.tsx",
                lineNumber: 257,
                columnNumber: 23
              }, this)
            ] }, void 0, true, {
              fileName: "app/components/AnalyticsTier.tsx",
              lineNumber: 255,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "heading2xl", as: "h2", color: advanced.ltvRoas >= 4 ? "success" : "warning", children: [
              advanced.ltvRoas.toFixed(2),
              "x"
            ] }, void 0, true, {
              fileName: "app/components/AnalyticsTier.tsx",
              lineNumber: 261,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", color: "subdued", children: "Long-term profitability" }, void 0, false, {
              fileName: "app/components/AnalyticsTier.tsx",
              lineNumber: 264,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 254,
            columnNumber: 19
          }, this) }, void 0, false, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 247,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Grid.Cell, { columnSpan: {
            xs: 6,
            sm: 3,
            md: 4,
            lg: 4,
            xl: 4
          }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { horizontal: true, alignment: "center", children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingMd", children: "Margin ROAS" }, void 0, false, {
                fileName: "app/components/AnalyticsTier.tsx",
                lineNumber: 279,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Tooltip, { content: "Profit margin adjusted ROAS", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { plain: true, monochrome: true, icon: TrendUpMajor }, void 0, false, {
                fileName: "app/components/AnalyticsTier.tsx",
                lineNumber: 281,
                columnNumber: 25
              }, this) }, void 0, false, {
                fileName: "app/components/AnalyticsTier.tsx",
                lineNumber: 280,
                columnNumber: 23
              }, this)
            ] }, void 0, true, {
              fileName: "app/components/AnalyticsTier.tsx",
              lineNumber: 278,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "heading2xl", as: "h2", children: [
              advanced.marginRoas.toFixed(2),
              "x"
            ] }, void 0, true, {
              fileName: "app/components/AnalyticsTier.tsx",
              lineNumber: 284,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", color: "subdued", children: "After-margin profitability" }, void 0, false, {
              fileName: "app/components/AnalyticsTier.tsx",
              lineNumber: 287,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 277,
            columnNumber: 19
          }, this) }, void 0, false, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 270,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 246,
          columnNumber: 48
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 224,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AnalyticsTier.tsx",
      lineNumber: 216,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/components/AnalyticsTier.tsx",
      lineNumber: 215,
      columnNumber: 12
    }, this);
  };
  const renderRealTimeStatus = () => {
    if (!isRealTimeEnabled)
      return null;
    return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { sectioned: true, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { horizontal: true, alignment: "center", distribution: "equalSpacing", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { horizontal: true, alignment: "center", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: "#00A47C",
          animation: "pulse 2s infinite"
        } }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 302,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", color: "success", children: "Real-time updates active" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 309,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 301,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { horizontal: true, alignment: "center", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodySm", color: "subdued", children: [
          "Last update: ",
          lastUpdate.toLocaleTimeString()
        ] }, void 0, true, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 314,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { plain: true, onClick: onDataRefresh, loading, disabled: loading, children: "Refresh" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 317,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 313,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AnalyticsTier.tsx",
      lineNumber: 300,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/components/AnalyticsTier.tsx",
      lineNumber: 299,
      columnNumber: 12
    }, this);
  };
  const renderUpgradePrompts = () => {
    if (!data.upgradePrompts || data.upgradePrompts.length === 0)
      return null;
    return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { sectioned: true, children: data.upgradePrompts.map((prompt, index) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Banner, { status: "info", action: {
      content: `Upgrade to ${getTierDisplayName(prompt.requiredTier)}`,
      onAction: () => onUpgrade?.(prompt.requiredTier)
    }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", children: prompt.message }, void 0, false, {
      fileName: "app/components/AnalyticsTier.tsx",
      lineNumber: 331,
      columnNumber: 13
    }, this) }, index, false, {
      fileName: "app/components/AnalyticsTier.tsx",
      lineNumber: 327,
      columnNumber: 53
    }, this)) }, void 0, false, {
      fileName: "app/components/AnalyticsTier.tsx",
      lineNumber: 326,
      columnNumber: 12
    }, this);
  };
  const renderTierStatus = () => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { sectioned: true, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { horizontal: true, alignment: "center", distribution: "equalSpacing", children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { horizontal: true, alignment: "center", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingMd", children: "Analytics Tier" }, void 0, false, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 338,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, { status: getTierBadgeColor(tier), children: getTierDisplayName(tier) }, void 0, false, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 339,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AnalyticsTier.tsx",
      lineNumber: 337,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { horizontal: true, alignment: "center", children: [
      tier !== "enterprise" && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { primary: true, onClick: () => onUpgrade?.(tier === "starter" ? "professional" : "enterprise"), children: tier === "starter" ? "Upgrade to Professional" : "Upgrade to Enterprise" }, void 0, false, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 345,
        columnNumber: 37
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { plain: true, icon: SettingsMajor, onClick: () => {
      }, children: "Manage Plan" }, void 0, false, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 349,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AnalyticsTier.tsx",
      lineNumber: 344,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/AnalyticsTier.tsx",
    lineNumber: 336,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "app/components/AnalyticsTier.tsx",
    lineNumber: 335,
    columnNumber: 34
  }, this);
  const renderTierComparison = () => {
    if (tier === "enterprise")
      return null;
    const features = {
      starter: ["Basic analytics", "Basic ROAS", "Monthly reports"],
      professional: ["Real-time analytics", "Advanced ROAS", "Weekly reports", "Attribution modeling"],
      enterprise: ["Custom dashboards", "Custom ROAS models", "Daily reports", "Multi-touch attribution"]
    };
    const nextTier = tier === "starter" ? "professional" : "enterprise";
    return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { sectioned: true, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingMd", children: "Unlock More Analytics Features" }, void 0, false, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 365,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Grid, { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Grid.Cell, { columnSpan: {
          xs: 6,
          sm: 6,
          md: 6,
          lg: 6,
          xl: 6
        }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingXs", children: [
            "Current Plan: ",
            getTierDisplayName(tier)
          ] }, void 0, true, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 375,
            columnNumber: 17
          }, this),
          features[tier].map((feature, index) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", color: "subdued", children: [
            "\u2713 ",
            feature
          ] }, index, true, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 376,
            columnNumber: 57
          }, this))
        ] }, void 0, true, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 374,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 367,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Grid.Cell, { columnSpan: {
          xs: 6,
          sm: 6,
          md: 6,
          lg: 6,
          xl: 6
        }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingXs", children: [
            getTierDisplayName(nextTier),
            " Plan"
          ] }, void 0, true, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 389,
            columnNumber: 17
          }, this),
          features[nextTier].map((feature, index) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", children: [
            "\u2713 ",
            feature
          ] }, index, true, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 390,
            columnNumber: 61
          }, this)),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { primary: true, size: "slim", onClick: () => onUpgrade?.(nextTier), children: [
            "Upgrade to ",
            getTierDisplayName(nextTier)
          ] }, void 0, true, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 393,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 388,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 381,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 366,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AnalyticsTier.tsx",
      lineNumber: 364,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/components/AnalyticsTier.tsx",
      lineNumber: 363,
      columnNumber: 12
    }, this);
  };
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { children: [
    renderTierStatus(),
    renderUpgradePrompts(),
    renderRealTimeStatus(),
    renderBasicKPIs(),
    renderROASMetrics(),
    renderTierComparison()
  ] }, void 0, true, {
    fileName: "app/components/AnalyticsTier.tsx",
    lineNumber: 404,
    columnNumber: 9
  }, this) }, void 0, false, {
    fileName: "app/components/AnalyticsTier.tsx",
    lineNumber: 403,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "app/components/AnalyticsTier.tsx",
    lineNumber: 402,
    columnNumber: 10
  }, this);
}
_s(AnalyticsTier, "sow5/cRT00N20X7cWMgtpcXaLxA=");
_c = AnalyticsTier;
var _c;
$RefreshReg$(_c, "AnalyticsTier");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

// app/routes/app.insights.tsx
var import_jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/app.insights.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s2 = $RefreshSig$();
var _s22 = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/app.insights.tsx"
  );
  import.meta.hot.lastModified = "1758300874713.9492";
}
function SimpleChart({
  data
}) {
  _s2();
  const [ChartComponent, setChartComponent] = React2.useState(null);
  React2.useEffect(() => {
    let alive = true;
    import("/assets/_shared/SimpleLines.client-ME5MMAXN.js").then((mod) => {
      if (alive)
        setChartComponent(() => mod.default);
    });
    return () => {
      alive = false;
    };
  }, []);
  if (!data?.length)
    return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      height: 180,
      border: "1px solid #eee",
      borderRadius: 8,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#666"
    }, children: "No data" }, void 0, false, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 44,
      columnNumber: 29
    }, this);
  if (!ChartComponent) {
    return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      height: 180,
      border: "1px solid #eee",
      borderRadius: 8,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#666"
    }, children: "Loading chart..." }, void 0, false, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 56,
      columnNumber: 12
    }, this);
  }
  return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(ChartComponent, { data }, void 0, false, {
    fileName: "app/routes/app.insights.tsx",
    lineNumber: 68,
    columnNumber: 10
  }, this);
}
_s2(SimpleChart, "573Tj3GFkXu19lwGqvY6g9TPtiA=");
_c2 = SimpleChart;
var InsightsErrorBoundary = class extends React2.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false
    };
  }
  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Insights page error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
        padding: 20,
        border: "1px solid #f56565",
        borderRadius: 8,
        backgroundColor: "#fed7d7"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h2", { children: "Something went wrong" }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 171,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("p", { children: "The insights page encountered an error. Please refresh the page." }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 172,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("button", { onClick: () => window.location.reload(), style: {
          marginTop: 10,
          padding: "8px 16px"
        }, children: "Refresh Page" }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 175,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 165,
        columnNumber: 14
      }, this);
    }
    return this.props.children;
  }
};
function InsightsContent() {
  _s22();
  const data = useLoaderData();
  const [sp] = useSearchParams();
  const nav = useNavigation();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const [toast, setToast] = React2.useState("");
  const [isApplying, setIsApplying] = React2.useState(false);
  const [showTierAnalytics, setShowTierAnalytics] = React2.useState(true);
  const [realTimeEnabled, setRealTimeEnabled] = React2.useState(false);
  const w = React2.useMemo(() => {
    try {
      return sp.get("w") === "24h" ? "24h" : data?.w || "7d";
    } catch {
      return "7d";
    }
  }, [sp, data]);
  const k = React2.useMemo(() => data?.kpi || {
    clicks: 0,
    cost: 0,
    conversions: 0,
    impressions: 0,
    ctr: 0,
    cpc: 0,
    cpa: 0
  }, [data]);
  const terms = React2.useMemo(() => Array.isArray(data?.top_terms) ? data.top_terms : [], [data]);
  const series = React2.useMemo(() => Array.isArray(data?.series) ? data.series : [], [data]);
  const explain = React2.useMemo(() => Array.isArray(data?.explain) ? data.explain : [], [data]);
  const logs = React2.useMemo(() => Array.isArray(data?.logs) ? data.logs : [], [data]);
  const retention = React2.useMemo(() => data?._retention || null, [data]);
  const tierStatus = React2.useMemo(() => data?.tierStatus || {
    tier: "starter",
    features: {}
  }, [data]);
  const shopName = React2.useMemo(() => {
    const url = new URL(window.location.href);
    return url.pathname.split("/")[1] || "demo-shop";
  }, []);
  React2.useEffect(() => {
    setRealTimeEnabled(tierStatus?.features?.realTimeAnalytics || false);
  }, [tierStatus]);
  const handleApplyAction = React2.useCallback(async (action, target) => {
    if (isApplying)
      return;
    setIsApplying(true);
    try {
      const {
        backendFetch
      } = await import("/assets/_shared/hmac-UH5PTSKZ.js");
      const body = {
        nonce: Date.now(),
        actions: []
      };
      if (action === "add_exact_negative" && target) {
        body.actions.push({
          type: "add_exact_negative",
          target
        });
      } else if (action === "lower_cpc_ceiling") {
        const cur = Number(k?.cpc || 0);
        const newCpc = Math.max(0, isFinite(cur) && cur > 0 ? cur * 0.8 : 0.15);
        body.actions.push({
          type: "lower_cpc_ceiling",
          campaign: "*",
          amount: Number(newCpc.toFixed(2))
        });
      } else {
        setToast("Invalid action");
        return;
      }
      const r = await backendFetch("/insights/actions/apply", "POST", body);
      setToast(r?.json?.ok ? "Action applied" : "Action failed");
      revalidator.revalidate();
    } catch (error) {
      console.error("Error applying action:", error);
      setToast("Action failed - network error");
    } finally {
      setIsApplying(false);
    }
  }, [isApplying, k, revalidator]);
  React2.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 3e3);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const handleUpgrade = React2.useCallback((tier) => {
    window.location.href = `/app/billing?upgrade=${tier}`;
  }, []);
  const handleDataRefresh = React2.useCallback(() => {
    revalidator.revalidate();
  }, [revalidator]);
  return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h1", { style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("span", { children: "Insights" }, void 0, false, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 299,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("span", { style: {
        display: "inline-flex",
        gap: 8
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("button", { onClick: () => setShowTierAnalytics(!showTierAnalytics), style: {
          padding: "4px 8px",
          fontSize: "12px",
          border: "1px solid #ccc",
          borderRadius: "4px",
          backgroundColor: showTierAnalytics ? "#007bff" : "white",
          color: showTierAnalytics ? "white" : "#007bff"
        }, children: showTierAnalytics ? "Basic View" : "Tier View" }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 304,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Link, { to: "/app/insights?w=7d", children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("button", { disabled: w === "7d" || nav.state !== "idle", children: "7d" }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 315,
          columnNumber: 13
        }, this) }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 314,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Link, { to: "/app/insights?w=24h", children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("button", { disabled: w === "24h" || nav.state !== "idle", children: "24h" }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 318,
          columnNumber: 13
        }, this) }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 317,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 300,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 294,
      columnNumber: 7
    }, this),
    showTierAnalytics && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      marginBottom: 20
    }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(AnalyticsTier, { tenant: shopName, data: {
      kpi: k,
      roas: data?.roas,
      series,
      tierInfo: {
        tier: tierStatus.tier,
        refreshInterval: tierStatus.config?.refreshInterval || 3e5,
        realTimeEnabled
      },
      upgradePrompts: data?.upgradePrompts
    }, onDataRefresh: handleDataRefresh, onUpgrade: handleUpgrade }, void 0, false, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 327,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 324,
      columnNumber: 29
    }, this),
    retention && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      background: retention.tier === "starter" ? "#fff3cd" : retention.tier === "professional" ? "#e7f3ff" : "#d1eddd",
      border: retention.tier === "starter" ? "1px solid #ffc107" : retention.tier === "professional" ? "1px solid #007bff" : "1px solid #28a745",
      borderRadius: "8px",
      padding: "12px 16px",
      marginBottom: "20px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("strong", { children: "Data Retention:" }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 350,
          columnNumber: 13
        }, this),
        " ",
        retention.description,
        " (",
        retention.tier.toUpperCase(),
        " plan)",
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("br", {}, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 351,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("small", { children: [
          "Data older than ",
          retention.cutoffDate,
          " is not shown"
        ] }, void 0, true, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 352,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 349,
        columnNumber: 11
      }, this),
      retention.upgradeMessage && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Link, { to: "/app/billing", style: {
        background: "#007bff",
        color: "white",
        padding: "8px 16px",
        textDecoration: "none",
        borderRadius: "6px",
        fontSize: "14px",
        fontWeight: "bold"
      }, children: retention.upgradeMessage }, void 0, false, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 355,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 354,
        columnNumber: 40
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 339,
      columnNumber: 21
    }, this),
    !showTierAnalytics && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(import_jsx_dev_runtime2.Fragment, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      display: "grid",
      gridTemplateColumns: "repeat(3,minmax(0,1fr))",
      gap: 12
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Card2, { label: "Clicks", value: k.clicks }, void 0, false, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 376,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Card2, { label: "Cost", value: fmt(k.cost) }, void 0, false, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 377,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Card2, { label: "Conv.", value: k.conversions }, void 0, false, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 378,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Card2, { label: "Impr.", value: k.impressions }, void 0, false, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 379,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Card2, { label: "CTR", value: pct(k.ctr) }, void 0, false, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 380,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Card2, { label: "CPC", value: fmt(k.cpc) }, void 0, false, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 381,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Card2, { label: "CPA", value: fmt(k.cpa) }, void 0, false, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 382,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 371,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 370,
      columnNumber: 30
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h3", { style: {
      marginTop: 16
    }, children: [
      "Trend (",
      w,
      ")",
      retention ? ` - ${retention.description}` : ""
    ] }, void 0, true, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 385,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(SimpleChart, { data: series }, void 0, false, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 388,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h3", { style: {
      marginTop: 16,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("span", { children: [
        "Top search terms (",
        w,
        ")"
      ] }, void 0, true, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 395,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Link, { to: `/app/insights/terms?w=${w}`, children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("button", { children: "View all terms" }, void 0, false, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 397,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 396,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 389,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h3", { style: {
      marginTop: 16
    }, children: "Activity (last 10)" }, void 0, false, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 400,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("ul", { children: [
      logs.map((l, i) => {
        if (!l || typeof l !== "object")
          return null;
        return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("li", { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("code", { children: l.timestamp || "No timestamp" }, void 0, false, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 407,
            columnNumber: 15
          }, this),
          " \u2014",
          " ",
          l.message || "No message"
        ] }, `log-${i}-${l.timestamp || i}`, true, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 406,
          columnNumber: 16
        }, this);
      }),
      !logs.length && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("li", { children: "No recent activity." }, void 0, false, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 411,
        columnNumber: 26
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 403,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("table", { cellPadding: 6, style: {
      width: "100%",
      borderCollapse: "collapse"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("thead", { children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("th", { align: "left", children: "Term" }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 419,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("th", { align: "right", children: "Clicks" }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 420,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("th", { align: "right", children: "Cost" }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 421,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("th", { align: "right", children: "Conv." }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 422,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 418,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 417,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("tbody", { children: [
        terms.map((t, i) => {
          if (!t || typeof t !== "object")
            return null;
          return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("td", { children: t.term || "Unknown term" }, void 0, false, {
              fileName: "app/routes/app.insights.tsx",
              lineNumber: 429,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("td", { align: "right", children: t.clicks || 0 }, void 0, false, {
              fileName: "app/routes/app.insights.tsx",
              lineNumber: 430,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("td", { align: "right", children: fmt(t.cost) }, void 0, false, {
              fileName: "app/routes/app.insights.tsx",
              lineNumber: 431,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("td", { align: "right", children: t.conversions || 0 }, void 0, false, {
              fileName: "app/routes/app.insights.tsx",
              lineNumber: 432,
              columnNumber: 17
            }, this)
          ] }, `term-${i}-${t.term || i}`, true, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 428,
            columnNumber: 18
          }, this);
        }),
        !terms.length && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("tr", { children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("td", { colSpan: 4, children: "Not enough data yet." }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 436,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 435,
          columnNumber: 29
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 425,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 413,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h3", { style: {
      marginTop: 16
    }, children: "Explain my spend" }, void 0, false, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 440,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("ul", { children: [
      explain.map((e, i) => {
        if (!e || typeof e !== "object")
          return null;
        const disabled = fetcher.state !== "idle" || isApplying;
        return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("li", { style: {
          marginBottom: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("span", { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("b", { children: e.label || "Unknown" }, void 0, false, {
              fileName: "app/routes/app.insights.tsx",
              lineNumber: 454,
              columnNumber: 17
            }, this),
            " \u2014",
            " ",
            e.reason || "No reason provided",
            ". Suggest:",
            " ",
            /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("code", { children: e.action || "none" }, void 0, false, {
              fileName: "app/routes/app.insights.tsx",
              lineNumber: 456,
              columnNumber: 17
            }, this),
            e.target ? ` (${e.target})` : ""
          ] }, void 0, true, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 453,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("button", { onClick: () => handleApplyAction(e.action, e.target), disabled, style: {
            padding: "6px 10px",
            border: "1px solid #eee",
            borderRadius: 6,
            cursor: disabled ? "not-allowed" : "pointer"
          }, children: isApplying ? "Applying..." : "Apply" }, void 0, false, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 459,
            columnNumber: 15
          }, this)
        ] }, `explain-${i}-${e.action}-${e.target}`, true, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 447,
          columnNumber: 16
        }, this);
      }),
      !explain.length && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("li", { children: "No high-confidence suggestions yet." }, void 0, false, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 469,
        columnNumber: 29
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 443,
      columnNumber: 7
    }, this),
    !!toast && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      marginTop: 6,
      fontSize: 12,
      opacity: 0.8,
      padding: "6px 12px",
      borderRadius: 4,
      backgroundColor: toast.includes("failed") ? "#fed7d7" : "#c6f6d5",
      border: toast.includes("failed") ? "1px solid #f56565" : "1px solid #38a169"
    }, children: toast }, void 0, false, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 471,
      columnNumber: 19
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/app.insights.tsx",
    lineNumber: 293,
    columnNumber: 10
  }, this);
}
_s22(InsightsContent, "wszQseWAEXlP99Qc3O0vKf1ihmA=", false, function() {
  return [useLoaderData, useSearchParams, useNavigation, useFetcher, useRevalidator];
});
_c22 = InsightsContent;
function Insights() {
  return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(InsightsErrorBoundary, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(InsightsContent, {}, void 0, false, {
    fileName: "app/routes/app.insights.tsx",
    lineNumber: 490,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "app/routes/app.insights.tsx",
    lineNumber: 489,
    columnNumber: 10
  }, this);
}
_c3 = Insights;
function Card2({
  label,
  value
}) {
  return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
    border: "1px solid #eee",
    borderRadius: 8,
    padding: 12
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      fontSize: 12,
      opacity: 0.7
    }, children: label }, void 0, false, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 503,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      fontSize: 20,
      fontWeight: 600
    }, children: value ?? "\u2014" }, void 0, false, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 507,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/app.insights.tsx",
    lineNumber: 498,
    columnNumber: 10
  }, this);
}
_c4 = Card2;
function fmt(n) {
  return typeof n === "number" ? `$${n.toFixed(2)}` : "\u2014";
}
function pct(n) {
  return typeof n === "number" ? `${(n * 100).toFixed(2)}%` : "\u2014";
}
var _c2;
var _c22;
var _c3;
var _c4;
$RefreshReg$(_c2, "SimpleChart");
$RefreshReg$(_c22, "InsightsContent");
$RefreshReg$(_c3, "Insights");
$RefreshReg$(_c4, "Card");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  Insights as default
};
//# sourceMappingURL=/assets/routes/app.insights-C5NC6TY2.js.map
