import {
  require_shopify
} from "/assets/_shared/chunk-7OUBBUAS.js";
import {
  require_node
} from "/assets/_shared/chunk-5LF5TODQ.js";
import {
  Form,
  Link,
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigation,
  useRevalidator
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

// app/routes/app.reports.tsx
var import_react = __toESM(require_react());
var import_node = __toESM(require_node());
var import_shopify = __toESM(require_shopify());
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/app.reports.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/app.reports.tsx"
  );
  import.meta.hot.lastModified = "1758301061295.5935";
}
function ReportsPage() {
  _s();
  const {
    settings,
    history,
    schedulerStatus,
    tenant,
    error
  } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const generateFetcher = useFetcher();
  const [testEmail, setTestEmail] = (0, import_react.useState)("");
  const [generateEmail, setGenerateEmail] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    const interval = setInterval(() => {
      revalidator.revalidate();
    }, 3e4);
    return () => clearInterval(interval);
  }, [revalidator]);
  const isLoading = navigation.state === "loading" || navigation.state === "submitting";
  const tierColors = {
    starter: "#28a745",
    professional: "#007bff",
    enterprise: "#ffc107"
  };
  if (error) {
    return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      padding: "20px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        background: "#f8d7da",
        color: "#721c24",
        padding: "15px",
        borderRadius: "4px",
        marginBottom: "20px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Error:" }, void 0, false, {
          fileName: "app/routes/app.reports.tsx",
          lineNumber: 221,
          columnNumber: 11
        }, this),
        " ",
        error
      ] }, void 0, true, {
        fileName: "app/routes/app.reports.tsx",
        lineNumber: 214,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, { to: "/app", style: {
        color: "#007bff",
        textDecoration: "none"
      }, children: "\u2190 Back to Dashboard" }, void 0, false, {
        fileName: "app/routes/app.reports.tsx",
        lineNumber: 223,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.reports.tsx",
      lineNumber: 211,
      columnNumber: 12
    }, this);
  }
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
    padding: "20px",
    maxWidth: "1200px"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      marginBottom: "30px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", { children: "Automated Reports" }, void 0, false, {
        fileName: "app/routes/app.reports.tsx",
        lineNumber: 238,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
        color: "#666",
        marginBottom: "20px"
      }, children: "Manage your automated insights reports and delivery settings" }, void 0, false, {
        fileName: "app/routes/app.reports.tsx",
        lineNumber: 239,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "inline-block",
        background: tierColors[settings.tier] || "#6c757d",
        color: "white",
        padding: "4px 12px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: "600",
        textTransform: "uppercase",
        marginBottom: "20px"
      }, children: [
        settings.tier,
        " Plan"
      ] }, void 0, true, {
        fileName: "app/routes/app.reports.tsx",
        lineNumber: 247,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.reports.tsx",
      lineNumber: 235,
      columnNumber: 7
    }, this),
    actionData && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      background: actionData.success ? "#d4edda" : "#f8d7da",
      color: actionData.success ? "#155724" : "#721c24",
      padding: "15px",
      borderRadius: "4px",
      marginBottom: "20px",
      border: `1px solid ${actionData.success ? "#c3e6cb" : "#f5c6cb"}`
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: actionData.success ? "Success:" : "Error:" }, void 0, false, {
        fileName: "app/routes/app.reports.tsx",
        lineNumber: 271,
        columnNumber: 11
      }, this),
      " ",
      actionData.message
    ] }, void 0, true, {
      fileName: "app/routes/app.reports.tsx",
      lineNumber: 263,
      columnNumber: 22
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "30px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          background: "white",
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "20px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { style: {
            marginTop: 0,
            marginBottom: "15px"
          }, children: "Report Settings" }, void 0, false, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 289,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            marginBottom: "15px"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Current Frequency:" }, void 0, false, {
              fileName: "app/routes/app.reports.tsx",
              lineNumber: 297,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
              background: "#e9ecef",
              padding: "2px 8px",
              borderRadius: "4px",
              marginLeft: "8px",
              textTransform: "capitalize"
            }, children: settings.frequency?.current || "Not set" }, void 0, false, {
              fileName: "app/routes/app.reports.tsx",
              lineNumber: 298,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 294,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            marginBottom: "15px"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Next Scheduled:" }, void 0, false, {
              fileName: "app/routes/app.reports.tsx",
              lineNumber: 312,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
              marginLeft: "8px",
              color: "#666"
            }, children: settings.frequency?.nextScheduled ? new Date(settings.frequency.nextScheduled).toLocaleString() : "Not scheduled" }, void 0, false, {
              fileName: "app/routes/app.reports.tsx",
              lineNumber: 313,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 309,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            marginBottom: "15px"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Available Features:" }, void 0, false, {
              fileName: "app/routes/app.reports.tsx",
              lineNumber: 324,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              marginTop: "8px"
            }, children: settings.features && Object.entries(settings.features).map(([key, value]) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              marginBottom: "4px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
                color: value ? "#28a745" : "#dc3545",
                marginRight: "8px"
              }, children: value ? "\u2713" : "\u2717" }, void 0, false, {
                fileName: "app/routes/app.reports.tsx",
                lineNumber: 331,
                columnNumber: 21
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
                textTransform: "capitalize"
              }, children: key.replace(/([A-Z])/g, " $1").toLowerCase() }, void 0, false, {
                fileName: "app/routes/app.reports.tsx",
                lineNumber: 337,
                columnNumber: 21
              }, this)
            ] }, key, true, {
              fileName: "app/routes/app.reports.tsx",
              lineNumber: 328,
              columnNumber: 95
            }, this)) }, void 0, false, {
              fileName: "app/routes/app.reports.tsx",
              lineNumber: 325,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 321,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.reports.tsx",
          lineNumber: 282,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          background: "white",
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "20px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { style: {
            marginTop: 0,
            marginBottom: "15px"
          }, children: "Generate Report Now" }, void 0, false, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 355,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Form, { method: "post", children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "hidden", name: "action", value: "generate" }, void 0, false, {
              fileName: "app/routes/app.reports.tsx",
              lineNumber: 361,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              marginBottom: "15px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
                display: "block",
                marginBottom: "5px",
                fontWeight: "500"
              }, children: "Report Type:" }, void 0, false, {
                fileName: "app/routes/app.reports.tsx",
                lineNumber: 366,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("select", { name: "reportType", style: {
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px"
              }, children: [
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "insights", children: "Insights Report" }, void 0, false, {
                  fileName: "app/routes/app.reports.tsx",
                  lineNumber: 379,
                  columnNumber: 19
                }, this),
                settings.reportTypes?.custom && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "custom", children: "Custom Report" }, void 0, false, {
                  fileName: "app/routes/app.reports.tsx",
                  lineNumber: 380,
                  columnNumber: 52
                }, this)
              ] }, void 0, true, {
                fileName: "app/routes/app.reports.tsx",
                lineNumber: 373,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "app/routes/app.reports.tsx",
              lineNumber: 363,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              marginBottom: "15px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
                display: "block",
                marginBottom: "5px",
                fontWeight: "500"
              }, children: "Email Address:" }, void 0, false, {
                fileName: "app/routes/app.reports.tsx",
                lineNumber: 387,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "email", name: "email", value: generateEmail, onChange: (e) => setGenerateEmail(e.target.value), placeholder: "your@email.com", style: {
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px"
              } }, void 0, false, {
                fileName: "app/routes/app.reports.tsx",
                lineNumber: 394,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "app/routes/app.reports.tsx",
              lineNumber: 384,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { type: "submit", disabled: isLoading, style: {
              background: "#007bff",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "4px",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.6 : 1
            }, children: isLoading ? "Generating..." : "Generate & Send Report" }, void 0, false, {
              fileName: "app/routes/app.reports.tsx",
              lineNumber: 402,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 360,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.reports.tsx",
          lineNumber: 348,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          background: "white",
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "20px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { style: {
            marginTop: 0,
            marginBottom: "15px"
          }, children: "Test Email Delivery" }, void 0, false, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 423,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
            color: "#666",
            marginBottom: "15px",
            fontSize: "14px"
          }, children: "Send a test report to verify email delivery is working properly." }, void 0, false, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 427,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Form, { method: "post", children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "hidden", name: "action", value: "test" }, void 0, false, {
              fileName: "app/routes/app.reports.tsx",
              lineNumber: 436,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              marginBottom: "15px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
                display: "block",
                marginBottom: "5px",
                fontWeight: "500"
              }, children: "Test Email Address:" }, void 0, false, {
                fileName: "app/routes/app.reports.tsx",
                lineNumber: 441,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "email", name: "email", value: testEmail, onChange: (e) => setTestEmail(e.target.value), placeholder: "test@email.com", required: true, style: {
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px"
              } }, void 0, false, {
                fileName: "app/routes/app.reports.tsx",
                lineNumber: 448,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "app/routes/app.reports.tsx",
              lineNumber: 438,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { type: "submit", disabled: isLoading || !testEmail, style: {
              background: "#28a745",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "4px",
              cursor: isLoading || !testEmail ? "not-allowed" : "pointer",
              opacity: isLoading || !testEmail ? 0.6 : 1
            }, children: isLoading ? "Sending..." : "Send Test Report" }, void 0, false, {
              fileName: "app/routes/app.reports.tsx",
              lineNumber: 456,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 435,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.reports.tsx",
          lineNumber: 417,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.reports.tsx",
        lineNumber: 280,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          background: "white",
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "20px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { style: {
            marginTop: 0,
            marginBottom: "15px"
          }, children: "Scheduler Status" }, void 0, false, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 481,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            marginBottom: "10px"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Status:" }, void 0, false, {
              fileName: "app/routes/app.reports.tsx",
              lineNumber: 489,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
              color: schedulerStatus.status === "running" ? "#28a745" : "#dc3545",
              marginLeft: "8px",
              fontWeight: "500"
            }, children: schedulerStatus.status === "running" ? "Active" : "Inactive" }, void 0, false, {
              fileName: "app/routes/app.reports.tsx",
              lineNumber: 490,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 486,
            columnNumber: 13
          }, this),
          schedulerStatus.metrics && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              marginBottom: "5px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Reports Generated:" }, void 0, false, {
                fileName: "app/routes/app.reports.tsx",
                lineNumber: 503,
                columnNumber: 19
              }, this),
              " ",
              schedulerStatus.metrics.reportsGenerated || 0
            ] }, void 0, true, {
              fileName: "app/routes/app.reports.tsx",
              lineNumber: 500,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              marginBottom: "5px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Emails Sent:" }, void 0, false, {
                fileName: "app/routes/app.reports.tsx",
                lineNumber: 508,
                columnNumber: 19
              }, this),
              " ",
              schedulerStatus.metrics.emailsSent || 0
            ] }, void 0, true, {
              fileName: "app/routes/app.reports.tsx",
              lineNumber: 505,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              marginBottom: "5px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Last Execution:" }, void 0, false, {
                fileName: "app/routes/app.reports.tsx",
                lineNumber: 513,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
                marginLeft: "4px",
                fontSize: "14px",
                color: "#666"
              }, children: schedulerStatus.metrics.lastExecution ? new Date(schedulerStatus.metrics.lastExecution).toLocaleString() : "Never" }, void 0, false, {
                fileName: "app/routes/app.reports.tsx",
                lineNumber: 514,
                columnNumber: 19
              }, this)
            ] }, void 0, true, {
              fileName: "app/routes/app.reports.tsx",
              lineNumber: 510,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 499,
            columnNumber: 41
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.reports.tsx",
          lineNumber: 474,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          background: "white",
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "20px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { style: {
            marginTop: 0,
            marginBottom: "15px"
          }, children: "Recent Reports" }, void 0, false, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 532,
            columnNumber: 13
          }, this),
          history.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
            color: "#666",
            fontStyle: "italic"
          }, children: "No reports generated yet" }, void 0, false, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 537,
            columnNumber: 37
          }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: history.map((report) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            border: "1px solid #eee",
            borderRadius: "4px",
            padding: "12px",
            marginBottom: "10px",
            background: "#f8f9fa"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "8px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
                fontWeight: "500",
                textTransform: "capitalize"
              }, children: [
                report.type,
                " Report"
              ] }, void 0, true, {
                fileName: "app/routes/app.reports.tsx",
                lineNumber: 554,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
                background: report.status === "completed" ? "#d4edda" : "#f8d7da",
                color: report.status === "completed" ? "#155724" : "#721c24",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "12px",
                textTransform: "capitalize"
              }, children: report.status }, void 0, false, {
                fileName: "app/routes/app.reports.tsx",
                lineNumber: 560,
                columnNumber: 23
              }, this)
            ] }, void 0, true, {
              fileName: "app/routes/app.reports.tsx",
              lineNumber: 548,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              fontSize: "14px",
              color: "#666"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
                "Generated: ",
                new Date(report.generatedAt).toLocaleString()
              ] }, void 0, true, {
                fileName: "app/routes/app.reports.tsx",
                lineNumber: 576,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
                "Generation Time: ",
                report.generationTime,
                "ms"
              ] }, void 0, true, {
                fileName: "app/routes/app.reports.tsx",
                lineNumber: 577,
                columnNumber: 23
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
                "Email: ",
                report.emailSent ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
                  color: "#28a745"
                }, children: "\u2713 Sent" }, void 0, false, {
                  fileName: "app/routes/app.reports.tsx",
                  lineNumber: 579,
                  columnNumber: 52
                }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
                  color: "#dc3545"
                }, children: "\u2717 Failed" }, void 0, false, {
                  fileName: "app/routes/app.reports.tsx",
                  lineNumber: 581,
                  columnNumber: 38
                }, this)
              ] }, void 0, true, {
                fileName: "app/routes/app.reports.tsx",
                lineNumber: 578,
                columnNumber: 23
              }, this)
            ] }, void 0, true, {
              fileName: "app/routes/app.reports.tsx",
              lineNumber: 572,
              columnNumber: 21
            }, this)
          ] }, report.id, true, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 541,
            columnNumber: 40
          }, this)) }, void 0, false, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 540,
            columnNumber: 45
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.reports.tsx",
          lineNumber: 526,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.reports.tsx",
        lineNumber: 472,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.reports.tsx",
      lineNumber: 274,
      columnNumber: 7
    }, this),
    settings.tier === "starter" && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
      padding: "20px",
      borderRadius: "8px",
      marginTop: "30px",
      textAlign: "center"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: {
        marginTop: 0
      }, children: "Upgrade to Professional" }, void 0, false, {
        fileName: "app/routes/app.reports.tsx",
        lineNumber: 601,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
        marginBottom: "15px"
      }, children: "Get weekly reports, real-time analytics, and advanced ROAS tracking" }, void 0, false, {
        fileName: "app/routes/app.reports.tsx",
        lineNumber: 604,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, { to: "/app/billing", style: {
        background: "white",
        color: "#667eea",
        padding: "10px 24px",
        borderRadius: "4px",
        textDecoration: "none",
        fontWeight: "500",
        display: "inline-block"
      }, children: "Upgrade Now" }, void 0, false, {
        fileName: "app/routes/app.reports.tsx",
        lineNumber: 609,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.reports.tsx",
      lineNumber: 593,
      columnNumber: 39
    }, this),
    settings.tier === "enterprise" && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      background: "white",
      border: "1px solid #ddd",
      borderRadius: "8px",
      padding: "20px",
      marginTop: "30px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { style: {
        marginTop: 0,
        marginBottom: "15px"
      }, children: "Enterprise Custom Reports" }, void 0, false, {
        fileName: "app/routes/app.reports.tsx",
        lineNumber: 630,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
        color: "#666",
        marginBottom: "15px"
      }, children: "Create custom reports with advanced analytics and forecasting" }, void 0, false, {
        fileName: "app/routes/app.reports.tsx",
        lineNumber: 634,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "15px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          border: "1px solid #eee",
          padding: "15px",
          borderRadius: "4px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", { style: {
            marginTop: 0,
            marginBottom: "8px"
          }, children: "Executive Summary" }, void 0, false, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 651,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
            fontSize: "14px",
            color: "#666",
            marginBottom: "10px"
          }, children: "High-level KPIs and strategic insights" }, void 0, false, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 655,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { style: {
            background: "#ffc107",
            color: "#212529",
            border: "none",
            padding: "6px 12px",
            borderRadius: "4px",
            fontSize: "12px",
            cursor: "pointer"
          }, children: "Generate" }, void 0, false, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 662,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.reports.tsx",
          lineNumber: 646,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          border: "1px solid #eee",
          padding: "15px",
          borderRadius: "4px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", { style: {
            marginTop: 0,
            marginBottom: "8px"
          }, children: "Customer Lifecycle" }, void 0, false, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 680,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
            fontSize: "14px",
            color: "#666",
            marginBottom: "10px"
          }, children: "Detailed customer journey and lifetime value analysis" }, void 0, false, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 684,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { style: {
            background: "#ffc107",
            color: "#212529",
            border: "none",
            padding: "6px 12px",
            borderRadius: "4px",
            fontSize: "12px",
            cursor: "pointer"
          }, children: "Generate" }, void 0, false, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 691,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.reports.tsx",
          lineNumber: 675,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          border: "1px solid #eee",
          padding: "15px",
          borderRadius: "4px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", { style: {
            marginTop: 0,
            marginBottom: "8px"
          }, children: "Performance Benchmarks" }, void 0, false, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 709,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
            fontSize: "14px",
            color: "#666",
            marginBottom: "10px"
          }, children: "Compare performance against industry benchmarks" }, void 0, false, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 713,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { style: {
            background: "#ffc107",
            color: "#212529",
            border: "none",
            padding: "6px 12px",
            borderRadius: "4px",
            fontSize: "12px",
            cursor: "pointer"
          }, children: "Generate" }, void 0, false, {
            fileName: "app/routes/app.reports.tsx",
            lineNumber: 720,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.reports.tsx",
          lineNumber: 704,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.reports.tsx",
        lineNumber: 641,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.reports.tsx",
      lineNumber: 623,
      columnNumber: 42
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      marginTop: "30px",
      textAlign: "center"
    }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Link, { to: "/app", style: {
      color: "#007bff",
      textDecoration: "none",
      fontSize: "14px"
    }, children: "\u2190 Back to Dashboard" }, void 0, false, {
      fileName: "app/routes/app.reports.tsx",
      lineNumber: 740,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/routes/app.reports.tsx",
      lineNumber: 736,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/app.reports.tsx",
    lineNumber: 231,
    columnNumber: 10
  }, this);
}
_s(ReportsPage, "cxsBu1951qNMFROuFGLtbYEBUp4=", false, function() {
  return [useLoaderData, useActionData, useNavigation, useRevalidator, useFetcher];
});
_c = ReportsPage;
function ErrorBoundary({
  error
}) {
  console.error("Reports page error:", error);
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
    padding: "2rem",
    background: "#fee",
    border: "1px solid #fcc"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { children: "Reports Error" }, void 0, false, {
      fileName: "app/routes/app.reports.tsx",
      lineNumber: 763,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: [
      "Something went wrong with the reports page: ",
      error?.message
    ] }, void 0, true, {
      fileName: "app/routes/app.reports.tsx",
      lineNumber: 764,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/app.reports.tsx",
    lineNumber: 758,
    columnNumber: 10
  }, this);
}
_c2 = ErrorBoundary;
var _c;
var _c2;
$RefreshReg$(_c, "ReportsPage");
$RefreshReg$(_c2, "ErrorBoundary");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  ErrorBoundary,
  ReportsPage as default
};
//# sourceMappingURL=/assets/routes/app.reports-HPRSHSXJ.js.map
