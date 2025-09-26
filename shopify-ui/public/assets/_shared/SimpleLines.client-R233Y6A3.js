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
  import.meta.hot.lastModified = "1758722236206.9429";
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
      height: 280,
      background: "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)",
      border: "1px solid rgba(102, 126, 234, 0.1)",
      borderRadius: 16,
      padding: 16,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#6b7280",
      fontSize: 14,
      fontWeight: "500"
    }, children: "Loading chart..." }, void 0, false, {
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
    ResponsiveContainer,
    Area,
    AreaChart,
    CartesianGrid
  } = R;
  const CustomTooltip = ({
    active,
    payload,
    label
  }) => {
    if (active && payload && payload.length) {
      return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(102, 126, 234, 0.2)",
        borderRadius: 12,
        padding: "12px 16px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
        fontSize: 14,
        fontWeight: "500"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
          margin: "0 0 8px 0",
          color: "#1f2937",
          fontWeight: "600"
        }, children: label }, void 0, false, {
          fileName: "app/components/SimpleLines.client.tsx",
          lineNumber: 83,
          columnNumber: 11
        }, this),
        payload.map((entry, index) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
          margin: "4px 0",
          color: entry.color,
          display: "flex",
          alignItems: "center",
          gap: 8
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: entry.color,
            display: "inline-block"
          } }, void 0, false, {
            fileName: "app/components/SimpleLines.client.tsx",
            lineNumber: 97,
            columnNumber: 15
          }, this),
          entry.dataKey,
          ": ",
          entry.dataKey === "cost" ? `$${entry.value?.toFixed(2)}` : entry.value
        ] }, index, true, {
          fileName: "app/components/SimpleLines.client.tsx",
          lineNumber: 90,
          columnNumber: 42
        }, this))
      ] }, void 0, true, {
        fileName: "app/components/SimpleLines.client.tsx",
        lineNumber: 73,
        columnNumber: 14
      }, this);
    }
    return null;
  };
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
    height: 280,
    background: "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)",
    border: "1px solid rgba(102, 126, 234, 0.1)",
    borderRadius: 16,
    padding: 16
  }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ResponsiveContainer, { width: "100%", height: "100%", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AreaChart, { data, margin: {
    top: 10,
    right: 30,
    left: 0,
    bottom: 0
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("defs", { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("linearGradient", { id: "clicksGradient", x1: "0", y1: "0", x2: "0", y2: "1", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("stop", { offset: "5%", stopColor: "#667eea", stopOpacity: 0.3 }, void 0, false, {
          fileName: "app/components/SimpleLines.client.tsx",
          lineNumber: 126,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("stop", { offset: "95%", stopColor: "#667eea", stopOpacity: 0.05 }, void 0, false, {
          fileName: "app/components/SimpleLines.client.tsx",
          lineNumber: 127,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/SimpleLines.client.tsx",
        lineNumber: 125,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("linearGradient", { id: "costGradient", x1: "0", y1: "0", x2: "0", y2: "1", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("stop", { offset: "5%", stopColor: "#764ba2", stopOpacity: 0.3 }, void 0, false, {
          fileName: "app/components/SimpleLines.client.tsx",
          lineNumber: 130,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("stop", { offset: "95%", stopColor: "#764ba2", stopOpacity: 0.05 }, void 0, false, {
          fileName: "app/components/SimpleLines.client.tsx",
          lineNumber: 131,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/SimpleLines.client.tsx",
        lineNumber: 129,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/SimpleLines.client.tsx",
      lineNumber: 124,
      columnNumber: 11
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CartesianGrid, { strokeDasharray: "3 3", stroke: "rgba(102, 126, 234, 0.1)" }, void 0, false, {
      fileName: "app/components/SimpleLines.client.tsx",
      lineNumber: 134,
      columnNumber: 11
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(XAxis, { dataKey: "t", hide: true, axisLine: false, tickLine: false }, void 0, false, {
      fileName: "app/components/SimpleLines.client.tsx",
      lineNumber: 135,
      columnNumber: 11
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(YAxis, { axisLine: false, tickLine: false, tick: {
      fontSize: 12,
      fill: "#6b7280"
    }, tickFormatter: (value) => value.toFixed(0) }, void 0, false, {
      fileName: "app/components/SimpleLines.client.tsx",
      lineNumber: 136,
      columnNumber: 11
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Tooltip, { content: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CustomTooltip, {}, void 0, false, {
      fileName: "app/components/SimpleLines.client.tsx",
      lineNumber: 140,
      columnNumber: 29
    }, this) }, void 0, false, {
      fileName: "app/components/SimpleLines.client.tsx",
      lineNumber: 140,
      columnNumber: 11
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Area, { type: "monotone", dataKey: "clicks", stroke: "#667eea", strokeWidth: 3, fill: "url(#clicksGradient)", dot: {
      fill: "#667eea",
      strokeWidth: 2,
      r: 4
    }, activeDot: {
      r: 6,
      stroke: "#667eea",
      strokeWidth: 2,
      fill: "#fff"
    } }, void 0, false, {
      fileName: "app/components/SimpleLines.client.tsx",
      lineNumber: 141,
      columnNumber: 11
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Area, { type: "monotone", dataKey: "cost", stroke: "#764ba2", strokeWidth: 3, fill: "url(#costGradient)", dot: {
      fill: "#764ba2",
      strokeWidth: 2,
      r: 4
    }, activeDot: {
      r: 6,
      stroke: "#764ba2",
      strokeWidth: 2,
      fill: "#fff"
    } }, void 0, false, {
      fileName: "app/components/SimpleLines.client.tsx",
      lineNumber: 151,
      columnNumber: 11
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/SimpleLines.client.tsx",
    lineNumber: 118,
    columnNumber: 9
  }, this) }, void 0, false, {
    fileName: "app/components/SimpleLines.client.tsx",
    lineNumber: 117,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "app/components/SimpleLines.client.tsx",
    lineNumber: 110,
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
//# sourceMappingURL=/assets/_shared/SimpleLines.client-R233Y6A3.js.map
