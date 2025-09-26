import {
  buildAppUrl,
  useShopContext
} from "/assets/_shared/chunk-L6URU3LL.js";
import {
  require_node
} from "/assets/_shared/chunk-5LF5TODQ.js";
import {
  Link,
  useLoaderData
} from "/assets/_shared/chunk-LWH66BJU.js";
import "/assets/_shared/chunk-Z7LCWUX7.js";
import {
  require_jsx_dev_runtime
} from "/assets/_shared/chunk-IFEKMGEG.js";
import "/assets/_shared/chunk-HGNQ3YCE.js";
import {
  createHotContext
} from "/assets/_shared/chunk-GN6N4SDD.js";
import "/assets/_shared/chunk-FK5MLNU6.js";
import {
  __toESM
} from "/assets/_shared/chunk-R6OA4XCD.js";

// app/routes/app.intent-os.tsx
var import_node = __toESM(require_node());
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/app.intent-os.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/app.intent-os.tsx"
  );
  import.meta.hot.lastModified = "1758301317918.35";
}
function IntentOSComingSoon() {
  _s();
  const {
    tenantId,
    launchDate
  } = useLoaderData();
  const shopContext = useShopContext();
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
    padding: "3rem 2rem",
    maxWidth: "800px",
    margin: "0 auto",
    textAlign: "center"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      marginBottom: "3rem"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", { style: {
        fontSize: "48px",
        marginBottom: "1rem",
        color: "#333"
      }, children: "Smart Website Features" }, void 0, false, {
        fileName: "app/routes/app.intent-os.tsx",
        lineNumber: 50,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
        fontSize: "24px",
        color: "#666",
        marginBottom: "2rem"
      }, children: "Advanced conversion optimization tools coming soon!" }, void 0, false, {
        fileName: "app/routes/app.intent-os.tsx",
        lineNumber: 57,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "inline-block",
        padding: "8px 16px",
        background: "#fff3cd",
        borderRadius: "6px",
        border: "1px solid #ffeaa7",
        fontSize: "16px",
        fontWeight: "bold",
        color: "#856404"
      }, children: [
        "\u{1F4C5} Expected Launch: ",
        launchDate
      ] }, void 0, true, {
        fileName: "app/routes/app.intent-os.tsx",
        lineNumber: 64,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.intent-os.tsx",
      lineNumber: 47,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      border: "1px solid #e1e5e9",
      borderRadius: "12px",
      padding: "2rem",
      marginBottom: "3rem",
      background: "#f8f9fa"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { style: {
        marginBottom: "2rem",
        color: "#333"
      }, children: "What's Coming" }, void 0, false, {
        fileName: "app/routes/app.intent-os.tsx",
        lineNumber: 86,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "1.5rem",
        textAlign: "left"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          padding: "1.5rem",
          border: "1px solid #28a745",
          borderRadius: "8px",
          background: "#fff"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: {
            color: "#28a745",
            marginBottom: "1rem"
          }, children: "\u23F0 Stock Urgency" }, void 0, false, {
            fileName: "app/routes/app.intent-os.tsx",
            lineNumber: 103,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
            color: "#666",
            fontSize: "14px"
          }, children: 'Automatically show "Only X left!" messages on low-stock products to create buying urgency.' }, void 0, false, {
            fileName: "app/routes/app.intent-os.tsx",
            lineNumber: 109,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.intent-os.tsx",
          lineNumber: 97,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          padding: "1.5rem",
          border: "1px solid #007bff",
          borderRadius: "8px",
          background: "#fff"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: {
            color: "#007bff",
            marginBottom: "1rem"
          }, children: "Welcome Offers" }, void 0, false, {
            fileName: "app/routes/app.intent-os.tsx",
            lineNumber: 124,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
            color: "#666",
            fontSize: "14px"
          }, children: "Show special discounts to first-time visitors to convert them into customers." }, void 0, false, {
            fileName: "app/routes/app.intent-os.tsx",
            lineNumber: 130,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.intent-os.tsx",
          lineNumber: 118,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          padding: "1.5rem",
          border: "1px solid #ffc107",
          borderRadius: "8px",
          background: "#fff"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: {
            color: "#856404",
            marginBottom: "1rem"
          }, children: "Smart Content" }, void 0, false, {
            fileName: "app/routes/app.intent-os.tsx",
            lineNumber: 145,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
            color: "#666",
            fontSize: "14px"
          }, children: "Show different headlines and messages based on how visitors found your store." }, void 0, false, {
            fileName: "app/routes/app.intent-os.tsx",
            lineNumber: 151,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.intent-os.tsx",
          lineNumber: 139,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          padding: "1.5rem",
          border: "1px solid #dc3545",
          borderRadius: "8px",
          background: "#fff"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: {
            color: "#dc3545",
            marginBottom: "1rem"
          }, children: "\u{1F4A8} Exit Intent" }, void 0, false, {
            fileName: "app/routes/app.intent-os.tsx",
            lineNumber: 166,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
            color: "#666",
            fontSize: "14px"
          }, children: "Catch visitors before they leave with last-chance offers and incentives." }, void 0, false, {
            fileName: "app/routes/app.intent-os.tsx",
            lineNumber: 172,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.intent-os.tsx",
          lineNumber: 160,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.intent-os.tsx",
        lineNumber: 91,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.intent-os.tsx",
      lineNumber: 79,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      border: "1px solid #007bff",
      borderRadius: "12px",
      padding: "2rem",
      marginBottom: "3rem",
      background: "#e7f3ff"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { style: {
        color: "#0c5460",
        marginBottom: "1rem"
      }, children: "Our Current Focus" }, void 0, false, {
        fileName: "app/routes/app.intent-os.tsx",
        lineNumber: 191,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
        fontSize: "18px",
        color: "#0c5460",
        marginBottom: "2rem"
      }, children: [
        "We're focusing on perfecting your",
        " ",
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Google Ads optimization" }, void 0, false, {
          fileName: "app/routes/app.intent-os.tsx",
          lineNumber: 203,
          columnNumber: 11
        }, this),
        " first. Once that's delivering amazing results, we'll add these website optimization features."
      ] }, void 0, true, {
        fileName: "app/routes/app.intent-os.tsx",
        lineNumber: 197,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1rem"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, { to: buildAppUrl("/app/autopilot", shopContext), style: {
          padding: "1rem",
          background: "#fff",
          border: "1px solid #007bff",
          borderRadius: "6px",
          textDecoration: "none",
          color: "#007bff",
          fontWeight: "bold",
          display: "block"
        }, children: "\u{1F916} Use Autopilot Now" }, void 0, false, {
          fileName: "app/routes/app.intent-os.tsx",
          lineNumber: 212,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, { to: "/app/advanced", style: {
          padding: "1rem",
          background: "#fff",
          border: "1px solid #28a745",
          borderRadius: "6px",
          textDecoration: "none",
          color: "#28a745",
          fontWeight: "bold",
          display: "block"
        }, children: "Configure Settings" }, void 0, false, {
          fileName: "app/routes/app.intent-os.tsx",
          lineNumber: 225,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, { to: "/app/insights", style: {
          padding: "1rem",
          background: "#fff",
          border: "1px solid #ffc107",
          borderRadius: "6px",
          textDecoration: "none",
          color: "#856404",
          fontWeight: "bold",
          display: "block"
        }, children: "View Performance" }, void 0, false, {
          fileName: "app/routes/app.intent-os.tsx",
          lineNumber: 238,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.intent-os.tsx",
        lineNumber: 207,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.intent-os.tsx",
      lineNumber: 184,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      padding: "1.5rem",
      background: "#f1f3f4",
      borderRadius: "8px",
      textAlign: "left"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: {
        marginBottom: "1rem",
        color: "#333"
      }, children: "Why We're Building This Step by Step" }, void 0, false, {
        fileName: "app/routes/app.intent-os.tsx",
        lineNumber: 260,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { style: {
        color: "#666",
        lineHeight: "1.6",
        paddingLeft: "20px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Better Product:" }, void 0, false, {
            fileName: "app/routes/app.intent-os.tsx",
            lineNumber: 272,
            columnNumber: 13
          }, this),
          " Perfect your Google Ads optimization first, then add website features"
        ] }, void 0, true, {
          fileName: "app/routes/app.intent-os.tsx",
          lineNumber: 271,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Faster Launch:" }, void 0, false, {
            fileName: "app/routes/app.intent-os.tsx",
            lineNumber: 276,
            columnNumber: 13
          }, this),
          " Get you making money sooner with proven Google Ads automation"
        ] }, void 0, true, {
          fileName: "app/routes/app.intent-os.tsx",
          lineNumber: 275,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Customer-Driven:" }, void 0, false, {
            fileName: "app/routes/app.intent-os.tsx",
            lineNumber: 280,
            columnNumber: 13
          }, this),
          " Build website features based on what you actually need"
        ] }, void 0, true, {
          fileName: "app/routes/app.intent-os.tsx",
          lineNumber: 279,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Quality Focus:" }, void 0, false, {
            fileName: "app/routes/app.intent-os.tsx",
            lineNumber: 284,
            columnNumber: 13
          }, this),
          " Each feature gets our full attention instead of rushing everything"
        ] }, void 0, true, {
          fileName: "app/routes/app.intent-os.tsx",
          lineNumber: 283,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.intent-os.tsx",
        lineNumber: 266,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.intent-os.tsx",
      lineNumber: 254,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      marginTop: "3rem",
      padding: "2rem",
      background: "#fff",
      border: "1px solid #e1e5e9",
      borderRadius: "8px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: {
        marginBottom: "1rem",
        color: "#333"
      }, children: "\u{1F4EC} Want to know when Smart Website features launch?" }, void 0, false, {
        fileName: "app/routes/app.intent-os.tsx",
        lineNumber: 298,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
        color: "#666",
        marginBottom: "1.5rem"
      }, children: "We'll email you as soon as these conversion optimization tools are ready." }, void 0, false, {
        fileName: "app/routes/app.intent-os.tsx",
        lineNumber: 304,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "flex",
        gap: "1rem",
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "wrap"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "email", placeholder: "your@email.com", style: {
          padding: "12px 16px",
          borderRadius: "6px",
          border: "1px solid #ddd",
          fontSize: "16px",
          minWidth: "250px"
        } }, void 0, false, {
          fileName: "app/routes/app.intent-os.tsx",
          lineNumber: 319,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { style: {
          padding: "12px 24px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "6px",
          fontSize: "16px",
          fontWeight: "bold",
          cursor: "pointer"
        }, children: "\u{1F4E7} Notify Me" }, void 0, false, {
          fileName: "app/routes/app.intent-os.tsx",
          lineNumber: 326,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.intent-os.tsx",
        lineNumber: 312,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.intent-os.tsx",
      lineNumber: 291,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/app.intent-os.tsx",
    lineNumber: 40,
    columnNumber: 10
  }, this);
}
_s(IntentOSComingSoon, "YlI0Sroem2Rslgw08EFcD6xQjK0=", false, function() {
  return [useLoaderData, useShopContext];
});
_c = IntentOSComingSoon;
var _c;
$RefreshReg$(_c, "IntentOSComingSoon");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  IntentOSComingSoon as default
};
//# sourceMappingURL=/assets/routes/app.intent-os-GLPZV4HV.js.map
