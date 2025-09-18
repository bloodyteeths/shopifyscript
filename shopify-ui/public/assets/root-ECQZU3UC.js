import {
  styles_default
} from "/assets/_shared/chunk-Y5NHUDNW.js";
import {
  buildAppUrl,
  useShopContext
} from "/assets/_shared/chunk-JZ5K47FH.js";
import {
  AppProvider
} from "/assets/_shared/chunk-OOADYVQX.js";
import "/assets/_shared/chunk-QDIWRKG7.js";
import {
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration
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

// app/root.tsx
var import_react = __toESM(require_react());
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/root.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/root.tsx"
  );
}
var en = {};
var links = () => [{
  rel: "stylesheet",
  href: styles_default
}];
function App() {
  _s();
  console.log("\u{1F504} App component initializing...");
  let shopContext;
  try {
    shopContext = useShopContext();
    console.log("\u2705 Shop context loaded");
  } catch (error) {
    console.error("\u274C Shop context error:", error);
    shopContext = null;
  }
  const [mobileMenuOpen, setMobileMenuOpen] = (0, import_react.useState)(false);
  import_react.default.useEffect(() => {
    console.log("\u{1F504} Setting up global error handlers...");
    const handleUnhandledRejection = (event) => {
      console.error("\u{1F6A8} Global unhandled promise rejection:", event.reason);
      console.error("\u{1F6A8} Event details:", event);
      event.preventDefault();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("unhandledrejection", handleUnhandledRejection);
      console.log("\u2705 Client-side error handlers registered");
      return () => {
        window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      };
    }
  }, []);
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("html", { lang: "en", children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("head", { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("meta", { charSet: "utf-8" }, void 0, false, {
        fileName: "app/root.tsx",
        lineNumber: 64,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }, void 0, false, {
        fileName: "app/root.tsx",
        lineNumber: 65,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Meta, {}, void 0, false, {
        fileName: "app/root.tsx",
        lineNumber: 66,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Links, {}, void 0, false, {
        fileName: "app/root.tsx",
        lineNumber: 67,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("style", { dangerouslySetInnerHTML: {
        __html: `
            @media (max-width: 768px) {
              .mobile-nav {
                position: fixed;
                top: 0;
                left: ${mobileMenuOpen ? "0" : "-100%"};
                width: 280px;
                height: 100vh;
                z-index: 1000;
                transition: left 0.3s ease;
                box-shadow: 2px 0 10px rgba(0,0,0,0.1);
              }
              .mobile-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 999;
                display: ${mobileMenuOpen ? "block" : "none"};
              }
              .desktop-nav {
                display: none;
              }
              .mobile-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 24px;
                background: #fafbfc;
                border-bottom: 1px solid #e1e3e5;
              }
              .hamburger {
                display: block;
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                padding: 8px;
                border-radius: 4px;
                transition: background-color 0.2s ease;
              }
              .hamburger:hover {
                background-color: #f1f2f3;
              }
              .main-content-mobile {
                padding: 16px !important;
              }
            }
            @media (min-width: 769px) {
              .mobile-nav,
              .mobile-overlay,
              .mobile-header {
                display: none;
              }
              .hamburger {
                display: none;
              }
            }
          `
      } }, void 0, false, {
        fileName: "app/root.tsx",
        lineNumber: 68,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/root.tsx",
      lineNumber: 63,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("body", { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AppProvider, { i18n: en, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "Polaris-Page", style: {
        display: "flex",
        minHeight: "100vh",
        flexDirection: "column"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "mobile-header", children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { className: "hamburger", onClick: () => setMobileMenuOpen(true), "aria-label": "Open navigation menu", children: "\u2630" }, void 0, false, {
            fileName: "app/root.tsx",
            lineNumber: 142,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", { style: {
            fontSize: "18px",
            fontWeight: "bold",
            color: "#202223",
            margin: 0
          }, children: "Ads Autopilot AI" }, void 0, false, {
            fileName: "app/root.tsx",
            lineNumber: 146,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            width: 36
          } }, void 0, false, {
            fileName: "app/root.tsx",
            lineNumber: 154,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/root.tsx",
          lineNumber: 141,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { className: "mobile-overlay", onClick: () => setMobileMenuOpen(false) }, void 0, false, {
          fileName: "app/root.tsx",
          lineNumber: 160,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          display: "flex",
          flex: 1
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("nav", { className: "desktop-nav", style: {
            width: 240,
            padding: 20,
            borderRight: "1px solid var(--p-color-border)",
            background: "#fafbfc"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: {
              marginBottom: 20,
              fontSize: "18px",
              fontWeight: "bold",
              color: "#202223",
              borderBottom: "1px solid #e1e3e5",
              paddingBottom: 12
            }, children: "Ads Autopilot AI" }, void 0, false, {
              fileName: "app/root.tsx",
              lineNumber: 175,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { style: {
              listStyle: "none",
              padding: 0,
              display: "grid",
              gap: 4
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(NavLink, { to: buildAppUrl("/app/", shopContext), style: {
                display: "block",
                padding: "8px 12px",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "500",
                color: "#202223",
                transition: "all 0.2s ease"
              }, children: "Dashboard" }, void 0, false, {
                fileName: "app/root.tsx",
                lineNumber: 194,
                columnNumber: 19
              }, this) }, void 0, false, {
                fileName: "app/root.tsx",
                lineNumber: 193,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(NavLink, { to: buildAppUrl("/app/autopilot", shopContext), style: {
                display: "block",
                padding: "8px 12px",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "500",
                color: "#202223",
                transition: "all 0.2s ease"
              }, children: "Autopilot" }, void 0, false, {
                fileName: "app/root.tsx",
                lineNumber: 209,
                columnNumber: 19
              }, this) }, void 0, false, {
                fileName: "app/root.tsx",
                lineNumber: 208,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(NavLink, { to: buildAppUrl("/app/insights", shopContext), style: {
                display: "block",
                padding: "8px 12px",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "500",
                color: "#202223",
                transition: "all 0.2s ease"
              }, children: "Insights" }, void 0, false, {
                fileName: "app/root.tsx",
                lineNumber: 224,
                columnNumber: 19
              }, this) }, void 0, false, {
                fileName: "app/root.tsx",
                lineNumber: 223,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(NavLink, { to: buildAppUrl("/app/advanced", shopContext), style: {
                display: "block",
                padding: "8px 12px",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "500",
                color: "#202223",
                transition: "all 0.2s ease"
              }, children: "Advanced" }, void 0, false, {
                fileName: "app/root.tsx",
                lineNumber: 239,
                columnNumber: 19
              }, this) }, void 0, false, {
                fileName: "app/root.tsx",
                lineNumber: 238,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { style: {
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid #e1e3e5"
              }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(NavLink, { to: "/app/intent-os", style: {
                display: "block",
                padding: "8px 12px",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "12px",
                fontWeight: "400",
                color: "#6d7175",
                opacity: 0.7
              }, children: [
                "Smart Website",
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
                  fileName: "app/root.tsx",
                  lineNumber: 271,
                  columnNumber: 21
                }, this),
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
                  fontSize: "10px",
                  color: "#8c9196"
                }, children: "Coming Q1 2026" }, void 0, false, {
                  fileName: "app/root.tsx",
                  lineNumber: 272,
                  columnNumber: 21
                }, this)
              ] }, void 0, true, {
                fileName: "app/root.tsx",
                lineNumber: 259,
                columnNumber: 19
              }, this) }, void 0, false, {
                fileName: "app/root.tsx",
                lineNumber: 253,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "app/root.tsx",
              lineNumber: 186,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "app/root.tsx",
            lineNumber: 168,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("nav", { className: "mobile-nav", style: {
            width: 280,
            padding: 20,
            background: "#fafbfc",
            borderRight: "1px solid var(--p-color-border)"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              paddingBottom: 12,
              borderBottom: "1px solid #e1e3e5"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: {
                fontSize: "18px",
                fontWeight: "bold",
                color: "#202223",
                margin: 0
              }, children: "Ads Autopilot AI" }, void 0, false, {
                fileName: "app/root.tsx",
                lineNumber: 299,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: () => setMobileMenuOpen(false), style: {
                background: "none",
                border: "none",
                fontSize: "18px",
                cursor: "pointer",
                padding: "4px 8px",
                borderRadius: "4px",
                color: "#6d7175"
              }, "aria-label": "Close navigation menu", children: "\u2715" }, void 0, false, {
                fileName: "app/root.tsx",
                lineNumber: 308,
                columnNumber: 19
              }, this)
            ] }, void 0, true, {
              fileName: "app/root.tsx",
              lineNumber: 291,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { style: {
              listStyle: "none",
              padding: 0,
              display: "grid",
              gap: 4
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(NavLink, { to: buildAppUrl("/app/", shopContext), onClick: () => setMobileMenuOpen(false), style: {
                display: "block",
                padding: "12px 16px",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "16px",
                fontWeight: "500",
                color: "#202223",
                transition: "all 0.2s ease"
              }, children: "Dashboard" }, void 0, false, {
                fileName: "app/root.tsx",
                lineNumber: 329,
                columnNumber: 21
              }, this) }, void 0, false, {
                fileName: "app/root.tsx",
                lineNumber: 328,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(NavLink, { to: buildAppUrl("/app/autopilot", shopContext), onClick: () => setMobileMenuOpen(false), style: {
                display: "block",
                padding: "12px 16px",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "16px",
                fontWeight: "500",
                color: "#202223",
                transition: "all 0.2s ease"
              }, children: "Autopilot" }, void 0, false, {
                fileName: "app/root.tsx",
                lineNumber: 344,
                columnNumber: 21
              }, this) }, void 0, false, {
                fileName: "app/root.tsx",
                lineNumber: 343,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(NavLink, { to: buildAppUrl("/app/insights", shopContext), onClick: () => setMobileMenuOpen(false), style: {
                display: "block",
                padding: "12px 16px",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "16px",
                fontWeight: "500",
                color: "#202223",
                transition: "all 0.2s ease"
              }, children: "Insights" }, void 0, false, {
                fileName: "app/root.tsx",
                lineNumber: 359,
                columnNumber: 21
              }, this) }, void 0, false, {
                fileName: "app/root.tsx",
                lineNumber: 358,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(NavLink, { to: buildAppUrl("/app/advanced", shopContext), onClick: () => setMobileMenuOpen(false), style: {
                display: "block",
                padding: "12px 16px",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "16px",
                fontWeight: "500",
                color: "#202223",
                transition: "all 0.2s ease"
              }, children: "Advanced" }, void 0, false, {
                fileName: "app/root.tsx",
                lineNumber: 374,
                columnNumber: 21
              }, this) }, void 0, false, {
                fileName: "app/root.tsx",
                lineNumber: 373,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { style: {
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid #e1e3e5"
              }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(NavLink, { to: "/app/intent-os", onClick: () => setMobileMenuOpen(false), style: {
                display: "block",
                padding: "12px 16px",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: "400",
                color: "#6d7175",
                opacity: 0.7
              }, children: [
                "Smart Website",
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
                  fileName: "app/root.tsx",
                  lineNumber: 406,
                  columnNumber: 23
                }, this),
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
                  fontSize: "12px",
                  color: "#8c9196"
                }, children: "Coming Q1 2026" }, void 0, false, {
                  fileName: "app/root.tsx",
                  lineNumber: 407,
                  columnNumber: 23
                }, this)
              ] }, void 0, true, {
                fileName: "app/root.tsx",
                lineNumber: 394,
                columnNumber: 21
              }, this) }, void 0, false, {
                fileName: "app/root.tsx",
                lineNumber: 388,
                columnNumber: 19
              }, this)
            ] }, void 0, true, {
              fileName: "app/root.tsx",
              lineNumber: 321,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "app/root.tsx",
            lineNumber: 284,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("main", { className: "main-content-mobile", style: {
            flex: 1,
            padding: 24,
            display: "flex",
            flexDirection: "column"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              flex: 1
            }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Outlet, {}, void 0, false, {
              fileName: "app/root.tsx",
              lineNumber: 428,
              columnNumber: 17
            }, this) }, void 0, false, {
              fileName: "app/root.tsx",
              lineNumber: 425,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("footer", { style: {
              marginTop: "auto",
              paddingTop: "24px",
              borderTop: "1px solid #e1e3e5",
              textAlign: "center",
              fontSize: "12px",
              color: "#6d7175"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
                marginBottom: "12px"
              }, children: [
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("a", { href: "/privacy", target: "_blank", style: {
                  color: "#006fbb",
                  textDecoration: "none",
                  marginRight: "16px"
                }, children: "Privacy Policy" }, void 0, false, {
                  fileName: "app/root.tsx",
                  lineNumber: 441,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("a", { href: "/terms", target: "_blank", style: {
                  color: "#006fbb",
                  textDecoration: "none",
                  marginRight: "16px"
                }, children: "Terms of Service" }, void 0, false, {
                  fileName: "app/root.tsx",
                  lineNumber: 449,
                  columnNumber: 19
                }, this),
                /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("a", { href: "/support", target: "_blank", style: {
                  color: "#006fbb",
                  textDecoration: "none"
                }, children: "Support" }, void 0, false, {
                  fileName: "app/root.tsx",
                  lineNumber: 457,
                  columnNumber: 19
                }, this)
              ] }, void 0, true, {
                fileName: "app/root.tsx",
                lineNumber: 438,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
                color: "#8c9196",
                fontSize: "11px"
              }, children: [
                "Ads Autopilot AI \xA9 ",
                (/* @__PURE__ */ new Date()).getFullYear(),
                " \u2022 Contact: atanrikulu@e-listele.com"
              ] }, void 0, true, {
                fileName: "app/root.tsx",
                lineNumber: 465,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "app/root.tsx",
              lineNumber: 430,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "app/root.tsx",
            lineNumber: 418,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/root.tsx",
          lineNumber: 163,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/root.tsx",
        lineNumber: 134,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "app/root.tsx",
        lineNumber: 133,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ScrollRestoration, {}, void 0, false, {
        fileName: "app/root.tsx",
        lineNumber: 476,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Scripts, {}, void 0, false, {
        fileName: "app/root.tsx",
        lineNumber: 477,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/root.tsx",
      lineNumber: 132,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/root.tsx",
    lineNumber: 62,
    columnNumber: 10
  }, this);
}
_s(App, "6g4k421onWmxrSFwb6XZAN/TZVY=", false, function() {
  return [useShopContext];
});
_c = App;
function ErrorBoundary() {
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("pre", { style: {
    padding: 16,
    color: "#a00"
  }, children: "Something went wrong. Check the console for details." }, void 0, false, {
    fileName: "app/root.tsx",
    lineNumber: 486,
    columnNumber: 10
  }, this);
}
_c2 = ErrorBoundary;
var _c;
var _c2;
$RefreshReg$(_c, "App");
$RefreshReg$(_c2, "ErrorBoundary");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  ErrorBoundary,
  App as default,
  links
};
//# sourceMappingURL=/assets/root-ECQZU3UC.js.map
