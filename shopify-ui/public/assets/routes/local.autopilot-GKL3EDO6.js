import {
  require_hmac
} from "/assets/_shared/chunk-7OQ7YQAO.js";
import {
  require_node
} from "/assets/_shared/chunk-5LF5TODQ.js";
import {
  useLoaderData
} from "/assets/_shared/chunk-73JMOIKH.js";
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

// app/routes/local.autopilot.tsx
var React = __toESM(require_react());
var import_node = __toESM(require_node());
var import_hmac = __toESM(require_hmac());
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/local.autopilot.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/local.autopilot.tsx"
  );
  import.meta.hot.lastModified = "1758229076745.2993";
}
function LocalAutopilot() {
  _s();
  const {
    diag,
    status,
    tenantInfo
  } = useLoaderData();
  const [mode, setMode] = React.useState("protect");
  const [budget, setBudget] = React.useState("3.00");
  const [cpc, setCpc] = React.useState("0.20");
  const [url, setUrl] = React.useState("");
  const [sheetId, setSheetId] = React.useState("");
  const [tested, setTested] = React.useState(false);
  const [toast, setToast] = React.useState("");
  const [scriptCode, setScriptCode] = React.useState("");
  const [showScript, setShowScript] = React.useState(false);
  React.useEffect(() => {
    if (showScript) {
      generateDynamicScript();
    }
  }, [mode, budget, cpc, url, showScript]);
  function run() {
    const config = `Configuration:
Mode: ${mode}
Budget: $${budget}/day
CPC: $${cpc}
URL: ${url}
Tenant: proofkit`;
    alert(`Autopilot would be enabled with:

${config}

In production, this would start the automation.`);
    setToast("Demo: Configuration shown (would enable in production)");
  }
  function testSheet() {
    setTested(true);
    setToast("Demo: Sheet connection would be tested");
  }
  function saveSheet() {
    setToast("Demo: Sheet configuration would be saved");
  }
  function generateDynamicScript() {
    const formData = new FormData();
    formData.append("actionType", "generateScript");
    formData.append("mode", mode);
    formData.append("budget", budget);
    formData.append("cpc", cpc);
    formData.append("url", url);
    fetch("/api/generate-script", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode,
        budget,
        cpc,
        url
      })
    }).then((response) => response.json()).then((data) => {
      if (data.success) {
        setScriptCode(data.script);
        setShowScript(true);
        setToast(`Complete ${data.size}KB script generated for ${data.tenant}`);
      } else {
        setToast("Error: " + data.error);
      }
    }).catch((error) => {
      setToast("Error generating script: " + error.message);
    });
  }
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", { children: "Developer Preview: Autopilot" }, void 0, false, {
      fileName: "app/routes/local.autopilot.tsx",
      lineNumber: 169,
      columnNumber: 7
    }, this),
    !diag?.sheets_ok && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("section", { style: {
      border: "1px solid #eee",
      padding: 12
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Connect Sheets" }, void 0, false, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 174,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { value: sheetId, onChange: (e) => setSheetId(e.target.value), placeholder: "Google Sheet ID", style: {
        width: "100%"
      } }, void 0, false, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 175,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        marginTop: 8,
        display: "flex",
        gap: 8
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: testSheet, children: "Test" }, void 0, false, {
          fileName: "app/routes/local.autopilot.tsx",
          lineNumber: 183,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { disabled: !tested, onClick: saveSheet, children: "Save" }, void 0, false, {
          fileName: "app/routes/local.autopilot.tsx",
          lineNumber: 184,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 178,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/local.autopilot.tsx",
      lineNumber: 170,
      columnNumber: 28
    }, this),
    toast && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: toast }, void 0, false, {
      fileName: "app/routes/local.autopilot.tsx",
      lineNumber: 189,
      columnNumber: 17
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("section", { style: {
      border: "1px solid #eee",
      padding: 12
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Goal" }, void 0, false, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 194,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "radio", name: "goal", value: "protect", checked: mode === "protect", onChange: () => setMode("protect") }, void 0, false, {
          fileName: "app/routes/local.autopilot.tsx",
          lineNumber: 196,
          columnNumber: 11
        }, this),
        " ",
        "Protect"
      ] }, void 0, true, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 195,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 199,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "radio", name: "goal", value: "grow", checked: mode === "grow", onChange: () => setMode("grow") }, void 0, false, {
          fileName: "app/routes/local.autopilot.tsx",
          lineNumber: 201,
          columnNumber: 11
        }, this),
        " ",
        "Grow"
      ] }, void 0, true, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 200,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 204,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "radio", name: "goal", value: "scale", checked: mode === "scale", onChange: () => setMode("scale") }, void 0, false, {
          fileName: "app/routes/local.autopilot.tsx",
          lineNumber: 206,
          columnNumber: 11
        }, this),
        " ",
        "Scale"
      ] }, void 0, true, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 205,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/local.autopilot.tsx",
      lineNumber: 190,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("section", { style: {
      border: "1px solid #eee",
      padding: 12
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Budget & CPC" }, void 0, false, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 214,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "number", step: "0.01", value: budget, onChange: (e) => setBudget(e.target.value), placeholder: "$ per day" }, void 0, false, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 215,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "number", step: "0.01", value: cpc, onChange: (e) => setCpc(e.target.value), placeholder: "Max CPC" }, void 0, false, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 216,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/local.autopilot.tsx",
      lineNumber: 210,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("section", { style: {
      border: "1px solid #eee",
      padding: 12
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Landing URL" }, void 0, false, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 222,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { value: url, onChange: (e) => setUrl(e.target.value), placeholder: "https://example.com", style: {
        width: "100%"
      } }, void 0, false, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 223,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/local.autopilot.tsx",
      lineNumber: 218,
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
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 234,
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
        }, children: "ALWAYS ON" }, void 0, false, {
          fileName: "app/routes/local.autopilot.tsx",
          lineNumber: 246,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: [
          "Automation running for: ",
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "proofkit" }, void 0, false, {
            fileName: "app/routes/local.autopilot.tsx",
            lineNumber: 256,
            columnNumber: 37
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/local.autopilot.tsx",
          lineNumber: 255,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 240,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        fontSize: "14px",
        color: "#666"
      }, children: [
        "\u2022 Budget optimization: Active",
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
          fileName: "app/routes/local.autopilot.tsx",
          lineNumber: 264,
          columnNumber: 11
        }, this),
        "\u2022 AI analysis: Running every 15min",
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
          fileName: "app/routes/local.autopilot.tsx",
          lineNumber: 266,
          columnNumber: 11
        }, this),
        "\u2022 Performance monitoring: Continuous",
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
          fileName: "app/routes/local.autopilot.tsx",
          lineNumber: 268,
          columnNumber: 11
        }, this),
        "\u2022 Script updates: Available below"
      ] }, void 0, true, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 259,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/local.autopilot.tsx",
      lineNumber: 227,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      marginTop: 8
    }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: generateDynamicScript, style: {
      background: "#007bff",
      color: "white",
      padding: "12px 24px",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "16px"
    }, children: "Generate Current Script" }, void 0, false, {
      fileName: "app/routes/local.autopilot.tsx",
      lineNumber: 275,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/routes/local.autopilot.tsx",
      lineNumber: 272,
      columnNumber: 7
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
          fileName: "app/routes/local.autopilot.tsx",
          lineNumber: 298,
          columnNumber: 13
        }, this),
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
          fileName: "app/routes/local.autopilot.tsx",
          lineNumber: 301,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 292,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("textarea", { readOnly: true, value: scriptCode, style: {
        width: "100%",
        height: 300,
        fontFamily: "monospace",
        fontSize: "12px"
      }, placeholder: "Script will appear here when loaded..." }, void 0, false, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 318,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ol", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Google Ads \u2192 Tools \u2192 Bulk actions \u2192 Scripts \u2192 + New script" }, void 0, false, {
          fileName: "app/routes/local.autopilot.tsx",
          lineNumber: 325,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Paste, Authorize, then Preview first" }, void 0, false, {
          fileName: "app/routes/local.autopilot.tsx",
          lineNumber: 326,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "If ok, Run once, then Schedule daily" }, void 0, false, {
          fileName: "app/routes/local.autopilot.tsx",
          lineNumber: 327,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/local.autopilot.tsx",
        lineNumber: 324,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/local.autopilot.tsx",
      lineNumber: 287,
      columnNumber: 22
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/local.autopilot.tsx",
    lineNumber: 168,
    columnNumber: 10
  }, this);
}
_s(LocalAutopilot, "XlCer3CNW376gulK/fr7dE9OmEE=", false, function() {
  return [useLoaderData];
});
_c = LocalAutopilot;
var _c;
$RefreshReg$(_c, "LocalAutopilot");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  LocalAutopilot as default
};
//# sourceMappingURL=/assets/routes/local.autopilot-GKL3EDO6.js.map
