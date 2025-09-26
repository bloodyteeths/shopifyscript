import {
  require_node
} from "/assets/_shared/chunk-5LF5TODQ.js";
import {
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
  createHotContext
} from "/assets/_shared/chunk-GN6N4SDD.js";
import "/assets/_shared/chunk-FK5MLNU6.js";
import {
  __toESM
} from "/assets/_shared/chunk-R6OA4XCD.js";

// app/routes/support.tsx
var import_node = __toESM(require_node());
var import_react2 = __toESM(require_react());
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/support.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/support.tsx"
  );
  import.meta.hot.lastModified = "1758229076726.9229";
}
var meta = () => {
  return [{
    title: "Support - Ads Autopilot AI"
  }, {
    name: "description",
    content: "Get tier-based support for Ads Autopilot AI - Email, priority, and phone support options"
  }];
};
function Support() {
  _s();
  const {
    tier,
    contactMethods
  } = useLoaderData();
  const [showContactForm, setShowContactForm] = (0, import_react2.useState)(false);
  const [formData, setFormData] = (0, import_react2.useState)({
    subject: "",
    description: "",
    category: "general",
    priority: "normal",
    customer_name: "",
    customer_email: "",
    customer_phone: ""
  });
  const [isSubmitting, setIsSubmitting] = (0, import_react2.useState)(false);
  const [submitResult, setSubmitResult] = (0, import_react2.useState)(null);
  const handleInputChange = (e) => {
    const {
      name,
      value
    } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);
    try {
      console.log("Submitting support ticket:", formData);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setSubmitResult({
        success: true,
        message: "Support ticket created successfully! You'll receive an email confirmation shortly."
      });
      setShowContactForm(false);
      setFormData({
        subject: "",
        description: "",
        category: "general",
        priority: "normal",
        customer_name: "",
        customer_email: "",
        customer_phone: ""
      });
    } catch (error) {
      setSubmitResult({
        success: false,
        message: "Failed to create support ticket. Please try again or email us directly."
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  const getTierDisplayName = (tier2) => {
    const tierNames = {
      starter: "Starter Plan",
      professional: "Professional Plan",
      enterprise: "Enterprise Plan"
    };
    return tierNames[tier2] || "Unknown Plan";
  };
  const getTierSupportLevel = (tier2) => {
    const supportLevels = {
      starter: {
        type: "Email Support",
        response: "24 hours",
        description: "Email support during business hours",
        features: ["Email support", "Knowledge base access", "Community forum"]
      },
      professional: {
        type: "Priority Email Support",
        response: "12 hours",
        description: "Priority email support with faster response times",
        features: ["Priority email support", "Advanced troubleshooting", "Feature guidance", "Escalation options"]
      },
      enterprise: {
        type: "Priority Phone & Email Support",
        response: "6 hours",
        description: "Premium support with phone and email options",
        features: ["Priority phone support", "Priority email support", "Dedicated account manager", "SLA guarantees", "Custom integration support"]
      }
    };
    return supportLevels[tier2] || supportLevels.starter;
  };
  const supportLevel = getTierSupportLevel(tier);
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
    fontFamily: "system-ui, sans-serif",
    lineHeight: "1.8",
    maxWidth: "800px",
    margin: "0 auto",
    padding: "2rem"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h1", { children: "Ads Autopilot AI Support" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 198,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "Get help with Ads Autopilot AI - your AI-powered Google Ads optimization tool for Shopify stores." }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 200,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      padding: "1.5rem",
      background: tier === "enterprise" ? "#fef3e3" : tier === "professional" ? "#f0f9ff" : "#f8fafc",
      border: `2px solid ${tier === "enterprise" ? "#f59e0b" : tier === "professional" ? "#3b82f6" : "#64748b"}`,
      borderRadius: "8px",
      marginBottom: "2rem"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { style: {
        margin: "0 0 1rem 0",
        color: tier === "enterprise" ? "#92400e" : tier === "professional" ? "#1e40af" : "#475569"
      }, children: [
        "Your Support Level: ",
        getTierDisplayName(tier)
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 210,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "grid",
        gridTemplateColumns: "1fr 2fr",
        gap: "1rem",
        alignItems: "start"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
            margin: "0 0 0.5rem 0",
            fontWeight: "bold",
            fontSize: "1.1rem"
          }, children: supportLevel.type }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 223,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
            margin: "0 0 0.5rem 0",
            color: "#6b7280"
          }, children: [
            "Response within ",
            supportLevel.response
          ] }, void 0, true, {
            fileName: "app/routes/support.tsx",
            lineNumber: 230,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
            margin: "0",
            color: "#6b7280",
            fontSize: "0.9rem"
          }, children: supportLevel.description }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 236,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/support.tsx",
          lineNumber: 222,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
            margin: "0 0 0.5rem 0",
            fontWeight: "bold"
          }, children: "Included Features:" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 245,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { style: {
            margin: "0",
            paddingLeft: "1.5rem"
          }, children: supportLevel.features.map((feature, index) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { style: {
            color: "#374151",
            marginBottom: "0.25rem"
          }, children: feature }, index, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 253,
            columnNumber: 62
          }, this)) }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 249,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/support.tsx",
          lineNumber: 244,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 216,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/support.tsx",
      lineNumber: 203,
      columnNumber: 7
    }, this),
    !showContactForm ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      textAlign: "center",
      margin: "2rem 0"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { onClick: () => setShowContactForm(true), style: {
        padding: "1rem 2rem",
        backgroundColor: tier === "enterprise" ? "#f59e0b" : tier === "professional" ? "#3b82f6" : "#6366f1",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontSize: "1.1rem",
        fontWeight: "bold",
        cursor: "pointer"
      }, children: "Create Support Ticket" }, void 0, false, {
        fileName: "app/routes/support.tsx",
        lineNumber: 267,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
        marginTop: "1rem",
        color: "#6b7280"
      }, children: "Get help with technical issues, billing questions, or general support" }, void 0, false, {
        fileName: "app/routes/support.tsx",
        lineNumber: 279,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/support.tsx",
      lineNumber: 263,
      columnNumber: 27
    }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      padding: "1.5rem",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      marginBottom: "2rem",
      backgroundColor: "#fafafa"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Create Support Ticket" }, void 0, false, {
        fileName: "app/routes/support.tsx",
        lineNumber: 292,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("form", { onSubmit: handleSubmit, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          marginBottom: "1rem"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
            display: "block",
            marginBottom: "0.5rem",
            fontWeight: "bold"
          }, children: "Your Name *" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 297,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "text", name: "customer_name", value: formData.customer_name, onChange: handleInputChange, required: true, style: {
            width: "100%",
            padding: "0.75rem",
            border: "1px solid #d1d5db",
            borderRadius: "4px"
          } }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 304,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/support.tsx",
          lineNumber: 294,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          marginBottom: "1rem"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
            display: "block",
            marginBottom: "0.5rem",
            fontWeight: "bold"
          }, children: "Email Address *" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 315,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "email", name: "customer_email", value: formData.customer_email, onChange: handleInputChange, required: true, style: {
            width: "100%",
            padding: "0.75rem",
            border: "1px solid #d1d5db",
            borderRadius: "4px"
          } }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 322,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/support.tsx",
          lineNumber: 312,
          columnNumber: 13
        }, this),
        tier === "enterprise" && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          marginBottom: "1rem"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
            display: "block",
            marginBottom: "0.5rem",
            fontWeight: "bold"
          }, children: "Phone Number (for phone support)" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 333,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "tel", name: "customer_phone", value: formData.customer_phone, onChange: handleInputChange, style: {
            width: "100%",
            padding: "0.75rem",
            border: "1px solid #d1d5db",
            borderRadius: "4px"
          } }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 340,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/support.tsx",
          lineNumber: 330,
          columnNumber: 39
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          marginBottom: "1rem"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "bold"
            }, children: "Category *" }, void 0, false, {
              fileName: "app/routes/support.tsx",
              lineNumber: 355,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("select", { name: "category", value: formData.category, onChange: handleInputChange, required: true, style: {
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "4px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "general", children: "General" }, void 0, false, {
                fileName: "app/routes/support.tsx",
                lineNumber: 368,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "technical", children: "Technical" }, void 0, false, {
                fileName: "app/routes/support.tsx",
                lineNumber: 369,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "billing", children: "Billing" }, void 0, false, {
                fileName: "app/routes/support.tsx",
                lineNumber: 370,
                columnNumber: 19
              }, this),
              tier === "enterprise" && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "urgent", children: "Urgent" }, void 0, false, {
                fileName: "app/routes/support.tsx",
                lineNumber: 371,
                columnNumber: 45
              }, this)
            ] }, void 0, true, {
              fileName: "app/routes/support.tsx",
              lineNumber: 362,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/support.tsx",
            lineNumber: 354,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "bold"
            }, children: "Priority *" }, void 0, false, {
              fileName: "app/routes/support.tsx",
              lineNumber: 376,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("select", { name: "priority", value: formData.priority, onChange: handleInputChange, required: true, style: {
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "4px"
            }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "low", children: "Low" }, void 0, false, {
                fileName: "app/routes/support.tsx",
                lineNumber: 389,
                columnNumber: 19
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "normal", children: "Normal" }, void 0, false, {
                fileName: "app/routes/support.tsx",
                lineNumber: 390,
                columnNumber: 19
              }, this),
              ["professional", "enterprise"].includes(tier) && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "high", children: "High" }, void 0, false, {
                fileName: "app/routes/support.tsx",
                lineNumber: 391,
                columnNumber: 69
              }, this),
              tier === "enterprise" && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("option", { value: "urgent", children: "Urgent" }, void 0, false, {
                fileName: "app/routes/support.tsx",
                lineNumber: 392,
                columnNumber: 45
              }, this)
            ] }, void 0, true, {
              fileName: "app/routes/support.tsx",
              lineNumber: 383,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/support.tsx",
            lineNumber: 375,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/support.tsx",
          lineNumber: 348,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          marginBottom: "1rem"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
            display: "block",
            marginBottom: "0.5rem",
            fontWeight: "bold"
          }, children: "Subject *" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 400,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "text", name: "subject", value: formData.subject, onChange: handleInputChange, required: true, style: {
            width: "100%",
            padding: "0.75rem",
            border: "1px solid #d1d5db",
            borderRadius: "4px"
          }, placeholder: "Brief description of your issue" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 407,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/support.tsx",
          lineNumber: 397,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          marginBottom: "1rem"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("label", { style: {
            display: "block",
            marginBottom: "0.5rem",
            fontWeight: "bold"
          }, children: "Description *" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 418,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("textarea", { name: "description", value: formData.description, onChange: handleInputChange, required: true, rows: 5, style: {
            width: "100%",
            padding: "0.75rem",
            border: "1px solid #d1d5db",
            borderRadius: "4px"
          }, placeholder: "Please provide detailed information about your issue..." }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 425,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/support.tsx",
          lineNumber: 415,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          display: "flex",
          gap: "1rem"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { type: "submit", disabled: isSubmitting, style: {
            padding: "0.75rem 1.5rem",
            backgroundColor: tier === "enterprise" ? "#f59e0b" : tier === "professional" ? "#3b82f6" : "#6366f1",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "1rem",
            fontWeight: "bold",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            opacity: isSubmitting ? 0.6 : 1
          }, children: isSubmitting ? "Creating Ticket..." : "Create Ticket" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 437,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("button", { type: "button", onClick: () => setShowContactForm(false), style: {
            padding: "0.75rem 1.5rem",
            backgroundColor: "#6b7280",
            color: "white",
            border: "none",
            borderRadius: "4px",
            fontSize: "1rem",
            cursor: "pointer"
          }, children: "Cancel" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 450,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/support.tsx",
          lineNumber: 433,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 293,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/support.tsx",
      lineNumber: 285,
      columnNumber: 18
    }, this),
    submitResult && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      padding: "1rem",
      backgroundColor: submitResult.success ? "#dcfce7" : "#fee2e2",
      border: `1px solid ${submitResult.success ? "#16a34a" : "#dc2626"}`,
      borderRadius: "4px",
      marginBottom: "2rem"
    }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
      margin: "0",
      color: submitResult.success ? "#166534" : "#991b1b",
      fontWeight: "bold"
    }, children: submitResult.message }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 473,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 466,
      columnNumber: 24
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { children: "Direct Contact Information" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 482,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      display: "grid",
      gridTemplateColumns: tier === "enterprise" ? "1fr 1fr 1fr" : "1fr 1fr",
      gap: "2rem",
      margin: "2rem 0"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        padding: "1.5rem",
        border: "1px solid #e5e7eb",
        borderRadius: "8px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Email Support" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 495,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Email:" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 496,
            columnNumber: 14
          }, this),
          " ",
          contactMethods.support_email,
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 496,
            columnNumber: 68
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Response Time:" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 497,
            columnNumber: 11
          }, this),
          " ",
          contactMethods.guaranteed_response_hours,
          " hours",
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 497,
            columnNumber: 91
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Hours:" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 498,
            columnNumber: 11
          }, this),
          " Monday-Friday, 9 AM - 6 PM EST"
        ] }, void 0, true, {
          fileName: "app/routes/support.tsx",
          lineNumber: 496,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "For all general inquiries, technical support, and account questions." }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 499,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 490,
        columnNumber: 9
      }, this),
      tier === "enterprise" && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        padding: "1.5rem",
        border: "2px solid #f59e0b",
        borderRadius: "8px",
        backgroundColor: "#fef3e3"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Phone Support" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 508,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Phone:" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 509,
            columnNumber: 16
          }, this),
          " (307) 395-9830",
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 509,
            columnNumber: 54
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Response Time:" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 510,
            columnNumber: 13
          }, this),
          " Immediate",
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 510,
            columnNumber: 54
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Hours:" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 511,
            columnNumber: 13
          }, this),
          " Monday-Friday, 9 AM - 6 PM EST"
        ] }, void 0, true, {
          fileName: "app/routes/support.tsx",
          lineNumber: 509,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "Priority phone support for urgent issues and dedicated account management." }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 512,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 502,
        columnNumber: 35
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        padding: "1.5rem",
        border: "1px solid #e5e7eb",
        borderRadius: "8px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Billing & Accounts" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 520,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Email:" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 521,
            columnNumber: 14
          }, this),
          " billing@proofkit.com",
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 521,
            columnNumber: 58
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Response Time:" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 522,
            columnNumber: 11
          }, this),
          " ",
          tier === "enterprise" ? "4" : tier === "professional" ? "6" : "24",
          " hours",
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 522,
            columnNumber: 117
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Hours:" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 523,
            columnNumber: 11
          }, this),
          " Monday-Friday, 9 AM - 6 PM EST"
        ] }, void 0, true, {
          fileName: "app/routes/support.tsx",
          lineNumber: 521,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "For subscription issues, billing questions, refund requests, and plan changes." }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 524,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 515,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/support.tsx",
      lineNumber: 484,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { children: "Getting Started" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 528,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Quick Setup Guide (5 Minutes)" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 530,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ol", { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Install the App:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 532,
          columnNumber: 13
        }, this),
        " Install Ads Autopilot AI from the Shopify App Store"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 532,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Connect Google Ads:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 533,
          columnNumber: 13
        }, this),
        " Authorize your Google Ads account integration"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 533,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Configure Audiences:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 534,
          columnNumber: 13
        }, this),
        " Set up your customer segmentation preferences"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 534,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Enable Autopilot:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 535,
          columnNumber: 13
        }, this),
        " Turn on automated campaign optimization"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 535,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Monitor Results:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 536,
          columnNumber: 13
        }, this),
        " Track your conversion rate improvements"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 536,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/support.tsx",
      lineNumber: 531,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Key Features" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 539,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "AI-Powered Optimization:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 541,
          columnNumber: 13
        }, this),
        " Automated Google Ads campaign management"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 541,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Smart Audience Targeting:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 542,
          columnNumber: 13
        }, this),
        " Anonymous customer segmentation without PII"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 542,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Performance Analytics:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 543,
          columnNumber: 13
        }, this),
        " Real-time conversion tracking and insights"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 543,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Google Sheets Integration:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 544,
          columnNumber: 13
        }, this),
        " Export data and manage campaigns"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 544,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Privacy-First:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 545,
          columnNumber: 13
        }, this),
        " GDPR & CCPA compliant, no customer data collection"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 545,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/support.tsx",
      lineNumber: 540,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { children: "Documentation & Resources" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 548,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Setup Guides" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 550,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Initial Setup:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 552,
          columnNumber: 13
        }, this),
        " Complete walkthrough of app installation and configuration"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 552,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Google Ads Integration:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 553,
          columnNumber: 13
        }, this),
        " Step-by-step guide to connect your Google Ads account"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 553,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Audience Configuration:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 554,
          columnNumber: 13
        }, this),
        " How to set up customer segmentation and targeting"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 554,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Campaign Optimization:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 555,
          columnNumber: 13
        }, this),
        " Best practices for automated campaign management"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 555,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/support.tsx",
      lineNumber: 551,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Troubleshooting" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 558,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Connection Issues:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 560,
          columnNumber: 13
        }, this),
        " Resolving Google Ads and Shopify integration problems"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 560,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Performance Questions:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 561,
          columnNumber: 13
        }, this),
        " Understanding campaign optimization metrics"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 561,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Billing Issues:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 562,
          columnNumber: 13
        }, this),
        " Common subscription and payment questions"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 562,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Account Problems:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 563,
          columnNumber: 13
        }, this),
        " Login, access, and configuration troubleshooting"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 563,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/support.tsx",
      lineNumber: 559,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { children: "Pricing & Plans" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 566,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: "1rem",
      margin: "2rem 0"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        padding: "1.5rem",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        textAlign: "center"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Free Plan" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 580,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
          fontSize: "2rem",
          fontWeight: "bold",
          color: "#10b981"
        }, children: "$0" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 581,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "per month" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 586,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { style: {
          textAlign: "left",
          marginTop: "1rem"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Up to 1,000 monthly sessions" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 591,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Basic campaign optimization" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 592,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Email support" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 593,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Standard analytics" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 594,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/support.tsx",
          lineNumber: 587,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 574,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        padding: "1.5rem",
        border: "2px solid #3b82f6",
        borderRadius: "8px",
        textAlign: "center",
        position: "relative"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          position: "absolute",
          top: "-10px",
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: "#3b82f6",
          color: "white",
          padding: "0.25rem 1rem",
          borderRadius: "12px",
          fontSize: "0.875rem"
        }, children: "Popular" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 605,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Pro Plan" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 618,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
          fontSize: "2rem",
          fontWeight: "bold",
          color: "#3b82f6"
        }, children: "$29" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 619,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "per month" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 624,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { style: {
          textAlign: "left",
          marginTop: "1rem"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Unlimited sessions" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 629,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Advanced AI optimization" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 630,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Priority support" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 631,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Advanced analytics" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 632,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Google Sheets integration" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 633,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/support.tsx",
          lineNumber: 625,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 598,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        padding: "1.5rem",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        textAlign: "center"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Enterprise" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 643,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
          fontSize: "2rem",
          fontWeight: "bold",
          color: "#8b5cf6"
        }, children: "$99" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 644,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "per month" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 649,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { style: {
          textAlign: "left",
          marginTop: "1rem"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Everything in Pro" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 654,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Multiple store management" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 655,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Dedicated account manager" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 656,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Custom integrations" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 657,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "SLA guarantees" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 658,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/support.tsx",
          lineNumber: 650,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 637,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/support.tsx",
      lineNumber: 568,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { children: "Technical Support" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 663,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "System Requirements" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 665,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Shopify Plan:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 667,
          columnNumber: 13
        }, this),
        " Any Shopify plan (Basic, Shopify, Advanced, Plus)"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 667,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Google Ads Account:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 668,
          columnNumber: 13
        }, this),
        " Active Google Ads account with API access"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 668,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Browser:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 669,
          columnNumber: 13
        }, this),
        " Modern browser (Chrome, Firefox, Safari, Edge)"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 669,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Permissions:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 670,
          columnNumber: 13
        }, this),
        " Shopify admin access to install apps"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 670,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/support.tsx",
      lineNumber: 666,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Common Integration Questions" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 673,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Google Ads API:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 675,
          columnNumber: 13
        }, this),
        " We use read/write access to optimize your campaigns"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 675,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Google Sheets:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 676,
          columnNumber: 13
        }, this),
        " Optional integration for data export and management"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 676,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Shopify Data:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 677,
          columnNumber: 13
        }, this),
        " We only read product catalog data (no customer PII)"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 677,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Privacy Compliance:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 678,
          columnNumber: 13
        }, this),
        " Fully GDPR and CCPA compliant by design"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 678,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/support.tsx",
      lineNumber: 674,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { children: "Privacy & Security" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 681,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Data Protection" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 683,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "No Customer PII:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 685,
          columnNumber: 13
        }, this),
        " We never collect personal information from your customers"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 685,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Minimal Data Collection:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 686,
          columnNumber: 13
        }, this),
        " Only store configuration and campaign settings"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 686,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Your Data Control:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 687,
          columnNumber: 13
        }, this),
        " You own and control all your optimization data"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 687,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Secure Infrastructure:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 688,
          columnNumber: 13
        }, this),
        " Enterprise-grade security with encryption"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 688,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/support.tsx",
      lineNumber: 684,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Compliance" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 691,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "GDPR Compliant:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 693,
          columnNumber: 13
        }, this),
        " Full compliance with EU privacy regulations"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 693,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "CCPA Compliant:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 694,
          columnNumber: 13
        }, this),
        " California privacy law compliance"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 694,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "SOC 2 Type II:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 695,
          columnNumber: 13
        }, this),
        " Audited security and privacy controls"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 695,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Data Processing Agreements:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 696,
          columnNumber: 13
        }, this),
        " Available for enterprise customers"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 696,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/support.tsx",
      lineNumber: 692,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { children: "Performance & Optimization" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 699,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Expected Results" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 701,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Conversion Rate:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 703,
          columnNumber: 13
        }, this),
        " Average 15-25% improvement in first 30 days"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 703,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Setup Time:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 704,
          columnNumber: 13
        }, this),
        " Complete setup in under 5 minutes"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 704,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Time to Value:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 705,
          columnNumber: 13
        }, this),
        " See optimization results within 24 hours"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 705,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Campaign Management:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 706,
          columnNumber: 13
        }, this),
        " Automated optimization saves 5-10 hours/week"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 706,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/support.tsx",
      lineNumber: 702,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Best Practices" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 709,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Audience Segmentation:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 711,
          columnNumber: 13
        }, this),
        " Set up detailed customer segments for better targeting"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 711,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Campaign Budgets:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 712,
          columnNumber: 13
        }, this),
        " Start with conservative budgets and scale based on performance"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 712,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Regular Monitoring:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 713,
          columnNumber: 13
        }, this),
        " Review optimization reports weekly"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 713,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "A/B Testing:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 714,
          columnNumber: 13
        }, this),
        " Use built-in testing features to optimize campaigns"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 714,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/support.tsx",
      lineNumber: 710,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { children: "Training & Onboarding" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 717,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Available Resources" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 719,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Video Tutorials:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 721,
          columnNumber: 13
        }, this),
        " Step-by-step setup and optimization guides"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 721,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Webinar Series:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 722,
          columnNumber: 13
        }, this),
        " Monthly training sessions with Q&A"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 722,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Best Practices Guide:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 723,
          columnNumber: 13
        }, this),
        " Comprehensive optimization strategies"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 723,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Case Studies:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 724,
          columnNumber: 13
        }, this),
        " Real customer success stories and results"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 724,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/support.tsx",
      lineNumber: 720,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Enterprise Support" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 727,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "Enterprise customers receive:" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 728,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Dedicated Account Manager:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 730,
          columnNumber: 13
        }, this),
        " Personal support and optimization guidance"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 730,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Custom Training:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 731,
          columnNumber: 13
        }, this),
        " Tailored training sessions for your team"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 731,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Implementation Support:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 732,
          columnNumber: 13
        }, this),
        " Hands-on help with complex setups"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 732,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Performance Reviews:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 733,
          columnNumber: 13
        }, this),
        " Regular optimization strategy sessions"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 733,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/support.tsx",
      lineNumber: 729,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { children: "Updates & Maintenance" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 736,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Service Updates" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 738,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Automatic Updates:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 740,
          columnNumber: 13
        }, this),
        " New features and improvements deployed continuously"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 740,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Maintenance Windows:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 741,
          columnNumber: 13
        }, this),
        " Scheduled maintenance with advance notice"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 741,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Security Patches:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 742,
          columnNumber: 13
        }, this),
        " Immediate deployment of critical updates"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 742,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Feature Announcements:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 743,
          columnNumber: 13
        }, this),
        " Email notifications for major new features"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 743,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/support.tsx",
      lineNumber: 739,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Service Status" }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 746,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Uptime Target:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 748,
          columnNumber: 13
        }, this),
        " 99.9% service availability"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 748,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Status Page:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 749,
          columnNumber: 13
        }, this),
        " Real-time service status and incident reports"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 749,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Performance Monitoring:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 750,
          columnNumber: 13
        }, this),
        " 24/7 monitoring of all systems"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 750,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Incident Response:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 751,
          columnNumber: 13
        }, this),
        " Rapid response to any service issues"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 751,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/support.tsx",
      lineNumber: 747,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("hr", { style: {
      margin: "3rem 0"
    } }, void 0, false, {
      fileName: "app/routes/support.tsx",
      lineNumber: 754,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      textAlign: "center",
      backgroundColor: "#f3f4f6",
      padding: "2rem",
      borderRadius: "8px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h3", { children: "Need Help Right Now?" }, void 0, false, {
        fileName: "app/routes/support.tsx",
        lineNumber: 764,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
        marginBottom: "1rem"
      }, children: "Contact our support team for immediate assistance" }, void 0, false, {
        fileName: "app/routes/support.tsx",
        lineNumber: 765,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Email:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 768,
          columnNumber: 12
        }, this),
        " ",
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("a", { href: "mailto:atanrikulu@e-listele.com", children: "atanrikulu@e-listele.com" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 768,
          columnNumber: 36
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 768,
          columnNumber: 106
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Response Time:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 769,
          columnNumber: 9
        }, this),
        " 24 hours",
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 769,
          columnNumber: 49
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Available:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 770,
          columnNumber: 9
        }, this),
        " Monday-Friday, 9 AM - 6 PM EST"
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 768,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        marginTop: "2rem"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h4", { children: "Emergency Support" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 775,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "For critical issues affecting your campaigns:" }, void 0, false, {
          fileName: "app/routes/support.tsx",
          lineNumber: 776,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Priority Email:" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 777,
            columnNumber: 14
          }, this),
          " ",
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("a", { href: "mailto:atanrikulu@e-listele.com", children: "atanrikulu@e-listele.com" }, void 0, false, {
            fileName: "app/routes/support.tsx",
            lineNumber: 777,
            columnNumber: 47
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/support.tsx",
          lineNumber: 777,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/support.tsx",
        lineNumber: 772,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/support.tsx",
      lineNumber: 758,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { style: {
      textAlign: "center",
      marginTop: "2rem",
      color: "#666"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Ads Autopilot AI Support Team" }, void 0, false, {
        fileName: "app/routes/support.tsx",
        lineNumber: 786,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("br", {}, void 0, false, {
        fileName: "app/routes/support.tsx",
        lineNumber: 786,
        columnNumber: 55
      }, this),
      "Helping you optimize your Google Ads campaigns with AI-powered automation"
    ] }, void 0, true, {
      fileName: "app/routes/support.tsx",
      lineNumber: 781,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/support.tsx",
    lineNumber: 191,
    columnNumber: 10
  }, this);
}
_s(Support, "MBAAtUsRp4md8nnr+Kpmrw9ieNk=", false, function() {
  return [useLoaderData];
});
_c = Support;
var _c;
$RefreshReg$(_c, "Support");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  Support as default,
  meta
};
//# sourceMappingURL=/assets/routes/support-VPHYDQ3B.js.map
