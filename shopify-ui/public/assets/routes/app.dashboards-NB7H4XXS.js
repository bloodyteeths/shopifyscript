import {
  ActionList,
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  Layout,
  Modal,
  Page,
  Popover,
  ResourceItem,
  ResourceList,
  Spinner,
  SvgDeleteIcon,
  SvgEditIcon,
  SvgExportIcon,
  SvgViewIcon,
  Text,
  TextField
} from "/assets/_shared/chunk-OOADYVQX.js";
import "/assets/_shared/chunk-QDIWRKG7.js";
import {
  require_node
} from "/assets/_shared/chunk-5LF5TODQ.js";
import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useSubmit
} from "/assets/_shared/chunk-APMZZZMT.js";
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

// app/routes/app.dashboards.tsx
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
    window.$RefreshRuntime$.register(type, '"app/routes/app.dashboards.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/app.dashboards.tsx"
  );
  import.meta.hot.lastModified = "1758227317384.0745";
}
function CustomDashboards() {
  _s();
  const {
    dashboards,
    templates,
    hasEnterpriseAccess,
    currentTier,
    shopName,
    error: loaderError
  } = useLoaderData();
  const navigate = useNavigate();
  const submit = useSubmit();
  const fetcher = useFetcher();
  const [showCreateModal, setShowCreateModal] = (0, import_react.useState)(false);
  const [showTemplateModal, setShowTemplateModal] = (0, import_react.useState)(false);
  const [selectedTemplate, setSelectedTemplate] = (0, import_react.useState)(null);
  const [newDashboardName, setNewDashboardName] = (0, import_react.useState)("");
  const [newDashboardDescription, setNewDashboardDescription] = (0, import_react.useState)("");
  const [loading, setLoading] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(loaderError || "");
  const [popoverActive, setPopoverActive] = (0, import_react.useState)({});
  const handleCreateDashboard = (0, import_react.useCallback)(async () => {
    if (!newDashboardName.trim()) {
      setError("Dashboard name is required");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("action", "create_dashboard");
    formData.append("dashboard_name", newDashboardName);
    formData.append("description", newDashboardDescription);
    submit(formData, {
      method: "post"
    });
    setShowCreateModal(false);
    setNewDashboardName("");
    setNewDashboardDescription("");
    setLoading(false);
  }, [newDashboardName, newDashboardDescription, submit]);
  const handleCreateFromTemplate = (0, import_react.useCallback)(async () => {
    if (!selectedTemplate || !newDashboardName.trim()) {
      setError("Template and dashboard name are required");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append("action", "create_from_template");
    formData.append("template_id", selectedTemplate.id.toString());
    formData.append("dashboard_name", newDashboardName);
    submit(formData, {
      method: "post"
    });
    setShowTemplateModal(false);
    setSelectedTemplate(null);
    setNewDashboardName("");
    setLoading(false);
  }, [selectedTemplate, newDashboardName, submit]);
  const handleDeleteDashboard = (0, import_react.useCallback)((dashboardId) => {
    if (confirm("Are you sure you want to delete this dashboard? This action cannot be undone.")) {
      const formData = new FormData();
      formData.append("action", "delete_dashboard");
      formData.append("dashboard_id", dashboardId.toString());
      submit(formData, {
        method: "post"
      });
    }
  }, [submit]);
  const handleExportDashboard = (0, import_react.useCallback)((dashboardId, format = "json") => {
    const formData = new FormData();
    formData.append("action", "export_dashboard");
    formData.append("dashboard_id", dashboardId.toString());
    formData.append("format", format);
    submit(formData, {
      method: "post"
    });
  }, [submit]);
  const togglePopover = (0, import_react.useCallback)((dashboardId) => {
    setPopoverActive((prev) => ({
      ...prev,
      [dashboardId]: !prev[dashboardId]
    }));
  }, []);
  (0, import_react.useEffect)(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5e3);
      return () => clearTimeout(timer);
    }
  }, [error]);
  if (!hasEnterpriseAccess) {
    return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Page, { title: "Custom Dashboards", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, { heading: "Enterprise Feature", action: {
      content: "Upgrade to Enterprise",
      url: "/app/billing"
    }, image: "https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "Custom dashboards are available exclusively with the Enterprise plan ($199/month). Create personalized analytics views, drag-and-drop widgets, and build the perfect dashboard for your business needs." }, void 0, false, {
        fileName: "app/routes/app.dashboards.tsx",
        lineNumber: 307,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        marginTop: "1rem"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", as: "p", fontWeight: "semibold", children: "Enterprise Features Include:" }, void 0, false, {
          fileName: "app/routes/app.dashboards.tsx",
          lineNumber: 315,
          columnNumber: 19
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("ul", { style: {
          marginTop: "0.5rem",
          paddingLeft: "1rem"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Unlimited custom dashboards" }, void 0, false, {
            fileName: "app/routes/app.dashboards.tsx",
            lineNumber: 322,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Drag-and-drop dashboard builder" }, void 0, false, {
            fileName: "app/routes/app.dashboards.tsx",
            lineNumber: 323,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Custom KPI definitions" }, void 0, false, {
            fileName: "app/routes/app.dashboards.tsx",
            lineNumber: 324,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Advanced visualization options" }, void 0, false, {
            fileName: "app/routes/app.dashboards.tsx",
            lineNumber: 325,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Dashboard sharing and export" }, void 0, false, {
            fileName: "app/routes/app.dashboards.tsx",
            lineNumber: 326,
            columnNumber: 21
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("li", { children: "Real-time data updates" }, void 0, false, {
            fileName: "app/routes/app.dashboards.tsx",
            lineNumber: 327,
            columnNumber: 21
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.dashboards.tsx",
          lineNumber: 318,
          columnNumber: 19
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.dashboards.tsx",
        lineNumber: 312,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        marginTop: "1rem"
      }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, { status: "warning", children: [
        "Current Plan: ",
        currentTier.toUpperCase()
      ] }, void 0, true, {
        fileName: "app/routes/app.dashboards.tsx",
        lineNumber: 333,
        columnNumber: 19
      }, this) }, void 0, false, {
        fileName: "app/routes/app.dashboards.tsx",
        lineNumber: 330,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.dashboards.tsx",
      lineNumber: 303,
      columnNumber: 15
    }, this) }, void 0, false, {
      fileName: "app/routes/app.dashboards.tsx",
      lineNumber: 302,
      columnNumber: 13
    }, this) }, void 0, false, {
      fileName: "app/routes/app.dashboards.tsx",
      lineNumber: 301,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "app/routes/app.dashboards.tsx",
      lineNumber: 300,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/routes/app.dashboards.tsx",
      lineNumber: 299,
      columnNumber: 12
    }, this);
  }
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Page, { title: "Custom Dashboards", subtitle: `Enterprise feature \u2022 ${dashboards.length} dashboard${dashboards.length !== 1 ? "s" : ""}`, primaryAction: {
    content: "Create Dashboard",
    onAction: () => setShowCreateModal(true)
  }, secondaryActions: [{
    content: "Browse Templates",
    onAction: () => setShowTemplateModal(true)
  }], children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout, { children: [
    error && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Banner, { title: "Error", status: "critical", onDismiss: () => setError(""), children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: error }, void 0, false, {
      fileName: "app/routes/app.dashboards.tsx",
      lineNumber: 354,
      columnNumber: 15
    }, this) }, void 0, false, {
      fileName: "app/routes/app.dashboards.tsx",
      lineNumber: 353,
      columnNumber: 13
    }, this) }, void 0, false, {
      fileName: "app/routes/app.dashboards.tsx",
      lineNumber: 352,
      columnNumber: 19
    }, this),
    loading && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      textAlign: "center",
      padding: "2rem"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Spinner, { size: "large" }, void 0, false, {
        fileName: "app/routes/app.dashboards.tsx",
        lineNumber: 365,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        marginTop: "1rem"
      }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", children: "Processing dashboard operation..." }, void 0, false, {
        fileName: "app/routes/app.dashboards.tsx",
        lineNumber: 369,
        columnNumber: 19
      }, this) }, void 0, false, {
        fileName: "app/routes/app.dashboards.tsx",
        lineNumber: 366,
        columnNumber: 17
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.dashboards.tsx",
      lineNumber: 361,
      columnNumber: 15
    }, this) }, void 0, false, {
      fileName: "app/routes/app.dashboards.tsx",
      lineNumber: 360,
      columnNumber: 13
    }, this) }, void 0, false, {
      fileName: "app/routes/app.dashboards.tsx",
      lineNumber: 359,
      columnNumber: 21
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout.Section, { children: dashboards.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, { heading: "No custom dashboards yet", action: {
      content: "Create your first dashboard",
      onAction: () => setShowCreateModal(true)
    }, secondaryAction: {
      content: "Browse templates",
      onAction: () => setShowTemplateModal(true)
    }, image: "https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "Build custom analytics dashboards tailored to your business needs. Start from scratch or choose from our pre-built templates." }, void 0, false, {
      fileName: "app/routes/app.dashboards.tsx",
      lineNumber: 385,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "app/routes/app.dashboards.tsx",
      lineNumber: 378,
      columnNumber: 15
    }, this) }, void 0, false, {
      fileName: "app/routes/app.dashboards.tsx",
      lineNumber: 377,
      columnNumber: 38
    }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ResourceList, { resourceName: {
      singular: "dashboard",
      plural: "dashboards"
    }, items: dashboards, renderItem: (dashboard) => {
      const {
        id,
        dashboard_name,
        description,
        is_default,
        view_count,
        updated_at,
        widgets
      } = dashboard;
      const shortcutActions = [{
        content: "View Dashboard",
        onAction: () => navigate(`/app/dashboards/${id}`)
      }, {
        content: "Edit Dashboard",
        onAction: () => navigate(`/app/dashboards/${id}/edit`)
      }, {
        content: "Export as JSON",
        onAction: () => handleExportDashboard(id, "json")
      }, {
        content: "Delete Dashboard",
        destructive: true,
        onAction: () => handleDeleteDashboard(id)
      }];
      return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ResourceItem, { id: id.toString(), url: `/app/dashboards/${id}`, accessibilityLabel: `View dashboard ${dashboard_name}`, media: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Avatar, { customer: false, size: "medium", name: dashboard_name }, void 0, false, {
        fileName: "app/routes/app.dashboards.tsx",
        lineNumber: 418,
        columnNumber: 146
      }, this), shortcutActions, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { distribution: "fill", alignment: "center", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { vertical: true, spacing: "tight", children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { spacing: "tight", children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", fontWeight: "semibold", children: dashboard_name }, void 0, false, {
              fileName: "app/routes/app.dashboards.tsx",
              lineNumber: 422,
              columnNumber: 29
            }, this),
            is_default && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, { status: "info", children: "Default" }, void 0, false, {
              fileName: "app/routes/app.dashboards.tsx",
              lineNumber: 425,
              columnNumber: 44
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.dashboards.tsx",
            lineNumber: 421,
            columnNumber: 27
          }, this),
          description && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodySm", color: "subdued", children: description }, void 0, false, {
            fileName: "app/routes/app.dashboards.tsx",
            lineNumber: 427,
            columnNumber: 43
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { spacing: "tight", children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodySm", color: "subdued", children: [
              widgets?.length || 0,
              " widgets \u2022 ",
              view_count,
              " views"
            ] }, void 0, true, {
              fileName: "app/routes/app.dashboards.tsx",
              lineNumber: 431,
              columnNumber: 29
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodySm", color: "subdued", children: [
              "Updated ",
              new Date(updated_at).toLocaleDateString()
            ] }, void 0, true, {
              fileName: "app/routes/app.dashboards.tsx",
              lineNumber: 434,
              columnNumber: 29
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.dashboards.tsx",
            lineNumber: 430,
            columnNumber: 27
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.dashboards.tsx",
          lineNumber: 420,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Popover, { active: popoverActive[id] || false, activator: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { disclosure: true, size: "slim", onClick: () => togglePopover(id), children: "Actions" }, void 0, false, {
          fileName: "app/routes/app.dashboards.tsx",
          lineNumber: 440,
          columnNumber: 81
        }, this), onClose: () => togglePopover(id), children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ActionList, { items: [{
          content: "View Dashboard",
          icon: SvgViewIcon,
          onAction: () => {
            navigate(`/app/dashboards/${id}`);
            togglePopover(id);
          }
        }, {
          content: "Edit Dashboard",
          icon: SvgEditIcon,
          onAction: () => {
            navigate(`/app/dashboards/${id}/edit`);
            togglePopover(id);
          }
        }, {
          content: "Export Dashboard",
          icon: SvgExportIcon,
          onAction: () => {
            handleExportDashboard(id);
            togglePopover(id);
          }
        }, {
          content: "Delete Dashboard",
          icon: SvgDeleteIcon,
          destructive: true,
          onAction: () => {
            handleDeleteDashboard(id);
            togglePopover(id);
          }
        }] }, void 0, false, {
          fileName: "app/routes/app.dashboards.tsx",
          lineNumber: 443,
          columnNumber: 27
        }, this) }, void 0, false, {
          fileName: "app/routes/app.dashboards.tsx",
          lineNumber: 440,
          columnNumber: 25
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.dashboards.tsx",
        lineNumber: 419,
        columnNumber: 23
      }, this) }, void 0, false, {
        fileName: "app/routes/app.dashboards.tsx",
        lineNumber: 418,
        columnNumber: 20
      }, this);
    } }, void 0, false, {
      fileName: "app/routes/app.dashboards.tsx",
      lineNumber: 391,
      columnNumber: 15
    }, this) }, void 0, false, {
      fileName: "app/routes/app.dashboards.tsx",
      lineNumber: 390,
      columnNumber: 23
    }, this) }, void 0, false, {
      fileName: "app/routes/app.dashboards.tsx",
      lineNumber: 376,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Modal, { open: showCreateModal, onClose: () => setShowCreateModal(false), title: "Create New Dashboard", primaryAction: {
      content: "Create Dashboard",
      onAction: handleCreateDashboard,
      loading: fetcher.state === "submitting"
    }, secondaryActions: [{
      content: "Cancel",
      onAction: () => setShowCreateModal(false)
    }], children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Modal.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { vertical: true, spacing: "loose", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextField, { label: "Dashboard Name", value: newDashboardName, onChange: setNewDashboardName, placeholder: "e.g., Q4 Performance Overview", autoComplete: "off" }, void 0, false, {
        fileName: "app/routes/app.dashboards.tsx",
        lineNumber: 491,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextField, { label: "Description (optional)", value: newDashboardDescription, onChange: setNewDashboardDescription, placeholder: "Brief description of what this dashboard shows", multiline: 3, autoComplete: "off" }, void 0, false, {
        fileName: "app/routes/app.dashboards.tsx",
        lineNumber: 492,
        columnNumber: 15
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.dashboards.tsx",
      lineNumber: 490,
      columnNumber: 13
    }, this) }, void 0, false, {
      fileName: "app/routes/app.dashboards.tsx",
      lineNumber: 489,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "app/routes/app.dashboards.tsx",
      lineNumber: 481,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Modal, { open: showTemplateModal, onClose: () => setShowTemplateModal(false), title: "Choose Dashboard Template", primaryAction: {
      content: "Create from Template",
      onAction: handleCreateFromTemplate,
      disabled: !selectedTemplate || !newDashboardName,
      loading: fetcher.state === "submitting"
    }, secondaryActions: [{
      content: "Cancel",
      onAction: () => setShowTemplateModal(false)
    }], large: true, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Modal.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { vertical: true, spacing: "loose", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextField, { label: "Dashboard Name", value: newDashboardName, onChange: setNewDashboardName, placeholder: "e.g., My Performance Dashboard", autoComplete: "off" }, void 0, false, {
        fileName: "app/routes/app.dashboards.tsx",
        lineNumber: 509,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingMd", children: "Available Templates" }, void 0, false, {
        fileName: "app/routes/app.dashboards.tsx",
        lineNumber: 511,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "1rem"
      }, children: templates.map((template) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { subdued: selectedTemplate?.id !== template.id, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        padding: "1rem",
        cursor: "pointer",
        border: selectedTemplate?.id === template.id ? "2px solid #5C6AC4" : "2px solid transparent"
      }, onClick: () => setSelectedTemplate(template), children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { vertical: true, spacing: "tight", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Stack, { distribution: "equalSpacing", children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", fontWeight: "semibold", children: template.template_name }, void 0, false, {
            fileName: "app/routes/app.dashboards.tsx",
            lineNumber: 526,
            columnNumber: 27
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, { children: template.template_category }, void 0, false, {
            fileName: "app/routes/app.dashboards.tsx",
            lineNumber: 529,
            columnNumber: 27
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.dashboards.tsx",
          lineNumber: 525,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodySm", color: "subdued", children: template.template_description }, void 0, false, {
          fileName: "app/routes/app.dashboards.tsx",
          lineNumber: 531,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, { status: "info", children: [
          template.tier_requirement.toUpperCase(),
          " tier"
        ] }, void 0, true, {
          fileName: "app/routes/app.dashboards.tsx",
          lineNumber: 534,
          columnNumber: 25
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.dashboards.tsx",
        lineNumber: 524,
        columnNumber: 23
      }, this) }, void 0, false, {
        fileName: "app/routes/app.dashboards.tsx",
        lineNumber: 519,
        columnNumber: 21
      }, this) }, template.id, false, {
        fileName: "app/routes/app.dashboards.tsx",
        lineNumber: 518,
        columnNumber: 44
      }, this)) }, void 0, false, {
        fileName: "app/routes/app.dashboards.tsx",
        lineNumber: 513,
        columnNumber: 15
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.dashboards.tsx",
      lineNumber: 508,
      columnNumber: 13
    }, this) }, void 0, false, {
      fileName: "app/routes/app.dashboards.tsx",
      lineNumber: 507,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "app/routes/app.dashboards.tsx",
      lineNumber: 498,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/app.dashboards.tsx",
    lineNumber: 350,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "app/routes/app.dashboards.tsx",
    lineNumber: 343,
    columnNumber: 10
  }, this);
}
_s(CustomDashboards, "VvMMeXo3t+8pcjp8PK984tB8pnU=", false, function() {
  return [useLoaderData, useNavigate, useSubmit, useFetcher];
});
_c = CustomDashboards;
var _c;
$RefreshReg$(_c, "CustomDashboards");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  CustomDashboards as default
};
//# sourceMappingURL=/assets/routes/app.dashboards-NB7H4XXS.js.map
