import {
  Avatar,
  Badge,
  Banner,
  Button,
  ButtonGroup,
  Card,
  DataTable,
  EmptyState,
  FormLayout,
  Frame,
  Layout,
  Modal,
  Page,
  ResourceItem,
  ResourceList,
  Select,
  Tabs,
  Text,
  TextContainer,
  TextField,
  Toast
} from "/assets/_shared/chunk-OOADYVQX.js";
import "/assets/_shared/chunk-QDIWRKG7.js";
import {
  require_node
} from "/assets/_shared/chunk-5LF5TODQ.js";
import {
  useLoaderData
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

// app/routes/app.intent-os.broken.tsx
var import_node = __toESM(require_node());

// app/components/IntentOS.tsx
var import_react = __toESM(require_react());
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/IntentOS.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/IntentOS.tsx"
  );
  import.meta.hot.lastModified = "1755791240173.6946";
}
var CheckCircleIcon = () => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: "\u2705" }, void 0, false, {
  fileName: "app/components/IntentOS.tsx",
  lineNumber: 25,
  columnNumber: 31
}, this);
_c = CheckCircleIcon;
var AlertCircleIcon = () => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: "\u26A0\uFE0F" }, void 0, false, {
  fileName: "app/components/IntentOS.tsx",
  lineNumber: 27,
  columnNumber: 31
}, this);
_c2 = AlertCircleIcon;
var InfoIcon = () => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: "\u2139\uFE0F" }, void 0, false, {
  fileName: "app/components/IntentOS.tsx",
  lineNumber: 29,
  columnNumber: 24
}, this);
_c3 = InfoIcon;
var EditIcon = () => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: "\u270F\uFE0F" }, void 0, false, {
  fileName: "app/components/IntentOS.tsx",
  lineNumber: 31,
  columnNumber: 24
}, this);
_c4 = EditIcon;
var DeleteIcon = () => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("span", { children: "\u{1F5D1}\uFE0F" }, void 0, false, {
  fileName: "app/components/IntentOS.tsx",
  lineNumber: 33,
  columnNumber: 26
}, this);
_c5 = DeleteIcon;
var IntentOS = ({
  tenantId,
  promoteEnabled = false
}) => {
  _s();
  const [selectedTab, setSelectedTab] = (0, import_react.useState)(0);
  const [loading, setLoading] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const [toastActive, setToastActive] = (0, import_react.useState)(false);
  const [toastMessage, setToastMessage] = (0, import_react.useState)("");
  const [toastError, setToastError] = (0, import_react.useState)(false);
  const [overlayConfig, setOverlayConfig] = (0, import_react.useState)({
    selector: "",
    channel: "web",
    metafields: {},
    description: ""
  });
  const [overlayHistory, setOverlayHistory] = (0, import_react.useState)([]);
  const [activeOverlay, setActiveOverlay] = (0, import_react.useState)(null);
  const [overlayModalActive, setOverlayModalActive] = (0, import_react.useState)(false);
  const [intentBlocks, setIntentBlocks] = (0, import_react.useState)({});
  const [intentModalActive, setIntentModalActive] = (0, import_react.useState)(false);
  const [editingIntent, setEditingIntent] = (0, import_react.useState)(null);
  const [utmContent, setUtmContent] = (0, import_react.useState)(null);
  const [utmTerm, setUtmTerm] = (0, import_react.useState)("high-intent");
  const [productContext, setProductContext] = (0, import_react.useState)({});
  const [promoDrafts, setPromoDrafts] = (0, import_react.useState)([]);
  const [promoModalActive, setPromoModalActive] = (0, import_react.useState)(false);
  const [promoConfig, setPromoConfig] = (0, import_react.useState)({
    campaign_name: "",
    offer_details: "",
    target_audience: "",
    industry: "ecommerce",
    campaign_type: "sale"
  });
  const showToast = (0, import_react.useCallback)((message, isError = false) => {
    setToastMessage(message);
    setToastError(isError);
    setToastActive(true);
  }, []);
  const apiCall = (0, import_react.useCallback)(async (endpoint, options = {}) => {
    try {
      const response = await fetch(`/api/intent-os/${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers
        },
        ...options
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "API call failed");
      }
      return data.data;
    } catch (error2) {
      console.error(`API call failed: ${endpoint}`, error2);
      throw error2;
    }
  }, []);
  (0, import_react.useEffect)(() => {
    loadIntentBlocks();
    loadOverlayHistory();
    loadPromoDrafts();
  }, [tenantId]);
  const loadIntentBlocks = async () => {
    try {
      const blocks = await apiCall(`intent-blocks?tenantId=${tenantId}`);
      setIntentBlocks(blocks || {});
    } catch (error2) {
      console.error("Failed to load intent blocks:", error2);
    }
  };
  const loadOverlayHistory = async () => {
    try {
      const history = await apiCall(`overlay-history?tenantId=${tenantId}`);
      setOverlayHistory(history || []);
      const active = await apiCall(`overlay-active?tenantId=${tenantId}`);
      setActiveOverlay(active);
    } catch (error2) {
      console.error("Failed to load overlay history:", error2);
    }
  };
  const loadPromoDrafts = async () => {
    try {
      const drafts = await apiCall(`promo-drafts?tenantId=${tenantId}`);
      setPromoDrafts(drafts || []);
    } catch (error2) {
      console.error("Failed to load promo drafts:", error2);
    }
  };
  const applyOverlay = async () => {
    if (!promoteEnabled) {
      showToast("PROMOTE flag must be enabled to apply overlays", true);
      return;
    }
    setLoading(true);
    try {
      await apiCall("apply-overlay", {
        method: "POST",
        body: JSON.stringify({
          tenantId,
          overlayConfig,
          promote: true
        })
      });
      showToast("Metafield overlay applied successfully");
      setOverlayModalActive(false);
      loadOverlayHistory();
    } catch (error2) {
      showToast(`Failed to apply overlay: ${error2.message}`, true);
    } finally {
      setLoading(false);
    }
  };
  const revertOverlay = async (targetVersion) => {
    if (!promoteEnabled) {
      showToast("PROMOTE flag must be enabled to revert overlays", true);
      return;
    }
    setLoading(true);
    try {
      await apiCall("revert-overlay", {
        method: "POST",
        body: JSON.stringify({
          tenantId,
          targetVersion,
          promote: true
        })
      });
      showToast("Metafield overlay reverted successfully");
      loadOverlayHistory();
    } catch (error2) {
      showToast(`Failed to revert overlay: ${error2.message}`, true);
    } finally {
      setLoading(false);
    }
  };
  const generateUTMContent = async () => {
    setLoading(true);
    try {
      const content = await apiCall("utm-content", {
        method: "POST",
        body: JSON.stringify({
          tenantId,
          utmTerm,
          productContext
        })
      });
      setUtmContent(content);
      showToast("UTM content generated successfully");
    } catch (error2) {
      showToast(`Failed to generate UTM content: ${error2.message}`, true);
    } finally {
      setLoading(false);
    }
  };
  const saveIntentBlock = async () => {
    if (!editingIntent || !promoteEnabled) {
      showToast("PROMOTE flag must be enabled to save intent blocks", true);
      return;
    }
    setLoading(true);
    try {
      await apiCall("intent-blocks", {
        method: "POST",
        body: JSON.stringify({
          tenantId,
          intentKey: editingIntent.intent_key,
          blockData: editingIntent,
          promote: true
        })
      });
      showToast("Intent block saved successfully");
      setIntentModalActive(false);
      setEditingIntent(null);
      loadIntentBlocks();
    } catch (error2) {
      showToast(`Failed to save intent block: ${error2.message}`, true);
    } finally {
      setLoading(false);
    }
  };
  const createPromoDraft = async () => {
    if (!promoteEnabled) {
      showToast("PROMOTE flag must be enabled to create promo drafts", true);
      return;
    }
    setLoading(true);
    try {
      const draft = await apiCall("promo-draft", {
        method: "POST",
        body: JSON.stringify({
          tenantId,
          promoConfig,
          promote: true
        })
      });
      showToast(`Promo draft created: ${draft.draft.title}`);
      setPromoModalActive(false);
      loadPromoDrafts();
    } catch (error2) {
      showToast(`Failed to create promo draft: ${error2.message}`, true);
    } finally {
      setLoading(false);
    }
  };
  const tabs = [{
    id: "overlays",
    content: "Catalog Overlays",
    accessibilityLabel: "Metafield overlay management",
    panelID: "overlays-panel"
  }, {
    id: "intent-blocks",
    content: "Intent Blocks",
    accessibilityLabel: "Intent block management",
    panelID: "intent-blocks-panel"
  }, {
    id: "utm-content",
    content: "UTM Content",
    accessibilityLabel: "UTM-driven content generation",
    panelID: "utm-content-panel"
  }, {
    id: "promo-drafts",
    content: "Promo Drafts",
    accessibilityLabel: "AI-generated promo page drafts",
    panelID: "promo-drafts-panel"
  }];
  const renderOverlaysTab = () => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout.Section, { children: [
    !promoteEnabled && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Banner, { status: "warning", title: "PROMOTE flag disabled", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "Overlay mutations are disabled. Enable PROMOTE flag to apply changes." }, void 0, false, {
      fileName: "app/components/IntentOS.tsx",
      lineNumber: 275,
      columnNumber: 13
    }, this) }, void 0, false, {
      fileName: "app/components/IntentOS.tsx",
      lineNumber: 274,
      columnNumber: 29
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingMd", children: "Metafield Overlays" }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 288,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { primary: true, onClick: () => setOverlayModalActive(true), disabled: !promoteEnabled, children: "Apply New Overlay" }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 289,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 283,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 282,
        columnNumber: 11
      }, this),
      activeOverlay && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "flex",
        flexDirection: "column",
        gap: "1rem"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingSm", children: "Active Overlay" }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 301,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextContainer, { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { children: [
              "Version: ",
              activeOverlay.version
            ] }, void 0, true, {
              fileName: "app/components/IntentOS.tsx",
              lineNumber: 308,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { color: "subdued", children: [
              "Applied:",
              " ",
              new Date(activeOverlay.appliedAt).toLocaleString()
            ] }, void 0, true, {
              fileName: "app/components/IntentOS.tsx",
              lineNumber: 309,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "app/components/IntentOS.tsx",
            lineNumber: 307,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { destructive: true, onClick: () => revertOverlay(), disabled: !promoteEnabled, loading, children: "Revert to Previous" }, void 0, false, {
            fileName: "app/components/IntentOS.tsx",
            lineNumber: 314,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 302,
          columnNumber: 17
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 296,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 295,
        columnNumber: 29
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(DataTable, { columnContentTypes: ["text", "text", "text", "text", "text"], headings: ["Timestamp", "Action", "Selector", "Channel", "Actions"], rows: overlayHistory.map((entry) => [new Date(entry.timestamp).toLocaleString(), /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, { status: entry.action === "APPLY" ? "success" : "info", children: entry.action }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 322,
        columnNumber: 234
      }, this), entry.selector || "-", entry.channel || "web", /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ButtonGroup, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { size: "slim", onClick: () => revertOverlay(entry.timestamp), disabled: !promoteEnabled, children: "Revert to This" }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 325,
        columnNumber: 19
      }, this) }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 324,
        columnNumber: 74
      }, this)]) }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 322,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 321,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/IntentOS.tsx",
      lineNumber: 281,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/IntentOS.tsx",
    lineNumber: 273,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "app/components/IntentOS.tsx",
    lineNumber: 272,
    columnNumber: 35
  }, this);
  const renderIntentBlocksTab = () => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingMd", children: "Intent Blocks" }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 342,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { primary: true, onClick: () => {
        setEditingIntent({
          intent_key: "",
          hero_headline: "",
          benefit_bullets: [],
          proof_snippet: "",
          cta_text: "",
          url_target: "",
          updated_at: "",
          updated_by: ""
        });
        setIntentModalActive(true);
      }, disabled: !promoteEnabled, children: "Create Intent Block" }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 343,
        columnNumber: 15
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/IntentOS.tsx",
      lineNumber: 337,
      columnNumber: 13
    }, this) }, void 0, false, {
      fileName: "app/components/IntentOS.tsx",
      lineNumber: 336,
      columnNumber: 11
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card.Section, { children: Object.keys(intentBlocks).length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, { heading: "No intent blocks yet", action: {
      content: "Create your first intent block",
      onAction: () => {
        setEditingIntent({
          intent_key: "",
          hero_headline: "",
          benefit_bullets: [],
          proof_snippet: "",
          cta_text: "",
          url_target: "",
          updated_at: "",
          updated_by: ""
        });
        setIntentModalActive(true);
      }
    }, image: "https://cdn.shopify.com/s/files/1/0005/4175/0643/files/empty-state.svg", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "Intent blocks help you create targeted content for different user intents and UTM campaigns." }, void 0, false, {
      fileName: "app/components/IntentOS.tsx",
      lineNumber: 378,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "app/components/IntentOS.tsx",
      lineNumber: 362,
      columnNumber: 55
    }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ResourceList, { resourceName: {
      singular: "intent block",
      plural: "intent blocks"
    }, items: Object.entries(intentBlocks).map(([key, block]) => ({
      id: key,
      ...block
    })), renderItem: (item) => {
      const {
        id,
        hero_headline,
        proof_snippet,
        updated_at
      } = item;
      return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ResourceItem, { id, media: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Avatar, { customer: false, size: "medium", initials: id.substring(0, 2).toUpperCase() }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 395,
        columnNumber: 49
      }, this), accessibilityLabel: `View details for ${id}`, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { distribution: "fillEvenly", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { vertical: true, spacing: "extraTight", children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", fontWeight: "semibold", children: id }, void 0, false, {
            fileName: "app/components/IntentOS.tsx",
            lineNumber: 398,
            columnNumber: 27
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodySm", children: hero_headline }, void 0, false, {
            fileName: "app/components/IntentOS.tsx",
            lineNumber: 401,
            columnNumber: 27
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodySm", color: "subdued", children: proof_snippet }, void 0, false, {
            fileName: "app/components/IntentOS.tsx",
            lineNumber: 402,
            columnNumber: 27
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodySm", color: "subdued", children: [
            "Updated:",
            " ",
            updated_at ? new Date(updated_at).toLocaleString() : "Never"
          ] }, void 0, true, {
            fileName: "app/components/IntentOS.tsx",
            lineNumber: 405,
            columnNumber: 27
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 397,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ButtonGroup, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { icon: EditIcon, size: "slim", onClick: () => {
          setEditingIntent(intentBlocks[id]);
          setIntentModalActive(true);
        }, disabled: !promoteEnabled, children: "Edit" }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 411,
          columnNumber: 27
        }, this) }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 410,
          columnNumber: 25
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 396,
        columnNumber: 23
      }, this) }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 395,
        columnNumber: 20
      }, this);
    } }, void 0, false, {
      fileName: "app/components/IntentOS.tsx",
      lineNumber: 382,
      columnNumber: 31
    }, this) }, void 0, false, {
      fileName: "app/components/IntentOS.tsx",
      lineNumber: 361,
      columnNumber: 11
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/IntentOS.tsx",
    lineNumber: 335,
    columnNumber: 9
  }, this) }, void 0, false, {
    fileName: "app/components/IntentOS.tsx",
    lineNumber: 334,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "app/components/IntentOS.tsx",
    lineNumber: 333,
    columnNumber: 39
  }, this);
  const renderUTMContentTab = () => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card.Section, { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingMd", children: "UTM-Driven Content Generator" }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 429,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextContainer, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "Generate dynamic content variations based on UTM parameters for improved conversion rates." }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 431,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 430,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/IntentOS.tsx",
      lineNumber: 428,
      columnNumber: 11
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FormLayout, { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, { label: "UTM Term", options: [{
        label: "High Intent",
        value: "high-intent"
      }, {
        label: "Research Phase",
        value: "research"
      }, {
        label: "Comparison Shopping",
        value: "comparison"
      }], value: utmTerm, onChange: (value) => setUtmTerm(value) }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 440,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextField, { label: "Product Category", value: productContext.category || "", onChange: (value) => setProductContext({
        ...productContext,
        category: value
      }), placeholder: "e.g., shoes, electronics, furniture" }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 451,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextField, { label: "Discount Percentage", value: productContext.discount || "", onChange: (value) => setProductContext({
        ...productContext,
        discount: value
      }), placeholder: "e.g., 20", suffix: "%" }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 456,
        columnNumber: 15
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { primary: true, onClick: generateUTMContent, loading, children: "Generate Content Variations" }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 461,
        columnNumber: 15
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/IntentOS.tsx",
      lineNumber: 439,
      columnNumber: 13
    }, this) }, void 0, false, {
      fileName: "app/components/IntentOS.tsx",
      lineNumber: 438,
      columnNumber: 11
    }, this),
    utmContent && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
      display: "flex",
      flexDirection: "column",
      gap: "1rem"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingSm", children: "Generated Content" }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 473,
        columnNumber: 17
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { color: "subdued", children: [
        "Strategy: ",
        utmContent.strategy.urgency,
        " urgency,",
        " ",
        utmContent.strategy.social_proof,
        " social proof"
      ] }, void 0, true, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 474,
        columnNumber: 17
      }, this),
      utmContent.variations.map((variation, index) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { sectioned: true, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { vertical: true, spacing: "tight", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingSm", children: [
          "Variation ",
          index + 1
        ] }, void 0, true, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 481,
          columnNumber: 23
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Headline:" }, void 0, false, {
            fileName: "app/components/IntentOS.tsx",
            lineNumber: 483,
            columnNumber: 25
          }, this),
          " ",
          variation.hero_headline
        ] }, void 0, true, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 482,
          columnNumber: 23
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Benefits:" }, void 0, false, {
            fileName: "app/components/IntentOS.tsx",
            lineNumber: 486,
            columnNumber: 25
          }, this),
          " ",
          variation.benefit_bullets.join(" \u2022 ")
        ] }, void 0, true, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 485,
          columnNumber: 23
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "Social Proof:" }, void 0, false, {
            fileName: "app/components/IntentOS.tsx",
            lineNumber: 490,
            columnNumber: 25
          }, this),
          " ",
          variation.proof_snippet
        ] }, void 0, true, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 489,
          columnNumber: 23
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "CTA:" }, void 0, false, {
            fileName: "app/components/IntentOS.tsx",
            lineNumber: 493,
            columnNumber: 25
          }, this),
          " ",
          variation.cta_text
        ] }, void 0, true, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 492,
          columnNumber: 23
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("strong", { children: "URL:" }, void 0, false, {
            fileName: "app/components/IntentOS.tsx",
            lineNumber: 496,
            columnNumber: 25
          }, this),
          " ",
          variation.url_target
        ] }, void 0, true, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 495,
          columnNumber: 23
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 480,
        columnNumber: 21
      }, this) }, index, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 479,
        columnNumber: 66
      }, this))
    ] }, void 0, true, {
      fileName: "app/components/IntentOS.tsx",
      lineNumber: 468,
      columnNumber: 15
    }, this) }, void 0, false, {
      fileName: "app/components/IntentOS.tsx",
      lineNumber: 467,
      columnNumber: 26
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/IntentOS.tsx",
    lineNumber: 427,
    columnNumber: 9
  }, this) }, void 0, false, {
    fileName: "app/components/IntentOS.tsx",
    lineNumber: 426,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "app/components/IntentOS.tsx",
    lineNumber: 425,
    columnNumber: 37
  }, this);
  const renderPromoDraftsTab = () => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card.Section, { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "headingMd", children: "AI Promo Page Drafts" }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 514,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { primary: true, onClick: () => setPromoModalActive(true), disabled: !promoteEnabled, children: "Create Promo Draft" }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 515,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 509,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextContainer, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "AI-generated promotional page drafts. All pages remain as drafts and require manual review before publishing." }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 520,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 519,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/IntentOS.tsx",
      lineNumber: 508,
      columnNumber: 11
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card.Section, { children: promoDrafts.length === 0 ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(EmptyState, { heading: "No promo drafts yet", action: {
      content: "Create your first promo draft",
      onAction: () => setPromoModalActive(true)
    }, image: "https://cdn.shopify.com/s/files/1/0005/4175/0643/files/empty-state.svg", children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "Generate AI-powered promotional page drafts for your campaigns and offers." }, void 0, false, {
      fileName: "app/components/IntentOS.tsx",
      lineNumber: 532,
      columnNumber: 17
    }, this) }, void 0, false, {
      fileName: "app/components/IntentOS.tsx",
      lineNumber: 528,
      columnNumber: 41
    }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ResourceList, { resourceName: {
      singular: "promo draft",
      plural: "promo drafts"
    }, items: promoDrafts, renderItem: (draft) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ResourceItem, { id: draft.id, media: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Avatar, { customer: false, size: "medium", initials: "PD" }, void 0, false, {
      fileName: "app/components/IntentOS.tsx",
      lineNumber: 539,
      columnNumber: 90
    }, this), accessibilityLabel: `View details for ${draft.title}`, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { distribution: "fillEvenly", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { vertical: true, spacing: "extraTight", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodyMd", fontWeight: "semibold", children: draft.title }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 542,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodySm", children: draft.meta_description }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 545,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodySm", color: "subdued", children: [
          "Handle: /",
          draft.handle
        ] }, void 0, true, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 546,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Text, { variant: "bodySm", color: "subdued", children: [
          "Created: ",
          new Date(draft.created_at).toLocaleString()
        ] }, void 0, true, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 549,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("div", { spacing: "extraTight", children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, { status: "info", children: "DRAFT" }, void 0, false, {
            fileName: "app/components/IntentOS.tsx",
            lineNumber: 553,
            columnNumber: 27
          }, this),
          draft.tags.map((tag) => /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Badge, { children: tag }, tag, false, {
            fileName: "app/components/IntentOS.tsx",
            lineNumber: 554,
            columnNumber: 50
          }, this))
        ] }, void 0, true, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 552,
          columnNumber: 25
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 541,
        columnNumber: 23
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(ButtonGroup, { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { size: "slim", children: "Preview" }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 558,
          columnNumber: 25
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Button, { size: "slim", primary: true, children: "Review & Publish" }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 559,
          columnNumber: 25
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 557,
        columnNumber: 23
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/IntentOS.tsx",
      lineNumber: 540,
      columnNumber: 21
    }, this) }, void 0, false, {
      fileName: "app/components/IntentOS.tsx",
      lineNumber: 539,
      columnNumber: 55
    }, this) }, void 0, false, {
      fileName: "app/components/IntentOS.tsx",
      lineNumber: 536,
      columnNumber: 31
    }, this) }, void 0, false, {
      fileName: "app/components/IntentOS.tsx",
      lineNumber: 527,
      columnNumber: 11
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/IntentOS.tsx",
    lineNumber: 507,
    columnNumber: 9
  }, this) }, void 0, false, {
    fileName: "app/components/IntentOS.tsx",
    lineNumber: 506,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "app/components/IntentOS.tsx",
    lineNumber: 505,
    columnNumber: 38
  }, this);
  const toastMarkup = toastActive ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Toast, { content: toastMessage, error: toastError, onDismiss: () => setToastActive(false) }, void 0, false, {
    fileName: "app/components/IntentOS.tsx",
    lineNumber: 569,
    columnNumber: 37
  }, this) : null;
  return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Frame, { children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Page, { title: "Intent OS - Conversion Rate Optimization", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Layout.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Tabs, { tabs, selected: selectedTab, onSelect: setSelectedTab, children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Card.Section, { children: [
        selectedTab === 0 && renderOverlaysTab(),
        selectedTab === 1 && renderIntentBlocksTab(),
        selectedTab === 2 && renderUTMContentTab(),
        selectedTab === 3 && renderPromoDraftsTab()
      ] }, void 0, true, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 576,
        columnNumber: 17
      }, this) }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 575,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 574,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 573,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 572,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Modal, { open: overlayModalActive, onClose: () => setOverlayModalActive(false), title: "Apply Metafield Overlay", primaryAction: {
        content: "Apply Overlay",
        onAction: applyOverlay,
        loading,
        disabled: !promoteEnabled
      }, secondaryActions: [{
        content: "Cancel",
        onAction: () => setOverlayModalActive(false)
      }], children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Modal.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FormLayout, { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextField, { label: "CSS Selector", value: overlayConfig.selector, onChange: (value) => setOverlayConfig({
          ...overlayConfig,
          selector: value
        }), placeholder: "e.g., .product-title, #price-display", helpText: "Target element for the overlay" }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 599,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, { label: "Channel", options: [{
          label: "Web",
          value: "web"
        }, {
          label: "Mobile App",
          value: "mobile"
        }, {
          label: "Email",
          value: "email"
        }], value: overlayConfig.channel, onChange: (value) => setOverlayConfig({
          ...overlayConfig,
          channel: value
        }) }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 604,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextField, { label: "Description", value: overlayConfig.description || "", onChange: (value) => setOverlayConfig({
          ...overlayConfig,
          description: value
        }), placeholder: "Brief description of this overlay", multiline: 2 }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 618,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 598,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 597,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 588,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Modal, { open: intentModalActive, onClose: () => {
        setIntentModalActive(false);
        setEditingIntent(null);
      }, title: editingIntent?.intent_key ? "Edit Intent Block" : "Create Intent Block", primaryAction: {
        content: "Save Intent Block",
        onAction: saveIntentBlock,
        loading,
        disabled: !promoteEnabled
      }, secondaryActions: [{
        content: "Cancel",
        onAction: () => {
          setIntentModalActive(false);
          setEditingIntent(null);
        }
      }], children: editingIntent && /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Modal.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FormLayout, { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextField, { label: "Intent Key", value: editingIntent.intent_key, onChange: (value) => setEditingIntent({
          ...editingIntent,
          intent_key: value
        }), placeholder: "e.g., high-intent-sale, brand-awareness" }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 644,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextField, { label: "Hero Headline", value: editingIntent.hero_headline, onChange: (value) => setEditingIntent({
          ...editingIntent,
          hero_headline: value
        }), placeholder: "Compelling headline for this intent" }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 649,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextField, { label: "Benefit Bullets (one per line)", value: editingIntent.benefit_bullets.join("\n"), onChange: (value) => setEditingIntent({
          ...editingIntent,
          benefit_bullets: value.split("\n").filter(Boolean)
        }), multiline: 4, placeholder: "Fast Shipping\nMoney-Back Guarantee\nExpert Support" }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 654,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextField, { label: "Social Proof Snippet", value: editingIntent.proof_snippet, onChange: (value) => setEditingIntent({
          ...editingIntent,
          proof_snippet: value
        }), placeholder: "Join 10,000+ satisfied customers" }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 659,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextField, { label: "CTA Text", value: editingIntent.cta_text, onChange: (value) => setEditingIntent({
          ...editingIntent,
          cta_text: value
        }), placeholder: "Shop Now & Save" }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 664,
          columnNumber: 17
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextField, { label: "Target URL", value: editingIntent.url_target, onChange: (value) => setEditingIntent({
          ...editingIntent,
          url_target: value
        }), placeholder: "/collections/sale" }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 669,
          columnNumber: 17
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 643,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 642,
        columnNumber: 29
      }, this) }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 627,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Modal, { open: promoModalActive, onClose: () => setPromoModalActive(false), title: "Create AI Promo Draft", primaryAction: {
        content: "Generate Draft",
        onAction: createPromoDraft,
        loading,
        disabled: !promoteEnabled
      }, secondaryActions: [{
        content: "Cancel",
        onAction: () => setPromoModalActive(false)
      }], children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Modal.Section, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FormLayout, { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextField, { label: "Campaign Name", value: promoConfig.campaign_name, onChange: (value) => setPromoConfig({
          ...promoConfig,
          campaign_name: value
        }), placeholder: "Summer Sale 2024" }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 689,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextField, { label: "Offer Details", value: promoConfig.offer_details, onChange: (value) => setPromoConfig({
          ...promoConfig,
          offer_details: value
        }), placeholder: "25% off all summer items + free shipping", multiline: 2 }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 694,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(TextField, { label: "Target Audience", value: promoConfig.target_audience, onChange: (value) => setPromoConfig({
          ...promoConfig,
          target_audience: value
        }), placeholder: "Fashion-conscious millennials" }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 699,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, { label: "Industry", options: [{
          label: "E-commerce",
          value: "ecommerce"
        }, {
          label: "SaaS",
          value: "saas"
        }, {
          label: "Services",
          value: "services"
        }], value: promoConfig.industry, onChange: (value) => setPromoConfig({
          ...promoConfig,
          industry: value
        }) }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 704,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(Select, { label: "Campaign Type", options: [{
          label: "Sale/Discount",
          value: "sale"
        }, {
          label: "Product Launch",
          value: "launch"
        }, {
          label: "Seasonal",
          value: "seasonal"
        }, {
          label: "Flash Sale",
          value: "flash"
        }], value: promoConfig.campaign_type, onChange: (value) => setPromoConfig({
          ...promoConfig,
          campaign_type: value
        }) }, void 0, false, {
          fileName: "app/components/IntentOS.tsx",
          lineNumber: 718,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 688,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 687,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "app/components/IntentOS.tsx",
        lineNumber: 678,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/IntentOS.tsx",
      lineNumber: 571,
      columnNumber: 7
    }, this),
    toastMarkup
  ] }, void 0, true, {
    fileName: "app/components/IntentOS.tsx",
    lineNumber: 570,
    columnNumber: 10
  }, this);
};
_s(IntentOS, "Uhi30sht+6lQdbGMc5jFYS62FEk=");
_c6 = IntentOS;
var IntentOS_default = IntentOS;
var _c;
var _c2;
var _c3;
var _c4;
var _c5;
var _c6;
$RefreshReg$(_c, "CheckCircleIcon");
$RefreshReg$(_c2, "AlertCircleIcon");
$RefreshReg$(_c3, "InfoIcon");
$RefreshReg$(_c4, "EditIcon");
$RefreshReg$(_c5, "DeleteIcon");
$RefreshReg$(_c6, "IntentOS");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

// app/routes/app.intent-os.broken.tsx
var import_jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/app.intent-os.broken.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s2 = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/app.intent-os.broken.tsx"
  );
  import.meta.hot.lastModified = "1755791240363.7332";
}
function IntentOSPage() {
  _s2();
  const {
    tenantId,
    promoteEnabled,
    shopDomain
  } = useLoaderData();
  return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(IntentOS_default, { tenantId, promoteEnabled }, void 0, false, {
    fileName: "app/routes/app.intent-os.broken.tsx",
    lineNumber: 47,
    columnNumber: 10
  }, this);
}
_s2(IntentOSPage, "5EVCkDlXu9o1b83rKiMEZhxEPCU=", false, function() {
  return [useLoaderData];
});
_c7 = IntentOSPage;
var _c7;
$RefreshReg$(_c7, "IntentOSPage");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  IntentOSPage as default
};
//# sourceMappingURL=/assets/routes/app.intent-os.broken-XOEG4FPR.js.map
