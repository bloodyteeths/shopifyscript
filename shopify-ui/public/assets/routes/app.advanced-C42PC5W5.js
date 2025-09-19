import {
  require_subscription
} from "/assets/_shared/chunk-QFXH3GZH.js";
import {
  require_shopify
} from "/assets/_shared/chunk-7OUBBUAS.js";
import {
  require_node
} from "/assets/_shared/chunk-5LF5TODQ.js";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  useRevalidator
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

// app/routes/app.advanced.tsx
var React = __toESM(require_react());
var import_node = __toESM(require_node());
var import_shopify = __toESM(require_shopify());
var import_subscription = __toESM(require_subscription());
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/app.advanced.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/app.advanced.tsx"
  );
  import.meta.hot.lastModified = "1758299890315.0266";
}
function Advanced() {
  _s();
  const data = useLoaderData();
  const actionData = useActionData();
  const cfg = data?.cfg || {};
  const suggestions = data?.suggestions || {};
  const insights = data?.insights || {};
  const nav = useNavigation();
  const caps = cfg?.CPC_CEILINGS || {};
  const capRows = Object.entries(caps).map(([campaign, value]) => ({
    campaign,
    value
  }));
  const [preview, setPreview] = React.useState([]);
  const [toast, setToast] = React.useState("");
  const [appliedSuggestions, setAppliedSuggestions] = React.useState(/* @__PURE__ */ new Set());
  const [buttonFeedback, setButtonFeedback] = React.useState({});
  const [showSetupBanner, setShowSetupBanner] = React.useState(false);
  const revalidator = useRevalidator();
  React.useEffect(() => {
    setShowSetupBanner(false);
  }, []);
  React.useEffect(() => {
    if (showSetupBanner) {
      return;
    }
    try {
      const url = new URL(window.location.href);
      const hasShopParam = !!url.searchParams.get("shop");
      if (!hasShopParam && data?.shopName) {
        url.searchParams.set("shop", data.shopName);
        window.history.replaceState({}, "", url.toString());
        try {
          revalidator.revalidate();
        } catch {
        }
      }
    } catch {
    }
  }, [revalidator, showSetupBanner]);
  const handleSetupComplete = (shopName) => {
    setShowSetupBanner(false);
    setToast(`Shop configured: ${shopName}.myshopify.com`);
    try {
      revalidator.revalidate();
    } catch {
    }
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("shop", shopName);
      window.history.replaceState({}, "", url.toString());
    } catch {
    }
  };
  const [targetCPAMode, setTargetCPAMode] = React.useState("preset");
  const [targetROASMode, setTargetROASMode] = React.useState("preset");
  const [scheduleMode, setScheduleMode] = React.useState("preset");
  const [keywordsMode, setKeywordsMode] = React.useState("preset");
  const [aiBehaviorMode, setAiBehaviorMode] = React.useState("preset");
  React.useEffect(() => {
    if (actionData?.error) {
      console.error("Action returned error:", actionData.error);
      setButtonFeedback((prev) => ({
        ...prev,
        runOptimization: `Error: ${actionData.error}`
      }));
      setTimeout(() => setButtonFeedback((prev) => ({
        ...prev,
        runOptimization: ""
      })), 8e3);
    } else if (actionData?.tickResult && actionData?.ok) {
      const planCount = actionData.planned?.length || 0;
      const appliedCount = actionData.applied?.length || 0;
      const skipped = actionData.skipped;
      if (skipped) {
        setButtonFeedback((prev) => ({
          ...prev,
          runOptimization: `Skipped: ${actionData.reason || "Not scheduled to run now"}`
        }));
      } else if (planCount > 0) {
        setButtonFeedback((prev) => ({
          ...prev,
          runOptimization: `Generated ${planCount} optimization${planCount !== 1 ? "s" : ""}, applied ${appliedCount}`
        }));
      } else {
        setButtonFeedback((prev) => ({
          ...prev,
          runOptimization: `Analysis complete - no optimizations needed right now`
        }));
      }
      setTimeout(() => setButtonFeedback((prev) => ({
        ...prev,
        runOptimization: ""
      })), 5e3);
    } else if (actionData?.ok && nav.formData?.get("save_caps")) {
      const message = actionData.sheetsSuccess ? "Bid limits saved to Google Sheets!" : "Bid limits saved!";
      setButtonFeedback((prev) => ({
        ...prev,
        saveCaps: message
      }));
      setTimeout(() => setButtonFeedback((prev) => ({
        ...prev,
        saveCaps: ""
      })), 3e3);
    } else if (actionData?.ok) {
      const message = actionData.sheetsSuccess ? "Settings saved to Google Sheets & optimization completed!" : "Settings saved & optimization completed!";
      setButtonFeedback((prev) => ({
        ...prev,
        runOptimization: message
      }));
      setTimeout(() => setButtonFeedback((prev) => ({
        ...prev,
        runOptimization: ""
      })), 5e3);
    } else if (actionData?.applied !== void 0) {
      setButtonFeedback((prev) => ({
        ...prev,
        seoApply: `Applied ${actionData.applied} SEO changes!`
      }));
      setTimeout(() => setButtonFeedback((prev) => ({
        ...prev,
        seoApply: ""
      })), 3e3);
    } else if (actionData?.preview !== void 0) {
      const previewCount = actionData.preview?.length || 0;
      setButtonFeedback((prev) => ({
        ...prev,
        seoPreview: `Generated ${previewCount} SEO preview${previewCount !== 1 ? "s" : ""}`
      }));
      setPreview(actionData.preview || []);
      setTimeout(() => setButtonFeedback((prev) => ({
        ...prev,
        seoPreview: ""
      })), 3e3);
    } else if (actionData?.updated !== void 0) {
      setButtonFeedback((prev) => ({
        ...prev,
        tagsApply: `Updated ${actionData.updated} products!`
      }));
      setTimeout(() => setButtonFeedback((prev) => ({
        ...prev,
        tagsApply: ""
      })), 3e3);
    }
    if (actionData) {
      console.log("Advanced page action data:", {
        ok: actionData.ok,
        error: actionData.error,
        shopName: actionData.shopName,
        sheetsSuccess: actionData.sheetsSuccess,
        saved: actionData.saved,
        message: actionData.message
      });
    }
  }, [actionData, nav.formData]);
  const applySuggestion = (suggestion) => {
    const formElement = document.querySelector('form[method="post"]');
    if (!formElement)
      return;
    const field = formElement.querySelector(`[name="${suggestion.field}"]`);
    if (field) {
      field.value = suggestion.recommendedValue;
      setAppliedSuggestions((prev) => /* @__PURE__ */ new Set([...prev, suggestion.type]));
      setToast(`Applied suggestion: ${suggestion.title}`);
      setTimeout(() => setToast(""), 3e3);
    }
  };
  const helpStyle = {
    fontSize: "14px",
    color: "#666",
    marginTop: "4px",
    fontStyle: "italic"
  };
  const sectionStyle = {
    border: "1px solid #e1e5e9",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "20px",
    backgroundColor: "#fafbfc"
  };
  const legendStyle = {
    fontSize: "18px",
    fontWeight: "bold",
    color: "#333",
    marginBottom: "8px"
  };
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
    maxWidth: 920
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", { children: "Advanced Settings" }, void 0, false, {
      fileName: "app/routes/app.advanced.tsx",
      lineNumber: 603,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
      color: "#666",
      marginBottom: "24px"
    }, children: "Fine-tune your ProofKit automation and optimize your store's performance." }, void 0, false, {
      fileName: "app/routes/app.advanced.tsx",
      lineNumber: 604,
      columnNumber: 7
    }, this),
    data?.error && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      backgroundColor: "#fff3cd",
      border: "1px solid #ffeaa7",
      borderRadius: "8px",
      padding: "16px",
      marginBottom: "20px",
      color: "#856404"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", { style: {
        margin: "0 0 8px 0",
        fontSize: "16px",
        fontWeight: "bold"
      }, children: "Configuration Issue" }, void 0, false, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 621,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
        margin: 0,
        fontSize: "14px"
      }, children: data.error }, void 0, false, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 628,
        columnNumber: 11
      }, this),
      data.needsSetup && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
        margin: "8px 0 0 0",
        fontSize: "12px",
        fontStyle: "italic"
      }, children: "Try setting up your shop configuration below to resolve this issue." }, void 0, false, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 632,
        columnNumber: 31
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.advanced.tsx",
      lineNumber: 613,
      columnNumber: 23
    }, this),
    suggestions.length > 0 && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      backgroundColor: "#fff3cd",
      border: "1px solid #ffeaa7",
      borderRadius: "8px",
      padding: "20px",
      marginBottom: "24px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: {
        fontSize: "18px",
        fontWeight: "bold",
        color: "#856404",
        marginBottom: "16px",
        display: "flex",
        alignItems: "center",
        gap: "8px"
      }, children: [
        "Personalized Recommendations",
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
          fontSize: "14px",
          fontWeight: "normal",
          color: "#666",
          marginLeft: "8px"
        }, children: "Based on your Google Ads performance" }, void 0, false, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 664,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 654,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "grid",
        gap: "12px"
      }, children: suggestions.map((suggestion) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        backgroundColor: "white",
        padding: "16px",
        borderRadius: "6px",
        border: "1px solid #f0c040",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", { style: {
            fontSize: "16px",
            fontWeight: "bold",
            marginBottom: "4px",
            color: "#333"
          }, children: suggestion.title }, void 0, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 687,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
            fontSize: "14px",
            color: "#666",
            margin: "0"
          }, children: suggestion.description }, void 0, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 695,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
            fontSize: "12px",
            color: "#856404",
            fontWeight: "bold"
          }, children: [
            "Recommended: ",
            suggestion.recommendedValue
          ] }, void 0, true, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 702,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 686,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { type: "button", onClick: () => applySuggestion(suggestion), disabled: appliedSuggestions.has(suggestion.type), style: {
          padding: "8px 16px",
          backgroundColor: appliedSuggestions.has(suggestion.type) ? "#6c757d" : "#ffc107",
          color: appliedSuggestions.has(suggestion.type) ? "white" : "#333",
          border: "none",
          borderRadius: "4px",
          cursor: appliedSuggestions.has(suggestion.type) ? "default" : "pointer",
          fontSize: "14px",
          fontWeight: "bold",
          minWidth: "80px"
        }, children: appliedSuggestions.has(suggestion.type) ? "Applied" : "Apply" }, void 0, false, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 710,
          columnNumber: 17
        }, this)
      ] }, suggestion.type, true, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 677,
        columnNumber: 44
      }, this)) }, void 0, false, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 673,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.advanced.tsx",
      lineNumber: 647,
      columnNumber: 34
    }, this),
    insights?.kpi && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      backgroundColor: "#f8f9fa",
      border: "1px solid #e1e5e9",
      borderRadius: "8px",
      padding: "20px",
      marginBottom: "24px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: {
        fontSize: "18px",
        fontWeight: "bold",
        marginBottom: "12px",
        color: "#333"
      }, children: "Current Performance (Last 7 Days)" }, void 0, false, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 735,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: "16px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          textAlign: "center"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            fontSize: "24px",
            fontWeight: "bold",
            color: "#007bff"
          }, children: insights.kpi.clicks || 0 }, void 0, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 751,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            fontSize: "12px",
            color: "#666"
          }, children: "Clicks" }, void 0, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 758,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 748,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          textAlign: "center"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            fontSize: "24px",
            fontWeight: "bold",
            color: "#28a745"
          }, children: [
            "$",
            (insights.kpi.cost || 0).toFixed(2)
          ] }, void 0, true, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 766,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            fontSize: "12px",
            color: "#666"
          }, children: "Spend" }, void 0, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 773,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 763,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          textAlign: "center"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            fontSize: "24px",
            fontWeight: "bold",
            color: "#ffc107"
          }, children: [
            "$",
            (insights.kpi.cpc || 0).toFixed(2)
          ] }, void 0, true, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 781,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            fontSize: "12px",
            color: "#666"
          }, children: "Avg CPC" }, void 0, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 788,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 778,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          textAlign: "center"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            fontSize: "24px",
            fontWeight: "bold",
            color: "#dc3545"
          }, children: [
            "$",
            (insights.kpi.cpa || 0).toFixed(2)
          ] }, void 0, true, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 796,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            fontSize: "12px",
            color: "#666"
          }, children: "CPA" }, void 0, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 803,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 793,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 743,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.advanced.tsx",
      lineNumber: 728,
      columnNumber: 25
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Form, { method: "post", style: {
      display: "grid",
      gap: 20
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "hidden", name: "shop", value: data?.shopName || "" }, void 0, false, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 816,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: sectionStyle, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: legendStyle, children: "\u{1F552} Automation Schedule" }, void 0, false, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 820,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: helpStyle, children: "Choose how often ProofKit should optimize your campaigns" }, void 0, false, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 821,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          marginTop: "12px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            display: "grid",
            gap: "8px"
          }, children: suggestions.schedule?.options.map((option, idx) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
            display: "flex",
            alignItems: "center",
            padding: "16px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            cursor: "pointer",
            backgroundColor: "#fafafa"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "radio", name: "schedule", value: option.value, defaultChecked: idx === 0, style: {
              marginRight: "12px"
            } }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 840,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: option.label }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 844,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
                fontSize: "12px",
                color: "#666",
                marginTop: "2px"
              }, children: option.description }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 845,
                columnNumber: 21
              }, this)
            ] }, void 0, true, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 843,
              columnNumber: 19
            }, this)
          ] }, idx, true, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 831,
            columnNumber: 67
          }, this)) }, void 0, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 827,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            ...helpStyle,
            marginTop: "8px"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Tip:" }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 860,
              columnNumber: 15
            }, this),
            ' Start with "Daily" if you have active campaigns. You can change this anytime.'
          ] }, void 0, true, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 856,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 824,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 819,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: sectionStyle, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: legendStyle, children: "Performance Targets" }, void 0, false, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 868,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: helpStyle, children: "Choose from personalized options or enter your own values" }, void 0, false, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 869,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          display: "grid",
          gap: "20px",
          marginTop: "12px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
              display: "block",
              fontWeight: "bold",
              marginBottom: "8px"
            }, children: "Target Cost Per Acquisition (CPA)" }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 879,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              ...helpStyle,
              marginBottom: "8px"
            }, children: suggestions.targetCPA?.description }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 886,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              marginBottom: "8px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
                marginRight: "16px"
              }, children: [
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "radio", checked: targetCPAMode === "preset", onChange: () => setTargetCPAMode("preset"), style: {
                  marginRight: "6px"
                } }, void 0, false, {
                  fileName: "app/routes/app.advanced.tsx",
                  lineNumber: 899,
                  columnNumber: 19
                }, this),
                "Choose from suggestions"
              ] }, void 0, true, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 896,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { children: [
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "radio", checked: targetCPAMode === "manual", onChange: () => setTargetCPAMode("manual"), style: {
                  marginRight: "6px"
                } }, void 0, false, {
                  fileName: "app/routes/app.advanced.tsx",
                  lineNumber: 905,
                  columnNumber: 19
                }, this),
                "Enter manually"
              ] }, void 0, true, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 904,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 893,
              columnNumber: 15
            }, this),
            targetCPAMode === "preset" ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              display: "grid",
              gap: "8px"
            }, children: suggestions.targetCPA?.options.map((option, idx) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
              display: "flex",
              alignItems: "center",
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              cursor: "pointer",
              backgroundColor: "#fafafa"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "radio", name: "target_cpa", value: option.value, defaultChecked: idx === 1, style: {
                marginRight: "12px"
              } }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 925,
                columnNumber: 25
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: [
                  "$",
                  option.value
                ] }, void 0, true, {
                  fileName: "app/routes/app.advanced.tsx",
                  lineNumber: 929,
                  columnNumber: 27
                }, this),
                " - ",
                option.label,
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
                  fontSize: "12px",
                  color: "#666",
                  marginTop: "2px"
                }, children: option.description }, void 0, false, {
                  fileName: "app/routes/app.advanced.tsx",
                  lineNumber: 930,
                  columnNumber: 27
                }, this)
              ] }, void 0, true, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 928,
                columnNumber: 25
              }, this)
            ] }, idx, true, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 916,
              columnNumber: 72
            }, this)) }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 912,
              columnNumber: 45
            }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { name: "target_cpa", type: "number", step: "0.01", defaultValue: cfg?.AP?.target_cpa || "", placeholder: "Enter your target CPA (e.g., 25.00)", style: {
              padding: "8px 12px",
              borderRadius: "4px",
              border: "1px solid #ddd",
              width: "100%",
              maxWidth: "300px"
            } }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 939,
              columnNumber: 26
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 878,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
              display: "block",
              fontWeight: "bold",
              marginBottom: "8px"
            }, children: "Target Return on Ad Spend (ROAS)" }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 950,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              ...helpStyle,
              marginBottom: "8px"
            }, children: suggestions.targetROAS?.description }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 957,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              marginBottom: "8px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
                marginRight: "16px"
              }, children: [
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "radio", checked: targetROASMode === "preset", onChange: () => setTargetROASMode("preset"), style: {
                  marginRight: "6px"
                } }, void 0, false, {
                  fileName: "app/routes/app.advanced.tsx",
                  lineNumber: 970,
                  columnNumber: 19
                }, this),
                "Choose from suggestions"
              ] }, void 0, true, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 967,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { children: [
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "radio", checked: targetROASMode === "manual", onChange: () => setTargetROASMode("manual"), style: {
                  marginRight: "6px"
                } }, void 0, false, {
                  fileName: "app/routes/app.advanced.tsx",
                  lineNumber: 976,
                  columnNumber: 19
                }, this),
                "Enter manually"
              ] }, void 0, true, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 975,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 964,
              columnNumber: 15
            }, this),
            targetROASMode === "preset" ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              display: "grid",
              gap: "8px"
            }, children: suggestions.targetROAS?.options.map((option, idx) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
              display: "flex",
              alignItems: "center",
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              cursor: "pointer",
              backgroundColor: "#fafafa"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "radio", name: "target_roas", value: option.value, defaultChecked: idx === 1, style: {
                marginRight: "12px"
              } }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 996,
                columnNumber: 25
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: [
                  option.value,
                  "x ROAS"
                ] }, void 0, true, {
                  fileName: "app/routes/app.advanced.tsx",
                  lineNumber: 1e3,
                  columnNumber: 27
                }, this),
                " - ",
                option.label,
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
                  fontSize: "12px",
                  color: "#666",
                  marginTop: "2px"
                }, children: option.description }, void 0, false, {
                  fileName: "app/routes/app.advanced.tsx",
                  lineNumber: 1001,
                  columnNumber: 27
                }, this)
              ] }, void 0, true, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 999,
                columnNumber: 25
              }, this)
            ] }, idx, true, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 987,
              columnNumber: 73
            }, this)) }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 983,
              columnNumber: 46
            }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { name: "target_roas", type: "number", step: "0.01", defaultValue: cfg?.AP?.target_roas || "", placeholder: "Enter your target ROAS (e.g., 4.0)", style: {
              padding: "8px 12px",
              borderRadius: "4px",
              border: "1px solid #ddd",
              width: "100%",
              maxWidth: "300px"
            } }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1010,
              columnNumber: 26
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 949,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 872,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 867,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: sectionStyle, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: legendStyle, children: "\u{1F4B3} Maximum Bid Limits" }, void 0, false, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 1023,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: helpStyle, children: "Set cost-per-click limits to control your ad spending" }, void 0, false, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 1024,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          marginTop: "12px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            marginBottom: "16px"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", { style: {
              fontSize: "16px",
              fontWeight: "bold",
              marginBottom: "8px"
            }, children: "Quick Setup (Recommended)" }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1034,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              display: "grid",
              gap: "8px"
            }, children: suggestions.bidCeiling?.options.map((option, idx) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { type: "button", onClick: () => {
              const campaignInput = document.querySelector('input[name="caps_campaign"]');
              const valueInput = document.querySelector('input[name="caps_value"]');
              if (campaignInput && valueInput) {
                campaignInput.value = "*";
                valueInput.value = option.value;
                setToast(`Set ${option.label} bid limit: $${option.value} for all campaigns`);
                setTimeout(() => setToast(""), 3e3);
              }
            }, style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              cursor: "pointer",
              backgroundColor: "#fafafa",
              textAlign: "left",
              fontSize: "14px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: [
                  "$",
                  option.value,
                  " - ",
                  option.label
                ] }, void 0, true, {
                  fileName: "app/routes/app.advanced.tsx",
                  lineNumber: 1068,
                  columnNumber: 25
                }, this),
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
                  fontSize: "12px",
                  color: "#666",
                  marginTop: "2px"
                }, children: option.description }, void 0, false, {
                  fileName: "app/routes/app.advanced.tsx",
                  lineNumber: 1071,
                  columnNumber: 25
                }, this)
              ] }, void 0, true, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1067,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
                fontSize: "12px",
                color: "#007bff",
                fontWeight: "bold"
              }, children: "Apply" }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1079,
                columnNumber: 23
              }, this)
            ] }, idx, true, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1045,
              columnNumber: 71
            }, this)) }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1041,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1031,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", { style: {
              fontSize: "16px",
              fontWeight: "bold",
              marginBottom: "8px"
            }, children: "Campaign-Specific Limits (Optional)" }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1092,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              display: "grid",
              gridTemplateColumns: "1fr 140px",
              gap: 8,
              marginBottom: "8px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Campaign Name" }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1105,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Max CPC ($)" }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1106,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1099,
              columnNumber: 15
            }, this),
            capRows.map((row, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              display: "grid",
              gridTemplateColumns: "1fr 140px",
              gap: 8,
              marginBottom: "4px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { name: "caps_campaign", defaultValue: row.campaign, placeholder: "Campaign name or * for all", style: {
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ddd"
              } }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1114,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { name: "caps_value", type: "number", step: "0.01", defaultValue: row.value, style: {
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ddd"
              } }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1119,
                columnNumber: 19
              }, this)
            ] }, i, true, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1108,
              columnNumber: 40
            }, this)),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              display: "grid",
              gridTemplateColumns: "1fr 140px",
              gap: 8,
              marginBottom: "8px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { name: "caps_campaign", placeholder: "Campaign name (or * for all campaigns)", style: {
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ddd"
              } }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1131,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { name: "caps_value", type: "number", step: "0.01", placeholder: "Max $", style: {
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #ddd"
              } }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1136,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1125,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: helpStyle, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Examples:" }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1143,
                columnNumber: 17
              }, this),
              ' Use "*" for all campaigns, "Brand Campaign" for specific ones. Set to 0 to remove a limit.'
            ] }, void 0, true, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1142,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginTop: "12px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { type: "submit", name: "save_caps", value: "1", disabled: nav.state !== "idle", style: {
                padding: "8px 16px",
                backgroundColor: nav.state !== "idle" ? "#6c757d" : "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: nav.state !== "idle" ? "not-allowed" : "pointer",
                opacity: nav.state !== "idle" ? 0.7 : 1
              }, children: nav.state !== "idle" ? "\u23F3 Saving..." : "\u{1F4BE} Save Bid Limits" }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1152,
                columnNumber: 17
              }, this),
              buttonFeedback.saveCaps && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
                color: "#155724",
                fontSize: "14px",
                fontWeight: "bold",
                padding: "4px 8px",
                backgroundColor: "#d4edda",
                borderRadius: "4px",
                border: "1px solid #c3e6cb"
              }, children: buttonFeedback.saveCaps }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1163,
                columnNumber: 45
              }, this)
            ] }, void 0, true, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1146,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1091,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 1027,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 1022,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: sectionStyle, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: legendStyle, children: "SEO Optimization" }, void 0, false, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 1181,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: helpStyle, children: "Improve your product pages for search engines" }, void 0, false, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 1182,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          display: "grid",
          gap: 12,
          marginTop: "12px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
              display: "block",
              fontWeight: "bold",
              marginBottom: "4px"
            }, children: "Product IDs or Handles" }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1189,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("textarea", { name: "product_ids", rows: 3, placeholder: "Enter product IDs or handles, separated by spaces, commas, or |", style: {
              width: "100%",
              padding: "8px 12px",
              borderRadius: "4px",
              border: "1px solid #ddd",
              fontFamily: "monospace",
              fontSize: "14px"
            } }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1196,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: helpStyle, children: 'Example: "12345 67890" or "t-shirt-blue, sneakers-red"' }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1204,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1188,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
              display: "block",
              fontWeight: "bold",
              marginBottom: "8px"
            }, children: "SEO Strategy" }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1210,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
              marginRight: "20px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "radio", name: "strategy", value: "template", defaultChecked: true, style: {
                marginRight: "6px"
              } }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1220,
                columnNumber: 17
              }, this),
              "Template (Use your own patterns)"
            ] }, void 0, true, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1217,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "radio", name: "strategy", value: "ai", style: {
                marginRight: "6px"
              } }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1226,
                columnNumber: 17
              }, this),
              "AI (Let AI write descriptions)"
            ] }, void 0, true, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1225,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1209,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
              display: "block",
              fontWeight: "bold",
              marginBottom: "4px"
            }, children: "Title Template" }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1234,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { name: "template_title", placeholder: "{{title}} | Free Shipping | Your Store", style: {
              width: "100%",
              padding: "8px 12px",
              borderRadius: "4px",
              border: "1px solid #ddd"
            } }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1241,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: helpStyle, children: [
              "Use ",
              "{{title}}",
              " for product name, ",
              "{{brand}}",
              " for brand name"
            ] }, void 0, true, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1247,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1233,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
              display: "block",
              fontWeight: "bold",
              marginBottom: "4px"
            }, children: "Description Template" }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1253,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { name: "template_description", placeholder: "Discover {{title}} by {{brand}}. High quality, fast shipping.", style: {
              width: "100%",
              padding: "8px 12px",
              borderRadius: "4px",
              border: "1px solid #ddd"
            } }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1260,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1252,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { type: "submit", name: "seo_preview", value: "1", disabled: nav.state !== "idle", style: {
              padding: "8px 16px",
              backgroundColor: nav.state !== "idle" ? "#6c757d" : "#ffc107",
              color: nav.state !== "idle" ? "white" : "#333",
              border: "none",
              borderRadius: "4px",
              cursor: nav.state !== "idle" ? "not-allowed" : "pointer",
              opacity: nav.state !== "idle" ? 0.7 : 1
            }, children: nav.state !== "idle" ? "Loading..." : "Preview Changes" }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1274,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { type: "submit", name: "seo_apply", value: "1", disabled: nav.state !== "idle", style: {
              padding: "8px 16px",
              backgroundColor: nav.state !== "idle" ? "#6c757d" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: nav.state !== "idle" ? "not-allowed" : "pointer",
              opacity: nav.state !== "idle" ? 0.7 : 1
            }, children: nav.state !== "idle" ? "Applying..." : "Apply to Store" }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1285,
              columnNumber: 15
            }, this),
            buttonFeedback.seoPreview && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
              color: "#856404",
              fontSize: "14px",
              fontWeight: "bold",
              padding: "4px 8px",
              backgroundColor: "#fff3cd",
              borderRadius: "4px",
              border: "1px solid #ffeaa7"
            }, children: buttonFeedback.seoPreview }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1296,
              columnNumber: 45
            }, this),
            buttonFeedback.seoApply && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
              color: "#155724",
              fontSize: "14px",
              fontWeight: "bold",
              padding: "4px 8px",
              backgroundColor: "#d4edda",
              borderRadius: "4px",
              border: "1px solid #c3e6cb"
            }, children: buttonFeedback.seoApply }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1307,
              columnNumber: 43
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1268,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 1183,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 1180,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: sectionStyle, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: legendStyle, children: "\u{1F511} Target Keywords" }, void 0, false, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 1324,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: helpStyle, children: "Choose keyword categories that match your business or enter your own" }, void 0, false, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 1325,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          marginTop: "12px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            marginBottom: "12px"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
              marginRight: "16px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "radio", checked: keywordsMode === "preset", onChange: () => setKeywordsMode("preset"), style: {
                marginRight: "6px"
              } }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1337,
                columnNumber: 17
              }, this),
              "Choose keyword category"
            ] }, void 0, true, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1334,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "radio", checked: keywordsMode === "manual", onChange: () => setKeywordsMode("manual"), style: {
                marginRight: "6px"
              } }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1343,
                columnNumber: 17
              }, this),
              "Enter my own keywords"
            ] }, void 0, true, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1342,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1331,
            columnNumber: 13
          }, this),
          keywordsMode === "preset" ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            display: "grid",
            gap: "12px"
          }, children: suggestions.keywords?.options.map((option, idx) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
            display: "block",
            padding: "16px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            cursor: "pointer",
            backgroundColor: "#fafafa"
          }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            display: "flex",
            alignItems: "flex-start",
            gap: "12px"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "radio", name: "desired_keywords", value: option.value, defaultChecked: idx === 0, style: {
              marginTop: "4px"
            } }, void 0, false, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1367,
              columnNumber: 25
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: option.label }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1371,
                columnNumber: 27
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
                fontSize: "12px",
                color: "#666",
                marginTop: "4px",
                marginBottom: "8px"
              }, children: option.description }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1372,
                columnNumber: 27
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
                fontSize: "14px",
                color: "#333",
                backgroundColor: "white",
                padding: "8px",
                borderRadius: "4px",
                border: "1px solid #eee",
                fontFamily: "monospace",
                whiteSpace: "pre-line"
              }, children: option.value }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1380,
                columnNumber: 27
              }, this)
            ] }, void 0, true, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1370,
              columnNumber: 25
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1362,
            columnNumber: 23
          }, this) }, idx, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1354,
            columnNumber: 69
          }, this)) }, void 0, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1350,
            columnNumber: 42
          }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("textarea", { name: "desired_keywords", rows: 6, placeholder: "Enter your keywords, one per line:\nyour product name\nyour brand\nyour industry terms\ncompetitor alternatives", defaultValue: (cfg?.AP?.desired_keywords || []).join("\n"), style: {
            width: "100%",
            padding: "12px",
            borderRadius: "4px",
            border: "1px solid #ddd",
            fontFamily: "monospace",
            fontSize: "14px"
          } }, void 0, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1395,
            columnNumber: 24
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: helpStyle, children: "These keywords help guide the autopilot's optimization decisions and negative keyword suggestions." }, void 0, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1404,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 1328,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 1323,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: sectionStyle, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: legendStyle, children: "AI Behavior Instructions" }, void 0, false, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 1413,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: helpStyle, children: "Choose a business strategy or write custom instructions for the AI" }, void 0, false, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 1414,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          marginTop: "12px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            marginBottom: "12px"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
              marginRight: "16px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "radio", checked: aiBehaviorMode === "preset", onChange: () => setAiBehaviorMode("preset"), style: {
                marginRight: "6px"
              } }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1426,
                columnNumber: 17
              }, this),
              "Choose business strategy"
            ] }, void 0, true, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1423,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "radio", checked: aiBehaviorMode === "manual", onChange: () => setAiBehaviorMode("manual"), style: {
                marginRight: "6px"
              } }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1432,
                columnNumber: 17
              }, this),
              "Write custom instructions"
            ] }, void 0, true, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1431,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1420,
            columnNumber: 13
          }, this),
          aiBehaviorMode === "preset" ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            display: "grid",
            gap: "12px"
          }, children: suggestions.aiBehavior?.options.map((option, idx) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
            display: "block",
            padding: "16px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            cursor: "pointer",
            backgroundColor: "#fafafa"
          }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            display: "flex",
            alignItems: "flex-start",
            gap: "12px"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(
              "input",
              {
                type: "radio",
                name: "playbook",
                value: option.value,
                defaultChecked: idx === 2,
                style: {
                  marginTop: "4px"
                }
              },
              void 0,
              false,
              {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1456,
                columnNumber: 25
              },
              this
            ),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              flex: 1
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "6px"
              }, children: [
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { style: {
                  fontSize: "16px"
                }, children: option.label }, void 0, false, {
                  fileName: "app/routes/app.advanced.tsx",
                  lineNumber: 1469,
                  columnNumber: 29
                }, this),
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
                  fontSize: "12px",
                  color: "#007bff",
                  backgroundColor: "#e7f3ff",
                  padding: "2px 8px",
                  borderRadius: "12px"
                }, children: idx === 0 ? "Premium" : idx === 1 ? "Growth" : "Balanced" }, void 0, false, {
                  fileName: "app/routes/app.advanced.tsx",
                  lineNumber: 1474,
                  columnNumber: 29
                }, this)
              ] }, void 0, true, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1463,
                columnNumber: 27
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
                fontSize: "13px",
                color: "#666",
                marginBottom: "10px"
              }, children: option.description }, void 0, false, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1484,
                columnNumber: 27
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
                fontSize: "12px",
                color: "#333",
                backgroundColor: "white",
                padding: "10px",
                borderRadius: "4px",
                border: "1px solid #eee",
                fontFamily: "inherit",
                whiteSpace: "pre-line",
                fontStyle: "italic"
              }, children: [
                '"',
                option.value,
                '"'
              ] }, void 0, true, {
                fileName: "app/routes/app.advanced.tsx",
                lineNumber: 1491,
                columnNumber: 27
              }, this)
            ] }, void 0, true, {
              fileName: "app/routes/app.advanced.tsx",
              lineNumber: 1460,
              columnNumber: 25
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1451,
            columnNumber: 23
          }, this) }, idx, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1443,
            columnNumber: 71
          }, this)) }, void 0, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1439,
            columnNumber: 44
          }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("textarea", { name: "playbook", rows: 8, placeholder: "Write specific instructions for the AI:\n\n\u2022 What type of customers should we focus on?\n\u2022 What's our competitive advantage?\n\u2022 Any products/keywords to avoid?\n\u2022 Special business rules or constraints?\n\u2022 Brand voice and messaging guidelines?", defaultValue: cfg?.AP?.playbook_prompt || "", style: {
            width: "100%",
            padding: "12px",
            borderRadius: "4px",
            border: "1px solid #ddd",
            fontFamily: "inherit",
            fontSize: "14px"
          } }, void 0, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1507,
            columnNumber: 24
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            ...helpStyle,
            marginTop: "8px"
          }, children: "These instructions help the AI understand your business goals and make better optimization decisions." }, void 0, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1516,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 1417,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 1412,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "16px",
        padding: "24px",
        borderTop: "2px solid #e1e5e9",
        marginTop: "20px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { type: "submit", name: "run_optimization", value: "1", disabled: nav.state !== "idle", style: {
          padding: "16px 32px",
          backgroundColor: nav.state !== "idle" ? "#6c757d" : "#28a745",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: nav.state !== "idle" ? "not-allowed" : "pointer",
          fontSize: "18px",
          fontWeight: "bold",
          opacity: nav.state !== "idle" ? 0.7 : 1,
          boxShadow: nav.state === "idle" ? "0 4px 12px rgba(40, 167, 69, 0.3)" : "none",
          transition: "all 0.2s ease"
        }, children: nav.state !== "idle" ? "\u23F3 Saving & Running..." : "\u{1F4BE} Save Settings & Run Optimization" }, void 0, false, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 1536,
          columnNumber: 11
        }, this),
        (buttonFeedback.saveSettings || buttonFeedback.runOptimization) && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
          color: "#155724",
          fontSize: "16px",
          fontWeight: "bold",
          padding: "8px 16px",
          backgroundColor: "#d4edda",
          borderRadius: "6px",
          border: "2px solid #c3e6cb",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }, children: buttonFeedback.runOptimization || buttonFeedback.saveSettings }, void 0, false, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 1551,
          columnNumber: 79
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 1527,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.advanced.tsx",
      lineNumber: 811,
      columnNumber: 7
    }, this),
    Array.isArray(preview) && preview.length > 0 && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      marginTop: "24px",
      padding: "20px",
      backgroundColor: "#f8f9fa",
      borderRadius: "8px",
      border: "1px solid #e1e5e9"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "SEO Preview" }, void 0, false, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 1573,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: helpStyle, children: "Here's how your product pages will look after optimization:" }, void 0, false, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 1574,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        overflowX: "auto",
        marginTop: "12px"
      }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("table", { style: {
        width: "100%",
        borderCollapse: "collapse",
        backgroundColor: "white",
        borderRadius: "4px",
        overflow: "hidden"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("thead", { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("tr", { style: {
          backgroundColor: "#f1f3f4"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("th", { style: {
            padding: "12px",
            textAlign: "left",
            borderBottom: "1px solid #ddd"
          }, children: "Product" }, void 0, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1592,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("th", { style: {
            padding: "12px",
            textAlign: "left",
            borderBottom: "1px solid #ddd"
          }, children: "New Title" }, void 0, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1599,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("th", { style: {
            padding: "12px",
            textAlign: "left",
            borderBottom: "1px solid #ddd"
          }, children: "New Description" }, void 0, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1606,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("th", { style: {
            padding: "12px",
            textAlign: "left",
            borderBottom: "1px solid #ddd"
          }, children: "Image Alt Text" }, void 0, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1613,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 1589,
          columnNumber: 17
        }, this) }, void 0, false, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 1588,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("tbody", { children: preview.map((p, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("tr", { style: {
          borderBottom: "1px solid #eee"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("td", { style: {
            padding: "12px",
            fontFamily: "monospace",
            fontSize: "14px"
          }, children: p.productId }, void 0, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1626,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("td", { style: {
            padding: "12px"
          }, children: p.title }, void 0, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1633,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("td", { style: {
            padding: "12px"
          }, children: p.description }, void 0, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1636,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("td", { style: {
            padding: "12px",
            fontStyle: "italic"
          }, children: p.images?.[0]?.altText || "(no alt text)" }, void 0, false, {
            fileName: "app/routes/app.advanced.tsx",
            lineNumber: 1639,
            columnNumber: 21
          }, this)
        ] }, i, true, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 1623,
          columnNumber: 40
        }, this)) }, void 0, false, {
          fileName: "app/routes/app.advanced.tsx",
          lineNumber: 1622,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 1581,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "app/routes/app.advanced.tsx",
        lineNumber: 1577,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.advanced.tsx",
      lineNumber: 1566,
      columnNumber: 56
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/app.advanced.tsx",
    lineNumber: 600,
    columnNumber: 10
  }, this);
}
_s(Advanced, "+zItBY5p0kJd2+lVppe4Lm5WsQU=", false, function() {
  return [useLoaderData, useActionData, useNavigation, useRevalidator];
});
_c = Advanced;
var _c;
$RefreshReg$(_c, "Advanced");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  Advanced as default
};
//# sourceMappingURL=/assets/routes/app.advanced-C42PC5W5.js.map
