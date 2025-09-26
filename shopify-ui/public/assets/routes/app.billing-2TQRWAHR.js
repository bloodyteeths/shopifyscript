import {
  require_node
} from "/assets/_shared/chunk-5LF5TODQ.js";
import {
  useActionData,
  useLoaderData,
  useNavigation
} from "/assets/_shared/chunk-TM4UYSIH.js";
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

// app/routes/app.billing.tsx
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
    window.$RefreshRuntime$.register(type, '"app/routes/app.billing.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/app.billing.tsx"
  );
  import.meta.hot.lastModified = "1758301114753.5508";
}
function Billing() {
  _s();
  const {
    shopName,
    hasActivePayment,
    currentSubscription,
    subscriptionTier,
    isInTrial,
    trialDaysRemaining,
    pricingTiers,
    appHandle,
    shouldRedirectToPlans
  } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  import_react.default.useEffect(() => {
    if (actionData?.success && actionData?.redirectUrl) {
      window.top?.location.assign(actionData.redirectUrl);
    }
  }, [actionData]);
  const redirectToManagedPricing = () => {
    console.log("Redirecting to managed pricing");
    console.log("App handle:", appHandle);
    console.log("Shop name:", shopName);
    console.log("Managed pricing URL:", managedPricingUrl);
    try {
      window.open(managedPricingUrl, "_blank");
      console.log("Opened pricing page in new tab");
    } catch (error) {
      console.error("Failed to open pricing page:", error);
      alert(`Please visit your Shopify admin and go to:
Settings \u2192 Apps \u2192 ProofKit

Or visit: ${managedPricingUrl}`);
    }
  };
  const formatPrice = (price) => {
    if (price === "Unlimited")
      return price;
    return typeof price === "number" ? `$${price.toLocaleString()}` : price;
  };
  const renderFeatureList = (features) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { style: {
    margin: 0,
    paddingLeft: "20px"
  }, children: features.map((feature, index) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { style: {
    marginBottom: "8px",
    fontSize: "14px"
  }, children: [
    "\u2713 ",
    feature
  ] }, index, true, {
    fileName: "app/routes/app.billing.tsx",
    lineNumber: 256,
    columnNumber: 41
  }, this)) }, void 0, false, {
    fileName: "app/routes/app.billing.tsx",
    lineNumber: 252,
    columnNumber: 41
  }, this);
  const renderSubscriptionStatus = () => {
    if (!hasActivePayment && !isInTrial) {
      return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        background: "#fff2cc",
        border: "1px solid #ffc107",
        padding: "24px",
        borderRadius: "8px",
        marginBottom: "32px",
        textAlign: "center"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: {
          margin: "0 0 16px 0"
        }, children: "Choose Your Plan" }, void 0, false, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 274,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
          margin: "0 0 20px 0",
          fontSize: "16px"
        }, children: "Start your 14-day free trial to access ProofKit's powerful features." }, void 0, false, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 277,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: redirectToManagedPricing, style: {
          padding: "16px 32px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "18px",
          fontWeight: "bold"
        }, children: "Start Free Trial" }, void 0, false, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 283,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.billing.tsx",
        lineNumber: 266,
        columnNumber: 14
      }, this);
    }
    if (isInTrial) {
      const tier = subscriptionTier ? pricingTiers[subscriptionTier.toUpperCase()] : null;
      return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        background: "#e8f5e8",
        border: "1px solid #4caf50",
        padding: "24px",
        borderRadius: "8px",
        marginBottom: "32px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: {
          margin: "0 0 16px 0"
        }, children: "\u{1F389} Free Trial Active" }, void 0, false, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 308,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          marginBottom: "16px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
            margin: "0 0 8px 0",
            fontSize: "16px"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Current Plan:" }, void 0, false, {
              fileName: "app/routes/app.billing.tsx",
              lineNumber: 318,
              columnNumber: 15
            }, this),
            " ",
            tier?.name || "Unknown",
            " ($",
            tier?.price,
            "/month)"
          ] }, void 0, true, {
            fileName: "app/routes/app.billing.tsx",
            lineNumber: 314,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
            margin: "0 0 8px 0",
            fontSize: "16px"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Trial Days Remaining:" }, void 0, false, {
              fileName: "app/routes/app.billing.tsx",
              lineNumber: 324,
              columnNumber: 15
            }, this),
            " ",
            trialDaysRemaining,
            " days"
          ] }, void 0, true, {
            fileName: "app/routes/app.billing.tsx",
            lineNumber: 320,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
            margin: "0",
            fontSize: "14px",
            color: "#666"
          }, children: [
            "Trial ends: ",
            new Date(new Date(currentSubscription.createdAt).getTime() + currentSubscription.trialDays * 24 * 60 * 60 * 1e3).toLocaleDateString()
          ] }, void 0, true, {
            fileName: "app/routes/app.billing.tsx",
            lineNumber: 326,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 311,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: redirectToManagedPricing, style: {
          padding: "12px 24px",
          backgroundColor: "#28a745",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "16px"
        }, children: "Manage Subscription" }, void 0, false, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 334,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.billing.tsx",
        lineNumber: 301,
        columnNumber: 14
      }, this);
    }
    if (hasActivePayment) {
      const tier = subscriptionTier ? pricingTiers[subscriptionTier.toUpperCase()] : null;
      return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        background: "#e8f5e8",
        border: "1px solid #4caf50",
        padding: "24px",
        borderRadius: "8px",
        marginBottom: "32px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: {
          margin: "0 0 16px 0"
        }, children: "Active Subscription" }, void 0, false, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 358,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          marginBottom: "16px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
            margin: "0 0 8px 0",
            fontSize: "16px"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Current Plan:" }, void 0, false, {
              fileName: "app/routes/app.billing.tsx",
              lineNumber: 368,
              columnNumber: 15
            }, this),
            " ",
            tier?.name || "Unknown",
            " ($",
            tier?.price,
            "/month)"
          ] }, void 0, true, {
            fileName: "app/routes/app.billing.tsx",
            lineNumber: 364,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
            margin: "0 0 8px 0",
            fontSize: "16px"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Status:" }, void 0, false, {
              fileName: "app/routes/app.billing.tsx",
              lineNumber: 374,
              columnNumber: 15
            }, this),
            " ",
            currentSubscription.status
          ] }, void 0, true, {
            fileName: "app/routes/app.billing.tsx",
            lineNumber: 370,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
            margin: "0",
            fontSize: "14px",
            color: "#666"
          }, children: [
            "Next billing: ",
            new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()
          ] }, void 0, true, {
            fileName: "app/routes/app.billing.tsx",
            lineNumber: 376,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 361,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: redirectToManagedPricing, style: {
          padding: "12px 24px",
          backgroundColor: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "16px"
        }, children: "Change Plan" }, void 0, false, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 384,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.billing.tsx",
        lineNumber: 351,
        columnNumber: 14
      }, this);
    }
    return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      background: "#f8f9fa",
      border: "1px solid #dee2e6",
      padding: "24px",
      borderRadius: "8px",
      marginBottom: "32px",
      textAlign: "center"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: {
        margin: "0 0 16px 0"
      }, children: "Subscription Status Unknown" }, void 0, false, {
        fileName: "app/routes/app.billing.tsx",
        lineNumber: 407,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: redirectToManagedPricing, style: {
        padding: "16px 32px",
        backgroundColor: "#6c757d",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontSize: "16px"
      }, children: "Check Subscription Status" }, void 0, false, {
        fileName: "app/routes/app.billing.tsx",
        lineNumber: 410,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.billing.tsx",
      lineNumber: 399,
      columnNumber: 12
    }, this);
  };
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
    padding: "24px",
    maxWidth: "1200px",
    margin: "0 auto"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", { children: "Billing & Subscription" }, void 0, false, {
      fileName: "app/routes/app.billing.tsx",
      lineNumber: 428,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
      color: "#666",
      marginBottom: "32px"
    }, children: [
      "Manage your ProofKit subscription for ",
      shopName
    ] }, void 0, true, {
      fileName: "app/routes/app.billing.tsx",
      lineNumber: 429,
      columnNumber: 7
    }, this),
    renderSubscriptionStatus(),
    actionData?.error && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      background: "#ffebee",
      border: "1px solid #f44336",
      padding: "16px",
      borderRadius: "8px",
      marginBottom: "24px"
    }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
      margin: 0,
      color: "#d32f2f"
    }, children: actionData.error }, void 0, false, {
      fileName: "app/routes/app.billing.tsx",
      lineNumber: 445,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "app/routes/app.billing.tsx",
      lineNumber: 438,
      columnNumber: 29
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      marginBottom: "32px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { children: "Available Plans" }, void 0, false, {
        fileName: "app/routes/app.billing.tsx",
        lineNumber: 454,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
        color: "#666",
        marginBottom: "24px"
      }, children: "All plans include a 14-day free trial. Pricing and subscriptions are managed by Shopify." }, void 0, false, {
        fileName: "app/routes/app.billing.tsx",
        lineNumber: 455,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "20px"
      }, children: Object.values(pricingTiers).map((tier) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        border: "1px solid #e0e0e0",
        borderRadius: "8px",
        padding: "24px",
        backgroundColor: "white"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          marginBottom: "16px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { style: {
              margin: 0
            }, children: tier.name }, void 0, false, {
              fileName: "app/routes/app.billing.tsx",
              lineNumber: 482,
              columnNumber: 19
            }, this),
            tier.badge && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
              background: "#4caf50",
              color: "white",
              padding: "4px 8px",
              borderRadius: "12px",
              fontSize: "12px"
            }, children: tier.badge }, void 0, false, {
              fileName: "app/routes/app.billing.tsx",
              lineNumber: 485,
              columnNumber: 34
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.billing.tsx",
            lineNumber: 476,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
            display: "flex",
            alignItems: "baseline",
            gap: "8px"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
              fontSize: "32px",
              fontWeight: "bold"
            }, children: [
              "$",
              tier.price
            ] }, void 0, true, {
              fileName: "app/routes/app.billing.tsx",
              lineNumber: 501,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { style: {
              color: "#666"
            }, children: "/month" }, void 0, false, {
              fileName: "app/routes/app.billing.tsx",
              lineNumber: 505,
              columnNumber: 19
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.billing.tsx",
            lineNumber: 496,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 473,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("hr", { style: {
          border: "none",
          borderTop: "1px solid #e0e0e0",
          margin: "16px 0"
        } }, void 0, false, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 511,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          marginBottom: "16px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", { style: {
            margin: "0 0 12px 0"
          }, children: "Features:" }, void 0, false, {
            fileName: "app/routes/app.billing.tsx",
            lineNumber: 520,
            columnNumber: 17
          }, this),
          renderFeatureList(tier.features.slice(0, 5)),
          tier.features.length > 5 && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
            color: "#666",
            fontSize: "14px",
            margin: "8px 0 0 0"
          }, children: [
            "+ ",
            tier.features.length - 5,
            " more features"
          ] }, void 0, true, {
            fileName: "app/routes/app.billing.tsx",
            lineNumber: 524,
            columnNumber: 46
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 517,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("hr", { style: {
          border: "none",
          borderTop: "1px solid #e0e0e0",
          margin: "16px 0"
        } }, void 0, false, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 533,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          marginBottom: "24px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", { style: {
            margin: "0 0 12px 0"
          }, children: "Limits:" }, void 0, false, {
            fileName: "app/routes/app.billing.tsx",
            lineNumber: 542,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { style: {
            margin: 0,
            paddingLeft: "20px"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
              "Campaigns: ",
              tier.limits.campaigns
            ] }, void 0, true, {
              fileName: "app/routes/app.billing.tsx",
              lineNumber: 549,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
              "Ad Groups: ",
              tier.limits.adGroups
            ] }, void 0, true, {
              fileName: "app/routes/app.billing.tsx",
              lineNumber: 550,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
              "Keywords: ",
              tier.limits.keywords
            ] }, void 0, true, {
              fileName: "app/routes/app.billing.tsx",
              lineNumber: 551,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
              "Monthly Spend: ",
              formatPrice(tier.limits.monthlySpend)
            ] }, void 0, true, {
              fileName: "app/routes/app.billing.tsx",
              lineNumber: 552,
              columnNumber: 19
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.billing.tsx",
            lineNumber: 545,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 539,
          columnNumber: 15
        }, this)
      ] }, tier.id, true, {
        fileName: "app/routes/app.billing.tsx",
        lineNumber: 467,
        columnNumber: 52
      }, this)) }, void 0, false, {
        fileName: "app/routes/app.billing.tsx",
        lineNumber: 462,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        textAlign: "center",
        marginTop: "24px",
        padding: "20px",
        backgroundColor: "#f8f9fa",
        borderRadius: "8px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
          margin: "0 0 16px 0",
          fontSize: "16px"
        }, children: "Ready to select your plan?" }, void 0, false, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 565,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: redirectToManagedPricing, style: {
          padding: "16px 32px",
          backgroundColor: "#28a745",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "18px",
          fontWeight: "bold"
        }, children: "View Plans & Subscribe" }, void 0, false, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 571,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.billing.tsx",
        lineNumber: 558,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.billing.tsx",
      lineNumber: 451,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      border: "1px solid #e0e0e0",
      borderRadius: "8px",
      padding: "24px",
      backgroundColor: "white"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Billing Information" }, void 0, false, {
        fileName: "app/routes/app.billing.tsx",
        lineNumber: 592,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { style: {
        paddingLeft: "20px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "All subscriptions are managed through Shopify" }, void 0, false, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 597,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Charges appear on your Shopify Partner account" }, void 0, false, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 598,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Cancel or modify anytime through your Partner Dashboard" }, void 0, false, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 599,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "14-day free trial on all plans" }, void 0, false, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 600,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.billing.tsx",
        lineNumber: 594,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        marginTop: "16px",
        padding: "16px",
        backgroundColor: "#f0f0f0",
        borderRadius: "4px",
        fontSize: "12px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", { children: "Debug Info:" }, void 0, false, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 611,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: [
          "App Handle: ",
          appHandle
        ] }, void 0, true, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 612,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: [
          "Shop: ",
          shopName
        ] }, void 0, true, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 613,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: [
          "Has Active Payment: ",
          hasActivePayment ? "Yes" : "No"
        ] }, void 0, true, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 614,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: [
          "Subscription Tier: ",
          subscriptionTier || "None"
        ] }, void 0, true, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 615,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: [
          "In Trial: ",
          isInTrial ? "Yes" : "No"
        ] }, void 0, true, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 616,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: [
          "Trial Days Remaining: ",
          trialDaysRemaining || "N/A"
        ] }, void 0, true, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 617,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: [
          "Should Redirect to Plans: ",
          shouldRedirectToPlans ? "Yes" : "No"
        ] }, void 0, true, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 618,
          columnNumber: 11
        }, this),
        currentSubscription && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: [
          "Subscription ID: ",
          currentSubscription.id
        ] }, void 0, true, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 619,
          columnNumber: 35
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.billing.tsx",
        lineNumber: 604,
        columnNumber: 9
      }, this),
      currentSubscription && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        marginTop: "16px",
        padding: "16px",
        backgroundColor: "#f5f5f5",
        borderRadius: "4px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", { children: "Current Subscription Details:" }, void 0, false, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 628,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: [
          "Subscription ID: ",
          currentSubscription.id
        ] }, void 0, true, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 629,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: [
          "Next billing: ",
          new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()
        ] }, void 0, true, {
          fileName: "app/routes/app.billing.tsx",
          lineNumber: 630,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.billing.tsx",
        lineNumber: 622,
        columnNumber: 33
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.billing.tsx",
      lineNumber: 586,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/app.billing.tsx",
    lineNumber: 423,
    columnNumber: 10
  }, this);
}
_s(Billing, "YhMy88K+4P1tHXaayJ171ppNCNQ=", false, function() {
  return [useLoaderData, useActionData, useNavigation];
});
_c = Billing;
function ErrorBoundary({
  error
}) {
  console.error("Billing page error:", error);
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
    padding: "2rem",
    background: "#fee",
    border: "1px solid #fcc"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { children: "Billing Error" }, void 0, false, {
      fileName: "app/routes/app.billing.tsx",
      lineNumber: 648,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: [
      "Something went wrong with the billing page: ",
      error?.message
    ] }, void 0, true, {
      fileName: "app/routes/app.billing.tsx",
      lineNumber: 649,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/app.billing.tsx",
    lineNumber: 643,
    columnNumber: 10
  }, this);
}
_c2 = ErrorBoundary;
var _c;
var _c2;
$RefreshReg$(_c, "Billing");
$RefreshReg$(_c2, "ErrorBoundary");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  ErrorBoundary,
  Billing as default
};
//# sourceMappingURL=/assets/routes/app.billing-2TQRWAHR.js.map
