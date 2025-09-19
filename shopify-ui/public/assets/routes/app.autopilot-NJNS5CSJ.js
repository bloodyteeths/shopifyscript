import {
  require_subscription
} from "/assets/_shared/chunk-VZJ6BN4E.js";
import {
  require_shopify
} from "/assets/_shared/chunk-7OUBBUAS.js";
import {
  require_hmac
} from "/assets/_shared/chunk-7OQ7YQAO.js";
import {
  require_node
} from "/assets/_shared/chunk-5LF5TODQ.js";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation
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

// app/routes/app.autopilot.tsx
var React = __toESM(require_react());
var import_node = __toESM(require_node());
var import_shopify = __toESM(require_shopify());
var import_hmac = __toESM(require_hmac());
var import_subscription = __toESM(require_subscription());
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/app.autopilot.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/app.autopilot.tsx"
  );
  import.meta.hot.lastModified = "1758313696606.4226";
}
function Autopilot() {
  _s();
  const {
    config,
    shopName: serverShopName,
    campaignLimits
  } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const [mode, setMode] = React.useState("protect");
  const [budget, setBudget] = React.useState("3.00");
  const [cpc, setCpc] = React.useState("0.20");
  const [url, setUrl] = React.useState("");
  const [toast, setToast] = React.useState("");
  const [scriptCode, setScriptCode] = React.useState("");
  const [showScript, setShowScript] = React.useState(false);
  const [shopName, setShopName] = React.useState(null);
  const isGeneratingScript = navigation.state === "submitting" && navigation.formData?.get("actionType") === "generateScript";
  React.useEffect(() => {
    setShopName(serverShopName);
  }, [serverShopName]);
  React.useEffect(() => {
    if (actionData?.success) {
      setScriptCode(actionData.script);
      setShowScript(true);
      setToast(`Script generated: ${actionData.size}KB`);
      try {
        localStorage.setItem("proofkit_generated_script", actionData.script);
        localStorage.setItem("proofkit_script_meta", JSON.stringify({
          size: actionData.size,
          shopName: actionData.shopName,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn("Failed to store script:", e);
      }
    } else if (actionData?.error) {
      setToast("Error: " + actionData.error);
    }
  }, [actionData]);
  React.useEffect(() => {
    try {
      const storedScript = localStorage.getItem("proofkit_generated_script");
      const storedMeta = localStorage.getItem("proofkit_script_meta");
      if (storedScript && storedMeta) {
        const meta = JSON.parse(storedMeta);
        const hourAgo = Date.now() - 60 * 60 * 1e3;
        if (meta.timestamp > hourAgo) {
          setScriptCode(storedScript);
          setShowScript(true);
          setToast(`Loaded ${meta.size}KB script`);
        } else {
          localStorage.removeItem("proofkit_generated_script");
          localStorage.removeItem("proofkit_script_meta");
        }
      }
    } catch (e) {
      console.warn("localStorage error:", e);
    }
  }, []);
  function run() {
    const config2 = `Configuration:
Mode: ${mode}
Budget: $${budget}/day
CPC: $${cpc}
URL: ${url}
Shop: ${shopName || "unknown"}`;
    alert(`Autopilot would be enabled with:

${config2}

In production, this would start the automation.`);
    setToast("Demo: Configuration shown (would enable in production)");
  }
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", { children: "Autopilot" }, void 0, false, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 324,
      columnNumber: 7
    }, this),
    campaignLimits && !campaignLimits.canCreate && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      backgroundColor: "#fef2f2",
      border: "1px solid #fecaca",
      borderRadius: "6px",
      padding: "16px",
      margin: "16px 0",
      color: "#dc2626"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: {
        margin: "0 0 8px 0",
        fontSize: "16px",
        fontWeight: "bold"
      }, children: "Campaign Limit Reached" }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 335,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
        margin: "0 0 12px 0"
      }, children: [
        "Your ",
        campaignLimits.tier,
        " plan allows up to ",
        campaignLimits.limit,
        " campaigns. You currently have ",
        campaignLimits.current,
        " active campaigns."
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 342,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("a", { href: campaignLimits.upgradeUrl, style: {
        backgroundColor: "#dc2626",
        color: "white",
        padding: "8px 16px",
        borderRadius: "4px",
        textDecoration: "none",
        display: "inline-block"
      }, children: "Upgrade Now" }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 348,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 327,
      columnNumber: 55
    }, this),
    campaignLimits && campaignLimits.canCreate && campaignLimits.remaining <= 2 && campaignLimits.limit !== -1 && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      backgroundColor: "#fef3c7",
      border: "1px solid #fcd34d",
      borderRadius: "6px",
      padding: "16px",
      margin: "16px 0",
      color: "#d97706"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: {
        margin: "0 0 8px 0",
        fontSize: "16px",
        fontWeight: "bold"
      }, children: "Campaign Usage Warning" }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 369,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
        margin: "0 0 12px 0"
      }, children: [
        "You are using ",
        campaignLimits.current,
        " of ",
        campaignLimits.limit,
        " campaigns in your ",
        campaignLimits.tier,
        " plan.",
        campaignLimits.remaining > 0 && ` You have ${campaignLimits.remaining} campaigns remaining.`
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 376,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("a", { href: campaignLimits.upgradeUrl, style: {
        backgroundColor: "#d97706",
        color: "white",
        padding: "8px 16px",
        borderRadius: "4px",
        textDecoration: "none",
        display: "inline-block"
      }, children: "Upgrade for More Campaigns" }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 382,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 361,
      columnNumber: 118
    }, this),
    toast && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: toast }, void 0, false, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 399,
      columnNumber: 17
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("section", { style: {
      border: "1px solid #eee",
      padding: 12
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Goal" }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 404,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "radio", name: "goal", value: "protect", checked: mode === "protect", onChange: () => setMode("protect") }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 406,
          columnNumber: 11
        }, this),
        " ",
        "Protect"
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 405,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 409,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "radio", name: "goal", value: "grow", checked: mode === "grow", onChange: () => setMode("grow") }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 411,
          columnNumber: 11
        }, this),
        " ",
        "Grow"
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 410,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 414,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "radio", name: "goal", value: "scale", checked: mode === "scale", onChange: () => setMode("scale") }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 416,
          columnNumber: 11
        }, this),
        " ",
        "Scale"
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 415,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 400,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("section", { style: {
      border: "1px solid #eee",
      padding: 12
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Budget & CPC" }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 424,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "number", step: "0.01", value: budget, onChange: (e) => setBudget(e.target.value), placeholder: "$ per day" }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 425,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "number", step: "0.01", value: cpc, onChange: (e) => setCpc(e.target.value), placeholder: "Max CPC" }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 426,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 420,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("section", { style: {
      border: "1px solid #eee",
      padding: 12
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Landing URL" }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 432,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { value: url, onChange: (e) => setUrl(e.target.value), placeholder: "https://example.com", style: {
        width: "100%"
      } }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 433,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 428,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      marginTop: 8,
      padding: 12,
      background: "#e7f3ff",
      borderRadius: 4,
      marginBottom: 16
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", { style: {
        margin: "0 0 8px 0",
        color: "#0c5460"
      }, children: "Autopilot Status" }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 444,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 8
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
          background: "#28a745",
          color: "white",
          padding: "4px 8px",
          borderRadius: "12px",
          fontSize: "12px"
        }, children: "ACTIVE" }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 456,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: [
          "Automation running for:",
          " ",
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: shopName || serverShopName || "Loading..." }, void 0, false, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 467,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 465,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 450,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        fontSize: "14px",
        color: "#666"
      }, children: [
        "Budget optimization: Active",
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 475,
          columnNumber: 11
        }, this),
        "AI analysis: Running every 15min",
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 477,
          columnNumber: 11
        }, this),
        "Performance monitoring: Continuous",
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 479,
          columnNumber: 11
        }, this),
        "Script updates: Available below"
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 470,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 437,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      marginTop: 8
    }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Form, { method: "post", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "hidden", name: "actionType", value: "generateScript" }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 487,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "hidden", name: "mode", value: mode }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 488,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "hidden", name: "budget", value: budget }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 489,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "hidden", name: "cpc", value: cpc }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 490,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "hidden", name: "url", value: url }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 491,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { type: "submit", disabled: isGeneratingScript || campaignLimits && !campaignLimits.canCreate, style: {
        background: isGeneratingScript || campaignLimits && !campaignLimits.canCreate ? "#6c757d" : "#007bff",
        color: "white",
        padding: "12px 24px",
        border: "none",
        borderRadius: "4px",
        cursor: isGeneratingScript || campaignLimits && !campaignLimits.canCreate ? "not-allowed" : "pointer",
        fontSize: "16px"
      }, title: campaignLimits && !campaignLimits.canCreate ? `Campaign limit reached. Upgrade your ${campaignLimits.tier} plan to create more campaigns.` : void 0, children: isGeneratingScript ? "Generating..." : campaignLimits && !campaignLimits.canCreate ? "Campaign Limit Reached" : "Generate Current Script" }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 492,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 486,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 483,
      columnNumber: 7
    }, this),
    actionData?.success && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      background: "#d4edda",
      border: "1px solid #c3e6cb",
      padding: "12px",
      marginTop: "12px",
      borderRadius: "4px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Script Generated Successfully!" }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 513,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: [
        "Size: ",
        actionData.size,
        "KB for shop: ",
        actionData.shopName
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 514,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("details", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("summary", { children: "View Script (Click to expand)" }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 516,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("textarea", { readOnly: true, value: actionData.script, style: {
          width: "100%",
          height: 300,
          fontFamily: "monospace",
          fontSize: "12px",
          marginTop: "8px"
        } }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 517,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 515,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 506,
      columnNumber: 31
    }, this),
    showScript && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("section", { style: {
      border: "1px solid #eee",
      padding: 12,
      marginTop: 12
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: [
          "Google Ads Script (",
          Math.round(scriptCode.length / 1024),
          "KB)"
        ] }, void 0, true, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 537,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          display: "flex",
          gap: "8px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: () => {
            navigator.clipboard.writeText(scriptCode).then(() => {
              setToast("Script copied to clipboard!");
            }).catch(() => {
              setToast("Copy failed - select text manually");
            });
          }, style: {
            background: "#28a745",
            color: "white",
            padding: "8px 16px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }, children: "Copy Script" }, void 0, false, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 544,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: () => {
            setShowScript(false);
            setScriptCode("");
            try {
              localStorage.removeItem("proofkit_generated_script");
              localStorage.removeItem("proofkit_script_meta");
            } catch (e) {
              console.warn("Failed to clear localStorage:", e);
            }
            setToast("Script cleared");
          }, style: {
            background: "#6c757d",
            color: "white",
            padding: "8px 16px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }, children: "Clear" }, void 0, false, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 560,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 540,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 531,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("textarea", { readOnly: true, value: scriptCode, style: {
        width: "100%",
        height: 300,
        fontFamily: "monospace",
        fontSize: "12px"
      }, placeholder: "Script will appear here when loaded..." }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 582,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ol", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Google Ads \u2192 Tools \u2192 Bulk actions \u2192 Scripts \u2192 + New script" }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 589,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Paste, Authorize, then Preview first" }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 590,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "If ok, Run once, then Schedule daily" }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 591,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 588,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 526,
      columnNumber: 22
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/app.autopilot.tsx",
    lineNumber: 323,
    columnNumber: 10
  }, this);
}
_s(Autopilot, "9XX3PV7ioCuvLxh1hYPqVbz8SHg=", false, function() {
  return [useLoaderData, useActionData, useNavigation];
});
_c = Autopilot;
var _c;
$RefreshReg$(_c, "Autopilot");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  Autopilot as default
};
//# sourceMappingURL=/assets/routes/app.autopilot-NJNS5CSJ.js.map
