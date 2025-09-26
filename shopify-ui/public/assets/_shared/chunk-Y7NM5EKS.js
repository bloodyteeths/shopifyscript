import {
  require_jsx_dev_runtime
} from "/assets/_shared/chunk-IFEKMGEG.js";
import {
  require_react
} from "/assets/_shared/chunk-HGNQ3YCE.js";
import {
  createHotContext
} from "/assets/_shared/chunk-GN6N4SDD.js";
import {
  __toESM
} from "/assets/_shared/chunk-R6OA4XCD.js";

// app/components/AIStatusIndicator.tsx
var import_react = __toESM(require_react());
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/AIStatusIndicator.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/AIStatusIndicator.tsx"
  );
  import.meta.hot.lastModified = "1758893490825.2388";
}
function AIStatusIndicator({
  shopName,
  compact = false,
  showTokenUsage = false
}) {
  _s();
  const [status, setStatus] = (0, import_react.useState)(null);
  const [tokenUsage, setTokenUsage] = (0, import_react.useState)(null);
  const [loading, setLoading] = (0, import_react.useState)(false);
  const [expanded, setExpanded] = (0, import_react.useState)(false);
  const fetchAIStatus = async () => {
    if (!shopName)
      return;
    setLoading(true);
    try {
      const {
        backendFetch
      } = await import("/assets/_shared/hmac-UH5PTSKZ.js");
      const healthResponse = await backendFetch("/ai/health", "GET", void 0, shopName);
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        if (healthData.ok) {
          setStatus(healthData.health);
        }
      }
      if (showTokenUsage) {
        const tokenResponse = await backendFetch("/ai/tokens/usage", "GET", void 0, shopName);
        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json();
          if (tokenData.ok) {
            setTokenUsage(tokenData.usage);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch AI status:", error);
    } finally {
      setLoading(false);
    }
  };
  (0, import_react.useEffect)(() => {
    if (shopName) {
      fetchAIStatus();
      const interval = setInterval(fetchAIStatus, 3e4);
      return () => clearInterval(interval);
    }
  }, [shopName, showTokenUsage]);
  const getStatusColor = (statusValue) => {
    switch (statusValue?.toLowerCase()) {
      case "healthy":
      case "active":
        return {
          bg: "#d1f2eb",
          color: "#0f5132",
          icon: "\u2705"
        };
      case "degraded":
      case "warning":
        return {
          bg: "#fef3c7",
          color: "#d97706",
          icon: "\u26A0\uFE0F"
        };
      case "unhealthy":
      case "error":
      case "inactive":
        return {
          bg: "#fef2f2",
          color: "#dc2626",
          icon: "\u274C"
        };
      default:
        return {
          bg: "#f8f9fa",
          color: "#6c757d",
          icon: "\u2753"
        };
    }
  };
  const getTokenUsageStatus = () => {
    if (!tokenUsage)
      return null;
    const dailyCost = tokenUsage.current?.daily?.cost || 0;
    const dailyBudget = tokenUsage.budget?.daily || 0;
    const usagePercent = dailyBudget > 0 ? dailyCost / dailyBudget * 100 : 0;
    if (usagePercent > 90) {
      return {
        status: "critical",
        color: "#dc2626",
        message: "Near budget limit"
      };
    } else if (usagePercent > 70) {
      return {
        status: "warning",
        color: "#d97706",
        message: "High usage"
      };
    } else {
      return {
        status: "normal",
        color: "#28a745",
        message: "Normal usage"
      };
    }
  };
  if (loading && !status) {
    return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      padding: compact ? "2px 6px" : "4px 8px",
      borderRadius: "12px",
      background: "#f8f9fa",
      color: "#6c757d",
      fontSize: compact ? "10px" : "12px",
      fontWeight: "bold"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: "\u23F3" }, void 0, false, {
        fileName: "app/components/AIStatusIndicator.tsx",
        lineNumber: 143,
        columnNumber: 9
      }, this),
      !compact && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: "Checking AI..." }, void 0, false, {
        fileName: "app/components/AIStatusIndicator.tsx",
        lineNumber: 144,
        columnNumber: 22
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AIStatusIndicator.tsx",
      lineNumber: 132,
      columnNumber: 12
    }, this);
  }
  if (!status) {
    return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      padding: compact ? "2px 6px" : "4px 8px",
      borderRadius: "12px",
      background: "#f8f9fa",
      color: "#6c757d",
      fontSize: compact ? "10px" : "12px",
      fontWeight: "bold"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: "\u2753" }, void 0, false, {
        fileName: "app/components/AIStatusIndicator.tsx",
        lineNumber: 159,
        columnNumber: 9
      }, this),
      !compact && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: "AI Status Unknown" }, void 0, false, {
        fileName: "app/components/AIStatusIndicator.tsx",
        lineNumber: 160,
        columnNumber: 22
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AIStatusIndicator.tsx",
      lineNumber: 148,
      columnNumber: 12
    }, this);
  }
  const overallStatus = getStatusColor(status.overall);
  const activeAlerts = status.tenant?.alerts?.filter((alert) => alert.active) || [];
  const tokenStatus = getTokenUsageStatus();
  if (compact) {
    return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      padding: "2px 6px",
      borderRadius: "12px",
      background: overallStatus.bg,
      color: overallStatus.color,
      fontSize: "10px",
      fontWeight: "bold",
      cursor: expanded ? "default" : "pointer",
      position: "relative"
    }, onClick: () => !expanded && setExpanded(true), title: `AI Status: ${status.overall} \u2022 Click for details`, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: overallStatus.icon }, void 0, false, {
        fileName: "app/components/AIStatusIndicator.tsx",
        lineNumber: 180,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: "AI" }, void 0, false, {
        fileName: "app/components/AIStatusIndicator.tsx",
        lineNumber: 181,
        columnNumber: 9
      }, this),
      activeAlerts.length > 0 && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
        background: "#dc2626",
        color: "white",
        borderRadius: "50%",
        width: "12px",
        height: "12px",
        fontSize: "8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }, children: activeAlerts.length }, void 0, false, {
        fileName: "app/components/AIStatusIndicator.tsx",
        lineNumber: 182,
        columnNumber: 37
      }, this),
      expanded && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        position: "absolute",
        top: "100%",
        right: 0,
        marginTop: "4px",
        background: "white",
        border: "1px solid #e1e3e5",
        borderRadius: "6px",
        padding: "8px",
        minWidth: "200px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        zIndex: 1e3,
        fontSize: "11px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "AI System Status" }, void 0, false, {
            fileName: "app/components/AIStatusIndicator.tsx",
            lineNumber: 217,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: (e) => {
            e.stopPropagation();
            setExpanded(false);
          }, style: {
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#6c757d",
            fontSize: "12px"
          }, children: "\u2715" }, void 0, false, {
            fileName: "app/components/AIStatusIndicator.tsx",
            lineNumber: 218,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AIStatusIndicator.tsx",
          lineNumber: 211,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          display: "grid",
          gap: "4px",
          marginBottom: "8px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            display: "flex",
            justifyContent: "space-between"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: "Overall:" }, void 0, false, {
              fileName: "app/components/AIStatusIndicator.tsx",
              lineNumber: 241,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
              color: overallStatus.color,
              fontWeight: "bold"
            }, children: [
              overallStatus.icon,
              " ",
              status.overall
            ] }, void 0, true, {
              fileName: "app/components/AIStatusIndicator.tsx",
              lineNumber: 242,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "app/components/AIStatusIndicator.tsx",
            lineNumber: 237,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            display: "flex",
            justifyContent: "space-between"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: "Provider:" }, void 0, false, {
              fileName: "app/components/AIStatusIndicator.tsx",
              lineNumber: 253,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
              color: getStatusColor(status.services?.aiProvider?.status).color
            }, children: status.services?.aiProvider?.status || "unknown" }, void 0, false, {
              fileName: "app/components/AIStatusIndicator.tsx",
              lineNumber: 254,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "app/components/AIStatusIndicator.tsx",
            lineNumber: 249,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            display: "flex",
            justifyContent: "space-between"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: "Automation:" }, void 0, false, {
              fileName: "app/components/AIStatusIndicator.tsx",
              lineNumber: 264,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
              color: getStatusColor(status.services?.automation?.status).color
            }, children: status.services?.automation?.status || "unknown" }, void 0, false, {
              fileName: "app/components/AIStatusIndicator.tsx",
              lineNumber: 265,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "app/components/AIStatusIndicator.tsx",
            lineNumber: 260,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AIStatusIndicator.tsx",
          lineNumber: 232,
          columnNumber: 13
        }, this),
        showTokenUsage && tokenStatus && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          marginBottom: "8px",
          paddingTop: "4px",
          borderTop: "1px solid #e1e3e5"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: "Token Usage:" }, void 0, false, {
              fileName: "app/components/AIStatusIndicator.tsx",
              lineNumber: 283,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
              color: tokenStatus.color,
              fontWeight: "bold",
              fontSize: "10px"
            }, children: tokenStatus.message }, void 0, false, {
              fileName: "app/components/AIStatusIndicator.tsx",
              lineNumber: 284,
              columnNumber: 19
            }, this)
          ] }, void 0, true, {
            fileName: "app/components/AIStatusIndicator.tsx",
            lineNumber: 278,
            columnNumber: 17
          }, this),
          tokenUsage && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            fontSize: "10px",
            color: "#666",
            marginTop: "2px"
          }, children: [
            "$",
            tokenUsage.current?.daily?.cost?.toFixed(2) || "0.00",
            " / $",
            tokenUsage.budget?.daily || "0.00",
            " daily"
          ] }, void 0, true, {
            fileName: "app/components/AIStatusIndicator.tsx",
            lineNumber: 292,
            columnNumber: 32
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AIStatusIndicator.tsx",
          lineNumber: 273,
          columnNumber: 47
        }, this),
        activeAlerts.length > 0 && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          paddingTop: "4px",
          borderTop: "1px solid #e1e3e5"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            fontWeight: "bold",
            marginBottom: "4px",
            color: "#dc2626"
          }, children: [
            "Alerts (",
            activeAlerts.length,
            "):"
          ] }, void 0, true, {
            fileName: "app/components/AIStatusIndicator.tsx",
            lineNumber: 305,
            columnNumber: 17
          }, this),
          activeAlerts.slice(0, 3).map((alert, index) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            fontSize: "10px",
            color: "#dc2626",
            marginBottom: "2px"
          }, children: [
            "\u2022 ",
            alert.message
          ] }, index, true, {
            fileName: "app/components/AIStatusIndicator.tsx",
            lineNumber: 312,
            columnNumber: 65
          }, this)),
          activeAlerts.length > 3 && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            fontSize: "10px",
            color: "#666",
            fontStyle: "italic"
          }, children: [
            "+",
            activeAlerts.length - 3,
            " more alerts"
          ] }, void 0, true, {
            fileName: "app/components/AIStatusIndicator.tsx",
            lineNumber: 319,
            columnNumber: 45
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AIStatusIndicator.tsx",
          lineNumber: 301,
          columnNumber: 41
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AIStatusIndicator.tsx",
        lineNumber: 197,
        columnNumber: 22
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AIStatusIndicator.tsx",
      lineNumber: 167,
      columnNumber: 12
    }, this);
  }
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
    padding: "12px",
    border: "1px solid #e1e3e5",
    borderRadius: "6px",
    background: "white"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "8px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: {
        margin: 0,
        fontSize: "14px",
        fontWeight: "bold"
      }, children: "AI System Status" }, void 0, false, {
        fileName: "app/components/AIStatusIndicator.tsx",
        lineNumber: 344,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: fetchAIStatus, disabled: loading, style: {
        background: "#f8f9fa",
        border: "1px solid #e1e3e5",
        borderRadius: "4px",
        padding: "4px 8px",
        cursor: loading ? "not-allowed" : "pointer",
        fontSize: "10px"
      }, title: "Refresh AI status", children: loading ? "\u23F3" : "\u{1F504}" }, void 0, false, {
        fileName: "app/components/AIStatusIndicator.tsx",
        lineNumber: 349,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AIStatusIndicator.tsx",
      lineNumber: 338,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      display: "grid",
      gap: "8px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
          fontSize: "12px"
        }, children: "Overall Health:" }, void 0, false, {
          fileName: "app/components/AIStatusIndicator.tsx",
          lineNumber: 370,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
          padding: "2px 8px",
          borderRadius: "12px",
          fontSize: "10px",
          fontWeight: "bold",
          background: overallStatus.bg,
          color: overallStatus.color
        }, children: [
          overallStatus.icon,
          " ",
          status.overall
        ] }, void 0, true, {
          fileName: "app/components/AIStatusIndicator.tsx",
          lineNumber: 373,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AIStatusIndicator.tsx",
        lineNumber: 365,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "8px",
        fontSize: "11px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            color: "#666",
            marginBottom: "2px"
          }, children: "AI Provider" }, void 0, false, {
            fileName: "app/components/AIStatusIndicator.tsx",
            lineNumber: 392,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            color: getStatusColor(status.services?.aiProvider?.status).color,
            fontWeight: "bold"
          }, children: status.services?.aiProvider?.status || "unknown" }, void 0, false, {
            fileName: "app/components/AIStatusIndicator.tsx",
            lineNumber: 396,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AIStatusIndicator.tsx",
          lineNumber: 391,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            color: "#666",
            marginBottom: "2px"
          }, children: "Automation" }, void 0, false, {
            fileName: "app/components/AIStatusIndicator.tsx",
            lineNumber: 405,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            color: getStatusColor(status.services?.automation?.status).color,
            fontWeight: "bold"
          }, children: status.services?.automation?.status || "unknown" }, void 0, false, {
            fileName: "app/components/AIStatusIndicator.tsx",
            lineNumber: 409,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AIStatusIndicator.tsx",
          lineNumber: 404,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AIStatusIndicator.tsx",
        lineNumber: 385,
        columnNumber: 9
      }, this),
      showTokenUsage && tokenUsage && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        paddingTop: "8px",
        borderTop: "1px solid #e1e3e5"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          fontSize: "11px",
          color: "#666",
          marginBottom: "4px"
        }, children: "Token Usage (Daily)" }, void 0, false, {
          fileName: "app/components/AIStatusIndicator.tsx",
          lineNumber: 422,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            fontSize: "12px",
            fontWeight: "bold"
          }, children: [
            "$",
            tokenUsage.current?.daily?.cost?.toFixed(2) || "0.00"
          ] }, void 0, true, {
            fileName: "app/components/AIStatusIndicator.tsx",
            lineNumber: 432,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            fontSize: "10px",
            color: "#666"
          }, children: [
            "/ $",
            tokenUsage.budget?.daily || "0.00",
            " limit"
          ] }, void 0, true, {
            fileName: "app/components/AIStatusIndicator.tsx",
            lineNumber: 438,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AIStatusIndicator.tsx",
          lineNumber: 427,
          columnNumber: 13
        }, this),
        tokenStatus && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          fontSize: "10px",
          color: tokenStatus.color,
          marginTop: "2px"
        }, children: tokenStatus.message }, void 0, false, {
          fileName: "app/components/AIStatusIndicator.tsx",
          lineNumber: 445,
          columnNumber: 29
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AIStatusIndicator.tsx",
        lineNumber: 418,
        columnNumber: 42
      }, this),
      activeAlerts.length > 0 && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        paddingTop: "8px",
        borderTop: "1px solid #e1e3e5"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          fontSize: "11px",
          color: "#dc2626",
          fontWeight: "bold",
          marginBottom: "4px"
        }, children: [
          "Active Alerts (",
          activeAlerts.length,
          "):"
        ] }, void 0, true, {
          fileName: "app/components/AIStatusIndicator.tsx",
          lineNumber: 458,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          maxHeight: "60px",
          overflowY: "auto"
        }, children: [
          activeAlerts.slice(0, 5).map((alert, index) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            fontSize: "10px",
            color: "#dc2626",
            marginBottom: "2px"
          }, children: [
            "\u2022 ",
            alert.message
          ] }, index, true, {
            fileName: "app/components/AIStatusIndicator.tsx",
            lineNumber: 470,
            columnNumber: 63
          }, this)),
          activeAlerts.length > 5 && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            fontSize: "10px",
            color: "#666",
            fontStyle: "italic"
          }, children: [
            "+",
            activeAlerts.length - 5,
            " more alerts"
          ] }, void 0, true, {
            fileName: "app/components/AIStatusIndicator.tsx",
            lineNumber: 477,
            columnNumber: 43
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AIStatusIndicator.tsx",
          lineNumber: 466,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AIStatusIndicator.tsx",
        lineNumber: 454,
        columnNumber: 37
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AIStatusIndicator.tsx",
      lineNumber: 361,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/AIStatusIndicator.tsx",
    lineNumber: 332,
    columnNumber: 10
  }, this);
}
_s(AIStatusIndicator, "2Gyf5FoH8PMf8NRyJLDIYoxvttE=");
_c = AIStatusIndicator;
var _c;
$RefreshReg$(_c, "AIStatusIndicator");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

export {
  AIStatusIndicator
};
//# sourceMappingURL=/assets/_shared/chunk-Y7NM5EKS.js.map
