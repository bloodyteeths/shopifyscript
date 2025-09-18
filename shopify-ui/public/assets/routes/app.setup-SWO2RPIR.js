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
import "/assets/_shared/chunk-HGNQ3YCE.js";
import {
  require_shopify
} from "/assets/_shared/chunk-7OUBBUAS.js";
import {
  createHotContext
} from "/assets/_shared/chunk-GN6N4SDD.js";
import "/assets/_shared/chunk-FK5MLNU6.js";
import {
  __commonJS,
  __toESM
} from "/assets/_shared/chunk-R6OA4XCD.js";

// empty-module:../utils/database.server
var require_database = __commonJS({
  "empty-module:../utils/database.server"(exports, module) {
    module.exports = {};
  }
});

// app/routes/app.setup.tsx
var import_node = __toESM(require_node());
var import_shopify = __toESM(require_shopify());
var import_database = __toESM(require_database());
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/app.setup.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/app.setup.tsx"
  );
  import.meta.hot.lastModified = "1758227317384.7246";
}
function Setup() {
  _s();
  const data = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
    maxWidth: 600,
    margin: "0 auto",
    padding: 20
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      backgroundColor: "#f8f9fa",
      border: "1px solid #e1e5e9",
      borderRadius: "8px",
      padding: "24px",
      marginBottom: "24px",
      textAlign: "center"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", { style: {
        margin: "0 0 16px 0",
        fontSize: "28px",
        color: "#333"
      }, children: "Welcome to ProofKit!" }, void 0, false, {
        fileName: "app/routes/app.setup.tsx",
        lineNumber: 95,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
        margin: "0 0 8px 0",
        fontSize: "18px",
        color: "#666"
      }, children: [
        "Setting up for: ",
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: data.shopDomain }, void 0, false, {
          fileName: "app/routes/app.setup.tsx",
          lineNumber: 107,
          columnNumber: 27
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.setup.tsx",
        lineNumber: 102,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
        margin: "0",
        fontSize: "14px",
        color: "#888"
      }, children: "This quick setup will only take 2 minutes" }, void 0, false, {
        fileName: "app/routes/app.setup.tsx",
        lineNumber: 109,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.setup.tsx",
      lineNumber: 87,
      columnNumber: 7
    }, this),
    actionData?.error && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      backgroundColor: "#fed7d7",
      border: "1px solid #f56565",
      borderRadius: "8px",
      padding: "16px",
      marginBottom: "20px",
      color: "#c53030"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", { style: {
        margin: "0 0 8px 0"
      }, children: "Setup Error" }, void 0, false, {
        fileName: "app/routes/app.setup.tsx",
        lineNumber: 126,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
        margin: 0
      }, children: actionData.error }, void 0, false, {
        fileName: "app/routes/app.setup.tsx",
        lineNumber: 129,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.setup.tsx",
      lineNumber: 118,
      columnNumber: 29
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Form, { method: "post", style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        backgroundColor: "white",
        border: "1px solid #e1e5e9",
        borderRadius: "12px",
        padding: "40px",
        textAlign: "center",
        maxWidth: "500px",
        marginBottom: "32px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          width: "64px",
          height: "64px",
          background: "linear-gradient(135deg, #007bff, #0056b3)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px auto",
          fontSize: "24px",
          color: "white"
        }, children: "\u2713" }, void 0, false, {
          fileName: "app/routes/app.setup.tsx",
          lineNumber: 149,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { style: {
          margin: "0 0 16px 0",
          fontSize: "24px",
          color: "#333"
        }, children: "You're All Set!" }, void 0, false, {
          fileName: "app/routes/app.setup.tsx",
          lineNumber: 161,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
          margin: "0 0 24px 0",
          fontSize: "16px",
          color: "#666",
          lineHeight: "1.5"
        }, children: [
          "ProofKit is now connected to your ",
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: data.shopDomain }, void 0, false, {
            fileName: "app/routes/app.setup.tsx",
            lineNumber: 174,
            columnNumber: 47
          }, this),
          " ",
          "store.",
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
            fileName: "app/routes/app.setup.tsx",
            lineNumber: 176,
            columnNumber: 13
          }, this),
          "Your AI-powered Google Ads optimization is ready to begin!"
        ] }, void 0, true, {
          fileName: "app/routes/app.setup.tsx",
          lineNumber: 168,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          backgroundColor: "#f8f9fa",
          border: "1px solid #dee2e6",
          borderRadius: "8px",
          padding: "16px",
          fontSize: "14px",
          color: "#495057"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Next steps:" }, void 0, false, {
            fileName: "app/routes/app.setup.tsx",
            lineNumber: 187,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
            fileName: "app/routes/app.setup.tsx",
            lineNumber: 188,
            columnNumber: 13
          }, this),
          "\u2022 Configure your campaign settings in Advanced Settings",
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
            fileName: "app/routes/app.setup.tsx",
            lineNumber: 190,
            columnNumber: 13
          }, this),
          "\u2022 Set up your automation schedule",
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
            fileName: "app/routes/app.setup.tsx",
            lineNumber: 192,
            columnNumber: 13
          }, this),
          "\u2022 Review performance insights as data flows in"
        ] }, void 0, true, {
          fileName: "app/routes/app.setup.tsx",
          lineNumber: 179,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.setup.tsx",
        lineNumber: 140,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { type: "submit", disabled: isSubmitting, style: {
        padding: "16px 32px",
        backgroundColor: isSubmitting ? "#6c757d" : "#007bff",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: isSubmitting ? "not-allowed" : "pointer",
        fontSize: "18px",
        fontWeight: "bold",
        boxShadow: isSubmitting ? "none" : "0 4px 12px rgba(0, 123, 255, 0.3)",
        transition: "all 0.2s ease"
      }, children: isSubmitting ? "Loading..." : "Get Started" }, void 0, false, {
        fileName: "app/routes/app.setup.tsx",
        lineNumber: 197,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.setup.tsx",
      lineNumber: 134,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/app.setup.tsx",
    lineNumber: 82,
    columnNumber: 10
  }, this);
}
_s(Setup, "Q6YH5PvE3iyz5kH/ldDGbLeChh4=", false, function() {
  return [useLoaderData, useActionData, useNavigation];
});
_c = Setup;
var _c;
$RefreshReg$(_c, "Setup");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  Setup as default
};
//# sourceMappingURL=/assets/routes/app.setup-SWO2RPIR.js.map
