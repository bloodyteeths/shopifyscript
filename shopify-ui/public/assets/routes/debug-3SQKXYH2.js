import {
  require_node
} from "/assets/_shared/chunk-5LF5TODQ.js";
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

// app/routes/debug.tsx
var import_node = __toESM(require_node());
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/debug.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/debug.tsx"
  );
  import.meta.hot.lastModified = "1755872727817.0015";
}
function Debug() {
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: "Debug route - check logs for environment info" }, void 0, false, {
    fileName: "app/routes/debug.tsx",
    lineNumber: 35,
    columnNumber: 10
  }, this);
}
_c = Debug;
var _c;
$RefreshReg$(_c, "Debug");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  Debug as default
};
//# sourceMappingURL=/assets/routes/debug-3SQKXYH2.js.map
