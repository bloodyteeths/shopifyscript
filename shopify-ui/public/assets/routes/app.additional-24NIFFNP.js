import {
  BlockStack,
  Box,
  Card,
  Layout,
  Link,
  List,
  Page,
  Text
} from "/assets/_shared/chunk-5CSWVI4C.js";
import "/assets/_shared/chunk-QDIWRKG7.js";
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

// app/routes/app.additional.tsx
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/app.additional.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/app.additional.tsx"
  );
  import.meta.hot.lastModified = "1758302236069.5872";
}
function AdditionalPage() {
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Page, { title: "Additional page", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout, { children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(BlockStack, { gap: "300", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { as: "p", variant: "bodyMd", children: [
        "The app template comes with an additional page which demonstrates how to create multiple pages within app navigation using",
        " ",
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, { url: "https://shopify.dev/docs/apps/tools/app-bridge", target: "_blank", removeUnderline: true, children: "App Bridge" }, void 0, false, {
          fileName: "app/routes/app.additional.tsx",
          lineNumber: 32,
          columnNumber: 17
        }, this),
        "."
      ] }, void 0, true, {
        fileName: "app/routes/app.additional.tsx",
        lineNumber: 28,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { as: "p", variant: "bodyMd", children: [
        "To create your own page and have it show up in the app navigation, add a page inside ",
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Code, { children: "app/routes" }, void 0, false, {
          fileName: "app/routes/app.additional.tsx",
          lineNumber: 39,
          columnNumber: 47
        }, this),
        ", and a link to it in the ",
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Code, { children: "<NavMenu>" }, void 0, false, {
          fileName: "app/routes/app.additional.tsx",
          lineNumber: 40,
          columnNumber: 35
        }, this),
        " component found in ",
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Code, { children: "app/routes/app.jsx" }, void 0, false, {
          fileName: "app/routes/app.additional.tsx",
          lineNumber: 41,
          columnNumber: 20
        }, this),
        "."
      ] }, void 0, true, {
        fileName: "app/routes/app.additional.tsx",
        lineNumber: 37,
        columnNumber: 15
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.additional.tsx",
      lineNumber: 27,
      columnNumber: 13
    }, this) }, void 0, false, {
      fileName: "app/routes/app.additional.tsx",
      lineNumber: 26,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "app/routes/app.additional.tsx",
      lineNumber: 25,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout.Section, { variant: "oneThird", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(BlockStack, { gap: "200", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { as: "h2", variant: "headingMd", children: "Resources" }, void 0, false, {
        fileName: "app/routes/app.additional.tsx",
        lineNumber: 49,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(List, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(List.Item, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, { url: "https://shopify.dev/docs/apps/design-guidelines/navigation#app-nav", target: "_blank", removeUnderline: true, children: "App nav best practices" }, void 0, false, {
        fileName: "app/routes/app.additional.tsx",
        lineNumber: 54,
        columnNumber: 19
      }, this) }, void 0, false, {
        fileName: "app/routes/app.additional.tsx",
        lineNumber: 53,
        columnNumber: 17
      }, this) }, void 0, false, {
        fileName: "app/routes/app.additional.tsx",
        lineNumber: 52,
        columnNumber: 15
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.additional.tsx",
      lineNumber: 48,
      columnNumber: 13
    }, this) }, void 0, false, {
      fileName: "app/routes/app.additional.tsx",
      lineNumber: 47,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "app/routes/app.additional.tsx",
      lineNumber: 46,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/app.additional.tsx",
    lineNumber: 24,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "app/routes/app.additional.tsx",
    lineNumber: 23,
    columnNumber: 10
  }, this);
}
_c = AdditionalPage;
function Code({
  children
}) {
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Box, { as: "span", padding: "025", paddingInlineStart: "100", paddingInlineEnd: "100", background: "bg-surface-active", borderWidth: "025", borderColor: "border", borderRadius: "100", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("code", { children }, void 0, false, {
    fileName: "app/routes/app.additional.tsx",
    lineNumber: 70,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "app/routes/app.additional.tsx",
    lineNumber: 69,
    columnNumber: 10
  }, this);
}
_c2 = Code;
var _c;
var _c2;
$RefreshReg$(_c, "AdditionalPage");
$RefreshReg$(_c2, "Code");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  AdditionalPage as default
};
//# sourceMappingURL=/assets/routes/app.additional-24NIFFNP.js.map
