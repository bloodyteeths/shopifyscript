import {
  AIStatusIndicator
} from "/assets/_shared/chunk-Y7NM5EKS.js";
import {
  Badge,
  Banner,
  Button,
  Card,
  Grid,
  Layout,
  LegacyStack,
  SvgChartLineIcon,
  SvgSettingsIcon,
  SvgViewIcon,
  Text,
  Tooltip
} from "/assets/_shared/chunk-5UXC3ZLW.js";
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

// app/routes/app.insights.tsx
var React3 = __toESM(require_react());
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
  import.meta.hot.lastModified = "1758722236328.7568";
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
    return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
      gap: 12,
      marginBottom: 20
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        background: "white",
        border: "1px solid #e3e3e3",
        borderRadius: 8,
        padding: "12px 14px",
        boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          color: "#616161",
          fontSize: 11,
          marginBottom: 4,
          fontWeight: "500",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }, children: "Clicks" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 101,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          fontSize: 20,
          fontWeight: "600",
          color: "#202223",
          marginBottom: 2
        }, children: formatNumber(kpi.clicks) }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 111,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          color: "#8a8a8a",
          fontSize: 10
        }, children: "Total clicks" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 119,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 94,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        background: "white",
        border: "1px solid #e3e3e3",
        borderRadius: 8,
        padding: "12px 14px",
        boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          color: "#616161",
          fontSize: 11,
          marginBottom: 4,
          fontWeight: "500",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }, children: "Cost" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 134,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          fontSize: 20,
          fontWeight: "600",
          color: "#5c6ac4",
          marginBottom: 2
        }, children: formatCurrency(kpi.cost) }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 144,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          color: "#8a8a8a",
          fontSize: 10
        }, children: "Total spend" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 152,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 127,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        background: "white",
        border: "1px solid #e3e3e3",
        borderRadius: 8,
        padding: "12px 14px",
        boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          color: "#616161",
          fontSize: 11,
          marginBottom: 4,
          fontWeight: "500",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }, children: "Conversions" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 167,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          fontSize: 20,
          fontWeight: "600",
          color: "#202223",
          marginBottom: 2
        }, children: formatNumber(kpi.conversions) }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 177,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          color: "#8a8a8a",
          fontSize: 10
        }, children: "Total conversions" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 185,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 160,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        background: "white",
        border: "1px solid #e3e3e3",
        borderRadius: 8,
        padding: "12px 14px",
        boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          color: "#616161",
          fontSize: 11,
          marginBottom: 4,
          fontWeight: "500",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }, children: "CTR" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 200,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          fontSize: 20,
          fontWeight: "600",
          color: "#202223",
          marginBottom: 2
        }, children: [
          (kpi.ctr * 100).toFixed(2),
          "%"
        ] }, void 0, true, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 210,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          color: "#8a8a8a",
          fontSize: 10
        }, children: "Click-through rate" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 218,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 193,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        background: "white",
        border: "1px solid #e3e3e3",
        borderRadius: 8,
        padding: "12px 14px",
        boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          color: "#616161",
          fontSize: 11,
          marginBottom: 4,
          fontWeight: "500",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }, children: "CPC" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 233,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          fontSize: 20,
          fontWeight: "600",
          color: "#5c6ac4",
          marginBottom: 2
        }, children: formatCurrency(kpi.cpc) }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 243,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          color: "#8a8a8a",
          fontSize: 10
        }, children: "Cost per click" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 251,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 226,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        background: "white",
        border: "1px solid #e3e3e3",
        borderRadius: 8,
        padding: "12px 14px",
        boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          color: "#616161",
          fontSize: 11,
          marginBottom: 4,
          fontWeight: "500",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }, children: "CPA" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 266,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          fontSize: 20,
          fontWeight: "600",
          color: "#5c6ac4",
          marginBottom: 2
        }, children: formatCurrency(kpi.cpa) }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 276,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          color: "#8a8a8a",
          fontSize: 10
        }, children: "Cost per acquisition" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 284,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 259,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AnalyticsTier.tsx",
      lineNumber: 88,
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
    return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { sectioned: true, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LegacyStack, { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LegacyStack, { horizontal: true, alignment: "center", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingLg", children: "ROAS Analytics" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 302,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, { status: getTierBadgeColor(tier), children: getTierDisplayName(tier) }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 303,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 301,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Grid, { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Grid.Cell, { columnSpan: {
          xs: 6,
          sm: 3,
          md: 4,
          lg: 4,
          xl: 4
        }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LegacyStack, { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingMd", children: "Basic ROAS" }, void 0, false, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 317,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "heading2xl", as: "h2", color: basic.roas >= 2 ? "success" : "critical", children: [
            basic.roas.toFixed(2),
            "x"
          ] }, void 0, true, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 318,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", color: "subdued", children: [
            "Revenue: ",
            formatCurrency(basic.revenue)
          ] }, void 0, true, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 321,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", color: "subdued", children: [
            "Profit: ",
            formatCurrency(basic.profit)
          ] }, void 0, true, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 324,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 316,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 309,
          columnNumber: 13
        }, this),
        advanced && tier !== "starter" && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Grid.Cell, { columnSpan: {
            xs: 6,
            sm: 3,
            md: 4,
            lg: 4,
            xl: 4
          }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LegacyStack, { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LegacyStack, { horizontal: true, alignment: "center", children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingMd", children: "LTV ROAS" }, void 0, false, {
                fileName: "app/components/AnalyticsTier.tsx",
                lineNumber: 340,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Tooltip, { content: "Lifetime Value based ROAS calculation", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { plain: true, monochrome: true, icon: SvgViewIcon }, void 0, false, {
                fileName: "app/components/AnalyticsTier.tsx",
                lineNumber: 342,
                columnNumber: 25
              }, this) }, void 0, false, {
                fileName: "app/components/AnalyticsTier.tsx",
                lineNumber: 341,
                columnNumber: 23
              }, this)
            ] }, void 0, true, {
              fileName: "app/components/AnalyticsTier.tsx",
              lineNumber: 339,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "heading2xl", as: "h2", color: advanced.ltvRoas >= 4 ? "success" : "warning", children: [
              advanced.ltvRoas.toFixed(2),
              "x"
            ] }, void 0, true, {
              fileName: "app/components/AnalyticsTier.tsx",
              lineNumber: 345,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", color: "subdued", children: "Long-term profitability" }, void 0, false, {
              fileName: "app/components/AnalyticsTier.tsx",
              lineNumber: 348,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 338,
            columnNumber: 19
          }, this) }, void 0, false, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 331,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Grid.Cell, { columnSpan: {
            xs: 6,
            sm: 3,
            md: 4,
            lg: 4,
            xl: 4
          }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LegacyStack, { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LegacyStack, { horizontal: true, alignment: "center", children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingMd", children: "Margin ROAS" }, void 0, false, {
                fileName: "app/components/AnalyticsTier.tsx",
                lineNumber: 363,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Tooltip, { content: "Profit margin adjusted ROAS", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { plain: true, monochrome: true, icon: SvgChartLineIcon }, void 0, false, {
                fileName: "app/components/AnalyticsTier.tsx",
                lineNumber: 365,
                columnNumber: 25
              }, this) }, void 0, false, {
                fileName: "app/components/AnalyticsTier.tsx",
                lineNumber: 364,
                columnNumber: 23
              }, this)
            ] }, void 0, true, {
              fileName: "app/components/AnalyticsTier.tsx",
              lineNumber: 362,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "heading2xl", as: "h2", children: [
              advanced.marginRoas.toFixed(2),
              "x"
            ] }, void 0, true, {
              fileName: "app/components/AnalyticsTier.tsx",
              lineNumber: 368,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", color: "subdued", children: "After-margin profitability" }, void 0, false, {
              fileName: "app/components/AnalyticsTier.tsx",
              lineNumber: 371,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 361,
            columnNumber: 19
          }, this) }, void 0, false, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 354,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 330,
          columnNumber: 48
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 308,
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
  const renderRealTimeStatus = () => {
    if (!isRealTimeEnabled)
      return null;
    return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { sectioned: true, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LegacyStack, { horizontal: true, alignment: "center", distribution: "equalSpacing", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LegacyStack, { horizontal: true, alignment: "center", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: "#00A47C",
          animation: "pulse 2s infinite"
        } }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 386,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", color: "success", children: "Real-time updates active" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 393,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 385,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LegacyStack, { horizontal: true, alignment: "center", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodySm", color: "subdued", children: [
          "Last update: ",
          lastUpdate.toLocaleTimeString()
        ] }, void 0, true, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 398,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { plain: true, onClick: onDataRefresh, loading, disabled: loading, children: "Refresh" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 401,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 397,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AnalyticsTier.tsx",
      lineNumber: 384,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/components/AnalyticsTier.tsx",
      lineNumber: 383,
      columnNumber: 12
    }, this);
  };
  const renderUpgradePrompts = () => {
    if (!data.upgradePrompts || data.upgradePrompts.length === 0)
      return null;
    return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LegacyStack, { sectioned: true, children: data.upgradePrompts.map((prompt, index) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Banner, { status: "info", action: {
      content: `Upgrade to ${getTierDisplayName(prompt.requiredTier)}`,
      onAction: () => onUpgrade?.(prompt.requiredTier)
    }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", children: prompt.message }, void 0, false, {
      fileName: "app/components/AnalyticsTier.tsx",
      lineNumber: 415,
      columnNumber: 13
    }, this) }, index, false, {
      fileName: "app/components/AnalyticsTier.tsx",
      lineNumber: 411,
      columnNumber: 53
    }, this)) }, void 0, false, {
      fileName: "app/components/AnalyticsTier.tsx",
      lineNumber: 410,
      columnNumber: 12
    }, this);
  };
  const renderTierStatus = () => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { sectioned: true, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LegacyStack, { horizontal: true, alignment: "center", distribution: "equalSpacing", children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LegacyStack, { horizontal: true, alignment: "center", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingMd", children: "Analytics Tier" }, void 0, false, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 422,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, { status: getTierBadgeColor(tier), children: getTierDisplayName(tier) }, void 0, false, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 423,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AnalyticsTier.tsx",
      lineNumber: 421,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LegacyStack, { horizontal: true, alignment: "center", children: [
      tier !== "enterprise" && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { primary: true, onClick: () => onUpgrade?.(tier === "starter" ? "professional" : "enterprise"), children: tier === "starter" ? "Upgrade to Professional" : "Upgrade to Enterprise" }, void 0, false, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 429,
        columnNumber: 37
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { plain: true, icon: SvgSettingsIcon, onClick: () => {
      }, children: "Manage Plan" }, void 0, false, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 433,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AnalyticsTier.tsx",
      lineNumber: 428,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/AnalyticsTier.tsx",
    lineNumber: 420,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "app/components/AnalyticsTier.tsx",
    lineNumber: 419,
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
    return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      background: "white",
      border: "1px solid #e3e3e3",
      borderRadius: 8,
      padding: 20,
      boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)",
      marginBottom: 24
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        marginBottom: 24
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: {
          fontSize: 24,
          fontWeight: "700",
          color: "#1f2937",
          margin: "0 0 8px 0",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }, children: "Unlock More Analytics Features" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 458,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
          color: "#6b7280",
          fontSize: 16,
          margin: 0
        }, children: "Upgrade to access advanced analytics and real-time insights" }, void 0, false, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 469,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 455,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 32
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          background: "#f6f6f7",
          border: "1px solid #e3e3e3",
          borderRadius: 16,
          padding: 24
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            marginBottom: 16
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", { style: {
              fontSize: 18,
              fontWeight: "600",
              color: "#1f2937",
              margin: "0 0 8px 0"
            }, children: [
              "Current Plan: ",
              getTierDisplayName(tier)
            ] }, void 0, true, {
              fileName: "app/components/AnalyticsTier.tsx",
              lineNumber: 492,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              display: "inline-block",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "white",
              padding: "4px 12px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: "600"
            }, children: getTierDisplayName(tier) }, void 0, false, {
              fileName: "app/components/AnalyticsTier.tsx",
              lineNumber: 500,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 489,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: features[tier].map((feature, index) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            display: "flex",
            alignItems: "center",
            marginBottom: 8,
            color: "#6b7280",
            fontSize: 14
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
              color: "#10b981",
              marginRight: 8,
              fontWeight: "bold"
            }, children: "\u2713" }, void 0, false, {
              fileName: "app/components/AnalyticsTier.tsx",
              lineNumber: 520,
              columnNumber: 19
            }, this),
            feature
          ] }, index, true, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 513,
            columnNumber: 55
          }, this)) }, void 0, false, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 512,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 483,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          background: "#f0fbf8",
          border: "1px solid #008060",
          borderRadius: 16,
          padding: 24,
          position: "relative"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            position: "absolute",
            top: -8,
            right: 16,
            background: "#008060",
            color: "white",
            padding: "4px 12px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: "600"
          }, children: "RECOMMENDED" }, void 0, false, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 537,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            marginBottom: 16
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", { style: {
              fontSize: 18,
              fontWeight: "600",
              color: "#1f2937",
              margin: "0 0 8px 0"
            }, children: [
              getTierDisplayName(nextTier),
              " Plan"
            ] }, void 0, true, {
              fileName: "app/components/AnalyticsTier.tsx",
              lineNumber: 554,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              display: "inline-block",
              background: "#008060",
              color: "white",
              padding: "4px 12px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: "600"
            }, children: getTierDisplayName(nextTier) }, void 0, false, {
              fileName: "app/components/AnalyticsTier.tsx",
              lineNumber: 562,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 551,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            marginBottom: 20
          }, children: features[nextTier].map((feature, index) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            display: "flex",
            alignItems: "center",
            marginBottom: 8,
            color: "#1f2937",
            fontSize: 14,
            fontWeight: "500"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
              color: "#10b981",
              marginRight: 8,
              fontWeight: "bold"
            }, children: "\u2713" }, void 0, false, {
              fileName: "app/components/AnalyticsTier.tsx",
              lineNumber: 586,
              columnNumber: 19
            }, this),
            feature
          ] }, index, true, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 578,
            columnNumber: 59
          }, this)) }, void 0, false, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 575,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: () => onUpgrade?.(nextTier), style: {
            background: "#008060",
            color: "white",
            border: "none",
            padding: "12px 24px",
            borderRadius: 12,
            cursor: "pointer",
            fontSize: 14,
            fontWeight: "600",
            width: "100%",
            transition: "all 0.3s ease",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)"
          }, onMouseOver: (e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(16, 185, 129, 0.4)";
          }, onMouseOut: (e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(16, 185, 129, 0.3)";
          }, children: [
            "Upgrade to ",
            getTierDisplayName(nextTier)
          ] }, void 0, true, {
            fileName: "app/components/AnalyticsTier.tsx",
            lineNumber: 595,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AnalyticsTier.tsx",
          lineNumber: 530,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AnalyticsTier.tsx",
        lineNumber: 478,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AnalyticsTier.tsx",
      lineNumber: 447,
      columnNumber: 12
    }, this);
  };
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LegacyStack, { children: [
    renderTierStatus(),
    renderUpgradePrompts(),
    renderRealTimeStatus(),
    renderBasicKPIs(),
    renderROASMetrics(),
    renderTierComparison()
  ] }, void 0, true, {
    fileName: "app/components/AnalyticsTier.tsx",
    lineNumber: 622,
    columnNumber: 9
  }, this) }, void 0, false, {
    fileName: "app/components/AnalyticsTier.tsx",
    lineNumber: 621,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "app/components/AnalyticsTier.tsx",
    lineNumber: 620,
    columnNumber: 10
  }, this);
}
_s(AnalyticsTier, "sow5/cRT00N20X7cWMgtpcXaLxA=");
_c = AnalyticsTier;
var _c;
$RefreshReg$(_c, "AnalyticsTier");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

// app/components/AIInsights.tsx
var React2 = __toESM(require_react());
var import_jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/AIInsights.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s2 = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/AIInsights.tsx"
  );
  import.meta.hot.lastModified = "1758893707891.8516";
}
var priorityColors = {
  high: {
    bg: "#fee2e2",
    border: "#dc2626",
    text: "#dc2626"
  },
  medium: {
    bg: "#fef3c7",
    border: "#d97706",
    text: "#d97706"
  },
  low: {
    bg: "#e0f2fe",
    border: "#0369a1",
    text: "#0369a1"
  }
};
function AIInsights({
  shopName,
  period,
  onRefresh
}) {
  _s2();
  const [insights, setInsights] = React2.useState(null);
  const [loading, setLoading] = React2.useState(false);
  const [error, setError] = React2.useState(null);
  const [expandedRecommendations, setExpandedRecommendations] = React2.useState(/* @__PURE__ */ new Set());
  const fetcher = useFetcher();
  React2.useEffect(() => {
    if (shopName && period) {
      loadInsights();
    }
  }, [shopName, period]);
  const loadInsights = async () => {
    if (loading)
      return;
    setLoading(true);
    setError(null);
    try {
      const {
        backendFetch
      } = await import("/assets/_shared/hmac-UH5PTSKZ.js");
      const response = await fetch(`/api/ai/insights?tenant=${shopName}&period=${period}`, {
        headers: {
          "X-Tenant-Id": shopName
        }
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setInsights(result.data);
        } else {
          throw new Error("Failed to load AI insights");
        }
      } else {
        throw new Error(`HTTP ${response.status}: Failed to fetch AI insights`);
      }
    } catch (err) {
      console.error("Error loading AI insights:", err);
      setError(err instanceof Error ? err.message : "Failed to load AI insights");
    } finally {
      setLoading(false);
    }
  };
  const toggleRecommendation = (id) => {
    const newExpanded = new Set(expandedRecommendations);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRecommendations(newExpanded);
  };
  if (loading) {
    return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      background: "white",
      border: "1px solid #e3e3e3",
      borderRadius: "8px",
      padding: "32px",
      textAlign: "center",
      marginBottom: "24px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
        color: "#666",
        marginBottom: "16px"
      }, children: "\u{1F916} Generating AI insights..." }, void 0, false, {
        fileName: "app/components/AIInsights.tsx",
        lineNumber: 115,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
        width: "32px",
        height: "32px",
        border: "3px solid #f3f4f6",
        borderTop: "3px solid #008060",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
        margin: "0 auto"
      } }, void 0, false, {
        fileName: "app/components/AIInsights.tsx",
        lineNumber: 119,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AIInsights.tsx",
      lineNumber: 107,
      columnNumber: 12
    }, this);
  }
  if (error) {
    return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      background: "white",
      border: "1px solid #f87171",
      borderRadius: "8px",
      padding: "24px",
      marginBottom: "24px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h3", { style: {
        color: "#dc2626",
        margin: "0 0 12px 0",
        fontSize: "16px",
        fontWeight: "600"
      }, children: "AI Insights Unavailable" }, void 0, false, {
        fileName: "app/components/AIInsights.tsx",
        lineNumber: 138,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("p", { style: {
        color: "#666",
        margin: "0 0 16px 0",
        fontSize: "14px"
      }, children: error }, void 0, false, {
        fileName: "app/components/AIInsights.tsx",
        lineNumber: 146,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("button", { onClick: loadInsights, style: {
        background: "#008060",
        color: "white",
        border: "none",
        padding: "8px 16px",
        borderRadius: "6px",
        fontSize: "13px",
        cursor: "pointer"
      }, children: "Retry" }, void 0, false, {
        fileName: "app/components/AIInsights.tsx",
        lineNumber: 153,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AIInsights.tsx",
      lineNumber: 131,
      columnNumber: 12
    }, this);
  }
  if (!insights) {
    return null;
  }
  const highPriorityCount = insights.recommendations?.filter((r) => r.priority === "high").length || 0;
  const totalSavings = insights.costOptimization?.totalWaste || 0;
  return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
    marginBottom: "32px"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      background: "white",
      border: "1px solid #e3e3e3",
      borderRadius: "8px",
      padding: "24px",
      marginBottom: "16px",
      boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "16px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h2", { style: {
            fontSize: "20px",
            fontWeight: "600",
            color: "#202223",
            margin: "0 0 8px 0",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }, children: "\u{1F916} AI-Powered Insights" }, void 0, false, {
            fileName: "app/components/AIInsights.tsx",
            lineNumber: 190,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("p", { style: {
            color: "#616161",
            margin: "0",
            fontSize: "14px"
          }, children: [
            "Generated ",
            new Date(insights.timestamp).toLocaleString(),
            " \u2022 ",
            period,
            " period"
          ] }, void 0, true, {
            fileName: "app/components/AIInsights.tsx",
            lineNumber: 201,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AIInsights.tsx",
          lineNumber: 189,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("button", { onClick: loadInsights, disabled: loading, style: {
          background: loading ? "#c9cccf" : "#008060",
          color: "white",
          border: "none",
          padding: "8px 16px",
          borderRadius: "6px",
          fontSize: "13px",
          fontWeight: "500",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1
        }, children: loading ? "Refreshing..." : "Refresh Insights" }, void 0, false, {
          fileName: "app/components/AIInsights.tsx",
          lineNumber: 209,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AIInsights.tsx",
        lineNumber: 183,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
          background: "#f6f6f7",
          padding: "16px",
          borderRadius: "6px",
          textAlign: "center"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
            fontSize: "24px",
            fontWeight: "700",
            color: "#202223",
            marginBottom: "4px"
          }, children: insights.recommendations?.length || 0 }, void 0, false, {
            fileName: "app/components/AIInsights.tsx",
            lineNumber: 236,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
            fontSize: "12px",
            color: "#616161",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }, children: "Total Recommendations" }, void 0, false, {
            fileName: "app/components/AIInsights.tsx",
            lineNumber: 244,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AIInsights.tsx",
          lineNumber: 230,
          columnNumber: 11
        }, this),
        highPriorityCount > 0 && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
          background: "#fee2e2",
          padding: "16px",
          borderRadius: "6px",
          textAlign: "center"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
            fontSize: "24px",
            fontWeight: "700",
            color: "#dc2626",
            marginBottom: "4px"
          }, children: highPriorityCount }, void 0, false, {
            fileName: "app/components/AIInsights.tsx",
            lineNumber: 260,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
            fontSize: "12px",
            color: "#dc2626",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }, children: "High Priority Issues" }, void 0, false, {
            fileName: "app/components/AIInsights.tsx",
            lineNumber: 268,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AIInsights.tsx",
          lineNumber: 254,
          columnNumber: 37
        }, this),
        totalSavings > 0 && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
          background: "#d1eddd",
          padding: "16px",
          borderRadius: "6px",
          textAlign: "center"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
            fontSize: "24px",
            fontWeight: "700",
            color: "#28a745",
            marginBottom: "4px"
          }, children: [
            "$",
            totalSavings.toFixed(0)
          ] }, void 0, true, {
            fileName: "app/components/AIInsights.tsx",
            lineNumber: 284,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
            fontSize: "12px",
            color: "#28a745",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }, children: "Potential Savings" }, void 0, false, {
            fileName: "app/components/AIInsights.tsx",
            lineNumber: 292,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AIInsights.tsx",
          lineNumber: 278,
          columnNumber: 32
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AIInsights.tsx",
        lineNumber: 225,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AIInsights.tsx",
      lineNumber: 175,
      columnNumber: 7
    }, this),
    insights.recommendations && insights.recommendations.length > 0 && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      background: "white",
      border: "1px solid #e3e3e3",
      borderRadius: "8px",
      padding: "24px",
      marginBottom: "16px",
      boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h3", { style: {
        fontSize: "16px",
        fontWeight: "600",
        color: "#202223",
        margin: "0 0 16px 0"
      }, children: "Actionable Recommendations" }, void 0, false, {
        fileName: "app/components/AIInsights.tsx",
        lineNumber: 313,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
        display: "flex",
        flexDirection: "column",
        gap: "16px"
      }, children: insights.recommendations.slice(0, 5).map((recommendation) => {
        const isExpanded = expandedRecommendations.has(recommendation.id);
        const colors = priorityColors[recommendation.priority];
        return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
          border: `1px solid ${colors.border}`,
          borderRadius: "8px",
          padding: "16px",
          background: colors.bg
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "8px"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "4px"
              }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("span", { style: {
                fontSize: "12px",
                fontWeight: "700",
                color: colors.text,
                background: "rgba(255, 255, 255, 0.7)",
                padding: "2px 8px",
                borderRadius: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }, children: [
                recommendation.priority,
                " PRIORITY"
              ] }, void 0, true, {
                fileName: "app/components/AIInsights.tsx",
                lineNumber: 349,
                columnNumber: 25
              }, this) }, void 0, false, {
                fileName: "app/components/AIInsights.tsx",
                lineNumber: 343,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h4", { style: {
                fontSize: "16px",
                fontWeight: "600",
                color: "#202223",
                margin: "0 0 8px 0"
              }, children: recommendation.title }, void 0, false, {
                fileName: "app/components/AIInsights.tsx",
                lineNumber: 362,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("p", { style: {
                color: "#666",
                margin: "0",
                fontSize: "14px"
              }, children: recommendation.description }, void 0, false, {
                fileName: "app/components/AIInsights.tsx",
                lineNumber: 370,
                columnNumber: 23
              }, this)
            ] }, void 0, true, {
              fileName: "app/components/AIInsights.tsx",
              lineNumber: 342,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("button", { onClick: () => toggleRecommendation(recommendation.id), style: {
              background: "rgba(255, 255, 255, 0.8)",
              border: `1px solid ${colors.border}`,
              color: colors.text,
              padding: "6px 12px",
              borderRadius: "4px",
              fontSize: "12px",
              cursor: "pointer",
              fontWeight: "500"
            }, children: isExpanded ? "Hide Details" : "Show Details" }, void 0, false, {
              fileName: "app/components/AIInsights.tsx",
              lineNumber: 379,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "app/components/AIInsights.tsx",
            lineNumber: 336,
            columnNumber: 19
          }, this),
          isExpanded && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
            background: "rgba(255, 255, 255, 0.5)",
            padding: "16px",
            borderRadius: "6px",
            marginTop: "12px"
          }, children: [
            recommendation.actions && recommendation.actions.length > 0 && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
              marginBottom: "12px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("strong", { style: {
                color: "#202223",
                fontSize: "14px"
              }, children: "Action Items:" }, void 0, false, {
                fileName: "app/components/AIInsights.tsx",
                lineNumber: 402,
                columnNumber: 27
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("ul", { style: {
                margin: "8px 0",
                paddingLeft: "20px"
              }, children: recommendation.actions.map((action, index) => /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("li", { style: {
                color: "#666",
                fontSize: "14px",
                marginBottom: "4px"
              }, children: action }, index, false, {
                fileName: "app/components/AIInsights.tsx",
                lineNumber: 410,
                columnNumber: 76
              }, this)) }, void 0, false, {
                fileName: "app/components/AIInsights.tsx",
                lineNumber: 406,
                columnNumber: 27
              }, this)
            ] }, void 0, true, {
              fileName: "app/components/AIInsights.tsx",
              lineNumber: 399,
              columnNumber: 87
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
              display: "flex",
              gap: "16px",
              fontSize: "13px"
            }, children: [
              recommendation.impact && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("strong", { style: {
                  color: "#202223"
                }, children: "Impact:" }, void 0, false, {
                  fileName: "app/components/AIInsights.tsx",
                  lineNumber: 426,
                  columnNumber: 29
                }, this),
                " ",
                /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("span", { style: {
                  color: "#666"
                }, children: recommendation.impact }, void 0, false, {
                  fileName: "app/components/AIInsights.tsx",
                  lineNumber: 429,
                  columnNumber: 29
                }, this)
              ] }, void 0, true, {
                fileName: "app/components/AIInsights.tsx",
                lineNumber: 425,
                columnNumber: 51
              }, this),
              recommendation.effort && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("strong", { style: {
                  color: "#202223"
                }, children: "Effort:" }, void 0, false, {
                  fileName: "app/components/AIInsights.tsx",
                  lineNumber: 434,
                  columnNumber: 29
                }, this),
                " ",
                /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("span", { style: {
                  color: "#666"
                }, children: recommendation.effort }, void 0, false, {
                  fileName: "app/components/AIInsights.tsx",
                  lineNumber: 437,
                  columnNumber: 29
                }, this)
              ] }, void 0, true, {
                fileName: "app/components/AIInsights.tsx",
                lineNumber: 433,
                columnNumber: 51
              }, this),
              recommendation.expectedSavings && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("strong", { style: {
                  color: "#28a745"
                }, children: "Expected Savings:" }, void 0, false, {
                  fileName: "app/components/AIInsights.tsx",
                  lineNumber: 442,
                  columnNumber: 29
                }, this),
                " ",
                /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("span", { style: {
                  color: "#28a745"
                }, children: recommendation.expectedSavings }, void 0, false, {
                  fileName: "app/components/AIInsights.tsx",
                  lineNumber: 445,
                  columnNumber: 29
                }, this)
              ] }, void 0, true, {
                fileName: "app/components/AIInsights.tsx",
                lineNumber: 441,
                columnNumber: 60
              }, this)
            ] }, void 0, true, {
              fileName: "app/components/AIInsights.tsx",
              lineNumber: 420,
              columnNumber: 23
            }, this)
          ] }, void 0, true, {
            fileName: "app/components/AIInsights.tsx",
            lineNumber: 393,
            columnNumber: 34
          }, this)
        ] }, recommendation.id, true, {
          fileName: "app/components/AIInsights.tsx",
          lineNumber: 330,
          columnNumber: 18
        }, this);
      }) }, void 0, false, {
        fileName: "app/components/AIInsights.tsx",
        lineNumber: 322,
        columnNumber: 11
      }, this),
      insights.recommendations.length > 5 && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
        textAlign: "center",
        marginTop: "16px"
      }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("p", { style: {
        color: "#666",
        fontSize: "14px"
      }, children: [
        "Showing 5 of ",
        insights.recommendations.length,
        " recommendations"
      ] }, void 0, true, {
        fileName: "app/components/AIInsights.tsx",
        lineNumber: 459,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "app/components/AIInsights.tsx",
        lineNumber: 455,
        columnNumber: 51
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AIInsights.tsx",
      lineNumber: 305,
      columnNumber: 75
    }, this),
    insights.performance?.insights && insights.performance.insights.length > 0 && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      background: "white",
      border: "1px solid #e3e3e3",
      borderRadius: "8px",
      padding: "24px",
      marginBottom: "16px",
      boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h3", { style: {
        fontSize: "16px",
        fontWeight: "600",
        color: "#202223",
        margin: "0 0 16px 0"
      }, children: "Performance Analysis" }, void 0, false, {
        fileName: "app/components/AIInsights.tsx",
        lineNumber: 477,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
        display: "flex",
        flexDirection: "column",
        gap: "12px"
      }, children: insights.performance.insights.map((insight, index) => /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
        padding: "16px",
        background: "#f6f6f7",
        borderRadius: "6px",
        borderLeft: "4px solid #008060"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
          fontSize: "14px",
          fontWeight: "600",
          color: "#202223",
          marginBottom: "8px"
        }, children: insight.title }, void 0, false, {
          fileName: "app/components/AIInsights.tsx",
          lineNumber: 497,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
          color: "#666",
          fontSize: "14px",
          marginBottom: "8px"
        }, children: insight.description }, void 0, false, {
          fileName: "app/components/AIInsights.tsx",
          lineNumber: 505,
          columnNumber: 17
        }, this),
        insight.action && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
          fontSize: "13px",
          color: "#008060",
          fontWeight: "500"
        }, children: [
          "\u{1F4A1} ",
          insight.action
        ] }, void 0, true, {
          fileName: "app/components/AIInsights.tsx",
          lineNumber: 512,
          columnNumber: 36
        }, this)
      ] }, index, true, {
        fileName: "app/components/AIInsights.tsx",
        lineNumber: 491,
        columnNumber: 68
      }, this)) }, void 0, false, {
        fileName: "app/components/AIInsights.tsx",
        lineNumber: 486,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AIInsights.tsx",
      lineNumber: 469,
      columnNumber: 86
    }, this),
    insights.costOptimization?.quickWins && insights.costOptimization.quickWins.length > 0 && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      background: "white",
      border: "1px solid #e3e3e3",
      borderRadius: "8px",
      padding: "24px",
      boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h3", { style: {
        fontSize: "16px",
        fontWeight: "600",
        color: "#202223",
        margin: "0 0 16px 0"
      }, children: "\u26A1 Quick Wins" }, void 0, false, {
        fileName: "app/components/AIInsights.tsx",
        lineNumber: 531,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "16px"
      }, children: insights.costOptimization.quickWins.map((win, index) => /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
        padding: "16px",
        background: "#e7f3ff",
        border: "1px solid #90caf9",
        borderRadius: "6px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
          fontSize: "14px",
          fontWeight: "600",
          color: "#1976d2",
          marginBottom: "8px"
        }, children: win.title }, void 0, false, {
          fileName: "app/components/AIInsights.tsx",
          lineNumber: 551,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
          color: "#666",
          fontSize: "14px",
          marginBottom: "12px"
        }, children: win.description }, void 0, false, {
          fileName: "app/components/AIInsights.tsx",
          lineNumber: 559,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
          display: "flex",
          justifyContent: "space-between",
          fontSize: "12px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("span", { style: {
            color: "#666"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("strong", { children: "Effort:" }, void 0, false, {
              fileName: "app/components/AIInsights.tsx",
              lineNumber: 574,
              columnNumber: 21
            }, this),
            " ",
            win.effort
          ] }, void 0, true, {
            fileName: "app/components/AIInsights.tsx",
            lineNumber: 571,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("span", { style: {
            color: "#1976d2"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("strong", { children: "Impact:" }, void 0, false, {
              fileName: "app/components/AIInsights.tsx",
              lineNumber: 579,
              columnNumber: 21
            }, this),
            " ",
            win.impact
          ] }, void 0, true, {
            fileName: "app/components/AIInsights.tsx",
            lineNumber: 576,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("span", { style: {
            color: "#666"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("strong", { children: "Time:" }, void 0, false, {
              fileName: "app/components/AIInsights.tsx",
              lineNumber: 584,
              columnNumber: 21
            }, this),
            " ",
            win.timeToImplement
          ] }, void 0, true, {
            fileName: "app/components/AIInsights.tsx",
            lineNumber: 581,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AIInsights.tsx",
          lineNumber: 566,
          columnNumber: 17
        }, this)
      ] }, index, true, {
        fileName: "app/components/AIInsights.tsx",
        lineNumber: 545,
        columnNumber: 70
      }, this)) }, void 0, false, {
        fileName: "app/components/AIInsights.tsx",
        lineNumber: 540,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AIInsights.tsx",
      lineNumber: 524,
      columnNumber: 98
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/AIInsights.tsx",
    lineNumber: 171,
    columnNumber: 10
  }, this);
}
_s2(AIInsights, "IxQidINEJLQm99chx1Il5ee9408=", false, function() {
  return [useFetcher];
});
_c2 = AIInsights;
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
var _c2;
$RefreshReg$(_c2, "AIInsights");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

// app/routes/app.insights.tsx
var import_jsx_dev_runtime3 = __toESM(require_jsx_dev_runtime());
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
var _s3 = $RefreshSig$();
var _s22 = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/app.insights.tsx"
  );
  import.meta.hot.lastModified = "1758893736579.5195";
}
function SimpleChart({
  data
}) {
  _s3();
  const [ChartComponent, setChartComponent] = React3.useState(null);
  React3.useEffect(() => {
    let alive = true;
    import("/assets/_shared/SimpleLines.client-R233Y6A3.js").then((mod) => {
      if (alive)
        setChartComponent(() => mod.default);
    });
    return () => {
      alive = false;
    };
  }, []);
  if (!data?.length)
    return /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
      height: 180,
      border: "1px solid #eee",
      borderRadius: 8,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#666"
    }, children: "No data" }, void 0, false, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 46,
      columnNumber: 29
    }, this);
  if (!ChartComponent) {
    return /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
      height: 180,
      border: "1px solid #eee",
      borderRadius: 8,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#666"
    }, children: "Loading chart..." }, void 0, false, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 58,
      columnNumber: 12
    }, this);
  }
  return /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)(ChartComponent, { data }, void 0, false, {
    fileName: "app/routes/app.insights.tsx",
    lineNumber: 70,
    columnNumber: 10
  }, this);
}
_s3(SimpleChart, "573Tj3GFkXu19lwGqvY6g9TPtiA=");
_c3 = SimpleChart;
var InsightsErrorBoundary = class extends React3.Component {
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
      return /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
        padding: 20,
        border: "1px solid #f56565",
        borderRadius: 8,
        backgroundColor: "#fed7d7"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("h2", { children: "Something went wrong" }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 313,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("p", { children: "The insights page encountered an error. Please refresh the page." }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 314,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("button", { onClick: () => window.location.reload(), style: {
          marginTop: 10,
          padding: "8px 16px"
        }, children: "Refresh Page" }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 317,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 307,
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
  const [toast, setToast] = React3.useState("");
  const [isApplying, setIsApplying] = React3.useState(false);
  const [realTimeEnabled, setRealTimeEnabled] = React3.useState(false);
  const w = React3.useMemo(() => {
    try {
      const param = sp.get("w");
      const validDurations = ["24h", "7d", "30d", "90d"];
      return validDurations.includes(param) ? param : data?.w || "7d";
    } catch {
      return "7d";
    }
  }, [sp, data]);
  const dataSource = React3.useMemo(() => data?.dataSource || "none", [data]);
  const hasRealData = React3.useMemo(() => data?.ok && data?.series && data.series.length > 0 && dataSource !== "none", [data, dataSource]);
  const k = React3.useMemo(() => data?.kpi || {
    clicks: 0,
    cost: 0,
    conversions: 0,
    impressions: 0,
    ctr: 0,
    cpc: 0,
    cpa: 0
  }, [data]);
  const terms = React3.useMemo(() => Array.isArray(data?.top_terms) ? data.top_terms : [], [data]);
  const series = React3.useMemo(() => Array.isArray(data?.series) ? data.series : [], [data]);
  const explain = React3.useMemo(() => Array.isArray(data?.explain) ? data.explain : [], [data]);
  const logs = React3.useMemo(() => Array.isArray(data?.logs) ? data.logs : [], [data]);
  const retention = React3.useMemo(() => data?._retention || null, [data]);
  const tierStatus = React3.useMemo(() => data?.tierStatus || {
    tier: "starter",
    features: {}
  }, [data]);
  const shopName = React3.useMemo(() => {
    return data?.shopName || "demo-shop";
  }, [data]);
  React3.useEffect(() => {
    setRealTimeEnabled(tierStatus?.features?.realTimeAnalytics || false);
  }, [tierStatus]);
  const handleApplyAction = React3.useCallback(async (action, target) => {
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
  React3.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 3e3);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const handleUpgrade = React3.useCallback((tier) => {
    window.location.href = `/app/billing?upgrade=${tier}`;
  }, []);
  const handleDataRefresh = React3.useCallback(() => {
    revalidator.revalidate();
  }, [revalidator]);
  return /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
    background: "#f6f6f7",
    minHeight: "100vh",
    padding: "0"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
      background: "white",
      borderBottom: "1px solid #e3e3e3",
      padding: "20px 24px"
    }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      maxWidth: "1200px",
      margin: "0 auto"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
        display: "flex",
        alignItems: "center",
        gap: "16px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("h1", { style: {
            fontSize: "24px",
            fontWeight: "600",
            color: "#202223",
            margin: "0"
          }, children: "Analytics Dashboard" }, void 0, false, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 464,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("p", { style: {
            margin: "4px 0 0 0",
            color: "#616161",
            fontSize: "14px",
            fontWeight: "400"
          }, children: "Real-time insights and performance metrics" }, void 0, false, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 472,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 463,
          columnNumber: 13
        }, this),
        tierStatus?.tier && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          background: tierStatus.tier === "enterprise" ? "#6f42c1" : tierStatus.tier === "professional" ? "#007bff" : "#28a745",
          color: "white",
          padding: "6px 12px",
          borderRadius: "16px",
          fontSize: "12px",
          fontWeight: "bold",
          textTransform: "uppercase",
          letterSpacing: "0.5px"
        }, children: [
          tierStatus.tier,
          " TIER"
        ] }, void 0, true, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 481,
          columnNumber: 34
        }, this),
        dataSource !== "none" && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          background: dataSource === "supabase" ? "#e3f2fd" : "#fff3cd",
          border: `1px solid ${dataSource === "supabase" ? "#90caf9" : "#ffc107"}`,
          borderRadius: "16px",
          fontSize: "12px",
          color: dataSource === "supabase" ? "#1976d2" : "#856404"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("span", { style: {
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: dataSource === "supabase" ? "#4caf50" : "#ff9800",
            display: "inline-block"
          } }, void 0, false, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 505,
            columnNumber: 17
          }, this),
          "Data: ",
          dataSource === "supabase" ? "Supabase" : dataSource === "sheets" ? "Google Sheets" : "Legacy"
        ] }, void 0, true, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 494,
          columnNumber: 39
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 458,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
        display: "flex",
        gap: "12px",
        alignItems: "center"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)(AIStatusIndicator, { shopName: k, compact: true, showTokenUsage: true }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 522,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("button", { onClick: async () => {
          try {
            const {
              backendFetch
            } = await import("/assets/_shared/hmac-UH5PTSKZ.js");
            const response = await backendFetch("/ai/weekly-summary-preview", "GET", void 0, k);
            if (response.ok) {
              const data2 = await response.json();
              if (data2.ok) {
                window.location.href = "/app/ai-dashboard";
              } else {
                setToast("Failed to generate AI summary");
              }
            } else {
              setToast("AI summary not available");
            }
          } catch (error) {
            setToast("Error generating AI summary");
          }
        }, style: {
          padding: "8px 12px",
          fontSize: "12px",
          fontWeight: "500",
          border: "1px solid #28a745",
          borderRadius: "6px",
          backgroundColor: "white",
          color: "#28a745",
          cursor: "pointer",
          transition: "all 0.2s ease",
          display: "flex",
          alignItems: "center",
          gap: "4px"
        }, onMouseEnter: (e) => {
          e.currentTarget.style.backgroundColor = "#28a745";
          e.currentTarget.style.color = "white";
        }, onMouseLeave: (e) => {
          e.currentTarget.style.backgroundColor = "white";
          e.currentTarget.style.color = "#28a745";
        }, children: "\u{1F916} AI Summary" }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 525,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          display: "flex",
          gap: "4px",
          background: "white",
          border: "1px solid #c9cccf",
          borderRadius: "6px",
          padding: "2px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)(Link, { to: "/app/insights?w=24h", style: {
            textDecoration: "none"
          }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("button", { disabled: w === "24h" || nav.state !== "idle", style: {
            padding: "6px 12px",
            fontSize: "13px",
            fontWeight: "500",
            border: "none",
            borderRadius: "4px",
            backgroundColor: w === "24h" ? "#008060" : "transparent",
            color: w === "24h" ? "white" : "#202223",
            cursor: w === "24h" || nav.state !== "idle" ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            opacity: w === "24h" || nav.state !== "idle" ? 0.6 : 1
          }, children: "24h" }, void 0, false, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 579,
            columnNumber: 17
          }, this) }, void 0, false, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 576,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)(Link, { to: "/app/insights?w=7d", style: {
            textDecoration: "none"
          }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("button", { disabled: w === "7d" || nav.state !== "idle", style: {
            padding: "6px 12px",
            fontSize: "13px",
            fontWeight: "500",
            border: "none",
            borderRadius: "4px",
            backgroundColor: w === "7d" ? "#008060" : "transparent",
            color: w === "7d" ? "white" : "#202223",
            cursor: w === "7d" || nav.state !== "idle" ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            opacity: w === "7d" || nav.state !== "idle" ? 0.6 : 1
          }, children: "7d" }, void 0, false, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 597,
            columnNumber: 17
          }, this) }, void 0, false, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 594,
            columnNumber: 15
          }, this),
          (tierStatus?.tier === "professional" || tierStatus?.tier === "enterprise") && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)(Link, { to: "/app/insights?w=30d", style: {
            textDecoration: "none"
          }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("button", { disabled: w === "30d" || nav.state !== "idle", style: {
            padding: "6px 12px",
            fontSize: "13px",
            fontWeight: "500",
            border: "none",
            borderRadius: "4px",
            backgroundColor: w === "30d" ? "#008060" : "transparent",
            color: w === "30d" ? "white" : "#202223",
            cursor: w === "30d" || nav.state !== "idle" ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            opacity: w === "30d" || nav.state !== "idle" ? 0.6 : 1
          }, children: "30d" }, void 0, false, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 615,
            columnNumber: 19
          }, this) }, void 0, false, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 612,
            columnNumber: 94
          }, this),
          tierStatus?.tier === "enterprise" && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)(Link, { to: "/app/insights?w=90d", style: {
            textDecoration: "none"
          }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("button", { disabled: w === "90d" || nav.state !== "idle", style: {
            padding: "6px 12px",
            fontSize: "13px",
            fontWeight: "500",
            border: "none",
            borderRadius: "4px",
            backgroundColor: w === "90d" ? "#008060" : "transparent",
            color: w === "90d" ? "white" : "#202223",
            cursor: w === "90d" || nav.state !== "idle" ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            opacity: w === "90d" || nav.state !== "idle" ? 0.6 : 1
          }, children: "90d" }, void 0, false, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 633,
            columnNumber: 19
          }, this) }, void 0, false, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 630,
            columnNumber: 53
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 568,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 516,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 451,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 446,
      columnNumber: 7
    }, this),
    tierStatus?.subscriptionInfo && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
      padding: "0 24px",
      maxWidth: "1200px",
      margin: "16px auto 0 auto"
    }, children: [
      tierStatus.subscriptionInfo.isInTrial && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
        background: "#fff3cd",
        border: "1px solid #ffc107",
        borderRadius: "8px",
        padding: "12px 16px",
        marginBottom: "16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("h3", { style: {
          margin: "0",
          fontSize: "14px",
          color: "#856404",
          fontWeight: "600"
        }, children: [
          "Free Trial Active - ",
          tierStatus.tier?.toUpperCase(),
          " Plan"
        ] }, void 0, true, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 670,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("p", { style: {
          margin: "4px 0 0 0",
          fontSize: "13px",
          color: "#856404"
        }, children: [
          tierStatus.subscriptionInfo.trialDaysRemaining,
          " days remaining \u2022 Full access to all features"
        ] }, void 0, true, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 678,
          columnNumber: 17
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 669,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 659,
        columnNumber: 53
      }, this),
      tierStatus.subscriptionInfo.hasActivePayment && !tierStatus.subscriptionInfo.isInTrial && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
        background: "#d1eddd",
        border: "1px solid #28a745",
        borderRadius: "8px",
        padding: "12px 16px",
        marginBottom: "16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("h3", { style: {
          margin: "0",
          fontSize: "14px",
          color: "#155724",
          fontWeight: "600"
        }, children: [
          tierStatus.tier?.toUpperCase(),
          " Plan Active"
        ] }, void 0, true, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 698,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("p", { style: {
          margin: "4px 0 0 0",
          fontSize: "13px",
          color: "#155724"
        }, children: [
          "Full access to all ",
          tierStatus.tier,
          " features \u2022 Data retention: ",
          tierStatus.features?.dataRetention || 30,
          " days"
        ] }, void 0, true, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 706,
          columnNumber: 17
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 697,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 687,
        columnNumber: 102
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 654,
      columnNumber: 40
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
      maxWidth: "1200px",
      margin: "0 auto",
      padding: "20px"
    }, children: [
      !hasRealData && dataSource === "none" && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
        background: "white",
        borderRadius: "8px",
        padding: "48px",
        textAlign: "center",
        marginBottom: "32px",
        border: "1px solid #e3e3e3"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("h2", { style: {
          color: "#202223",
          marginBottom: "16px"
        }, children: "No Analytics Data Available" }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 732,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("p", { style: {
          color: "#616161",
          marginBottom: "24px"
        }, children: "Run the Google Ads script to start collecting campaign metrics. Data will appear here after the first successful script execution." }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 736,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          display: "inline-block",
          padding: "12px 24px",
          background: "#f6f6f7",
          borderRadius: "6px",
          fontSize: "14px",
          color: "#202223"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("strong", { children: "Next steps:" }, void 0, false, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 751,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("ol", { style: {
            textAlign: "left",
            margin: "12px 0 0 0",
            paddingLeft: "20px"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("li", { children: "Copy the Google Ads script from the Setup page" }, void 0, false, {
              fileName: "app/routes/app.insights.tsx",
              lineNumber: 757,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("li", { children: "Add it to your Google Ads account" }, void 0, false, {
              fileName: "app/routes/app.insights.tsx",
              lineNumber: 758,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("li", { children: "Run the script or schedule it to run daily" }, void 0, false, {
              fileName: "app/routes/app.insights.tsx",
              lineNumber: 759,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("li", { children: "Check back here in 5-10 minutes" }, void 0, false, {
              fileName: "app/routes/app.insights.tsx",
              lineNumber: 760,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 752,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 743,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 724,
        columnNumber: 51
      }, this),
      (hasRealData || dataSource !== "none") && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
        marginBottom: "32px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)(AnalyticsTier, { tenant: shopName, data: {
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
          lineNumber: 769,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)(AIInsights, { shopName, period: w, onRefresh: handleDataRefresh }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 782,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 766,
        columnNumber: 52
      }, this),
      retention && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
        background: retention.tier === "starter" ? "linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)" : retention.tier === "professional" ? "linear-gradient(135deg, #e7f3ff 0%, #74b9ff 100%)" : "linear-gradient(135deg, #d1eddd 0%, #00b894 100%)",
        border: retention.tier === "starter" ? "1px solid #ffc107" : retention.tier === "professional" ? "1px solid #007bff" : "1px solid #28a745",
        borderRadius: 16,
        padding: 24,
        marginBottom: 32,
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          fontWeight: "bold",
          marginBottom: 12,
          fontSize: 16
        }, children: [
          retention.tier === "starter" ? "\u26A0\uFE0F" : retention.tier === "professional" ? "\u2139\uFE0F" : "\u2705",
          " Data Retention: ",
          retention.description,
          " (",
          retention.tier.toUpperCase(),
          " plan)"
        ] }, void 0, true, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 792,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          color: "#6b7280",
          fontSize: 14,
          marginBottom: 16
        }, children: [
          "Data older than ",
          retention.cutoffDate,
          " is not shown"
        ] }, void 0, true, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 799,
          columnNumber: 13
        }, this),
        retention.upgradeMessage && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)(Link, { to: "/app/billing", style: {
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
          padding: "12px 24px",
          textDecoration: "none",
          borderRadius: 12,
          fontSize: 14,
          fontWeight: "600",
          display: "inline-block",
          boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
          transition: "all 0.3s ease"
        }, onMouseOver: (e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 6px 20px rgba(102, 126, 234, 0.4)";
        }, onMouseOut: (e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.3)";
        }, children: retention.upgradeMessage }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 806,
          columnNumber: 42
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 784,
        columnNumber: 23
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
        marginBottom: 24
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          background: "white",
          border: "1px solid #e3e3e3",
          borderRadius: 8,
          padding: 20,
          boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("h3", { style: {
            margin: "0 0 16px 0",
            fontSize: 16,
            fontWeight: "600",
            color: "#202223"
          }, children: [
            "Trend (",
            w,
            ")",
            retention ? ` - ${retention.description}` : ""
          ] }, void 0, true, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 841,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)(SimpleChart, { data: series }, void 0, false, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 849,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 834,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          background: "white",
          border: "1px solid #e3e3e3",
          borderRadius: 8,
          padding: 20,
          boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("h3", { style: {
              margin: 0,
              fontSize: 16,
              fontWeight: "600",
              color: "#202223"
            }, children: [
              "Top search terms (",
              w,
              ")"
            ] }, void 0, true, {
              fileName: "app/routes/app.insights.tsx",
              lineNumber: 864,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)(Link, { to: `/app/insights/terms?w=${w}`, style: {
              textDecoration: "none"
            }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("button", { style: {
              background: "#008060",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: "500",
              padding: "6px 12px",
              borderRadius: 6,
              transition: "all 0.2s ease"
            }, children: "View all terms" }, void 0, false, {
              fileName: "app/routes/app.insights.tsx",
              lineNumber: 875,
              columnNumber: 17
            }, this) }, void 0, false, {
              fileName: "app/routes/app.insights.tsx",
              lineNumber: 872,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 858,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
            maxHeight: 200,
            overflowY: "auto"
          }, children: terms.length > 0 ? terms.slice(0, 5).map((term, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 0",
            borderBottom: i < terms.slice(0, 5).length - 1 ? "1px solid #f3f4f6" : "none"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("span", { style: {
              fontWeight: "600",
              color: "#1f2937"
            }, children: term.term }, void 0, false, {
              fileName: "app/routes/app.insights.tsx",
              lineNumber: 901,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
              display: "flex",
              gap: 16,
              fontSize: 14
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("span", { style: {
                color: "#6b7280"
              }, children: [
                term.clicks,
                " clicks"
              ] }, void 0, true, {
                fileName: "app/routes/app.insights.tsx",
                lineNumber: 910,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("span", { style: {
                color: "#6b7280"
              }, children: [
                "$",
                term.cost?.toFixed(2)
              ] }, void 0, true, {
                fileName: "app/routes/app.insights.tsx",
                lineNumber: 913,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("span", { style: {
                color: "#6b7280"
              }, children: [
                term.conv,
                " conv."
              ] }, void 0, true, {
                fileName: "app/routes/app.insights.tsx",
                lineNumber: 918,
                columnNumber: 23
              }, this)
            ] }, void 0, true, {
              fileName: "app/routes/app.insights.tsx",
              lineNumber: 905,
              columnNumber: 21
            }, this)
          ] }, i, true, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 894,
            columnNumber: 70
          }, this)) : /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
            color: "#6b7280",
            textAlign: "center",
            padding: 20
          }, children: "No search terms data available" }, void 0, false, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 922,
            columnNumber: 29
          }, this) }, void 0, false, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 890,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 851,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 828,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
        marginBottom: 24
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          background: "white",
          border: "1px solid #e3e3e3",
          borderRadius: 8,
          padding: 20,
          boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("h3", { style: {
            margin: "0 0 16px 0",
            fontSize: 16,
            fontWeight: "600",
            color: "#202223"
          }, children: "Activity (last 10)" }, void 0, false, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 946,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
            maxHeight: 200,
            overflowY: "auto"
          }, children: logs.length > 0 ? logs.map((l, i) => {
            if (!l || typeof l !== "object")
              return null;
            return /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
              padding: "12px 0",
              borderBottom: i < logs.length - 1 ? "1px solid #f3f4f6" : "none",
              fontSize: 14
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("span", { style: {
                color: "#6b7280"
              }, children: l.timestamp || "No timestamp" }, void 0, false, {
                fileName: "app/routes/app.insights.tsx",
                lineNumber: 965,
                columnNumber: 23
              }, this),
              " ",
              "\u2014 ",
              /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("span", { style: {
                color: "#1f2937"
              }, children: l.message || "No message" }, void 0, false, {
                fileName: "app/routes/app.insights.tsx",
                lineNumber: 970,
                columnNumber: 25
              }, this)
            ] }, `log-${i}-${l.timestamp || i}`, true, {
              fileName: "app/routes/app.insights.tsx",
              lineNumber: 960,
              columnNumber: 22
            }, this);
          }) : /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
            color: "#6b7280",
            textAlign: "center",
            padding: 20
          }, children: "No recent activity." }, void 0, false, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 974,
            columnNumber: 18
          }, this) }, void 0, false, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 954,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 939,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          background: "white",
          border: "1px solid #e3e3e3",
          borderRadius: 8,
          padding: 20,
          boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("h3", { style: {
            margin: "0 0 16px 0",
            fontSize: 16,
            fontWeight: "600",
            color: "#202223"
          }, children: "Term Details" }, void 0, false, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 990,
            columnNumber: 13
          }, this),
          terms.length > 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 0",
              borderBottom: "1px solid #f3f4f6"
            }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("span", { style: {
              fontWeight: "700",
              fontSize: 18,
              color: "#1f2937"
            }, children: terms[0].term }, void 0, false, {
              fileName: "app/routes/app.insights.tsx",
              lineNumber: 1006,
              columnNumber: 19
            }, this) }, void 0, false, {
              fileName: "app/routes/app.insights.tsx",
              lineNumber: 999,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
              display: "flex",
              gap: 32,
              marginTop: 16
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
                  color: "#6b7280",
                  fontSize: 12,
                  marginBottom: 8,
                  fontWeight: "500"
                }, children: "Clicks" }, void 0, false, {
                  fileName: "app/routes/app.insights.tsx",
                  lineNumber: 1020,
                  columnNumber: 21
                }, this),
                /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
                  fontSize: 24,
                  fontWeight: "700",
                  color: "#1f2937"
                }, children: terms[0].clicks }, void 0, false, {
                  fileName: "app/routes/app.insights.tsx",
                  lineNumber: 1028,
                  columnNumber: 21
                }, this)
              ] }, void 0, true, {
                fileName: "app/routes/app.insights.tsx",
                lineNumber: 1019,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
                  color: "#6b7280",
                  fontSize: 12,
                  marginBottom: 8,
                  fontWeight: "500"
                }, children: "Cost" }, void 0, false, {
                  fileName: "app/routes/app.insights.tsx",
                  lineNumber: 1037,
                  columnNumber: 21
                }, this),
                /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
                  fontSize: 24,
                  fontWeight: "700",
                  color: "#1f2937"
                }, children: [
                  "$",
                  terms[0].cost?.toFixed(2)
                ] }, void 0, true, {
                  fileName: "app/routes/app.insights.tsx",
                  lineNumber: 1045,
                  columnNumber: 21
                }, this)
              ] }, void 0, true, {
                fileName: "app/routes/app.insights.tsx",
                lineNumber: 1036,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
                  color: "#6b7280",
                  fontSize: 12,
                  marginBottom: 8,
                  fontWeight: "500"
                }, children: "Conv." }, void 0, false, {
                  fileName: "app/routes/app.insights.tsx",
                  lineNumber: 1054,
                  columnNumber: 21
                }, this),
                /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
                  fontSize: 24,
                  fontWeight: "700",
                  color: "#1f2937"
                }, children: terms[0].conversions || 0 }, void 0, false, {
                  fileName: "app/routes/app.insights.tsx",
                  lineNumber: 1062,
                  columnNumber: 21
                }, this)
              ] }, void 0, true, {
                fileName: "app/routes/app.insights.tsx",
                lineNumber: 1053,
                columnNumber: 19
              }, this)
            ] }, void 0, true, {
              fileName: "app/routes/app.insights.tsx",
              lineNumber: 1014,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 998,
            columnNumber: 33
          }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
            color: "#6b7280",
            textAlign: "center",
            padding: 20
          }, children: "Not enough data yet." }, void 0, false, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 1071,
            columnNumber: 24
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 983,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 933,
        columnNumber: 9
      }, this),
      explain.length > 0 && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
        background: "white",
        border: "1px solid #e3e3e3",
        borderRadius: 8,
        padding: 20,
        boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)",
        marginBottom: 24
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("h3", { style: {
          margin: "0 0 16px 0",
          fontSize: 16,
          fontWeight: "600",
          color: "#202223"
        }, children: "Explain my spend" }, void 0, false, {
          fileName: "app/routes/app.insights.tsx",
          lineNumber: 1088,
          columnNumber: 13
        }, this),
        explain.map((e, i) => {
          if (!e || typeof e !== "object")
            return null;
          const disabled = fetcher.state !== "idle" || isApplying;
          return /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 0",
            borderBottom: i < explain.length - 1 ? "1px solid #f3f4f6" : "none"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
                fontWeight: "600",
                marginBottom: 8,
                fontSize: 16,
                color: "#1f2937"
              }, children: e.label || "Unknown" }, void 0, false, {
                fileName: "app/routes/app.insights.tsx",
                lineNumber: 1107,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
                color: "#6b7280",
                fontSize: 14
              }, children: [
                e.reason || "No reason provided",
                ". Suggest: ",
                /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("code", { style: {
                  background: "#f3f4f6",
                  padding: "2px 6px",
                  borderRadius: 4
                }, children: e.action || "none" }, void 0, false, {
                  fileName: "app/routes/app.insights.tsx",
                  lineNumber: 1119,
                  columnNumber: 68
                }, this),
                e.target ? ` (${e.target})` : ""
              ] }, void 0, true, {
                fileName: "app/routes/app.insights.tsx",
                lineNumber: 1115,
                columnNumber: 21
              }, this)
            ] }, void 0, true, {
              fileName: "app/routes/app.insights.tsx",
              lineNumber: 1106,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("button", { onClick: () => handleApplyAction(e.action, e.target), disabled, style: {
              background: disabled ? "#c9cccf" : "#008060",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: 6,
              cursor: disabled ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: "500",
              opacity: disabled ? 0.6 : 1,
              transition: "all 0.2s ease"
            }, children: isApplying ? "Applying..." : "Apply" }, void 0, false, {
              fileName: "app/routes/app.insights.tsx",
              lineNumber: 1127,
              columnNumber: 19
            }, this)
          ] }, `explain-${i}-${e.action}-${e.target}`, true, {
            fileName: "app/routes/app.insights.tsx",
            lineNumber: 1099,
            columnNumber: 18
          }, this);
        })
      ] }, void 0, true, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 1080,
        columnNumber: 32
      }, this),
      !!toast && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
        position: "fixed",
        bottom: 20,
        right: 20,
        background: toast.includes("failed") ? "#d82c0d" : "#008060",
        color: "white",
        padding: "12px 20px",
        borderRadius: 6,
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        zIndex: 1e3,
        fontWeight: "500",
        fontSize: 13
      }, children: toast }, void 0, false, {
        fileName: "app/routes/app.insights.tsx",
        lineNumber: 1144,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 718,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/app.insights.tsx",
    lineNumber: 440,
    columnNumber: 10
  }, this);
}
_s22(InsightsContent, "d6bD6oU1mi11oGi9gTTxY3TCsmQ=", false, function() {
  return [useLoaderData, useSearchParams, useNavigation, useFetcher, useRevalidator];
});
_c22 = InsightsContent;
function Insights() {
  return /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)(InsightsErrorBoundary, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)(InsightsContent, {}, void 0, false, {
    fileName: "app/routes/app.insights.tsx",
    lineNumber: 1168,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "app/routes/app.insights.tsx",
    lineNumber: 1167,
    columnNumber: 10
  }, this);
}
_c32 = Insights;
function Card2({
  label,
  value
}) {
  return /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
    border: "1px solid #eee",
    borderRadius: 8,
    padding: 12
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
      fontSize: 12,
      opacity: 0.7
    }, children: label }, void 0, false, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 1181,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
      fontSize: 20,
      fontWeight: 600
    }, children: value ?? "\u2014" }, void 0, false, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 1185,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/app.insights.tsx",
    lineNumber: 1176,
    columnNumber: 10
  }, this);
}
_c4 = Card2;
function ModernCard({
  label,
  value
}) {
  return /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
    background: "white",
    border: "1px solid #e3e3e3",
    borderRadius: 8,
    padding: 16,
    boxShadow: "0 1px 0 rgba(0, 0, 0, 0.05)"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
      color: "#616161",
      fontSize: 12,
      marginBottom: 4,
      fontWeight: "500"
    }, children: label }, void 0, false, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 1203,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
      fontSize: 24,
      fontWeight: "600",
      color: "#202223"
    }, children: value ?? "\u2014" }, void 0, false, {
      fileName: "app/routes/app.insights.tsx",
      lineNumber: 1211,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/app.insights.tsx",
    lineNumber: 1196,
    columnNumber: 10
  }, this);
}
_c5 = ModernCard;
var _c3;
var _c22;
var _c32;
var _c4;
var _c5;
$RefreshReg$(_c3, "SimpleChart");
$RefreshReg$(_c22, "InsightsContent");
$RefreshReg$(_c32, "Insights");
$RefreshReg$(_c4, "Card");
$RefreshReg$(_c5, "ModernCard");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  Insights as default
};
//# sourceMappingURL=/assets/routes/app.insights-X25Z33ZZ.js.map
