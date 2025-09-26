import {
  buildAppUrl,
  useShopContext
} from "/assets/_shared/chunk-L6URU3LL.js";
import {
  AIStatusIndicator
} from "/assets/_shared/chunk-Y7NM5EKS.js";
import {
  require_subscription
} from "/assets/_shared/chunk-VZJ6BN4E.js";
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
import {
  require_react
} from "/assets/_shared/chunk-HGNQ3YCE.js";
import {
  require_shopify
} from "/assets/_shared/chunk-7OUBBUAS.js";
import {
  createHotContext
} from "/assets/_shared/chunk-GN6N4SDD.js";
import "/assets/_shared/chunk-FK5MLNU6.js";
import {
  __toESM
} from "/assets/_shared/chunk-R6OA4XCD.js";

// app/routes/app._index.tsx
var import_react2 = __toESM(require_react());
var import_node = __toESM(require_node());
var import_shopify = __toESM(require_shopify());
var import_subscription = __toESM(require_subscription());

// app/components/LoadingStates.tsx
var import_react = __toESM(require_react());
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/LoadingStates.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/LoadingStates.tsx"
  );
  import.meta.hot.lastModified = "1758229076684.4536";
}
function LoadingSpinner({
  size = "medium",
  color = "#007bff",
  text = "Loading..."
}) {
  const dimensions = {
    small: 16,
    medium: 24,
    large: 32
  };
  const spinnerSize = dimensions[size];
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "8px"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      width: spinnerSize,
      height: spinnerSize,
      border: `2px solid transparent`,
      borderTop: `2px solid ${color}`,
      borderRadius: "50%",
      animation: "spin 1s linear infinite"
    } }, void 0, false, {
      fileName: "app/components/LoadingStates.tsx",
      lineNumber: 43,
      columnNumber: 7
    }, this),
    text && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
      fontSize: size === "small" ? "12px" : size === "medium" ? "14px" : "16px",
      color: "#6c757d",
      fontWeight: "500"
    }, children: text }, void 0, false, {
      fileName: "app/components/LoadingStates.tsx",
      lineNumber: 51,
      columnNumber: 16
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("style", { dangerouslySetInnerHTML: {
      __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
    } }, void 0, false, {
      fileName: "app/components/LoadingStates.tsx",
      lineNumber: 58,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/LoadingStates.tsx",
    lineNumber: 36,
    columnNumber: 10
  }, this);
}
_c = LoadingSpinner;
function SkeletonText({
  lines = 1,
  width = "100%",
  height = "16px"
}) {
  const skeletonItems = Array.from({
    length: lines
  }, (_, i) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 2s infinite",
    borderRadius: "4px",
    marginBottom: i < lines - 1 ? "8px" : "0"
  } }, i, false, {
    fileName: "app/components/LoadingStates.tsx",
    lineNumber: 78,
    columnNumber: 16
  }, this));
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
    skeletonItems,
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("style", { dangerouslySetInnerHTML: {
      __html: `
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `
    } }, void 0, false, {
      fileName: "app/components/LoadingStates.tsx",
      lineNumber: 89,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/LoadingStates.tsx",
    lineNumber: 87,
    columnNumber: 10
  }, this);
}
_c2 = SkeletonText;
function SkeletonCard() {
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "1.5rem",
    background: "#f8f9fa"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SkeletonText, { width: "60%", height: "20px" }, void 0, false, {
      fileName: "app/components/LoadingStates.tsx",
      lineNumber: 109,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      marginTop: "12px",
      marginBottom: "16px"
    }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(SkeletonText, { lines: 2, width: "90%", height: "14px" }, void 0, false, {
      fileName: "app/components/LoadingStates.tsx",
      lineNumber: 114,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/components/LoadingStates.tsx",
      lineNumber: 110,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      width: "120px",
      height: "40px",
      background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 2s infinite",
      borderRadius: "6px"
    } }, void 0, false, {
      fileName: "app/components/LoadingStates.tsx",
      lineNumber: 116,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("style", { dangerouslySetInnerHTML: {
      __html: `
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `
    } }, void 0, false, {
      fileName: "app/components/LoadingStates.tsx",
      lineNumber: 124,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/LoadingStates.tsx",
    lineNumber: 103,
    columnNumber: 10
  }, this);
}
_c3 = SkeletonCard;
function LoadingOverlay({
  message = "Loading...",
  isVisible = true
}) {
  if (!isVisible)
    return null;
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    flexDirection: "column",
    gap: "16px"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingSpinner, { size: "large", text: "" }, void 0, false, {
      fileName: "app/components/LoadingStates.tsx",
      lineNumber: 156,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      fontSize: "16px",
      color: "#495057",
      fontWeight: "500",
      textAlign: "center"
    }, children: message }, void 0, false, {
      fileName: "app/components/LoadingStates.tsx",
      lineNumber: 157,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/LoadingStates.tsx",
    lineNumber: 142,
    columnNumber: 10
  }, this);
}
_c4 = LoadingOverlay;
function LoadingButton({
  children,
  isLoading = false,
  disabled = false,
  onClick,
  style = {},
  loadingText = "Loading...",
  type = "button",
  ...props
}) {
  const isDisabled = disabled || isLoading;
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { type, onClick, disabled: isDisabled, style: {
    position: "relative",
    cursor: isDisabled ? "not-allowed" : "pointer",
    opacity: isDisabled ? 0.7 : 1,
    ...style
  }, ...props, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
      visibility: isLoading ? "hidden" : "visible"
    }, children }, void 0, false, {
      fileName: "app/components/LoadingStates.tsx",
      lineNumber: 187,
      columnNumber: 7
    }, this),
    isLoading && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      position: "absolute",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      display: "flex",
      alignItems: "center",
      gap: "8px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(LoadingSpinner, { size: "small", text: "" }, void 0, false, {
        fileName: "app/components/LoadingStates.tsx",
        lineNumber: 201,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: loadingText }, void 0, false, {
        fileName: "app/components/LoadingStates.tsx",
        lineNumber: 202,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/LoadingStates.tsx",
      lineNumber: 192,
      columnNumber: 21
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/LoadingStates.tsx",
    lineNumber: 181,
    columnNumber: 10
  }, this);
}
_c5 = LoadingButton;
function Toast({
  message,
  type = "success",
  isVisible = false,
  onClose,
  duration = 4e3
}) {
  _s();
  import_react.default.useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);
  if (!isVisible)
    return null;
  const colors = {
    success: {
      bg: "#d1eddd",
      border: "#28a745",
      text: "#155724"
    },
    error: {
      bg: "#fee",
      border: "#dc3545",
      text: "#721c24"
    },
    warning: {
      bg: "#fff3cd",
      border: "#ffc107",
      text: "#856404"
    },
    info: {
      bg: "#e7f3ff",
      border: "#007bff",
      text: "#004085"
    }
  };
  const colorScheme = colors[type];
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
    position: "fixed",
    top: "20px",
    right: "20px",
    background: colorScheme.bg,
    border: `1px solid ${colorScheme.border}`,
    borderRadius: "8px",
    padding: "12px 16px",
    color: colorScheme.text,
    fontSize: "14px",
    fontWeight: "500",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    zIndex: 1e4,
    maxWidth: "400px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    animation: "slideIn 0.3s ease-out"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: message }, void 0, false, {
      fileName: "app/components/LoadingStates.tsx",
      lineNumber: 269,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: onClose, style: {
      background: "none",
      border: "none",
      color: colorScheme.text,
      cursor: "pointer",
      fontSize: "16px",
      padding: "0",
      opacity: 0.7
    }, onMouseOver: (e) => e.target.style.opacity = "1", onMouseOut: (e) => e.target.style.opacity = "0.7", children: "\u2715" }, void 0, false, {
      fileName: "app/components/LoadingStates.tsx",
      lineNumber: 270,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("style", { dangerouslySetInnerHTML: {
      __html: `
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `
    } }, void 0, false, {
      fileName: "app/components/LoadingStates.tsx",
      lineNumber: 281,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/LoadingStates.tsx",
    lineNumber: 249,
    columnNumber: 10
  }, this);
}
_s(Toast, "OD7bBpZva5O2jO+Puf00hKivP7c=");
_c6 = Toast;
var _c;
var _c2;
var _c3;
var _c4;
var _c5;
var _c6;
$RefreshReg$(_c, "LoadingSpinner");
$RefreshReg$(_c2, "SkeletonText");
$RefreshReg$(_c3, "SkeletonCard");
$RefreshReg$(_c4, "LoadingOverlay");
$RefreshReg$(_c5, "LoadingButton");
$RefreshReg$(_c6, "Toast");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

// app/routes/app._index.tsx
var import_jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/app._index.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s2 = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/app._index.tsx"
  );
  import.meta.hot.lastModified = "1758893513939.8188";
}
function AppIndex() {
  _s2();
  const {
    message,
    timestamp,
    shopName,
    subscriptionInfo,
    planSelectionUrl
  } = useLoaderData();
  const shopContext = useShopContext();
  const [isInitialLoad, setIsInitialLoad] = (0, import_react2.useState)(true);
  const [toast, setToast] = (0, import_react2.useState)({
    message: "",
    type: "success",
    visible: false
  });
  import_react2.default.useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoad(false);
      if (subscriptionInfo?.hasActivePayment || subscriptionInfo?.isInTrial) {
        setToast({
          message: `Welcome back! Your ${subscriptionInfo.subscriptionTier?.toUpperCase()} plan is active.`,
          type: "success",
          visible: true
        });
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [subscriptionInfo]);
  import_react2.default.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const chargeId = urlParams.get("charge_id");
    const isPostSubscription = !!chargeId;
    if (subscriptionInfo?.needsSubscription && planSelectionUrl && !isPostSubscription) {
      console.log("Client-side redirect to plan selection:", planSelectionUrl);
      const redirectMessage = {
        message: "Shopify.API.remoteRedirect",
        data: {
          location: planSelectionUrl
        }
      };
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(JSON.stringify(redirectMessage), "*");
          console.log("PostMessage sent to parent window");
        } else {
          window.top.location.href = planSelectionUrl;
        }
      } catch (error) {
        console.error("Redirect failed:", error);
        alert(`Please visit: ${planSelectionUrl}`);
      }
    } else if (isPostSubscription) {
      console.log(`Post-subscription detected, staying on dashboard (charge_id: ${chargeId})`);
    }
  }, [subscriptionInfo, planSelectionUrl]);
  const renderSubscriptionBanner = () => {
    if (!subscriptionInfo)
      return null;
    if (subscriptionInfo.isInTrial) {
      return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
        background: "#fff3cd",
        border: "1px solid #ffc107",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "24px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h3", { style: {
          margin: "0 0 8px 0",
          fontSize: "16px",
          color: "#856404"
        }, children: [
          "Free Trial Active - ",
          subscriptionInfo.subscriptionTier?.toUpperCase(),
          " Plan"
        ] }, void 0, true, {
          fileName: "app/routes/app._index.tsx",
          lineNumber: 188,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("p", { style: {
          margin: "0",
          fontSize: "14px",
          color: "#856404"
        }, children: [
          subscriptionInfo.trialDaysRemaining,
          " days remaining in your trial"
        ] }, void 0, true, {
          fileName: "app/routes/app._index.tsx",
          lineNumber: 195,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app._index.tsx",
        lineNumber: 181,
        columnNumber: 14
      }, this);
    }
    if (subscriptionInfo.hasActivePayment) {
      return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
        background: "#d1eddd",
        border: "1px solid #28a745",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "24px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h3", { style: {
          margin: "0 0 8px 0",
          fontSize: "16px",
          color: "#155724"
        }, children: [
          subscriptionInfo.subscriptionTier?.toUpperCase(),
          " Plan Active"
        ] }, void 0, true, {
          fileName: "app/routes/app._index.tsx",
          lineNumber: 212,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("p", { style: {
          margin: "0",
          fontSize: "14px",
          color: "#155724"
        }, children: "Full access to all features" }, void 0, false, {
          fileName: "app/routes/app._index.tsx",
          lineNumber: 219,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app._index.tsx",
        lineNumber: 205,
        columnNumber: 14
      }, this);
    }
    return null;
  };
  const renderDataRetentionInfo = () => {
    if (!subscriptionInfo?.subscriptionTier)
      return null;
    const tier = subscriptionInfo.subscriptionTier.toLowerCase();
    const retentionDays = tier === "starter" ? 7 : tier === "professional" ? 30 : 90;
    const upgradeMessage = tier === "starter" ? "Upgrade to Professional for 30-day retention" : tier === "professional" ? "Upgrade to Enterprise for 90-day retention" : null;
    return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      background: tier === "starter" ? "#fff3cd" : tier === "professional" ? "#e7f3ff" : "#f8f9fa",
      border: tier === "starter" ? "1px solid #ffc107" : tier === "professional" ? "1px solid #007bff" : "1px solid #dee2e6",
      borderRadius: "8px",
      padding: "16px",
      marginBottom: "24px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h4", { style: {
          margin: "0 0 4px 0",
          fontSize: "16px",
          color: tier === "starter" ? "#856404" : tier === "professional" ? "#004085" : "#495057"
        }, children: [
          "Data Retention: ",
          retentionDays,
          " days"
        ] }, void 0, true, {
          fileName: "app/routes/app._index.tsx",
          lineNumber: 248,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("p", { style: {
          margin: "0",
          fontSize: "14px",
          color: tier === "starter" ? "#856404" : tier === "professional" ? "#004085" : "#6c757d"
        }, children: [
          "Your ",
          tier.toUpperCase(),
          " plan shows data from the last ",
          retentionDays,
          " days. Older data is automatically filtered."
        ] }, void 0, true, {
          fileName: "app/routes/app._index.tsx",
          lineNumber: 255,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app._index.tsx",
        lineNumber: 247,
        columnNumber: 9
      }, this),
      upgradeMessage && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Link, { to: planSelectionUrl, style: {
        background: "#007bff",
        color: "white",
        padding: "10px 16px",
        textDecoration: "none",
        borderRadius: "6px",
        fontSize: "14px",
        fontWeight: "bold",
        whiteSpace: "nowrap"
      }, children: upgradeMessage }, void 0, false, {
        fileName: "app/routes/app._index.tsx",
        lineNumber: 263,
        columnNumber: 28
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app._index.tsx",
      lineNumber: 237,
      columnNumber: 12
    }, this);
  };
  return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
    padding: "2rem"
  }, children: [
    renderSubscriptionBanner(),
    renderDataRetentionInfo(),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      background: "#e7f3ff",
      border: "1px solid #b3d7ff",
      borderRadius: "8px",
      padding: "16px",
      marginBottom: "24px",
      display: "flex",
      alignItems: "center",
      gap: "12px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
        width: "24px",
        height: "24px",
        background: "#007bff",
        borderRadius: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: "12px",
        fontWeight: "bold"
      }, children: "\u2713" }, void 0, false, {
        fileName: "app/routes/app._index.tsx",
        lineNumber: 293,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h3", { style: {
          margin: "0",
          fontSize: "16px",
          color: "#0066cc"
        }, children: [
          "Connected to ",
          shopName,
          ".myshopify.com"
        ] }, void 0, true, {
          fileName: "app/routes/app._index.tsx",
          lineNumber: 306,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("p", { style: {
          margin: "4px 0 0 0",
          fontSize: "14px",
          color: "#666"
        }, children: "Your shop is automatically detected and configured" }, void 0, false, {
          fileName: "app/routes/app._index.tsx",
          lineNumber: 313,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app._index.tsx",
        lineNumber: 305,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app._index.tsx",
      lineNumber: 283,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h1", { children: "Ads Autopilot AI Dashboard" }, void 0, false, {
      fileName: "app/routes/app._index.tsx",
      lineNumber: 323,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("p", { children: message }, void 0, false, {
      fileName: "app/routes/app._index.tsx",
      lineNumber: 324,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
      gap: "1rem",
      marginTop: "2rem"
    }, children: isInitialLoad ? (
      // Show skeleton loading states
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(import_jsx_dev_runtime2.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(SkeletonCard, {}, void 0, false, {
          fileName: "app/routes/app._index.tsx",
          lineNumber: 335,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(SkeletonCard, {}, void 0, false, {
          fileName: "app/routes/app._index.tsx",
          lineNumber: 336,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(SkeletonCard, {}, void 0, false, {
          fileName: "app/routes/app._index.tsx",
          lineNumber: 337,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(SkeletonCard, {}, void 0, false, {
          fileName: "app/routes/app._index.tsx",
          lineNumber: 338,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(SkeletonCard, {}, void 0, false, {
          fileName: "app/routes/app._index.tsx",
          lineNumber: 339,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app._index.tsx",
        lineNumber: 334,
        columnNumber: 7
      }, this)
    ) : (
      // Show actual content
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(import_jsx_dev_runtime2.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "1.5rem",
          background: "#f8f9fa",
          transition: "transform 0.2s ease, box-shadow 0.2s ease"
        }, onMouseEnter: (e) => {
          e.currentTarget.style.transform = "translateY(-2px)";
          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
        }, onMouseLeave: (e) => {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h3", { children: "Autopilot" }, void 0, false, {
            fileName: "app/routes/app._index.tsx",
            lineNumber: 356,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("p", { children: "Automated campaign management and optimization" }, void 0, false, {
            fileName: "app/routes/app._index.tsx",
            lineNumber: 357,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Link, { to: buildAppUrl("/app/autopilot", shopContext), style: {
            background: "#007bff",
            color: "white",
            padding: "12px 24px",
            textDecoration: "none",
            borderRadius: "6px",
            display: "inline-block",
            fontSize: "16px",
            fontWeight: "bold",
            boxShadow: "0 2px 8px rgba(0, 123, 255, 0.3)",
            transition: "all 0.2s ease"
          }, onMouseEnter: (e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 123, 255, 0.4)";
          }, onMouseLeave: (e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 123, 255, 0.3)";
          }, children: "Open Autopilot" }, void 0, false, {
            fileName: "app/routes/app._index.tsx",
            lineNumber: 358,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app._index.tsx",
          lineNumber: 343,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "1.5rem",
          background: "#f8f9fa"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h3", { children: "Insights" }, void 0, false, {
            fileName: "app/routes/app._index.tsx",
            lineNumber: 386,
            columnNumber: 11
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("p", { children: "Performance analytics and campaign insights" }, void 0, false, {
            fileName: "app/routes/app._index.tsx",
            lineNumber: 387,
            columnNumber: 11
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Link, { to: "/app/insights", style: {
            background: "#28a745",
            color: "white",
            padding: "12px 24px",
            textDecoration: "none",
            borderRadius: "6px",
            display: "inline-block",
            fontSize: "16px",
            fontWeight: "bold",
            boxShadow: "0 2px 8px rgba(40, 167, 69, 0.3)",
            transition: "all 0.2s ease"
          }, children: "View Insights" }, void 0, false, {
            fileName: "app/routes/app._index.tsx",
            lineNumber: 388,
            columnNumber: 11
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app._index.tsx",
          lineNumber: 380,
          columnNumber: 9
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "1.5rem",
          background: "#f8f9fa",
          position: "relative"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h3", { children: "Custom Dashboards" }, void 0, false, {
            fileName: "app/routes/app._index.tsx",
            lineNumber: 411,
            columnNumber: 11
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("p", { children: "Enterprise-exclusive custom analytics dashboards" }, void 0, false, {
            fileName: "app/routes/app._index.tsx",
            lineNumber: 412,
            columnNumber: 11
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
            position: "absolute",
            top: "8px",
            right: "8px",
            background: "#6f42c1",
            color: "white",
            padding: "4px 8px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: "bold"
          }, children: "ENTERPRISE" }, void 0, false, {
            fileName: "app/routes/app._index.tsx",
            lineNumber: 413,
            columnNumber: 11
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Link, { to: "/app/dashboards", style: {
            background: "#6f42c1",
            color: "white",
            padding: "12px 24px",
            textDecoration: "none",
            borderRadius: "6px",
            display: "inline-block",
            fontSize: "16px",
            fontWeight: "bold",
            boxShadow: "0 2px 8px rgba(111, 66, 193, 0.3)",
            transition: "all 0.2s ease"
          }, children: "Custom Dashboards" }, void 0, false, {
            fileName: "app/routes/app._index.tsx",
            lineNumber: 426,
            columnNumber: 11
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app._index.tsx",
          lineNumber: 404,
          columnNumber: 9
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "1.5rem",
          background: "#f8f9fa",
          opacity: 0.7,
          position: "relative"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h3", { children: "Smart Website Features" }, void 0, false, {
            fileName: "app/routes/app._index.tsx",
            lineNumber: 450,
            columnNumber: 11
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("p", { children: "Advanced conversion optimization tools" }, void 0, false, {
            fileName: "app/routes/app._index.tsx",
            lineNumber: 451,
            columnNumber: 11
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
            position: "absolute",
            top: "8px",
            right: "8px",
            background: "#fff3cd",
            color: "#856404",
            padding: "4px 8px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: "bold"
          }, children: "Coming Q1 2026" }, void 0, false, {
            fileName: "app/routes/app._index.tsx",
            lineNumber: 452,
            columnNumber: 11
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Link, { to: "/app/intent-os", style: {
            background: "#6c757d",
            color: "white",
            padding: "10px 20px",
            textDecoration: "none",
            borderRadius: "6px",
            display: "inline-block",
            fontSize: "14px",
            fontWeight: "bold",
            opacity: 0.8,
            transition: "all 0.2s ease"
          }, children: "Preview Features" }, void 0, false, {
            fileName: "app/routes/app._index.tsx",
            lineNumber: 465,
            columnNumber: 11
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app._index.tsx",
          lineNumber: 442,
          columnNumber: 9
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "1.5rem",
          background: "#f8f9fa"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h3", { children: "Advanced" }, void 0, false, {
            fileName: "app/routes/app._index.tsx",
            lineNumber: 487,
            columnNumber: 11
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("p", { children: "Advanced settings and configuration" }, void 0, false, {
            fileName: "app/routes/app._index.tsx",
            lineNumber: 488,
            columnNumber: 11
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Link, { to: "/app/advanced", style: {
            background: "#6c757d",
            color: "white",
            padding: "12px 24px",
            textDecoration: "none",
            borderRadius: "6px",
            display: "inline-block",
            fontSize: "16px",
            fontWeight: "bold",
            boxShadow: "0 2px 8px rgba(108, 117, 125, 0.3)",
            transition: "all 0.2s ease"
          }, children: "Advanced Settings" }, void 0, false, {
            fileName: "app/routes/app._index.tsx",
            lineNumber: 489,
            columnNumber: 11
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app._index.tsx",
          lineNumber: 481,
          columnNumber: 9
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
          border: "1px solid #28a745",
          borderRadius: "8px",
          padding: "1.5rem",
          background: "#f8fff9",
          position: "relative"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
            position: "absolute",
            top: "8px",
            right: "8px"
          }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(AIStatusIndicator, { shopName, compact: true }, void 0, false, {
            fileName: "app/routes/app._index.tsx",
            lineNumber: 517,
            columnNumber: 13
          }, this) }, void 0, false, {
            fileName: "app/routes/app._index.tsx",
            lineNumber: 512,
            columnNumber: 11
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h3", { children: "\u{1F916} AI Dashboard" }, void 0, false, {
            fileName: "app/routes/app._index.tsx",
            lineNumber: 519,
            columnNumber: 11
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("p", { children: "Manage AI-generated content and monitor automation" }, void 0, false, {
            fileName: "app/routes/app._index.tsx",
            lineNumber: 520,
            columnNumber: 11
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Link, { to: "/app/ai-dashboard", style: {
            background: "#28a745",
            color: "white",
            padding: "12px 24px",
            textDecoration: "none",
            borderRadius: "6px",
            display: "inline-block",
            fontSize: "16px",
            fontWeight: "bold",
            boxShadow: "0 2px 8px rgba(40, 167, 69, 0.3)",
            transition: "all 0.2s ease"
          }, children: "Open AI Dashboard" }, void 0, false, {
            fileName: "app/routes/app._index.tsx",
            lineNumber: 521,
            columnNumber: 11
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app._index.tsx",
          lineNumber: 505,
          columnNumber: 9
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app._index.tsx",
        lineNumber: 342,
        columnNumber: 7
      }, this)
    ) }, void 0, false, {
      fileName: "app/routes/app._index.tsx",
      lineNumber: 326,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      marginTop: "2rem",
      padding: "1rem",
      background: "#e9ecef",
      borderRadius: "4px",
      fontSize: "0.9rem",
      color: "#666"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("strong", { children: "Status:" }, void 0, false, {
        fileName: "app/routes/app._index.tsx",
        lineNumber: 547,
        columnNumber: 9
      }, this),
      " Connected to backend \u2022 Last updated:",
      " ",
      new Date(timestamp).toLocaleString()
    ] }, void 0, true, {
      fileName: "app/routes/app._index.tsx",
      lineNumber: 539,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Toast, { message: toast.message, type: toast.type, isVisible: toast.visible, onClose: () => setToast((prev) => ({
      ...prev,
      visible: false
    })) }, void 0, false, {
      fileName: "app/routes/app._index.tsx",
      lineNumber: 552,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/app._index.tsx",
    lineNumber: 277,
    columnNumber: 10
  }, this);
}
_s2(AppIndex, "Aos3id0qnR8f01NNQWX50Pir/4E=", false, function() {
  return [useLoaderData, useShopContext];
});
_c7 = AppIndex;
var _c7;
$RefreshReg$(_c7, "AppIndex");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  AppIndex as default
};
//# sourceMappingURL=/assets/routes/app._index-OZSAWETZ.js.map
