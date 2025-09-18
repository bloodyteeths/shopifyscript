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

// app/components/ShopSetupTest.tsx
var React4 = __toESM(require_react());

// app/components/ShopSetupBanner.tsx
var React = __toESM(require_react());

// app/utils/shop-config.ts
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/utils/shop-config.ts"
  );
  import.meta.hot.lastModified = "1756026742243.1958";
}
var SHOP_NAME_KEY = "proofkit_shop_name";
function getStoredShopName() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return localStorage.getItem(SHOP_NAME_KEY);
  } catch (error) {
    console.warn("Failed to read shop name from localStorage:", error);
    return null;
  }
}
function setStoredShopName(shopName) {
  if (typeof window === "undefined") {
    return;
  }
  if (!validateShopName(shopName)) {
    throw new Error("Invalid shop name provided");
  }
  try {
    localStorage.setItem(SHOP_NAME_KEY, shopName);
    localStorage.setItem(`${SHOP_NAME_KEY}_user_set`, "true");
    try {
      const maxAge = 60 * 60 * 24 * 365;
      document.cookie = `${SHOP_NAME_KEY}=${encodeURIComponent(shopName)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
      document.cookie = `${SHOP_NAME_KEY}_user_set=true; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
    } catch (e) {
    }
  } catch (error) {
    console.warn("Failed to store shop name in localStorage:", error);
  }
}
function validateShopName(shopName) {
  if (!shopName || typeof shopName !== "string") {
    return false;
  }
  const trimmed = shopName.trim();
  const validPattern = /^[a-zA-Z0-9][a-zA-Z0-9\-_]{1,63}$/;
  return validPattern.test(trimmed);
}
function getShopNameOrNull() {
  const stored = getStoredShopName();
  if (stored && validateShopName(stored)) {
    return stored;
  }
  return null;
}
function getShopNameOrDefault() {
  const stored = getStoredShopName();
  if (stored && validateShopName(stored)) {
    return stored;
  }
  return process.env.TENANT_ID || "proofkit";
}
function clearStoredShopName() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.removeItem(SHOP_NAME_KEY);
    localStorage.removeItem(`${SHOP_NAME_KEY}_user_set`);
    try {
      document.cookie = `${SHOP_NAME_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
      document.cookie = `${SHOP_NAME_KEY}_user_set=; Path=/; Max-Age=0; SameSite=Lax`;
    } catch (e) {
    }
  } catch (error) {
    console.warn("Failed to clear shop name from localStorage:", error);
  }
}
function isShopSetupNeeded() {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const setupDismissed = sessionStorage.getItem("proofkit_setup_dismissed");
    if (setupDismissed === "true") {
      return false;
    }
  } catch (e) {
  }
  const storedShopName = getStoredShopName();
  if (!storedShopName || !validateShopName(storedShopName)) {
    return true;
  }
  const defaultTenant = process.env.TENANT_ID || "proofkit";
  if (storedShopName === defaultTenant && !localStorage.getItem(`${SHOP_NAME_KEY}_user_set`)) {
    return true;
  }
  return false;
}
function dismissShopSetupForSession() {
  try {
    sessionStorage.setItem("proofkit_setup_dismissed", "true");
  } catch (e) {
  }
}

// app/components/ShopSetupBanner.tsx
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/ShopSetupBanner.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/ShopSetupBanner.tsx"
  );
  import.meta.hot.lastModified = "1758228999288.5623";
}
function ShopSetupBanner({
  onSetupComplete,
  showOnlyIfNeeded = true,
  allowDismiss = true
}) {
  _s();
  const [shopName, setShopName] = React.useState("");
  const [isVisible, setIsVisible] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [showSuccess, setShowSuccess] = React.useState(false);
  React.useEffect(() => {
    const needsSetup = isShopSetupNeeded();
    if (showOnlyIfNeeded) {
      setIsVisible(needsSetup);
    } else {
      setIsVisible(true);
    }
    if (needsSetup) {
      setShopName("");
    } else {
      const currentShopName = getShopNameOrDefault();
      setShopName(currentShopName);
    }
  }, [showOnlyIfNeeded]);
  const handleSave = async () => {
    setError("");
    setIsLoading(true);
    try {
      const trimmedShopName = shopName.trim();
      if (!trimmedShopName) {
        setError("Please enter your shop name");
        return;
      }
      if (!validateShopName(trimmedShopName)) {
        setError("Shop name must be 2-64 characters, alphanumeric with hyphens/underscores allowed");
        return;
      }
      setStoredShopName(trimmedShopName);
      setShowSuccess(true);
      onSetupComplete?.(trimmedShopName);
      setTimeout(() => {
        setIsVisible(false);
      }, 2e3);
    } catch (err) {
      setError("Failed to save shop name. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSave();
    }
  };
  const handleDismiss = () => {
    dismissShopSetupForSession();
    setIsVisible(false);
  };
  if (!isVisible) {
    return null;
  }
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
    backgroundColor: "#e7f3ff",
    border: "2px solid #007bff",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 4px 12px rgba(0, 123, 255, 0.15)",
    position: "relative"
  }, children: [
    allowDismiss && !showSuccess && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: handleDismiss, style: {
      position: "absolute",
      top: "12px",
      right: "12px",
      background: "transparent",
      border: "none",
      color: "#007bff",
      fontSize: "24px",
      cursor: "pointer",
      padding: "4px",
      borderRadius: "4px",
      lineHeight: "1",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "32px",
      height: "32px",
      transition: "background-color 0.2s ease"
    }, onMouseEnter: (e) => e.currentTarget.style.backgroundColor = "#f8f9fa", onMouseLeave: (e) => e.currentTarget.style.backgroundColor = "transparent", title: "Skip setup for now", children: "\xD7" }, void 0, false, {
      fileName: "app/components/ShopSetupBanner.tsx",
      lineNumber: 106,
      columnNumber: 40
    }, this),
    showSuccess ? (
      // Success State
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        textAlign: "center",
        color: "#155724"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          fontSize: "48px",
          marginBottom: "12px"
        }, children: "Success" }, void 0, false, {
          fileName: "app/components/ShopSetupBanner.tsx",
          lineNumber: 134,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: {
          fontSize: "24px",
          fontWeight: "bold",
          marginBottom: "8px",
          color: "#155724"
        }, children: "Setup Complete!" }, void 0, false, {
          fileName: "app/components/ShopSetupBanner.tsx",
          lineNumber: 140,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
          fontSize: "16px",
          color: "#155724",
          margin: "0"
        }, children: [
          "ProofKit is now configured for:",
          " ",
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: [
            shopName,
            ".myshopify.com"
          ] }, void 0, true, {
            fileName: "app/components/ShopSetupBanner.tsx",
            lineNumber: 154,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/ShopSetupBanner.tsx",
          lineNumber: 148,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/ShopSetupBanner.tsx",
        lineNumber: 130,
        columnNumber: 5
      }, this)
    ) : (
      // Setup Form
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          display: "flex",
          alignItems: "flex-start",
          gap: "20px",
          marginBottom: "20px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            fontSize: "48px",
            lineHeight: "1"
          }, children: "Store" }, void 0, false, {
            fileName: "app/components/ShopSetupBanner.tsx",
            lineNumber: 165,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            flex: 1
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { style: {
              fontSize: "24px",
              fontWeight: "bold",
              color: "#0c5460",
              marginBottom: "8px",
              margin: "0 0 8px 0"
            }, children: "Connect Your Shopify Store" }, void 0, false, {
              fileName: "app/components/ShopSetupBanner.tsx",
              lineNumber: 174,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
              fontSize: "16px",
              color: "#0c5460",
              marginBottom: "16px",
              lineHeight: "1.5",
              margin: "0"
            }, children: "Enter your Shopify store name to set up ProofKit automation and tracking." }, void 0, false, {
              fileName: "app/components/ShopSetupBanner.tsx",
              lineNumber: 183,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "app/components/ShopSetupBanner.tsx",
            lineNumber: 171,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/ShopSetupBanner.tsx",
          lineNumber: 159,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          border: "1px solid #b8daff"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "16px"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
              display: "flex",
              alignItems: "center",
              flex: 1,
              maxWidth: "400px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "text", value: shopName, onChange: (e) => setShopName(e.target.value), onKeyPress: handleKeyPress, placeholder: "your-shop-name", disabled: isLoading, style: {
                padding: "12px 16px",
                fontSize: "16px",
                border: error ? "2px solid #dc3545" : "2px solid #007bff",
                borderRadius: "6px 0 0 6px",
                flex: 1,
                outline: "none",
                fontFamily: "monospace",
                backgroundColor: isLoading ? "#f8f9fa" : "white"
              }, autoFocus: true }, void 0, false, {
                fileName: "app/components/ShopSetupBanner.tsx",
                lineNumber: 214,
                columnNumber: 17
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
                padding: "12px 16px",
                backgroundColor: "#f8f9fa",
                border: error ? "2px solid #dc3545" : "2px solid #007bff",
                borderLeft: "none",
                borderRadius: "0 6px 6px 0",
                fontSize: "16px",
                color: "#666",
                fontFamily: "monospace",
                whiteSpace: "nowrap"
              }, children: ".myshopify.com" }, void 0, false, {
                fileName: "app/components/ShopSetupBanner.tsx",
                lineNumber: 224,
                columnNumber: 17
              }, this)
            ] }, void 0, true, {
              fileName: "app/components/ShopSetupBanner.tsx",
              lineNumber: 208,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: handleSave, disabled: isLoading || !shopName.trim(), style: {
              padding: "12px 24px",
              backgroundColor: isLoading || !shopName.trim() ? "#6c757d" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: isLoading || !shopName.trim() ? "not-allowed" : "pointer",
              opacity: isLoading || !shopName.trim() ? 0.7 : 1,
              transition: "all 0.2s ease",
              boxShadow: isLoading || !shopName.trim() ? "none" : "0 2px 8px rgba(40, 167, 69, 0.3)"
            }, children: isLoading ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: "Saving..." }, void 0, false, {
              fileName: "app/components/ShopSetupBanner.tsx",
              lineNumber: 252,
              columnNumber: 30
            }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: "Save & Continue" }, void 0, false, {
              fileName: "app/components/ShopSetupBanner.tsx",
              lineNumber: 252,
              columnNumber: 47
            }, this) }, void 0, false, {
              fileName: "app/components/ShopSetupBanner.tsx",
              lineNumber: 239,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "app/components/ShopSetupBanner.tsx",
            lineNumber: 202,
            columnNumber: 13
          }, this),
          error && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            color: "#721c24",
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: "6px",
            padding: "12px 16px",
            fontSize: "14px",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: "Warning" }, void 0, false, {
              fileName: "app/components/ShopSetupBanner.tsx",
              lineNumber: 268,
              columnNumber: 17
            }, this),
            error
          ] }, void 0, true, {
            fileName: "app/components/ShopSetupBanner.tsx",
            lineNumber: 256,
            columnNumber: 23
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            fontSize: "14px",
            color: "#495057",
            lineHeight: "1.4"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Examples:" }, void 0, false, {
              fileName: "app/components/ShopSetupBanner.tsx",
              lineNumber: 277,
              columnNumber: 15
            }, this),
            ' "proofkit", "my-store", "awesome-shop"',
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
              fileName: "app/components/ShopSetupBanner.tsx",
              lineNumber: 278,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Note:" }, void 0, false, {
              fileName: "app/components/ShopSetupBanner.tsx",
              lineNumber: 279,
              columnNumber: 15
            }, this),
            ' Enter only the part before ".myshopify.com"'
          ] }, void 0, true, {
            fileName: "app/components/ShopSetupBanner.tsx",
            lineNumber: 272,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/ShopSetupBanner.tsx",
          lineNumber: 196,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          marginTop: "16px",
          padding: "16px",
          backgroundColor: "#fff3cd",
          borderRadius: "6px",
          border: "1px solid #ffeaa7"
        }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          display: "flex",
          alignItems: "flex-start",
          gap: "12px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
            fontSize: "20px"
          }, children: "Info" }, void 0, false, {
            fileName: "app/components/ShopSetupBanner.tsx",
            lineNumber: 295,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            fontSize: "14px",
            color: "#856404",
            lineHeight: "1.4"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Why do we need this?" }, void 0, false, {
              fileName: "app/components/ShopSetupBanner.tsx",
              lineNumber: 303,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
              fileName: "app/components/ShopSetupBanner.tsx",
              lineNumber: 304,
              columnNumber: 17
            }, this),
            "ProofKit uses your shop name to:",
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { style: {
              margin: "8px 0 0 0",
              paddingLeft: "20px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Generate personalized Google Ads scripts" }, void 0, false, {
                fileName: "app/components/ShopSetupBanner.tsx",
                lineNumber: 310,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Track your store's performance data" }, void 0, false, {
                fileName: "app/components/ShopSetupBanner.tsx",
                lineNumber: 311,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Ensure proper tenant isolation for multi-store setups" }, void 0, false, {
                fileName: "app/components/ShopSetupBanner.tsx",
                lineNumber: 312,
                columnNumber: 19
              }, this)
            ] }, void 0, true, {
              fileName: "app/components/ShopSetupBanner.tsx",
              lineNumber: 306,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "app/components/ShopSetupBanner.tsx",
            lineNumber: 298,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/ShopSetupBanner.tsx",
          lineNumber: 290,
          columnNumber: 13
        }, this) }, void 0, false, {
          fileName: "app/components/ShopSetupBanner.tsx",
          lineNumber: 283,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/ShopSetupBanner.tsx",
        lineNumber: 158,
        columnNumber: 5
      }, this)
    )
  ] }, void 0, true, {
    fileName: "app/components/ShopSetupBanner.tsx",
    lineNumber: 96,
    columnNumber: 10
  }, this);
}
_s(ShopSetupBanner, "CQhYMGlWns3HO/f5YtPkkGktMpY=");
_c = ShopSetupBanner;
var ShopSetupBanner_default = ShopSetupBanner;
var _c;
$RefreshReg$(_c, "ShopSetupBanner");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

// app/components/ShopConfig.tsx
var React2 = __toESM(require_react());
var import_jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/ShopConfig.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s2 = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/ShopConfig.tsx"
  );
  import.meta.hot.lastModified = "1758229065804.905";
}
function ShopConfig({
  showInline = false,
  onShopNameChange
}) {
  _s2();
  const [shopName, setShopName] = React2.useState("");
  const [isEditing, setIsEditing] = React2.useState(false);
  const [error, setError] = React2.useState("");
  const [success, setSuccess] = React2.useState("");
  React2.useEffect(() => {
    const currentShopName = getShopNameOrNull() || getShopNameOrDefault();
    setShopName(currentShopName);
    try {
      const defaultShop = process.env.TENANT_ID || "proofkit";
      if (currentShopName && currentShopName !== defaultShop) {
        const url = new URL(window.location.href);
        if (url.searchParams.get("shop") !== currentShopName) {
          url.searchParams.set("shop", currentShopName);
          window.history.replaceState({}, "", url.toString());
        }
      }
    } catch {
    }
  }, []);
  const handleSave = () => {
    setError("");
    setSuccess("");
    if (!validateShopName(shopName)) {
      setError("Shop name must be 2-64 characters, alphanumeric with hyphens/underscores allowed");
      return;
    }
    try {
      setStoredShopName(shopName);
      dismissShopSetupForSession();
      setSuccess("Shop name saved successfully!");
      setIsEditing(false);
      onShopNameChange?.(shopName);
      setTimeout(() => setSuccess(""), 3e3);
    } catch (err) {
      setError("Failed to save shop name. Please try again.");
    }
  };
  const handleCancel = () => {
    const currentShopName = getShopNameOrNull() || getShopNameOrDefault();
    setShopName(currentShopName);
    setIsEditing(false);
    setError("");
  };
  const handleClear = () => {
    clearStoredShopName();
    const defaultShopName = getShopNameOrDefault();
    setShopName(defaultShopName);
    setSuccess("Shop name cleared, using default");
    onShopNameChange?.(defaultShopName);
    setTimeout(() => setSuccess(""), 3e3);
  };
  if (showInline) {
    return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontSize: "14px",
      padding: "8px 12px",
      backgroundColor: "#f8f9fa",
      borderRadius: "6px",
      border: "1px solid #e1e5e9"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("span", { style: {
        fontWeight: "bold",
        color: "#495057"
      }, children: "Shop:" }, void 0, false, {
        fileName: "app/components/ShopConfig.tsx",
        lineNumber: 93,
        columnNumber: 9
      }, this),
      isEditing ? /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(import_jsx_dev_runtime2.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
          display: "flex",
          alignItems: "center"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("input", { type: "text", value: shopName, onChange: (e) => setShopName(e.target.value), onKeyPress: (e) => e.key === "Enter" && handleSave(), style: {
            padding: "4px 8px",
            border: error ? "1px solid #dc3545" : "1px solid #007bff",
            borderRadius: "4px 0 0 4px",
            fontSize: "14px",
            width: "120px",
            fontFamily: "monospace",
            outline: "none"
          }, placeholder: "shop-name", autoFocus: true }, void 0, false, {
            fileName: "app/components/ShopConfig.tsx",
            lineNumber: 102,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("span", { style: {
            padding: "4px 8px",
            backgroundColor: "#e9ecef",
            border: error ? "1px solid #dc3545" : "1px solid #007bff",
            borderLeft: "none",
            borderRadius: "0 4px 4px 0",
            fontSize: "14px",
            color: "#666",
            fontFamily: "monospace"
          }, children: ".myshopify.com" }, void 0, false, {
            fileName: "app/components/ShopConfig.tsx",
            lineNumber: 111,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/ShopConfig.tsx",
          lineNumber: 98,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("button", { onClick: handleSave, style: {
          padding: "4px 8px",
          background: "#28a745",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "12px",
          fontWeight: "bold"
        }, children: "\u2713" }, void 0, false, {
          fileName: "app/components/ShopConfig.tsx",
          lineNumber: 124,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("button", { onClick: handleCancel, style: {
          padding: "4px 8px",
          background: "#6c757d",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "12px"
        }, children: "\u2715" }, void 0, false, {
          fileName: "app/components/ShopConfig.tsx",
          lineNumber: 136,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/ShopConfig.tsx",
        lineNumber: 97,
        columnNumber: 22
      }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(import_jsx_dev_runtime2.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("strong", { style: {
          color: "#007bff",
          fontFamily: "monospace"
        }, children: [
          shopName,
          ".myshopify.com"
        ] }, void 0, true, {
          fileName: "app/components/ShopConfig.tsx",
          lineNumber: 148,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("button", { onClick: () => setIsEditing(true), style: {
          padding: "2px 6px",
          background: "transparent",
          border: "1px solid #007bff",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "12px",
          color: "#007bff"
        }, children: "Edit" }, void 0, false, {
          fileName: "app/components/ShopConfig.tsx",
          lineNumber: 154,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/ShopConfig.tsx",
        lineNumber: 147,
        columnNumber: 17
      }, this),
      error && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("span", { style: {
        color: "#dc3545",
        fontSize: "12px",
        backgroundColor: "#f8d7da",
        padding: "2px 6px",
        borderRadius: "4px",
        border: "1px solid #f5c6cb"
      }, children: error }, void 0, false, {
        fileName: "app/components/ShopConfig.tsx",
        lineNumber: 166,
        columnNumber: 19
      }, this),
      success && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("span", { style: {
        color: "#155724",
        fontSize: "12px",
        backgroundColor: "#d4edda",
        padding: "2px 6px",
        borderRadius: "4px",
        border: "1px solid #c3e6cb"
      }, children: success }, void 0, false, {
        fileName: "app/components/ShopConfig.tsx",
        lineNumber: 176,
        columnNumber: 21
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/ShopConfig.tsx",
      lineNumber: 83,
      columnNumber: 12
    }, this);
  }
  return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
    border: "1px solid #e1e5e9",
    borderRadius: "8px",
    padding: "16px",
    backgroundColor: "#f8f9fa",
    marginBottom: "16px"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("h3", { style: {
      fontSize: "16px",
      fontWeight: "bold",
      marginBottom: "8px",
      color: "#333"
    }, children: "Shop Configuration" }, void 0, false, {
      fileName: "app/components/ShopConfig.tsx",
      lineNumber: 195,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("p", { style: {
      fontSize: "14px",
      color: "#666",
      marginBottom: "12px"
    }, children: "Set your shop name to ensure proper tenant identification for all ProofKit features." }, void 0, false, {
      fileName: "app/components/ShopConfig.tsx",
      lineNumber: 203,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      marginBottom: "12px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("label", { style: {
        display: "block",
        fontWeight: "bold",
        marginBottom: "8px",
        fontSize: "16px",
        color: "#495057"
      }, children: "Shopify Store URL" }, void 0, false, {
        fileName: "app/components/ShopConfig.tsx",
        lineNumber: 215,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
        display: "flex",
        flexDirection: "column",
        gap: "12px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
          display: "flex",
          alignItems: "center",
          maxWidth: "500px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("input", { type: "text", value: shopName, onChange: (e) => setShopName(e.target.value), onKeyPress: (e) => e.key === "Enter" && handleSave(), style: {
            padding: "12px 16px",
            border: error ? "2px solid #dc3545" : "2px solid #007bff",
            borderRadius: "6px 0 0 6px",
            fontSize: "16px",
            flex: 1,
            fontFamily: "monospace",
            outline: "none",
            backgroundColor: "white"
          }, placeholder: "your-shop-name" }, void 0, false, {
            fileName: "app/components/ShopConfig.tsx",
            lineNumber: 234,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
            padding: "12px 16px",
            backgroundColor: "#f8f9fa",
            border: error ? "2px solid #dc3545" : "2px solid #007bff",
            borderLeft: "none",
            borderRadius: "0 6px 6px 0",
            fontSize: "16px",
            color: "#666",
            fontFamily: "monospace",
            whiteSpace: "nowrap"
          }, children: ".myshopify.com" }, void 0, false, {
            fileName: "app/components/ShopConfig.tsx",
            lineNumber: 244,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/ShopConfig.tsx",
          lineNumber: 229,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
          display: "flex",
          gap: "12px",
          flexWrap: "wrap"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("button", { onClick: handleSave, style: {
            padding: "12px 24px",
            background: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold",
            boxShadow: "0 2px 8px rgba(40, 167, 69, 0.3)",
            transition: "all 0.2s ease"
          }, children: "\u{1F4BE} Save Shop Name" }, void 0, false, {
            fileName: "app/components/ShopConfig.tsx",
            lineNumber: 264,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("button", { onClick: handleClear, style: {
            padding: "12px 24px",
            background: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold"
          }, children: "Reset to Default" }, void 0, false, {
            fileName: "app/components/ShopConfig.tsx",
            lineNumber: 278,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/ShopConfig.tsx",
          lineNumber: 259,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
          fontSize: "14px",
          color: "#6c757d",
          backgroundColor: "#f8f9fa",
          padding: "12px",
          borderRadius: "6px",
          border: "1px solid #e9ecef"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("strong", { children: "Examples:" }, void 0, false, {
            fileName: "app/components/ShopConfig.tsx",
            lineNumber: 300,
            columnNumber: 13
          }, this),
          ' "proofkit", "my-store", "awesome-shop"',
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("br", {}, void 0, false, {
            fileName: "app/components/ShopConfig.tsx",
            lineNumber: 301,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("strong", { children: "Note:" }, void 0, false, {
            fileName: "app/components/ShopConfig.tsx",
            lineNumber: 302,
            columnNumber: 13
          }, this),
          ' Enter only the part before ".myshopify.com"'
        ] }, void 0, true, {
          fileName: "app/components/ShopConfig.tsx",
          lineNumber: 292,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/ShopConfig.tsx",
        lineNumber: 224,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/ShopConfig.tsx",
      lineNumber: 212,
      columnNumber: 7
    }, this),
    error && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      color: "#721c24",
      backgroundColor: "#f8d7da",
      border: "1px solid #f5c6cb",
      borderRadius: "4px",
      padding: "8px 12px",
      fontSize: "14px",
      marginBottom: "8px"
    }, children: error }, void 0, false, {
      fileName: "app/components/ShopConfig.tsx",
      lineNumber: 307,
      columnNumber: 17
    }, this),
    success && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      color: "#155724",
      backgroundColor: "#d4edda",
      border: "1px solid #c3e6cb",
      borderRadius: "4px",
      padding: "8px 12px",
      fontSize: "14px",
      marginBottom: "8px"
    }, children: success }, void 0, false, {
      fileName: "app/components/ShopConfig.tsx",
      lineNumber: 319,
      columnNumber: 19
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
      fontSize: "12px",
      color: "#666",
      fontStyle: "italic"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("strong", { children: "Note:" }, void 0, false, {
        fileName: "app/components/ShopConfig.tsx",
        lineNumber: 336,
        columnNumber: 9
      }, this),
      ' This shop name will be used for all API calls and data isolation. Use your Shopify shop name without ".myshopify.com" (e.g., "proofkit" for "proofkit.myshopify.com").'
    ] }, void 0, true, {
      fileName: "app/components/ShopConfig.tsx",
      lineNumber: 331,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/ShopConfig.tsx",
    lineNumber: 188,
    columnNumber: 10
  }, this);
}
_s2(ShopConfig, "C/pNfBNskjC+CbpKrMEnzeGhl3I=");
_c2 = ShopConfig;
var ShopConfig_default = ShopConfig;
var _c2;
$RefreshReg$(_c2, "ShopConfig");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

// app/components/ShopNameInput.tsx
var React3 = __toESM(require_react());
var import_jsx_dev_runtime3 = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/ShopNameInput.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s3 = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/ShopNameInput.tsx"
  );
  import.meta.hot.lastModified = "1755791240228.7102";
}
function ShopNameInput({
  value,
  onChange,
  onSave,
  placeholder = "your-shop-name",
  disabled = false,
  error,
  size = "medium",
  showLabel = true,
  autoFocus = false
}) {
  _s3();
  const [localError, setLocalError] = React3.useState("");
  const [isValid, setIsValid] = React3.useState(true);
  React3.useEffect(() => {
    if (value.trim()) {
      const valid = validateShopName(value.trim());
      setIsValid(valid);
      if (!valid) {
        setLocalError("Must be 2-64 characters, alphanumeric with hyphens/underscores allowed");
      } else {
        setLocalError("");
      }
    } else {
      setIsValid(true);
      setLocalError("");
    }
  }, [value]);
  const handleKeyPress = (e) => {
    if (e.key === "Enter" && onSave && isValid && value.trim()) {
      onSave();
    }
  };
  const displayError = error || localError;
  const hasError = Boolean(displayError);
  const sizeConfig = {
    small: {
      fontSize: "14px",
      padding: "6px 10px",
      height: "32px"
    },
    medium: {
      fontSize: "16px",
      padding: "12px 16px",
      height: "44px"
    },
    large: {
      fontSize: "18px",
      padding: "16px 20px",
      height: "52px"
    }
  };
  const config = sizeConfig[size];
  return /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  }, children: [
    showLabel && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("label", { style: {
      fontSize: size === "large" ? "18px" : size === "small" ? "14px" : "16px",
      fontWeight: "bold",
      color: "#495057",
      marginBottom: "4px"
    }, children: "Shopify Store URL" }, void 0, false, {
      fileName: "app/components/ShopNameInput.tsx",
      lineNumber: 86,
      columnNumber: 21
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
      display: "flex",
      alignItems: "stretch",
      maxWidth: size === "large" ? "600px" : size === "small" ? "320px" : "500px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("input", { type: "text", value, onChange: (e) => onChange(e.target.value), onKeyPress: handleKeyPress, placeholder, disabled, autoFocus, style: {
        ...config,
        border: hasError ? "2px solid #dc3545" : isValid && value.trim() ? "2px solid #28a745" : "2px solid #007bff",
        borderRadius: "6px 0 0 6px",
        flex: 1,
        fontFamily: "monospace",
        outline: "none",
        backgroundColor: disabled ? "#f8f9fa" : "white",
        color: disabled ? "#6c757d" : "#495057",
        transition: "border-color 0.2s ease"
      } }, void 0, false, {
        fileName: "app/components/ShopNameInput.tsx",
        lineNumber: 100,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
        ...config,
        backgroundColor: disabled ? "#e9ecef" : "#f8f9fa",
        border: hasError ? "2px solid #dc3545" : isValid && value.trim() ? "2px solid #28a745" : "2px solid #007bff",
        borderLeft: "none",
        borderRadius: "0 6px 6px 0",
        color: disabled ? "#adb5bd" : "#6c757d",
        fontFamily: "monospace",
        whiteSpace: "nowrap",
        display: "flex",
        alignItems: "center"
      }, children: ".myshopify.com" }, void 0, false, {
        fileName: "app/components/ShopNameInput.tsx",
        lineNumber: 112,
        columnNumber: 9
      }, this),
      value.trim() && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
        display: "flex",
        alignItems: "center",
        paddingLeft: "8px",
        fontSize: size === "large" ? "20px" : "16px"
      }, children: isValid ? /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("span", { style: {
        color: "#28a745"
      }, children: "\u2713" }, void 0, false, {
        fileName: "app/components/ShopNameInput.tsx",
        lineNumber: 134,
        columnNumber: 24
      }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("span", { style: {
        color: "#dc3545"
      }, children: "\u2717" }, void 0, false, {
        fileName: "app/components/ShopNameInput.tsx",
        lineNumber: 136,
        columnNumber: 23
      }, this) }, void 0, false, {
        fileName: "app/components/ShopNameInput.tsx",
        lineNumber: 128,
        columnNumber: 26
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/ShopNameInput.tsx",
      lineNumber: 95,
      columnNumber: 7
    }, this),
    displayError && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
      color: "#721c24",
      backgroundColor: "#f8d7da",
      border: "1px solid #f5c6cb",
      borderRadius: "4px",
      padding: size === "large" ? "8px 12px" : "6px 10px",
      fontSize: size === "large" ? "14px" : "13px",
      display: "flex",
      alignItems: "center",
      gap: "6px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("span", { children: "\u26A0\uFE0F" }, void 0, false, {
        fileName: "app/components/ShopNameInput.tsx",
        lineNumber: 154,
        columnNumber: 11
      }, this),
      displayError
    ] }, void 0, true, {
      fileName: "app/components/ShopNameInput.tsx",
      lineNumber: 143,
      columnNumber: 24
    }, this),
    !displayError && value.trim() && isValid && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
      color: "#155724",
      fontSize: size === "large" ? "14px" : "13px",
      display: "flex",
      alignItems: "center",
      gap: "6px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("span", { children: "\u2713" }, void 0, false, {
        fileName: "app/components/ShopNameInput.tsx",
        lineNumber: 166,
        columnNumber: 11
      }, this),
      "Valid shop name: ",
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("strong", { children: [
        value,
        ".myshopify.com"
      ] }, void 0, true, {
        fileName: "app/components/ShopNameInput.tsx",
        lineNumber: 167,
        columnNumber: 28
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/ShopNameInput.tsx",
      lineNumber: 159,
      columnNumber: 52
    }, this),
    !value.trim() && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
      fontSize: size === "large" ? "14px" : "13px",
      color: "#6c757d",
      fontStyle: "italic"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("strong", { children: "Examples:" }, void 0, false, {
        fileName: "app/components/ShopNameInput.tsx",
        lineNumber: 176,
        columnNumber: 11
      }, this),
      ' "proofkit", "my-store", "awesome-shop"'
    ] }, void 0, true, {
      fileName: "app/components/ShopNameInput.tsx",
      lineNumber: 171,
      columnNumber: 25
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/ShopNameInput.tsx",
    lineNumber: 81,
    columnNumber: 10
  }, this);
}
_s3(ShopNameInput, "fVZTvWdZuQYCCHCWALvoxo3S6H4=");
_c3 = ShopNameInput;
var ShopNameInput_default = ShopNameInput;
var _c3;
$RefreshReg$(_c3, "ShopNameInput");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

// app/components/ShopSetupTest.tsx
var import_jsx_dev_runtime4 = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/ShopSetupTest.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s4 = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/ShopSetupTest.tsx"
  );
  import.meta.hot.lastModified = "1758229076674.7446";
}
function ShopSetupTest() {
  _s4();
  const [testMode, setTestMode] = React4.useState("banner");
  const [shopName, setShopName] = React4.useState("");
  const [status, setStatus] = React4.useState({
    stored: null,
    current: "proofkit",
    needsSetup: true
  });
  const refreshStatus = React4.useCallback(() => {
    setStatus({
      stored: getStoredShopName(),
      current: getShopNameOrNull(),
      needsSetup: isShopSetupNeeded()
    });
  }, []);
  React4.useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);
  const handleClearStorage = () => {
    clearStoredShopName();
    refreshStatus();
    setShopName("");
  };
  const testCases = [{
    name: "Valid Names",
    values: ["proofkit", "my-store", "test123", "awesome_shop"]
  }, {
    name: "Invalid Names",
    values: ["", "a", "shop name", "shop@name", "-invalid", "toolongshopnamethatexceeds64charactersandshouldbeinvalidaccordingtorules"]
  }];
  return /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
    padding: "20px",
    maxWidth: "800px"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("h2", { children: "\u{1F9EA} Shop Setup Components Test" }, void 0, false, {
      fileName: "app/components/ShopSetupTest.tsx",
      lineNumber: 64,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
      backgroundColor: "#f8f9fa",
      padding: "16px",
      borderRadius: "8px",
      marginBottom: "20px",
      border: "1px solid #e1e5e9"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("h3", { children: "Current Status" }, void 0, false, {
        fileName: "app/components/ShopSetupTest.tsx",
        lineNumber: 74,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
        fontFamily: "monospace",
        fontSize: "14px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { children: [
          "Stored Shop Name: ",
          /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("strong", { children: status.stored || "null" }, void 0, false, {
            fileName: "app/components/ShopSetupTest.tsx",
            lineNumber: 80,
            columnNumber: 31
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/ShopSetupTest.tsx",
          lineNumber: 79,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { children: [
          "Current Shop Name: ",
          /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("strong", { children: status.current }, void 0, false, {
            fileName: "app/components/ShopSetupTest.tsx",
            lineNumber: 83,
            columnNumber: 32
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/ShopSetupTest.tsx",
          lineNumber: 82,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { children: [
          "Setup Needed:",
          " ",
          /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("strong", { style: {
            color: status.needsSetup ? "#dc3545" : "#28a745"
          }, children: status.needsSetup ? "YES" : "NO" }, void 0, false, {
            fileName: "app/components/ShopSetupTest.tsx",
            lineNumber: 87,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/ShopSetupTest.tsx",
          lineNumber: 85,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/ShopSetupTest.tsx",
        lineNumber: 75,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("button", { onClick: handleClearStorage, style: {
        marginTop: "12px",
        padding: "8px 16px",
        backgroundColor: "#dc3545",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer"
      }, children: "Clear Storage (Reset Test)" }, void 0, false, {
        fileName: "app/components/ShopSetupTest.tsx",
        lineNumber: 94,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("button", { onClick: refreshStatus, style: {
        marginTop: "12px",
        marginLeft: "8px",
        padding: "8px 16px",
        backgroundColor: "#007bff",
        color: "white",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer"
      }, children: "Refresh Status" }, void 0, false, {
        fileName: "app/components/ShopSetupTest.tsx",
        lineNumber: 105,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/ShopSetupTest.tsx",
      lineNumber: 67,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
      marginBottom: "20px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("label", { style: {
        display: "block",
        fontWeight: "bold",
        marginBottom: "8px"
      }, children: "Select Component to Test:" }, void 0, false, {
        fileName: "app/components/ShopSetupTest.tsx",
        lineNumber: 123,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
        display: "flex",
        gap: "12px"
      }, children: [{
        key: "banner",
        label: "\u{1F3EA} Setup Banner"
      }, {
        key: "config",
        label: "Shop Config"
      }, {
        key: "input",
        label: "Name Input"
      }].map(({
        key,
        label
      }) => /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("label", { style: {
        display: "flex",
        alignItems: "center",
        gap: "4px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("input", { type: "radio", name: "testMode", value: key, checked: testMode === key, onChange: (e) => setTestMode(e.target.value) }, void 0, false, {
          fileName: "app/components/ShopSetupTest.tsx",
          lineNumber: 151,
          columnNumber: 15
        }, this),
        label
      ] }, key, true, {
        fileName: "app/components/ShopSetupTest.tsx",
        lineNumber: 146,
        columnNumber: 15
      }, this)) }, void 0, false, {
        fileName: "app/components/ShopSetupTest.tsx",
        lineNumber: 130,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/ShopSetupTest.tsx",
      lineNumber: 120,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
      border: "2px solid #007bff",
      borderRadius: "8px",
      padding: "20px",
      marginBottom: "20px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("h3", { children: "Component Preview" }, void 0, false, {
        fileName: "app/components/ShopSetupTest.tsx",
        lineNumber: 164,
        columnNumber: 9
      }, this),
      testMode === "banner" && /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)(ShopSetupBanner_default, { onSetupComplete: (name) => {
        console.log("Setup completed:", name);
        refreshStatus();
      }, showOnlyIfNeeded: false }, void 0, false, {
        fileName: "app/components/ShopSetupTest.tsx",
        lineNumber: 165,
        columnNumber: 35
      }, this),
      testMode === "config" && /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)(ShopConfig_default, { showInline: false, onShopNameChange: (name) => {
        console.log("Shop name changed:", name);
        refreshStatus();
      } }, void 0, false, {
        fileName: "app/components/ShopSetupTest.tsx",
        lineNumber: 170,
        columnNumber: 35
      }, this),
      testMode === "input" && /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)(ShopNameInput_default, { value: shopName, onChange: setShopName, onSave: () => {
          console.log("Save requested:", shopName);
        }, size: "medium", autoFocus: false }, void 0, false, {
          fileName: "app/components/ShopSetupTest.tsx",
          lineNumber: 176,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("button", { onClick: () => console.log("Manual save:", shopName), style: {
          marginTop: "12px",
          padding: "8px 16px",
          backgroundColor: "#28a745",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer"
        }, children: "Test Save" }, void 0, false, {
          fileName: "app/components/ShopSetupTest.tsx",
          lineNumber: 179,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/ShopSetupTest.tsx",
        lineNumber: 175,
        columnNumber: 34
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/ShopSetupTest.tsx",
      lineNumber: 158,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
      backgroundColor: "#fff3cd",
      padding: "16px",
      borderRadius: "8px",
      border: "1px solid #ffeaa7"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("h3", { children: "Validation Testing" }, void 0, false, {
        fileName: "app/components/ShopSetupTest.tsx",
        lineNumber: 200,
        columnNumber: 9
      }, this),
      testCases.map(({
        name,
        values
      }) => /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
        marginBottom: "16px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("h4", { children: [
          name,
          ":"
        ] }, void 0, true, {
          fileName: "app/components/ShopSetupTest.tsx",
          lineNumber: 207,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "8px"
        }, children: values.map((value) => {
          const isValid = validateShopName(value);
          return /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
            padding: "8px 12px",
            backgroundColor: isValid ? "#d4edda" : "#f8d7da",
            border: `1px solid ${isValid ? "#c3e6cb" : "#f5c6cb"}`,
            borderRadius: "4px",
            fontSize: "14px",
            fontFamily: "monospace"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { children: [
              '"',
              value,
              '"'
            ] }, void 0, true, {
              fileName: "app/components/ShopSetupTest.tsx",
              lineNumber: 223,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
              fontSize: "12px",
              marginTop: "4px"
            }, children: isValid ? "Valid" : "Invalid" }, void 0, false, {
              fileName: "app/components/ShopSetupTest.tsx",
              lineNumber: 224,
              columnNumber: 21
            }, this)
          ] }, value, true, {
            fileName: "app/components/ShopSetupTest.tsx",
            lineNumber: 215,
            columnNumber: 20
          }, this);
        }) }, void 0, false, {
          fileName: "app/components/ShopSetupTest.tsx",
          lineNumber: 208,
          columnNumber: 13
        }, this)
      ] }, name, true, {
        fileName: "app/components/ShopSetupTest.tsx",
        lineNumber: 204,
        columnNumber: 13
      }, this))
    ] }, void 0, true, {
      fileName: "app/components/ShopSetupTest.tsx",
      lineNumber: 194,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/ShopSetupTest.tsx",
    lineNumber: 60,
    columnNumber: 10
  }, this);
}
_s4(ShopSetupTest, "81mvkxlEUzejKyGseR6g+X9bSA0=");
_c4 = ShopSetupTest;
var ShopSetupTest_default = ShopSetupTest;
var _c4;
$RefreshReg$(_c4, "ShopSetupTest");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

// app/routes/app.test-shop-setup.tsx
var import_jsx_dev_runtime5 = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/app.test-shop-setup.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/app.test-shop-setup.tsx"
  );
  import.meta.hot.lastModified = "1755791240378.8628";
}
function TestShopSetup() {
  return /* @__PURE__ */ (0, import_jsx_dev_runtime5.jsxDEV)(ShopSetupTest_default, {}, void 0, false, {
    fileName: "app/routes/app.test-shop-setup.tsx",
    lineNumber: 23,
    columnNumber: 10
  }, this);
}
_c5 = TestShopSetup;
var _c5;
$RefreshReg$(_c5, "TestShopSetup");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  TestShopSetup as default
};
//# sourceMappingURL=/assets/routes/app.test-shop-setup-GKTFHR6H.js.map
