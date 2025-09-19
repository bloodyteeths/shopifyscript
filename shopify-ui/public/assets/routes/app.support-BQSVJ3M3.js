import {
  Badge,
  Banner,
  Button,
  ButtonGroup,
  Card,
  DataTable,
  EmptyState,
  Layout,
  Modal,
  Page,
  Select,
  Text,
  TextField
} from "/assets/_shared/chunk-ZXKZ2IIA.js";
import "/assets/_shared/chunk-QDIWRKG7.js";
import {
  require_node
} from "/assets/_shared/chunk-5LF5TODQ.js";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation
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

// app/routes/app.support.tsx
var import_node = __toESM(require_node());
var import_react2 = __toESM(require_react());
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/app.support.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/app.support.tsx"
  );
  import.meta.hot.lastModified = "1758301288630.3977";
}
var meta = () => {
  return [{
    title: "Support - Ads Autopilot AI"
  }, {
    name: "description",
    content: "In-app support center with tier-based assistance"
  }];
};
function AppSupport() {
  _s();
  const {
    tier,
    contactMethods,
    tickets,
    tenant
  } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const [showCreateForm, setShowCreateForm] = (0, import_react2.useState)(false);
  const [selectedTicket, setSelectedTicket] = (0, import_react2.useState)(null);
  const [formData, setFormData] = (0, import_react2.useState)({
    subject: "",
    description: "",
    category: "general",
    priority: "normal",
    customer_name: "",
    customer_email: "",
    customer_phone: ""
  });
  const isSubmitting = navigation.state === "submitting";
  (0, import_react2.useEffect)(() => {
    if (actionData?.success) {
      setShowCreateForm(false);
      setFormData({
        subject: "",
        description: "",
        category: "general",
        priority: "normal",
        customer_name: "",
        customer_email: "",
        customer_phone: ""
      });
    }
  }, [actionData]);
  const getTierDisplayName = (tier2) => {
    const tierNames = {
      starter: "Starter Plan",
      professional: "Professional Plan",
      enterprise: "Enterprise Plan"
    };
    return tierNames[tier2] || "Unknown Plan";
  };
  const getTierBadgeStatus = (tier2) => {
    return tier2 === "enterprise" ? "warning" : tier2 === "professional" ? "info" : "default";
  };
  const getStatusBadge = (status) => {
    const statusMap = {
      open: {
        status: "default",
        label: "Open"
      },
      in_progress: {
        status: "info",
        label: "In Progress"
      },
      pending_customer: {
        status: "attention",
        label: "Pending Customer"
      },
      resolved: {
        status: "success",
        label: "Resolved"
      },
      closed: {
        status: "default",
        label: "Closed"
      }
    };
    return statusMap[status] || {
      status: "default",
      label: status
    };
  };
  const getPriorityBadge = (priority) => {
    const priorityMap = {
      low: {
        status: "default",
        label: "Low"
      },
      normal: {
        status: "info",
        label: "Normal"
      },
      high: {
        status: "attention",
        label: "High"
      },
      urgent: {
        status: "critical",
        label: "Urgent"
      }
    };
    return priorityMap[priority] || {
      status: "default",
      label: priority
    };
  };
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  const ticketRows = tickets.map((ticket) => [ticket.ticket_number, ticket.subject, /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, { ...getStatusBadge(ticket.status), children: getStatusBadge(ticket.status).label }, ticket.id, false, {
    fileName: "app/routes/app.support.tsx",
    lineNumber: 234,
    columnNumber: 83
  }, this), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, { ...getPriorityBadge(ticket.priority), children: getPriorityBadge(ticket.priority).label }, `priority-${ticket.id}`, false, {
    fileName: "app/routes/app.support.tsx",
    lineNumber: 234,
    columnNumber: 188
  }, this), ticket.category, formatDate(ticket.created_at), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { size: "slim", onClick: () => setSelectedTicket(ticket.id), children: "View" }, `view-${ticket.id}`, false, {
    fileName: "app/routes/app.support.tsx",
    lineNumber: 234,
    columnNumber: 363
  }, this)]);
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Page, { title: "Support Center", subtitle: `${getTierDisplayName(tier)} - Get help when you need it`, children: [
    actionData?.success && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Banner, { title: "Success", status: "success", onDismiss: () => {
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: actionData.message }, void 0, false, {
        fileName: "app/routes/app.support.tsx",
        lineNumber: 239,
        columnNumber: 11
      }, this),
      actionData.ticket_number && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: [
        "Ticket number: ",
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: actionData.ticket_number }, void 0, false, {
          fileName: "app/routes/app.support.tsx",
          lineNumber: 240,
          columnNumber: 58
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.support.tsx",
        lineNumber: 240,
        columnNumber: 40
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.support.tsx",
      lineNumber: 238,
      columnNumber: 31
    }, this),
    actionData?.success === false && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Banner, { title: "Error", status: "critical", onDismiss: () => {
    }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: actionData.message }, void 0, false, {
      fileName: "app/routes/app.support.tsx",
      lineNumber: 244,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "app/routes/app.support.tsx",
      lineNumber: 243,
      columnNumber: 41
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout, { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        padding: "1.5rem"
      }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { vertical: true, spacing: "loose", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { alignment: "center", children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack.Item, { fill: true, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingLg", as: "h2", children: "Your Support Level" }, void 0, false, {
            fileName: "app/routes/app.support.tsx",
            lineNumber: 257,
            columnNumber: 21
          }, this) }, void 0, false, {
            fileName: "app/routes/app.support.tsx",
            lineNumber: 256,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, { ...{
            status: getTierBadgeStatus(tier)
          }, children: getTierDisplayName(tier) }, void 0, false, {
            fileName: "app/routes/app.support.tsx",
            lineNumber: 261,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.support.tsx",
          lineNumber: 255,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { distribution: "fillEvenly", spacing: "loose", children: [
          contactMethods.email_support && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { vertical: true, spacing: "tight", children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmailMajor, {}, void 0, false, {
              fileName: "app/routes/app.support.tsx",
              lineNumber: 270,
              columnNumber: 23
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", fontWeight: "semibold", children: "Email Support" }, void 0, false, {
              fileName: "app/routes/app.support.tsx",
              lineNumber: 271,
              columnNumber: 23
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodySm", color: "subdued", children: [
              "Response within ",
              contactMethods.guaranteed_response_hours,
              "h"
            ] }, void 0, true, {
              fileName: "app/routes/app.support.tsx",
              lineNumber: 272,
              columnNumber: 23
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.support.tsx",
            lineNumber: 269,
            columnNumber: 52
          }, this),
          contactMethods.phone_support && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { vertical: true, spacing: "tight", children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(PhoneMajor, {}, void 0, false, {
              fileName: "app/routes/app.support.tsx",
              lineNumber: 278,
              columnNumber: 23
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", fontWeight: "semibold", children: "Phone Support" }, void 0, false, {
              fileName: "app/routes/app.support.tsx",
              lineNumber: 279,
              columnNumber: 23
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodySm", color: "subdued", children: contactMethods.support_phone }, void 0, false, {
              fileName: "app/routes/app.support.tsx",
              lineNumber: 280,
              columnNumber: 23
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.support.tsx",
            lineNumber: 277,
            columnNumber: 52
          }, this),
          contactMethods.priority_routing && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { vertical: true, spacing: "tight", children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(AlertMajor, {}, void 0, false, {
              fileName: "app/routes/app.support.tsx",
              lineNumber: 286,
              columnNumber: 23
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", fontWeight: "semibold", children: "Priority Routing" }, void 0, false, {
              fileName: "app/routes/app.support.tsx",
              lineNumber: 287,
              columnNumber: 23
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodySm", color: "subdued", children: "Fast-tracked support" }, void 0, false, {
              fileName: "app/routes/app.support.tsx",
              lineNumber: 288,
              columnNumber: 23
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.support.tsx",
            lineNumber: 285,
            columnNumber: 55
          }, this),
          contactMethods.dedicated_manager && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { vertical: true, spacing: "tight", children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(CustomersMajor, {}, void 0, false, {
              fileName: "app/routes/app.support.tsx",
              lineNumber: 294,
              columnNumber: 23
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", fontWeight: "semibold", children: "Account Manager" }, void 0, false, {
              fileName: "app/routes/app.support.tsx",
              lineNumber: 295,
              columnNumber: 23
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodySm", color: "subdued", children: "Dedicated support contact" }, void 0, false, {
              fileName: "app/routes/app.support.tsx",
              lineNumber: 296,
              columnNumber: 23
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.support.tsx",
            lineNumber: 293,
            columnNumber: 56
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.support.tsx",
          lineNumber: 268,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ButtonGroup, { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { primary: true, icon: TicketMajor, onClick: () => setShowCreateForm(true), children: "Create Support Ticket" }, void 0, false, {
            fileName: "app/routes/app.support.tsx",
            lineNumber: 303,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { url: `mailto:${contactMethods.support_email}`, external: true, icon: EmailMajor, children: "Email Support" }, void 0, false, {
            fileName: "app/routes/app.support.tsx",
            lineNumber: 306,
            columnNumber: 19
          }, this),
          contactMethods.phone_support && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { url: `tel:${contactMethods.support_phone}`, external: true, icon: PhoneMajor, children: "Call Support" }, void 0, false, {
            fileName: "app/routes/app.support.tsx",
            lineNumber: 309,
            columnNumber: 52
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.support.tsx",
          lineNumber: 302,
          columnNumber: 17
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.support.tsx",
        lineNumber: 254,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "app/routes/app.support.tsx",
        lineNumber: 251,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "app/routes/app.support.tsx",
        lineNumber: 250,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "app/routes/app.support.tsx",
        lineNumber: 249,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        padding: "1.5rem"
      }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { vertical: true, spacing: "loose", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingLg", as: "h2", children: "Your Support Tickets" }, void 0, false, {
          fileName: "app/routes/app.support.tsx",
          lineNumber: 325,
          columnNumber: 17
        }, this),
        tickets.length > 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DataTable, { columnContentTypes: ["text", "text", "text", "text", "text", "text", "text"], headings: ["Ticket #", "Subject", "Status", "Priority", "Category", "Created", "Action"], rows: ticketRows, footerContent: `Showing ${tickets.length} of ${tickets.length} tickets` }, void 0, false, {
          fileName: "app/routes/app.support.tsx",
          lineNumber: 327,
          columnNumber: 39
        }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, { heading: "No support tickets yet", image: "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png", children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "When you create support tickets, they'll appear here." }, void 0, false, {
            fileName: "app/routes/app.support.tsx",
            lineNumber: 328,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { primary: true, onClick: () => setShowCreateForm(true), children: "Create Your First Ticket" }, void 0, false, {
            fileName: "app/routes/app.support.tsx",
            lineNumber: 329,
            columnNumber: 21
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.support.tsx",
          lineNumber: 327,
          columnNumber: 314
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.support.tsx",
        lineNumber: 324,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "app/routes/app.support.tsx",
        lineNumber: 321,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "app/routes/app.support.tsx",
        lineNumber: 320,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "app/routes/app.support.tsx",
        lineNumber: 319,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout.Section, { secondary: true, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        padding: "1.5rem"
      }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { vertical: true, spacing: "loose", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingMd", as: "h3", children: "Service Level Agreement" }, void 0, false, {
          fileName: "app/routes/app.support.tsx",
          lineNumber: 345,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { vertical: true, spacing: "tight", children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { alignment: "center", children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ClockMajor, {}, void 0, false, {
              fileName: "app/routes/app.support.tsx",
              lineNumber: 349,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Response Time:" }, void 0, false, {
                fileName: "app/routes/app.support.tsx",
                lineNumber: 351,
                columnNumber: 23
              }, this),
              " ",
              contactMethods.guaranteed_response_hours,
              " hours"
            ] }, void 0, true, {
              fileName: "app/routes/app.support.tsx",
              lineNumber: 350,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.support.tsx",
            lineNumber: 348,
            columnNumber: 19
          }, this),
          contactMethods.guaranteed_resolution_hours && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { alignment: "center", children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ClockMajor, {}, void 0, false, {
              fileName: "app/routes/app.support.tsx",
              lineNumber: 356,
              columnNumber: 23
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Resolution Time:" }, void 0, false, {
                fileName: "app/routes/app.support.tsx",
                lineNumber: 358,
                columnNumber: 25
              }, this),
              " ",
              contactMethods.guaranteed_resolution_hours,
              " hours"
            ] }, void 0, true, {
              fileName: "app/routes/app.support.tsx",
              lineNumber: 357,
              columnNumber: 23
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.support.tsx",
            lineNumber: 355,
            columnNumber: 66
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.support.tsx",
          lineNumber: 347,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodySm", color: "subdued", children: [
          "All times are calculated during business hours (Monday-Friday, 9 AM - 6 PM EST).",
          tier !== "starter" && " Priority routing ensures your tickets are handled by senior support staff."
        ] }, void 0, true, {
          fileName: "app/routes/app.support.tsx",
          lineNumber: 363,
          columnNumber: 17
        }, this),
        tier === "starter" && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Banner, { status: "info", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "Upgrade to Professional or Enterprise for faster response times and additional support channels." }, void 0, false, {
          fileName: "app/routes/app.support.tsx",
          lineNumber: 369,
          columnNumber: 21
        }, this) }, void 0, false, {
          fileName: "app/routes/app.support.tsx",
          lineNumber: 368,
          columnNumber: 40
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.support.tsx",
        lineNumber: 344,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "app/routes/app.support.tsx",
        lineNumber: 341,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "app/routes/app.support.tsx",
        lineNumber: 340,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "app/routes/app.support.tsx",
        lineNumber: 339,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.support.tsx",
      lineNumber: 247,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Modal, { open: showCreateForm, onClose: () => setShowCreateForm(false), title: "Create Support Ticket", primaryAction: {
      content: isSubmitting ? "Creating..." : "Create Ticket",
      loading: isSubmitting,
      onAction: () => {
        const form = document.getElementById("support-ticket-form");
        if (form) {
          form.requestSubmit();
        }
      }
    }, secondaryActions: [{
      content: "Cancel",
      onAction: () => setShowCreateForm(false)
    }], large: true, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Modal.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Form, { method: "post", id: "support-ticket-form", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "hidden", name: "intent", value: "create_ticket" }, void 0, false, {
        fileName: "app/routes/app.support.tsx",
        lineNumber: 393,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("input", { type: "hidden", name: "tenant", value: tenant }, void 0, false, {
        fileName: "app/routes/app.support.tsx",
        lineNumber: 394,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { vertical: true, spacing: "loose", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextField, { label: "Your Name", value: formData.customer_name, onChange: (value) => setFormData((prev) => ({
          ...prev,
          customer_name: value
        })), name: "customer_name", autoComplete: "name", required: true }, void 0, false, {
          fileName: "app/routes/app.support.tsx",
          lineNumber: 397,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextField, { label: "Email Address", type: "email", value: formData.customer_email, onChange: (value) => setFormData((prev) => ({
          ...prev,
          customer_email: value
        })), name: "customer_email", autoComplete: "email", required: true }, void 0, false, {
          fileName: "app/routes/app.support.tsx",
          lineNumber: 402,
          columnNumber: 15
        }, this),
        tier === "enterprise" && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextField, { label: "Phone Number (for phone support callback)", type: "tel", value: formData.customer_phone, onChange: (value) => setFormData((prev) => ({
          ...prev,
          customer_phone: value
        })), name: "customer_phone", autoComplete: "tel", helpText: "Enterprise customers can request a phone callback for urgent issues" }, void 0, false, {
          fileName: "app/routes/app.support.tsx",
          lineNumber: 407,
          columnNumber: 41
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { distribution: "fillEvenly", children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack.Item, { fill: true, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, { label: "Category", options: [{
            label: "General",
            value: "general"
          }, {
            label: "Technical",
            value: "technical"
          }, {
            label: "Billing",
            value: "billing"
          }, ...tier === "enterprise" ? [{
            label: "Urgent",
            value: "urgent"
          }] : []], value: formData.category, onChange: (value) => setFormData((prev) => ({
            ...prev,
            category: value
          })), name: "category" }, void 0, false, {
            fileName: "app/routes/app.support.tsx",
            lineNumber: 414,
            columnNumber: 19
          }, this) }, void 0, false, {
            fileName: "app/routes/app.support.tsx",
            lineNumber: 413,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack.Item, { fill: true, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, { label: "Priority", options: [{
            label: "Low",
            value: "low"
          }, {
            label: "Normal",
            value: "normal"
          }, ...["professional", "enterprise"].includes(tier) ? [{
            label: "High",
            value: "high"
          }] : [], ...tier === "enterprise" ? [{
            label: "Urgent",
            value: "urgent"
          }] : []], value: formData.priority, onChange: (value) => setFormData((prev) => ({
            ...prev,
            priority: value
          })), name: "priority" }, void 0, false, {
            fileName: "app/routes/app.support.tsx",
            lineNumber: 433,
            columnNumber: 19
          }, this) }, void 0, false, {
            fileName: "app/routes/app.support.tsx",
            lineNumber: 432,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.support.tsx",
          lineNumber: 412,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextField, { label: "Subject", value: formData.subject, onChange: (value) => setFormData((prev) => ({
          ...prev,
          subject: value
        })), name: "subject", placeholder: "Brief description of your issue", required: true }, void 0, false, {
          fileName: "app/routes/app.support.tsx",
          lineNumber: 452,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextField, { label: "Description", value: formData.description, onChange: (value) => setFormData((prev) => ({
          ...prev,
          description: value
        })), name: "description", multiline: 6, placeholder: "Please provide detailed information about your issue, including any error messages, steps to reproduce, and what you expected to happen...", helpText: "The more details you provide, the faster we can help resolve your issue.", required: true }, void 0, false, {
          fileName: "app/routes/app.support.tsx",
          lineNumber: 457,
          columnNumber: 15
        }, this),
        tier === "starter" && (formData.priority === "high" || formData.priority === "urgent") && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Banner, { status: "info", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "High and Urgent priorities are available for Professional and Enterprise customers. Your ticket will be processed as Normal priority." }, void 0, false, {
          fileName: "app/routes/app.support.tsx",
          lineNumber: 463,
          columnNumber: 19
        }, this) }, void 0, false, {
          fileName: "app/routes/app.support.tsx",
          lineNumber: 462,
          columnNumber: 106
        }, this),
        tier !== "enterprise" && formData.category === "urgent" && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Banner, { status: "info", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "Urgent category is available for Enterprise customers only. Your ticket will be processed as Technical category." }, void 0, false, {
          fileName: "app/routes/app.support.tsx",
          lineNumber: 467,
          columnNumber: 19
        }, this) }, void 0, false, {
          fileName: "app/routes/app.support.tsx",
          lineNumber: 466,
          columnNumber: 75
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.support.tsx",
        lineNumber: 396,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.support.tsx",
      lineNumber: 392,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "app/routes/app.support.tsx",
      lineNumber: 391,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/routes/app.support.tsx",
      lineNumber: 378,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/app.support.tsx",
    lineNumber: 237,
    columnNumber: 10
  }, this);
}
_s(AppSupport, "+GKzHoLA2gHMn1gsijLBVe5kEL0=", false, function() {
  return [useLoaderData, useActionData, useNavigation];
});
_c = AppSupport;
var _c;
$RefreshReg$(_c, "AppSupport");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  AppSupport as default,
  meta
};
//# sourceMappingURL=/assets/routes/app.support-BQSVJ3M3.js.map
