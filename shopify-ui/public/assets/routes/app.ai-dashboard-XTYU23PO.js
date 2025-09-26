import {
  require_subscription
} from "/assets/_shared/chunk-VZJ6BN4E.js";
import {
  require_node
} from "/assets/_shared/chunk-5LF5TODQ.js";
import {
  useLoaderData
} from "/assets/_shared/chunk-LWH66BJU.js";
import "/assets/_shared/chunk-Z7LCWUX7.js";
import {
  require_jsx_dev_runtime
} from "/assets/_shared/chunk-IFEKMGEG.js";
import {
  require_react
} from "/assets/_shared/chunk-HGNQ3YCE.js";
import {
  require_shopify
} from "/assets/_shared/chunk-7OUBBUAS.js";
import {
  createHotContext
} from "/assets/_shared/chunk-GN6N4SDD.js";
import "/assets/_shared/chunk-FK5MLNU6.js";
import {
  __toESM
} from "/assets/_shared/chunk-R6OA4XCD.js";

// app/routes/app.ai-dashboard.tsx
var import_node = __toESM(require_node());
var import_shopify = __toESM(require_shopify());
var import_subscription = __toESM(require_subscription());

// app/components/AIDashboard.tsx
var import_react = __toESM(require_react());

// app/utils/ai-client.ts
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/utils/ai-client.ts"
  );
  import.meta.hot.lastModified = "1758907333336.0054";
}
async function authenticatedFetch(path, method = "GET", body, shopName) {
  const timestamp = Date.now();
  const tenant = shopName || window.__SHOPIFY_SHOP__ || "proofkit";
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  const proxyUrl = `/api/proxy/${cleanPath}`;
  const headers = {
    "Content-Type": "application/json",
    "X-Tenant-ID": tenant,
    "X-Timestamp": timestamp.toString()
  };
  const options = {
    method,
    headers,
    ...body && method !== "GET" ? { body: JSON.stringify(body) } : {}
  };
  return fetch(proxyUrl, options);
}

// app/components/AIDashboard.tsx
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/AIDashboard.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/AIDashboard.tsx"
  );
  import.meta.hot.lastModified = "1758907833877.964";
}
function AIDashboard({
  shopName,
  subscriptionTier = "starter",
  hasFeatureAccess: hasFeatureAccess2 = false
}) {
  _s();
  const [drafts, setDrafts] = (0, import_react.useState)([]);
  const [providerStatus, setProviderStatus] = (0, import_react.useState)(null);
  const [tokenUsage, setTokenUsage] = (0, import_react.useState)(null);
  const [activities, setActivities] = (0, import_react.useState)([]);
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(null);
  const [selectedDrafts, setSelectedDrafts] = (0, import_react.useState)(/* @__PURE__ */ new Set());
  const fetchDrafts = async () => {
    try {
      const response = await authenticatedFetch("/ai/drafts", "GET", void 0, shopName);
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          const allDrafts = [...data.rsa_default.map((d) => ({
            ...d,
            type: "default"
          })), ...data.library.map((d) => ({
            ...d,
            type: "library"
          }))];
          setDrafts(allDrafts);
        }
      }
    } catch (err) {
      console.error("Failed to fetch drafts:", err);
    }
  };
  const fetchProviderStatus = async () => {
    try {
      const response = await authenticatedFetch("/ai/provider/status", "GET", void 0, shopName);
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setProviderStatus(data.status);
        }
      }
    } catch (err) {
      console.error("Failed to fetch provider status:", err);
    }
  };
  const fetchTokenUsage = async () => {
    try {
      const response = await authenticatedFetch("/ai/tokens/usage", "GET", void 0, shopName);
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setTokenUsage(data.usage);
        }
      }
    } catch (err) {
      console.error("Failed to fetch token usage:", err);
    }
  };
  const fetchActivities = async () => {
    try {
      const response = await authenticatedFetch("/ai/logs?limit=10", "GET", void 0, shopName);
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setActivities(data.logs || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch activities:", err);
    }
  };
  const acceptDrafts = async () => {
    const selectedDraftsList = Array.from(selectedDrafts).map((index) => drafts[index]);
    try {
      const response = await authenticatedFetch("/ai/accept", "POST", {
        items: selectedDraftsList.map((draft) => ({
          theme: draft.theme,
          headlines_pipe: draft.headlines.join("|"),
          descriptions_pipe: draft.descriptions.join("|"),
          source: draft.source || "accepted"
        }))
      }, shopName);
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.accepted > 0) {
          setError(null);
          setSelectedDrafts(/* @__PURE__ */ new Set());
          await fetchDrafts();
        } else {
          setError(data.error || "Failed to accept drafts");
        }
      }
    } catch (err) {
      setError("Error accepting drafts: " + err.message);
    }
  };
  const rejectDrafts = () => {
    setSelectedDrafts(/* @__PURE__ */ new Set());
  };
  const triggerAIWriter = async () => {
    if (!hasFeatureAccess2) {
      setError("AI Writer requires Professional+ subscription");
      return;
    }
    try {
      setError(null);
      console.log("Triggering AI writer for shop:", shopName);
      const response = await authenticatedFetch("/jobs/ai_writer", "POST", {
        dryRun: false,
        limit: 5
      }, shopName);
      const responseText = await response.text();
      console.log("AI Writer Response:", responseText);
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Failed to parse response:", responseText);
        setError("AI Writer triggered but response was not valid JSON");
        setTimeout(() => {
          fetchDrafts();
          fetchActivities();
        }, 2e3);
        return;
      }
      if (response.ok && data.ok) {
        setError(null);
        console.log("AI Writer triggered successfully:", data);
        setTimeout(() => {
          fetchDrafts();
          fetchActivities();
          fetchProviderStatus();
        }, 2e3);
      } else {
        setError(data.error || data.message || "Failed to trigger AI writer");
      }
    } catch (err) {
      console.error("Error triggering AI writer:", err);
      setError("Error triggering AI writer: " + err.message);
    }
  };
  (0, import_react.useEffect)(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchDrafts(), fetchProviderStatus(), fetchTokenUsage(), fetchActivities()]);
      } catch (err) {
        setError("Failed to load AI dashboard data");
      } finally {
        setLoading(false);
      }
    };
    if (shopName) {
      loadData();
    }
  }, [shopName]);
  const toggleDraftSelection = (index) => {
    const newSelection = new Set(selectedDrafts);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedDrafts(newSelection);
  };
  if (loading) {
    return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      padding: "20px",
      textAlign: "center"
    }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      fontSize: "16px",
      color: "#666"
    }, children: "Loading AI Dashboard..." }, void 0, false, {
      fileName: "app/components/AIDashboard.tsx",
      lineNumber: 213,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/components/AIDashboard.tsx",
      lineNumber: 209,
      columnNumber: 12
    }, this);
  }
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
    padding: "20px"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      marginBottom: "24px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", { style: {
        margin: "0 0 8px 0",
        fontSize: "24px",
        fontWeight: "bold"
      }, children: "AI Dashboard" }, void 0, false, {
        fileName: "app/components/AIDashboard.tsx",
        lineNumber: 225,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
        margin: 0,
        color: "#666",
        fontSize: "14px"
      }, children: "Manage AI-generated content, monitor usage, and track automation status" }, void 0, false, {
        fileName: "app/components/AIDashboard.tsx",
        lineNumber: 230,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AIDashboard.tsx",
      lineNumber: 222,
      columnNumber: 7
    }, this),
    error && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      background: "#fff2f2",
      border: "1px solid #fecaca",
      borderRadius: "6px",
      padding: "12px",
      marginBottom: "16px",
      color: "#dc2626"
    }, children: error }, void 0, false, {
      fileName: "app/components/AIDashboard.tsx",
      lineNumber: 239,
      columnNumber: 17
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("section", { style: {
      background: "#f8f9fa",
      border: "1px solid #e1e3e5",
      borderRadius: "8px",
      padding: "16px",
      marginBottom: "20px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { style: {
        margin: "0 0 12px 0",
        fontSize: "18px",
        fontWeight: "bold"
      }, children: "AI System Status" }, void 0, false, {
        fileName: "app/components/AIDashboard.tsx",
        lineNumber: 258,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "16px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            fontSize: "12px",
            color: "#666",
            marginBottom: "4px"
          }, children: "Provider Status" }, void 0, false, {
            fileName: "app/components/AIDashboard.tsx",
            lineNumber: 269,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            padding: "4px 8px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: "bold",
            background: providerStatus?.status === "healthy" ? "#d1f2eb" : "#fef2f2",
            color: providerStatus?.status === "healthy" ? "#0f5132" : "#dc2626",
            display: "inline-block"
          }, children: providerStatus?.status || "Unknown" }, void 0, false, {
            fileName: "app/components/AIDashboard.tsx",
            lineNumber: 274,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AIDashboard.tsx",
          lineNumber: 268,
          columnNumber: 11
        }, this),
        tokenUsage && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              fontSize: "12px",
              color: "#666",
              marginBottom: "4px"
            }, children: "Daily Usage" }, void 0, false, {
              fileName: "app/components/AIDashboard.tsx",
              lineNumber: 289,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              fontSize: "16px",
              fontWeight: "bold"
            }, children: [
              "$",
              tokenUsage.current?.daily?.cost?.toFixed(2) || "0.00",
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
                fontSize: "12px",
                color: "#666",
                marginLeft: "4px"
              }, children: [
                "/ $",
                tokenUsage.budget?.daily || "0.00"
              ] }, void 0, true, {
                fileName: "app/components/AIDashboard.tsx",
                lineNumber: 299,
                columnNumber: 19
              }, this)
            ] }, void 0, true, {
              fileName: "app/components/AIDashboard.tsx",
              lineNumber: 294,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "app/components/AIDashboard.tsx",
            lineNumber: 288,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              fontSize: "12px",
              color: "#666",
              marginBottom: "4px"
            }, children: "Monthly Usage" }, void 0, false, {
              fileName: "app/components/AIDashboard.tsx",
              lineNumber: 310,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              fontSize: "16px",
              fontWeight: "bold"
            }, children: [
              "$",
              tokenUsage.current?.monthly?.cost?.toFixed(2) || "0.00",
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
                fontSize: "12px",
                color: "#666",
                marginLeft: "4px"
              }, children: [
                "/ $",
                tokenUsage.budget?.monthly || "0.00"
              ] }, void 0, true, {
                fileName: "app/components/AIDashboard.tsx",
                lineNumber: 320,
                columnNumber: 19
              }, this)
            ] }, void 0, true, {
              fileName: "app/components/AIDashboard.tsx",
              lineNumber: 315,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "app/components/AIDashboard.tsx",
            lineNumber: 309,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AIDashboard.tsx",
          lineNumber: 287,
          columnNumber: 26
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AIDashboard.tsx",
        lineNumber: 263,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AIDashboard.tsx",
      lineNumber: 251,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("section", { style: {
      background: "white",
      border: "1px solid #e1e3e5",
      borderRadius: "8px",
      padding: "16px",
      marginBottom: "20px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { style: {
        margin: "0 0 12px 0",
        fontSize: "18px",
        fontWeight: "bold"
      }, children: "AI Actions" }, void 0, false, {
        fileName: "app/components/AIDashboard.tsx",
        lineNumber: 341,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "flex",
        gap: "12px",
        flexWrap: "wrap"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: triggerAIWriter, disabled: !hasFeatureAccess2, style: {
          background: hasFeatureAccess2 ? "#28a745" : "#6c757d",
          color: "white",
          padding: "8px 16px",
          border: "none",
          borderRadius: "4px",
          cursor: hasFeatureAccess2 ? "pointer" : "not-allowed",
          fontSize: "14px"
        }, title: !hasFeatureAccess2 ? "Requires Professional+ subscription" : "Generate new AI content", children: "Generate New Content" }, void 0, false, {
          fileName: "app/components/AIDashboard.tsx",
          lineNumber: 351,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: () => {
          fetchDrafts();
          fetchActivities();
          fetchTokenUsage();
        }, style: {
          background: "#007bff",
          color: "white",
          padding: "8px 16px",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "14px"
        }, children: "Refresh Data" }, void 0, false, {
          fileName: "app/components/AIDashboard.tsx",
          lineNumber: 363,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AIDashboard.tsx",
        lineNumber: 346,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AIDashboard.tsx",
      lineNumber: 334,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("section", { style: {
      background: "white",
      border: "1px solid #e1e3e5",
      borderRadius: "8px",
      padding: "16px",
      marginBottom: "20px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "16px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { style: {
          margin: 0,
          fontSize: "18px",
          fontWeight: "bold"
        }, children: [
          "AI Generated Drafts (",
          drafts.length,
          ")"
        ] }, void 0, true, {
          fileName: "app/components/AIDashboard.tsx",
          lineNumber: 395,
          columnNumber: 11
        }, this),
        selectedDrafts.size > 0 && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          display: "flex",
          gap: "8px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: acceptDrafts, style: {
            background: "#28a745",
            color: "white",
            padding: "6px 12px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px"
          }, children: [
            "Accept (",
            selectedDrafts.size,
            ")"
          ] }, void 0, true, {
            fileName: "app/components/AIDashboard.tsx",
            lineNumber: 407,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: rejectDrafts, style: {
            background: "#dc3545",
            color: "white",
            padding: "6px 12px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px"
          }, children: "Reject" }, void 0, false, {
            fileName: "app/components/AIDashboard.tsx",
            lineNumber: 418,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AIDashboard.tsx",
          lineNumber: 403,
          columnNumber: 39
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AIDashboard.tsx",
        lineNumber: 389,
        columnNumber: 9
      }, this),
      drafts.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        textAlign: "center",
        padding: "40px",
        color: "#666"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "No AI drafts available" }, void 0, false, {
          fileName: "app/components/AIDashboard.tsx",
          lineNumber: 437,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
          fontSize: "12px"
        }, children: 'Generate content using the "Generate New Content" button above' }, void 0, false, {
          fileName: "app/components/AIDashboard.tsx",
          lineNumber: 438,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/AIDashboard.tsx",
        lineNumber: 432,
        columnNumber: 32
      }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "grid",
        gap: "12px"
      }, children: drafts.map((draft, index) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        border: selectedDrafts.has(index) ? "2px solid #007bff" : "1px solid #e1e3e5",
        borderRadius: "6px",
        padding: "12px",
        cursor: "pointer",
        transition: "all 0.2s ease"
      }, onClick: () => toggleDraftSelection(index), children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "checkbox", checked: selectedDrafts.has(index), onChange: () => toggleDraftSelection(index), style: {
              margin: 0
            } }, void 0, false, {
              fileName: "app/components/AIDashboard.tsx",
              lineNumber: 463,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { style: {
              fontSize: "14px"
            }, children: draft.theme || "Untitled" }, void 0, false, {
              fileName: "app/components/AIDashboard.tsx",
              lineNumber: 466,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
              background: draft.type === "default" ? "#e6f3ff" : "#f0f8f0",
              color: draft.type === "default" ? "#0c5460" : "#155724",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "10px",
              fontWeight: "bold"
            }, children: draft.type || "library" }, void 0, false, {
              fileName: "app/components/AIDashboard.tsx",
              lineNumber: 469,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "app/components/AIDashboard.tsx",
            lineNumber: 458,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            padding: "2px 8px",
            borderRadius: "12px",
            fontSize: "10px",
            fontWeight: "bold",
            background: draft.lint?.ok ? "#d1f2eb" : "#fef2f2",
            color: draft.lint?.ok ? "#0f5132" : "#dc2626"
          }, children: draft.lint?.ok ? "Valid" : "Issues" }, void 0, false, {
            fileName: "app/components/AIDashboard.tsx",
            lineNumber: 481,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AIDashboard.tsx",
          lineNumber: 452,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          fontSize: "12px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              fontWeight: "bold",
              marginBottom: "4px",
              color: "#007bff"
            }, children: [
              "Headlines (",
              draft.headlines?.length || 0,
              ")"
            ] }, void 0, true, {
              fileName: "app/components/AIDashboard.tsx",
              lineNumber: 500,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              maxHeight: "60px",
              overflowY: "auto"
            }, children: [
              draft.headlines?.slice(0, 3).map((headline, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
                color: "#666",
                marginBottom: "2px"
              }, children: headline }, i, false, {
                fileName: "app/components/AIDashboard.tsx",
                lineNumber: 511,
                columnNumber: 74
              }, this)),
              (draft.headlines?.length || 0) > 3 && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
                color: "#999",
                fontStyle: "italic"
              }, children: [
                "+",
                (draft.headlines?.length || 0) - 3,
                " more..."
              ] }, void 0, true, {
                fileName: "app/components/AIDashboard.tsx",
                lineNumber: 517,
                columnNumber: 62
              }, this)
            ] }, void 0, true, {
              fileName: "app/components/AIDashboard.tsx",
              lineNumber: 507,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "app/components/AIDashboard.tsx",
            lineNumber: 499,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              fontWeight: "bold",
              marginBottom: "4px",
              color: "#28a745"
            }, children: [
              "Descriptions (",
              draft.descriptions?.length || 0,
              ")"
            ] }, void 0, true, {
              fileName: "app/components/AIDashboard.tsx",
              lineNumber: 527,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              maxHeight: "60px",
              overflowY: "auto"
            }, children: [
              draft.descriptions?.slice(0, 2).map((desc, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
                color: "#666",
                marginBottom: "2px"
              }, children: desc }, i, false, {
                fileName: "app/components/AIDashboard.tsx",
                lineNumber: 538,
                columnNumber: 73
              }, this)),
              (draft.descriptions?.length || 0) > 2 && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
                color: "#999",
                fontStyle: "italic"
              }, children: [
                "+",
                (draft.descriptions?.length || 0) - 2,
                " more..."
              ] }, void 0, true, {
                fileName: "app/components/AIDashboard.tsx",
                lineNumber: 544,
                columnNumber: 65
              }, this)
            ] }, void 0, true, {
              fileName: "app/components/AIDashboard.tsx",
              lineNumber: 534,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "app/components/AIDashboard.tsx",
            lineNumber: 526,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AIDashboard.tsx",
          lineNumber: 493,
          columnNumber: 17
        }, this),
        !draft.lint?.ok && draft.lint?.errors && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          marginTop: "8px",
          fontSize: "11px",
          color: "#dc2626"
        }, children: [
          "Issues: ",
          draft.lint.errors.join(", ")
        ] }, void 0, true, {
          fileName: "app/components/AIDashboard.tsx",
          lineNumber: 554,
          columnNumber: 59
        }, this)
      ] }, index, true, {
        fileName: "app/components/AIDashboard.tsx",
        lineNumber: 445,
        columnNumber: 43
      }, this)) }, void 0, false, {
        fileName: "app/components/AIDashboard.tsx",
        lineNumber: 441,
        columnNumber: 20
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AIDashboard.tsx",
      lineNumber: 382,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("section", { style: {
      background: "white",
      border: "1px solid #e1e3e5",
      borderRadius: "8px",
      padding: "16px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { style: {
        margin: "0 0 12px 0",
        fontSize: "18px",
        fontWeight: "bold"
      }, children: "Recent AI Activity" }, void 0, false, {
        fileName: "app/components/AIDashboard.tsx",
        lineNumber: 572,
        columnNumber: 9
      }, this),
      activities.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        textAlign: "center",
        padding: "20px",
        color: "#666"
      }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "No recent AI activity" }, void 0, false, {
        fileName: "app/components/AIDashboard.tsx",
        lineNumber: 583,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "app/components/AIDashboard.tsx",
        lineNumber: 578,
        columnNumber: 36
      }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "grid",
        gap: "8px"
      }, children: activities.slice(0, 10).map((activity, index) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        padding: "8px 12px",
        background: "#f8f9fa",
        borderRadius: "4px",
        fontSize: "12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: activity.operation || "AI Operation" }, void 0, false, {
            fileName: "app/components/AIDashboard.tsx",
            lineNumber: 598,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
            marginLeft: "8px",
            color: "#666"
          }, children: activity.details || "No details available" }, void 0, false, {
            fileName: "app/components/AIDashboard.tsx",
            lineNumber: 599,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AIDashboard.tsx",
          lineNumber: 597,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
            padding: "2px 8px",
            borderRadius: "12px",
            fontSize: "10px",
            fontWeight: "bold",
            background: activity.status === "success" ? "#d1f2eb" : "#fef2f2",
            color: activity.status === "success" ? "#0f5132" : "#dc2626"
          }, children: activity.status || "unknown" }, void 0, false, {
            fileName: "app/components/AIDashboard.tsx",
            lineNumber: 611,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
            color: "#999",
            fontSize: "11px"
          }, children: activity.timestamp ? new Date(activity.timestamp).toLocaleString() : "No timestamp" }, void 0, false, {
            fileName: "app/components/AIDashboard.tsx",
            lineNumber: 621,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/AIDashboard.tsx",
          lineNumber: 606,
          columnNumber: 17
        }, this)
      ] }, index, true, {
        fileName: "app/components/AIDashboard.tsx",
        lineNumber: 588,
        columnNumber: 63
      }, this)) }, void 0, false, {
        fileName: "app/components/AIDashboard.tsx",
        lineNumber: 584,
        columnNumber: 20
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/AIDashboard.tsx",
      lineNumber: 566,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/AIDashboard.tsx",
    lineNumber: 219,
    columnNumber: 10
  }, this);
}
_s(AIDashboard, "g3EqiCo7+xfZ6budk8JkqtFY4oM=");
_c = AIDashboard;
var _c;
$RefreshReg$(_c, "AIDashboard");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

// app/routes/app.ai-dashboard.tsx
var import_jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/app.ai-dashboard.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s2 = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/app.ai-dashboard.tsx"
  );
  import.meta.hot.lastModified = "1758893412611.437";
}
function AIDashboardPage() {
  _s2();
  const {
    shopName,
    subscriptionInfo,
    availableFeatures
  } = useLoaderData();
  return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { children: [
    !availableFeatures.aiDashboard && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      backgroundColor: "#fef3c7",
      border: "1px solid #fcd34d",
      borderRadius: "6px",
      padding: "16px",
      margin: "16px 0",
      color: "#d97706"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h3", { style: {
        margin: "0 0 8px 0",
        fontSize: "16px",
        fontWeight: "bold"
      }, children: "Limited Access" }, void 0, false, {
        fileName: "app/routes/app.ai-dashboard.tsx",
        lineNumber: 114,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("p", { style: {
        margin: "0 0 12px 0"
      }, children: [
        "Your ",
        subscriptionInfo.subscriptionTier || "starter",
        " plan has limited AI dashboard features. Upgrade to Professional for full AI capabilities."
      ] }, void 0, true, {
        fileName: "app/routes/app.ai-dashboard.tsx",
        lineNumber: 121,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("a", { href: "/app/billing", style: {
        backgroundColor: "#d97706",
        color: "white",
        padding: "8px 16px",
        borderRadius: "4px",
        textDecoration: "none",
        display: "inline-block"
      }, children: "Upgrade Now" }, void 0, false, {
        fileName: "app/routes/app.ai-dashboard.tsx",
        lineNumber: 127,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.ai-dashboard.tsx",
      lineNumber: 106,
      columnNumber: 42
    }, this),
    availableFeatures.aiDashboard && !availableFeatures.advancedAIWriter && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      backgroundColor: "#e6f3ff",
      border: "1px solid #b3d9ff",
      borderRadius: "6px",
      padding: "16px",
      margin: "16px 0",
      color: "#0c5460"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h3", { style: {
        margin: "0 0 8px 0",
        fontSize: "16px",
        fontWeight: "bold"
      }, children: "AI Dashboard Available" }, void 0, false, {
        fileName: "app/routes/app.ai-dashboard.tsx",
        lineNumber: 148,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("p", { style: {
        margin: "0 0 12px 0"
      }, children: "You have access to basic AI features. Upgrade to Professional+ for advanced AI automation and analytics." }, void 0, false, {
        fileName: "app/routes/app.ai-dashboard.tsx",
        lineNumber: 155,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("a", { href: "/app/billing", style: {
        backgroundColor: "#0c5460",
        color: "white",
        padding: "8px 16px",
        borderRadius: "4px",
        textDecoration: "none",
        display: "inline-block"
      }, children: "View Plans" }, void 0, false, {
        fileName: "app/routes/app.ai-dashboard.tsx",
        lineNumber: 160,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.ai-dashboard.tsx",
      lineNumber: 140,
      columnNumber: 80
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(AIDashboard, { shopName, subscriptionTier: subscriptionInfo.subscriptionTier || "starter", hasFeatureAccess: availableFeatures.advancedAIWriter }, void 0, false, {
      fileName: "app/routes/app.ai-dashboard.tsx",
      lineNumber: 172,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/app.ai-dashboard.tsx",
    lineNumber: 104,
    columnNumber: 10
  }, this);
}
_s2(AIDashboardPage, "oZ47nk7YIXB9wyUttwPlZ3cqNOU=", false, function() {
  return [useLoaderData];
});
_c2 = AIDashboardPage;
var _c2;
$RefreshReg$(_c2, "AIDashboardPage");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  AIDashboardPage as default
};
//# sourceMappingURL=/assets/routes/app.ai-dashboard-XTYU23PO.js.map
