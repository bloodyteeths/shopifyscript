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

// app/components/SimpleLines.client.tsx
var React = __toESM(require_react());
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/SimpleLines.client.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/SimpleLines.client.tsx"
  );
  import.meta.hot.lastModified = "1758229076667.8726";
}
function SimpleLines({
  data
}) {
  _s();
  const [R, setR] = React.useState(null);
  React.useEffect(() => {
    let alive = true;
    import("/assets/_shared/es6-B63KRPQP.js").then((mod) => {
      if (alive)
        setR(mod);
    });
    return () => {
      alive = false;
    };
  }, []);
  if (!R) {
    return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      height: 240,
      border: "1px solid #eee",
      borderRadius: 8,
      padding: 8
    } }, void 0, false, {
      fileName: "app/components/SimpleLines.client.tsx",
      lineNumber: 38,
      columnNumber: 12
    }, this);
  }
  const {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer
  } = R;
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
    height: 240,
    border: "1px solid #eee",
    borderRadius: 8,
    padding: 8
  }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LineChart, { data, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(XAxis, { dataKey: "t", hide: true }, void 0, false, {
      fileName: "app/components/SimpleLines.client.tsx",
      lineNumber: 61,
      columnNumber: 11
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(YAxis, {}, void 0, false, {
      fileName: "app/components/SimpleLines.client.tsx",
      lineNumber: 62,
      columnNumber: 11
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Tooltip, {}, void 0, false, {
      fileName: "app/components/SimpleLines.client.tsx",
      lineNumber: 63,
      columnNumber: 11
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Line, { type: "monotone", dataKey: "clicks" }, void 0, false, {
      fileName: "app/components/SimpleLines.client.tsx",
      lineNumber: 64,
      columnNumber: 11
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Line, { type: "monotone", dataKey: "cost" }, void 0, false, {
      fileName: "app/components/SimpleLines.client.tsx",
      lineNumber: 65,
      columnNumber: 11
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/SimpleLines.client.tsx",
    lineNumber: 60,
    columnNumber: 9
  }, this) }, void 0, false, {
    fileName: "app/components/SimpleLines.client.tsx",
    lineNumber: 59,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "app/components/SimpleLines.client.tsx",
    lineNumber: 53,
    columnNumber: 10
  }, this);
}
_s(SimpleLines, "PjUXd1yBHeoWZ2omZYXgfY+X5cw=");
_c = SimpleLines;
var _c;
$RefreshReg$(_c, "SimpleLines");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  SimpleLines as default
};
//# sourceMappingURL=/assets/_shared/SimpleLines.client-ME5MMAXN.js.map
