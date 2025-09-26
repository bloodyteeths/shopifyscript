import {
  require_hmac
} from "/assets/_shared/chunk-7OQ7YQAO.js";
import {
  Banner,
  BlockStack,
  Box,
  Button,
  Card,
  Checkbox,
  ChoiceList,
  FormLayout,
  InlineGrid,
  RangeSlider,
  Select,
  Text,
  TextField
} from "/assets/_shared/chunk-5UXC3ZLW.js";
import "/assets/_shared/chunk-QDIWRKG7.js";
import {
  require_subscription
} from "/assets/_shared/chunk-VZJ6BN4E.js";
import {
  require_node
} from "/assets/_shared/chunk-5LF5TODQ.js";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation
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

// app/routes/app.autopilot.tsx
var React3 = __toESM(require_react());
var import_node = __toESM(require_node());
var import_shopify = __toESM(require_shopify());
var import_hmac = __toESM(require_hmac());

// app/components/ClientOnly.tsx
var React = __toESM(require_react());
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/ClientOnly.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/ClientOnly.tsx"
  );
  import.meta.hot.lastModified = "1758229076653.9019";
}
function ClientOnly({
  children,
  fallback = null
}) {
  _s();
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => setHydrated(true), []);
  return hydrated ? /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: children() }, void 0, false, {
    fileName: "app/components/ClientOnly.tsx",
    lineNumber: 30,
    columnNumber: 21
  }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(import_jsx_dev_runtime.Fragment, { children: fallback }, void 0, false, {
    fileName: "app/components/ClientOnly.tsx",
    lineNumber: 30,
    columnNumber: 41
  }, this);
}
_s(ClientOnly, "/47YNaDQBvRcdaMfKv2fLgjliyI=");
_c = ClientOnly;
var _c;
$RefreshReg$(_c, "ClientOnly");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

// app/routes/app.autopilot.tsx
var import_subscription = __toESM(require_subscription());

// app/components/CampaignSetupForm.tsx
var import_react = __toESM(require_react());
var import_jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/CampaignSetupForm.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s2 = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/CampaignSetupForm.tsx"
  );
  import.meta.hot.lastModified = "1758888316144.7039";
}
function CampaignSetupForm({
  shopName,
  onGenerate
}) {
  _s2();
  const [config, setConfig] = (0, import_react.useState)({
    businessName: shopName,
    businessType: "ecommerce",
    mainProducts: "",
    targetAudience: "",
    dailyBudget: 20,
    targetCPC: 0.5,
    goal: "sales",
    alwaysOn: false,
    businessHours: {
      start: "09:00",
      end: "20:00",
      days: ["MON", "TUE", "WED", "THU", "FRI"]
    },
    keywordStrategy: "auto",
    customKeywords: "",
    adTone: "friendly",
    hasOffer: false,
    offerText: ""
  });
  const businessTypeOptions = [{
    label: "\u{1F6CD}\uFE0F E-commerce Store",
    value: "ecommerce"
  }, {
    label: "\u{1F3E2} Service Business",
    value: "service"
  }, {
    label: "\u{1F4CD} Local Business",
    value: "local"
  }, {
    label: "\u{1F4BC} B2B Company",
    value: "b2b"
  }];
  const goalOptions = [{
    label: "\u{1F4B0} Get more sales",
    value: "sales"
  }, {
    label: "\u{1F680} Increase website traffic",
    value: "traffic"
  }, {
    label: "\u{1F4E7} Generate leads",
    value: "leads"
  }];
  const toneCards = [{
    id: "professional",
    emoji: "\u{1F454}",
    label: "Professional"
  }, {
    id: "friendly",
    emoji: "\u{1F60A}",
    label: "Friendly"
  }, {
    id: "urgent",
    emoji: "\u{1F525}",
    label: "Urgent"
  }, {
    id: "luxury",
    emoji: "\u{1F48E}",
    label: "Luxurious"
  }];
  return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(BlockStack, { gap: "600", children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Banner, { title: "Quick Campaign Setup", tone: "info", children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("p", { children: "Answer a few simple questions to create your automated Google Ads campaign. Our AI will handle the rest!" }, void 0, false, {
      fileName: "app/components/CampaignSetupForm.tsx",
      lineNumber: 91,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/components/CampaignSetupForm.tsx",
      lineNumber: 90,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(BlockStack, { gap: "400", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Text, { variant: "headingMd", as: "h2", children: "1. About Your Business" }, void 0, false, {
        fileName: "app/components/CampaignSetupForm.tsx",
        lineNumber: 98,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(FormLayout, { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(TextField, { label: "Business name", value: config.businessName, onChange: (value) => setConfig({
          ...config,
          businessName: value
        }), autoComplete: "off", disabled: true }, void 0, false, {
          fileName: "app/components/CampaignSetupForm.tsx",
          lineNumber: 103,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Select, { label: "What type of business?", options: businessTypeOptions, value: config.businessType, onChange: (value) => setConfig({
          ...config,
          businessType: value
        }) }, void 0, false, {
          fileName: "app/components/CampaignSetupForm.tsx",
          lineNumber: 108,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(TextField, { label: "What do you sell? (e.g., baby clothes, organic coffee)", value: config.mainProducts, onChange: (value) => setConfig({
          ...config,
          mainProducts: value
        }), placeholder: "Enter your main products or services", autoComplete: "off" }, void 0, false, {
          fileName: "app/components/CampaignSetupForm.tsx",
          lineNumber: 113,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(TextField, { label: "Who is your target audience?", value: config.targetAudience, onChange: (value) => setConfig({
          ...config,
          targetAudience: value
        }), placeholder: "e.g., parents with young children", autoComplete: "off" }, void 0, false, {
          fileName: "app/components/CampaignSetupForm.tsx",
          lineNumber: 118,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/CampaignSetupForm.tsx",
        lineNumber: 102,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/CampaignSetupForm.tsx",
      lineNumber: 97,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/components/CampaignSetupForm.tsx",
      lineNumber: 96,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(BlockStack, { gap: "400", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Text, { variant: "headingMd", as: "h2", children: "2. Budget & Goals" }, void 0, false, {
        fileName: "app/components/CampaignSetupForm.tsx",
        lineNumber: 129,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(BlockStack, { gap: "200", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(RangeSlider, { label: `Daily budget: $${config.dailyBudget}`, value: config.dailyBudget, onChange: (value) => setConfig({
          ...config,
          dailyBudget: value
        }), min: 5, max: 500, output: true }, void 0, false, {
          fileName: "app/components/CampaignSetupForm.tsx",
          lineNumber: 134,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(RangeSlider, { label: `Target cost per click: $${config.targetCPC.toFixed(2)}`, value: config.targetCPC * 100, onChange: (value) => setConfig({
          ...config,
          targetCPC: value / 100
        }), min: 10, max: 500, output: true }, void 0, false, {
          fileName: "app/components/CampaignSetupForm.tsx",
          lineNumber: 139,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/CampaignSetupForm.tsx",
        lineNumber: 133,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(BlockStack, { gap: "200", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Text, { variant: "headingSm", as: "h3", children: "What's your main goal?" }, void 0, false, {
          fileName: "app/components/CampaignSetupForm.tsx",
          lineNumber: 146,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(ChoiceList, { title: "", choices: goalOptions.map((opt) => ({
          label: opt.label,
          value: opt.value
        })), selected: [config.goal], onChange: (selected) => setConfig({
          ...config,
          goal: selected[0]
        }) }, void 0, false, {
          fileName: "app/components/CampaignSetupForm.tsx",
          lineNumber: 149,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/CampaignSetupForm.tsx",
        lineNumber: 145,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/CampaignSetupForm.tsx",
      lineNumber: 128,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/components/CampaignSetupForm.tsx",
      lineNumber: 127,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(BlockStack, { gap: "400", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Text, { variant: "headingMd", as: "h2", children: "3. When to Show Ads" }, void 0, false, {
        fileName: "app/components/CampaignSetupForm.tsx",
        lineNumber: 163,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Checkbox, { label: "Show ads 24/7", checked: config.alwaysOn, onChange: (value) => setConfig({
        ...config,
        alwaysOn: value
      }) }, void 0, false, {
        fileName: "app/components/CampaignSetupForm.tsx",
        lineNumber: 167,
        columnNumber: 11
      }, this),
      !config.alwaysOn && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(BlockStack, { gap: "200", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(InlineGrid, { columns: 2, gap: "400", children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(TextField, { label: "Start time", type: "time", value: config.businessHours.start, onChange: (value) => setConfig({
            ...config,
            businessHours: {
              ...config.businessHours,
              start: value
            }
          }), autoComplete: "off" }, void 0, false, {
            fileName: "app/components/CampaignSetupForm.tsx",
            lineNumber: 174,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(TextField, { label: "End time", type: "time", value: config.businessHours.end, onChange: (value) => setConfig({
            ...config,
            businessHours: {
              ...config.businessHours,
              end: value
            }
          }), autoComplete: "off" }, void 0, false, {
            fileName: "app/components/CampaignSetupForm.tsx",
            lineNumber: 181,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/CampaignSetupForm.tsx",
          lineNumber: 173,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(BlockStack, { gap: "100", children: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Checkbox, { label: day, checked: config.businessHours.days.includes(day), onChange: (checked) => {
          const days = checked ? [...config.businessHours.days, day] : config.businessHours.days.filter((d) => d !== day);
          setConfig({
            ...config,
            businessHours: {
              ...config.businessHours,
              days
            }
          });
        } }, day, false, {
          fileName: "app/components/CampaignSetupForm.tsx",
          lineNumber: 191,
          columnNumber: 79
        }, this)) }, void 0, false, {
          fileName: "app/components/CampaignSetupForm.tsx",
          lineNumber: 190,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/CampaignSetupForm.tsx",
        lineNumber: 172,
        columnNumber: 32
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/CampaignSetupForm.tsx",
      lineNumber: 162,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/components/CampaignSetupForm.tsx",
      lineNumber: 161,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(BlockStack, { gap: "400", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Text, { variant: "headingMd", as: "h2", children: "4. Keyword Strategy" }, void 0, false, {
        fileName: "app/components/CampaignSetupForm.tsx",
        lineNumber: 209,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(ChoiceList, { title: "", choices: [{
        label: "\u{1F916} Let AI suggest keywords (Recommended)",
        value: "auto"
      }, {
        label: "\u{1F3F7}\uFE0F Focus on my brand name",
        value: "brand"
      }, {
        label: "\u{1F3AF} Target competitor keywords",
        value: "competitor"
      }, {
        label: "\u270F\uFE0F Use custom keywords",
        value: "custom"
      }], selected: [config.keywordStrategy], onChange: (selected) => setConfig({
        ...config,
        keywordStrategy: selected[0]
      }) }, void 0, false, {
        fileName: "app/components/CampaignSetupForm.tsx",
        lineNumber: 213,
        columnNumber: 11
      }, this),
      config.keywordStrategy === "custom" && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(TextField, { label: "Enter your keywords (comma separated)", value: config.customKeywords, onChange: (value) => setConfig({
        ...config,
        customKeywords: value
      }), multiline: 3, placeholder: "organic baby clothes, eco friendly kids wear, sustainable children clothing", autoComplete: "off" }, void 0, false, {
        fileName: "app/components/CampaignSetupForm.tsx",
        lineNumber: 230,
        columnNumber: 51
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/CampaignSetupForm.tsx",
      lineNumber: 208,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/components/CampaignSetupForm.tsx",
      lineNumber: 207,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(BlockStack, { gap: "400", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Text, { variant: "headingMd", as: "h2", children: "5. Ad Tone & Style" }, void 0, false, {
        fileName: "app/components/CampaignSetupForm.tsx",
        lineNumber: 240,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(InlineGrid, { columns: 4, gap: "400", children: toneCards.map((tone) => /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Box, { padding: "400", background: config.adTone === tone.id ? "bg-surface-selected" : "bg-surface", borderColor: "border", borderWidth: "025", borderRadius: "200", onClick: () => setConfig({
        ...config,
        adTone: tone.id
      }), children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(BlockStack, { gap: "200", inlineAlign: "center", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Text, { variant: "headingLg", as: "p", children: tone.emoji }, void 0, false, {
          fileName: "app/components/CampaignSetupForm.tsx",
          lineNumber: 250,
          columnNumber: 19
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Text, { variant: "bodyMd", as: "p", children: tone.label }, void 0, false, {
          fileName: "app/components/CampaignSetupForm.tsx",
          lineNumber: 251,
          columnNumber: 19
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/CampaignSetupForm.tsx",
        lineNumber: 249,
        columnNumber: 17
      }, this) }, tone.id, false, {
        fileName: "app/components/CampaignSetupForm.tsx",
        lineNumber: 245,
        columnNumber: 36
      }, this)) }, void 0, false, {
        fileName: "app/components/CampaignSetupForm.tsx",
        lineNumber: 244,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/CampaignSetupForm.tsx",
      lineNumber: 239,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/components/CampaignSetupForm.tsx",
      lineNumber: 238,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Card, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(BlockStack, { gap: "400", children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Text, { variant: "headingMd", as: "h2", children: "6. Special Offers (Optional)" }, void 0, false, {
        fileName: "app/components/CampaignSetupForm.tsx",
        lineNumber: 261,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Checkbox, { label: "I have a special offer to promote", checked: config.hasOffer, onChange: (value) => setConfig({
        ...config,
        hasOffer: value
      }) }, void 0, false, {
        fileName: "app/components/CampaignSetupForm.tsx",
        lineNumber: 265,
        columnNumber: 11
      }, this),
      config.hasOffer && /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(TextField, { label: "What's your offer?", value: config.offerText, onChange: (value) => setConfig({
        ...config,
        offerText: value
      }), placeholder: "e.g., Free shipping on orders over $50", autoComplete: "off" }, void 0, false, {
        fileName: "app/components/CampaignSetupForm.tsx",
        lineNumber: 270,
        columnNumber: 31
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/CampaignSetupForm.tsx",
      lineNumber: 260,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/components/CampaignSetupForm.tsx",
      lineNumber: 259,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Box, { padding: "400", children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Button, { variant: "primary", size: "large", fullWidth: true, onClick: () => onGenerate(config), disabled: !config.mainProducts || !config.targetAudience, children: "Generate My Automated Campaign Script" }, void 0, false, {
      fileName: "app/components/CampaignSetupForm.tsx",
      lineNumber: 279,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/components/CampaignSetupForm.tsx",
      lineNumber: 278,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/CampaignSetupForm.tsx",
    lineNumber: 89,
    columnNumber: 10
  }, this);
}
_s2(CampaignSetupForm, "ayDocf4+K2UDu5JoFb6eSq6DPOc=");
_c2 = CampaignSetupForm;
var _c2;
$RefreshReg$(_c2, "CampaignSetupForm");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

// app/components/MLAutopilotDashboard.tsx
var import_react2 = __toESM(require_react());
var import_jsx_dev_runtime3 = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/components/MLAutopilotDashboard.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s3 = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/MLAutopilotDashboard.tsx"
  );
  import.meta.hot.lastModified = "1758893601342.6482";
}
function MLAutopilotDashboard({
  shopName,
  mlState,
  onRefresh
}) {
  _s3();
  const [isLoading, setIsLoading] = (0, import_react2.useState)(false);
  const [lastUpdated, setLastUpdated] = (0, import_react2.useState)("");
  const refreshMLState = async () => {
    if (!onRefresh)
      return;
    setIsLoading(true);
    try {
      await onRefresh();
      setLastUpdated((/* @__PURE__ */ new Date()).toLocaleTimeString());
    } catch (error) {
      console.error("Failed to refresh ML state:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const getMaturityColor = (maturity) => {
    switch (maturity) {
      case "advanced":
        return "#28a745";
      case "intermediate":
        return "#ffc107";
      case "beginner":
        return "#17a2b8";
      default:
        return "#6c757d";
    }
  };
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8)
      return "#28a745";
    if (confidence >= 0.6)
      return "#ffc107";
    if (confidence >= 0.4)
      return "#fd7e14";
    return "#dc3545";
  };
  const formatHour = (hour) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}${period}`;
  };
  const getDayName = (day) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[day];
  };
  if (!mlState) {
    return /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
      background: "#f8f9fa",
      border: "1px solid #e9ecef",
      borderRadius: "8px",
      padding: "20px",
      marginTop: "16px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("h3", { style: {
        margin: "0 0 12px 0",
        color: "#495057"
      }, children: "\u{1F916} ML Autopilot Dashboard" }, void 0, false, {
        fileName: "app/components/MLAutopilotDashboard.tsx",
        lineNumber: 78,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("p", { style: {
        margin: 0,
        color: "#6c757d"
      }, children: "ML Autopilot is initializing. Run an autopilot tick to see insights." }, void 0, false, {
        fileName: "app/components/MLAutopilotDashboard.tsx",
        lineNumber: 84,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/MLAutopilotDashboard.tsx",
      lineNumber: 71,
      columnNumber: 12
    }, this);
  }
  return /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
    background: "white",
    border: "1px solid #e9ecef",
    borderRadius: "8px",
    padding: "20px",
    marginTop: "16px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("h3", { style: {
        margin: 0,
        color: "#495057"
      }, children: "\u{1F916} ML Autopilot Dashboard" }, void 0, false, {
        fileName: "app/components/MLAutopilotDashboard.tsx",
        lineNumber: 106,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
        display: "flex",
        alignItems: "center",
        gap: "12px"
      }, children: [
        lastUpdated && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("span", { style: {
          fontSize: "12px",
          color: "#6c757d"
        }, children: [
          "Updated: ",
          lastUpdated
        ] }, void 0, true, {
          fileName: "app/components/MLAutopilotDashboard.tsx",
          lineNumber: 117,
          columnNumber: 27
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("button", { onClick: refreshMLState, disabled: isLoading, style: {
          background: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          padding: "6px 12px",
          fontSize: "12px",
          cursor: isLoading ? "not-allowed" : "pointer",
          opacity: isLoading ? 0.6 : 1
        }, children: isLoading ? "Refreshing..." : "Refresh" }, void 0, false, {
          fileName: "app/components/MLAutopilotDashboard.tsx",
          lineNumber: 123,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/MLAutopilotDashboard.tsx",
        lineNumber: 112,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/MLAutopilotDashboard.tsx",
      lineNumber: 100,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "16px",
      marginBottom: "24px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
        background: "#f8f9fa",
        border: "1px solid #e9ecef",
        borderRadius: "6px",
        padding: "12px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          fontSize: "12px",
          color: "#6c757d",
          marginBottom: "4px"
        }, children: "ML Status" }, void 0, false, {
          fileName: "app/components/MLAutopilotDashboard.tsx",
          lineNumber: 151,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("span", { style: {
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: mlState.enabled ? "#28a745" : "#dc3545"
          } }, void 0, false, {
            fileName: "app/components/MLAutopilotDashboard.tsx",
            lineNumber: 163,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("span", { style: {
            fontWeight: "bold",
            color: mlState.enabled ? "#28a745" : "#dc3545"
          }, children: mlState.enabled ? "ACTIVE" : "LEGACY MODE" }, void 0, false, {
            fileName: "app/components/MLAutopilotDashboard.tsx",
            lineNumber: 169,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/MLAutopilotDashboard.tsx",
          lineNumber: 158,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/MLAutopilotDashboard.tsx",
        lineNumber: 145,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
        background: "#f8f9fa",
        border: "1px solid #e9ecef",
        borderRadius: "6px",
        padding: "12px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          fontSize: "12px",
          color: "#6c757d",
          marginBottom: "4px"
        }, children: "Confidence Score" }, void 0, false, {
          fileName: "app/components/MLAutopilotDashboard.tsx",
          lineNumber: 184,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          fontSize: "18px",
          fontWeight: "bold",
          color: getConfidenceColor(mlState.confidence)
        }, children: [
          (mlState.confidence * 100).toFixed(1),
          "%"
        ] }, void 0, true, {
          fileName: "app/components/MLAutopilotDashboard.tsx",
          lineNumber: 191,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/MLAutopilotDashboard.tsx",
        lineNumber: 178,
        columnNumber: 9
      }, this),
      mlState.learningState && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
        background: "#f8f9fa",
        border: "1px solid #e9ecef",
        borderRadius: "6px",
        padding: "12px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          fontSize: "12px",
          color: "#6c757d",
          marginBottom: "4px"
        }, children: "Learning Maturity" }, void 0, false, {
          fileName: "app/components/MLAutopilotDashboard.tsx",
          lineNumber: 206,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          fontSize: "14px",
          fontWeight: "bold",
          color: getMaturityColor(mlState.learningState.maturity),
          textTransform: "uppercase"
        }, children: mlState.learningState.maturity }, void 0, false, {
          fileName: "app/components/MLAutopilotDashboard.tsx",
          lineNumber: 213,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          fontSize: "11px",
          color: "#6c757d",
          marginTop: "2px"
        }, children: [
          mlState.learningState.dataPoints,
          " data points"
        ] }, void 0, true, {
          fileName: "app/components/MLAutopilotDashboard.tsx",
          lineNumber: 221,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/MLAutopilotDashboard.tsx",
        lineNumber: 200,
        columnNumber: 35
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/MLAutopilotDashboard.tsx",
      lineNumber: 139,
      columnNumber: 7
    }, this),
    mlState.insights && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
      marginBottom: "20px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("h4", { style: {
        margin: "0 0 12px 0",
        color: "#495057"
      }, children: "\u{1F4CA} Performance Insights" }, void 0, false, {
        fileName: "app/components/MLAutopilotDashboard.tsx",
        lineNumber: 235,
        columnNumber: 11
      }, this),
      mlState.insights.timeOfDayTrends && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
        background: "#e7f3ff",
        border: "1px solid #b3d9ff",
        borderRadius: "6px",
        padding: "12px",
        marginBottom: "12px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("span", { style: {
            fontWeight: "bold",
            fontSize: "14px"
          }, children: "\u{1F552} Optimal Hours" }, void 0, false, {
            fileName: "app/components/MLAutopilotDashboard.tsx",
            lineNumber: 256,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("span", { style: {
            fontSize: "12px",
            color: "#0c5460",
            background: "#d1ecf1",
            padding: "2px 6px",
            borderRadius: "3px"
          }, children: [
            ((mlState.insights.timeOfDayTrends.confidence || 0) * 100).toFixed(0),
            "% confidence"
          ] }, void 0, true, {
            fileName: "app/components/MLAutopilotDashboard.tsx",
            lineNumber: 262,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/MLAutopilotDashboard.tsx",
          lineNumber: 250,
          columnNumber: 15
        }, this),
        mlState.insights.timeOfDayTrends.highPerformanceHours?.length ? /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          fontSize: "13px",
          color: "#0c5460"
        }, children: [
          "Best performing hours: ",
          mlState.insights.timeOfDayTrends.highPerformanceHours.map(formatHour).join(", ")
        ] }, void 0, true, {
          fileName: "app/components/MLAutopilotDashboard.tsx",
          lineNumber: 272,
          columnNumber: 80
        }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          fontSize: "13px",
          color: "#6c757d"
        }, children: "Analyzing time patterns..." }, void 0, false, {
          fileName: "app/components/MLAutopilotDashboard.tsx",
          lineNumber: 277,
          columnNumber: 26
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/MLAutopilotDashboard.tsx",
        lineNumber: 243,
        columnNumber: 48
      }, this),
      mlState.insights.dayOfWeekTrends && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
        background: "#fff3cd",
        border: "1px solid #ffeaa7",
        borderRadius: "6px",
        padding: "12px",
        marginBottom: "12px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("span", { style: {
            fontWeight: "bold",
            fontSize: "14px"
          }, children: "\u{1F4C5} Optimal Days" }, void 0, false, {
            fileName: "app/components/MLAutopilotDashboard.tsx",
            lineNumber: 299,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("span", { style: {
            fontSize: "12px",
            color: "#856404",
            background: "#ffeaa7",
            padding: "2px 6px",
            borderRadius: "3px"
          }, children: [
            ((mlState.insights.dayOfWeekTrends.confidence || 0) * 100).toFixed(0),
            "% confidence"
          ] }, void 0, true, {
            fileName: "app/components/MLAutopilotDashboard.tsx",
            lineNumber: 305,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/MLAutopilotDashboard.tsx",
          lineNumber: 293,
          columnNumber: 15
        }, this),
        mlState.insights.dayOfWeekTrends.highPerformanceDays?.length ? /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          fontSize: "13px",
          color: "#856404"
        }, children: [
          "Best performing days: ",
          mlState.insights.dayOfWeekTrends.highPerformanceDays.map(getDayName).join(", ")
        ] }, void 0, true, {
          fileName: "app/components/MLAutopilotDashboard.tsx",
          lineNumber: 315,
          columnNumber: 79
        }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          fontSize: "13px",
          color: "#6c757d"
        }, children: "Analyzing day-of-week patterns..." }, void 0, false, {
          fileName: "app/components/MLAutopilotDashboard.tsx",
          lineNumber: 320,
          columnNumber: 26
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/MLAutopilotDashboard.tsx",
        lineNumber: 286,
        columnNumber: 48
      }, this),
      mlState.insights.conversionPrediction && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
        background: "#d4edda",
        border: "1px solid #c3e6cb",
        borderRadius: "6px",
        padding: "12px",
        marginBottom: "12px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("span", { style: {
            fontWeight: "bold",
            fontSize: "14px"
          }, children: "\u{1F3AF} CPA Prediction" }, void 0, false, {
            fileName: "app/components/MLAutopilotDashboard.tsx",
            lineNumber: 342,
            columnNumber: 17
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("span", { style: {
            fontSize: "12px",
            color: "#155724",
            background: "#c3e6cb",
            padding: "2px 6px",
            borderRadius: "3px"
          }, children: [
            ((mlState.insights.conversionPrediction.confidence || 0) * 100).toFixed(0),
            "% confidence"
          ] }, void 0, true, {
            fileName: "app/components/MLAutopilotDashboard.tsx",
            lineNumber: 348,
            columnNumber: 17
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/MLAutopilotDashboard.tsx",
          lineNumber: 336,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          fontSize: "13px",
          color: "#155724"
        }, children: [
          "Predicted CPA: $",
          mlState.insights.conversionPrediction.predictedCPA?.toFixed(2) || "N/A",
          mlState.insights.conversionPrediction.trend && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("span", { style: {
            marginLeft: "8px"
          }, children: [
            "(Trend: ",
            mlState.insights.conversionPrediction.trend,
            ")"
          ] }, void 0, true, {
            fileName: "app/components/MLAutopilotDashboard.tsx",
            lineNumber: 363,
            columnNumber: 65
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/MLAutopilotDashboard.tsx",
          lineNumber: 358,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/MLAutopilotDashboard.tsx",
        lineNumber: 329,
        columnNumber: 53
      }, this),
      mlState.insights.performanceForecasts && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
        background: "#f8d7da",
        border: "1px solid #f5c6cb",
        borderRadius: "6px",
        padding: "12px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          fontWeight: "bold",
          fontSize: "14px",
          marginBottom: "8px"
        }, children: "\u{1F4C8} Performance Forecasts" }, void 0, false, {
          fileName: "app/components/MLAutopilotDashboard.tsx",
          lineNumber: 378,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px"
        }, children: [
          mlState.insights.performanceForecasts.next7Days && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
              fontSize: "12px",
              color: "#721c24",
              fontWeight: "bold"
            }, children: "Next 7 Days" }, void 0, false, {
              fileName: "app/components/MLAutopilotDashboard.tsx",
              lineNumber: 391,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
              fontSize: "13px",
              color: "#721c24"
            }, children: [
              "CPA: $",
              mlState.insights.performanceForecasts.next7Days.cpa?.toFixed(2) || "N/A"
            ] }, void 0, true, {
              fileName: "app/components/MLAutopilotDashboard.tsx",
              lineNumber: 398,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
              fontSize: "13px",
              color: "#721c24"
            }, children: [
              "Conversions: ",
              mlState.insights.performanceForecasts.next7Days.conversions?.toFixed(0) || "N/A"
            ] }, void 0, true, {
              fileName: "app/components/MLAutopilotDashboard.tsx",
              lineNumber: 404,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "app/components/MLAutopilotDashboard.tsx",
            lineNumber: 390,
            columnNumber: 69
          }, this),
          mlState.insights.performanceForecasts.next30Days && /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
              fontSize: "12px",
              color: "#721c24",
              fontWeight: "bold"
            }, children: "Next 30 Days" }, void 0, false, {
              fileName: "app/components/MLAutopilotDashboard.tsx",
              lineNumber: 412,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
              fontSize: "13px",
              color: "#721c24"
            }, children: [
              "CPA: $",
              mlState.insights.performanceForecasts.next30Days.cpa?.toFixed(2) || "N/A"
            ] }, void 0, true, {
              fileName: "app/components/MLAutopilotDashboard.tsx",
              lineNumber: 419,
              columnNumber: 21
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
              fontSize: "13px",
              color: "#721c24"
            }, children: [
              "Conversions: ",
              mlState.insights.performanceForecasts.next30Days.conversions?.toFixed(0) || "N/A"
            ] }, void 0, true, {
              fileName: "app/components/MLAutopilotDashboard.tsx",
              lineNumber: 425,
              columnNumber: 21
            }, this)
          ] }, void 0, true, {
            fileName: "app/components/MLAutopilotDashboard.tsx",
            lineNumber: 411,
            columnNumber: 70
          }, this)
        ] }, void 0, true, {
          fileName: "app/components/MLAutopilotDashboard.tsx",
          lineNumber: 385,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/MLAutopilotDashboard.tsx",
        lineNumber: 372,
        columnNumber: 53
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/MLAutopilotDashboard.tsx",
      lineNumber: 232,
      columnNumber: 28
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
      borderTop: "1px solid #e9ecef",
      paddingTop: "16px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("h4", { style: {
        margin: "0 0 12px 0",
        color: "#495057"
      }, children: "\u2699\uFE0F Manual Controls" }, void 0, false, {
        fileName: "app/components/MLAutopilotDashboard.tsx",
        lineNumber: 441,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("div", { style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "8px"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("button", { style: {
          background: mlState.enabled ? "#6c757d" : "#28a745",
          color: "white",
          border: "none",
          borderRadius: "4px",
          padding: "8px 12px",
          fontSize: "12px",
          cursor: "pointer"
        }, onClick: () => {
          alert(`This would ${mlState.enabled ? "disable" : "enable"} ML Autopilot`);
        }, children: mlState.enabled ? "Switch to Legacy" : "Enable ML Mode" }, void 0, false, {
          fileName: "app/components/MLAutopilotDashboard.tsx",
          lineNumber: 452,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("button", { style: {
          background: "#17a2b8",
          color: "white",
          border: "none",
          borderRadius: "4px",
          padding: "8px 12px",
          fontSize: "12px",
          cursor: "pointer"
        }, onClick: () => {
          alert("This would force retrain the ML models with latest data");
        }, children: "Retrain Models" }, void 0, false, {
          fileName: "app/components/MLAutopilotDashboard.tsx",
          lineNumber: 467,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("button", { style: {
          background: "#dc3545",
          color: "white",
          border: "none",
          borderRadius: "4px",
          padding: "8px 12px",
          fontSize: "12px",
          cursor: "pointer"
        }, onClick: () => {
          alert("This would reset all ML learning data");
        }, children: "Reset Learning" }, void 0, false, {
          fileName: "app/components/MLAutopilotDashboard.tsx",
          lineNumber: 481,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/components/MLAutopilotDashboard.tsx",
        lineNumber: 447,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/MLAutopilotDashboard.tsx",
      lineNumber: 437,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("details", { style: {
      marginTop: "16px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("summary", { style: {
        cursor: "pointer",
        fontSize: "12px",
        color: "#6c757d",
        userSelect: "none"
      }, children: "Debug: Raw ML State" }, void 0, false, {
        fileName: "app/components/MLAutopilotDashboard.tsx",
        lineNumber: 501,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime3.jsxDEV)("pre", { style: {
        background: "#f8f9fa",
        border: "1px solid #e9ecef",
        borderRadius: "4px",
        padding: "8px",
        fontSize: "10px",
        marginTop: "8px",
        overflow: "auto",
        maxHeight: "200px"
      }, children: JSON.stringify(mlState, null, 2) }, void 0, false, {
        fileName: "app/components/MLAutopilotDashboard.tsx",
        lineNumber: 509,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/components/MLAutopilotDashboard.tsx",
      lineNumber: 498,
      columnNumber: 50
    }, this)
  ] }, void 0, true, {
    fileName: "app/components/MLAutopilotDashboard.tsx",
    lineNumber: 92,
    columnNumber: 10
  }, this);
}
_s3(MLAutopilotDashboard, "nM856SL4SSdDlQ9W3B5/6ix+tNc=");
_c3 = MLAutopilotDashboard;
var _c3;
$RefreshReg$(_c3, "MLAutopilotDashboard");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;

// app/routes/app.autopilot.tsx
var import_jsx_dev_runtime4 = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/app.autopilot.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s4 = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/app.autopilot.tsx"
  );
  import.meta.hot.lastModified = "1758893642319.5312";
}
function Autopilot() {
  _s4();
  const {
    config,
    shopName: serverShopName,
    campaignLimits
  } = useLoaderData();
  const actionData = useActionData();
  const navigation = useNavigation();
  const [mode, setMode] = React3.useState("protect");
  const [budget, setBudget] = React3.useState("20.00");
  const [cpc, setCpc] = React3.useState("0.50");
  const [url, setUrl] = React3.useState("");
  const [showAdvancedForm, setShowAdvancedForm] = React3.useState(false);
  const [toast, setToast] = React3.useState("");
  const [scriptCode, setScriptCode] = React3.useState("");
  const [showScript, setShowScript] = React3.useState(false);
  const [shopName, setShopName] = React3.useState(null);
  const [generatedAds, setGeneratedAds] = React3.useState(null);
  const [showGeneratedAds, setShowGeneratedAds] = React3.useState(false);
  const [isGeneratingAds, setIsGeneratingAds] = React3.useState(false);
  const [mlState, setMLState] = React3.useState(null);
  const [showMLDashboard, setShowMLDashboard] = React3.useState(false);
  const isGeneratingScript = navigation.state === "submitting" && navigation.formData?.get("actionType") === "generateScript";
  const generateAIAds = async () => {
    if (!shopName) {
      setToast("Error: Shop name not available");
      return;
    }
    setIsGeneratingAds(true);
    setToast("Generating AI ads...");
    try {
      const {
        backendFetch
      } = await import("/assets/_shared/hmac-UH5PTSKZ.js");
      const response = await backendFetch("/ai/generate/rsa", "POST", {
        theme: "Business",
        industry: "ecommerce",
        keywords: ["shop", "online", "store"],
        tone: "professional",
        headlineCount: 15,
        descriptionCount: 4
      }, shopName);
      if (response.ok) {
        const result = await response.json();
        if (result.ok) {
          setGeneratedAds(result);
          setShowGeneratedAds(true);
          setToast(`Generated ${result.headlines?.length || 0} headlines and ${result.descriptions?.length || 0} descriptions`);
        } else {
          setToast("Error: " + result.error);
        }
      } else {
        setToast("Error: Failed to generate AI ads");
      }
    } catch (error) {
      console.error("AI ads generation error:", error);
      setToast("Error: " + error.message);
    } finally {
      setIsGeneratingAds(false);
    }
  };
  const fetchMLState = async () => {
    if (!shopName)
      return;
    try {
      const {
        backendFetch
      } = await import("/assets/_shared/hmac-UH5PTSKZ.js");
      const response = await backendFetch("/jobs/autopilot_tick", "POST", {
        nonce: Date.now()
      }, shopName + "?dry=1");
      if (response.ok) {
        const result = await response.json();
        if (result.ok && result.ml) {
          setMLState(result.ml);
          setToast("ML state updated");
        }
      }
    } catch (error) {
      console.error("Failed to fetch ML state:", error);
      setToast("Error: Failed to fetch ML insights");
    }
  };
  const acceptAIAds = async () => {
    if (!generatedAds || !shopName) {
      setToast("Error: No ads to accept");
      return;
    }
    try {
      const {
        backendFetch
      } = await import("/assets/_shared/hmac-UH5PTSKZ.js");
      const response = await backendFetch("/ai/accept", "POST", {
        items: [{
          theme: "generated",
          headlines_pipe: generatedAds.headlines?.join("|") || "",
          descriptions_pipe: generatedAds.descriptions?.join("|") || "",
          source: "ai_generated"
        }]
      }, shopName);
      if (response.ok) {
        const result = await response.json();
        if (result.ok && result.accepted > 0) {
          setToast(`Accepted ${result.accepted} AI-generated ad sets`);
          setShowGeneratedAds(false);
          setGeneratedAds(null);
        } else {
          setToast("Error: " + (result.error || "Failed to accept ads"));
        }
      } else {
        setToast("Error: Failed to accept AI ads");
      }
    } catch (error) {
      console.error("AI ads acceptance error:", error);
      setToast("Error: " + error.message);
    }
  };
  React3.useEffect(() => {
    setShopName(serverShopName);
  }, [serverShopName]);
  React3.useEffect(() => {
    if (actionData?.success) {
      setScriptCode(actionData.script);
      setShowScript(true);
      setToast(`Script generated: ${actionData.size}KB`);
      try {
        localStorage.setItem("proofkit_generated_script", actionData.script);
        localStorage.setItem("proofkit_script_meta", JSON.stringify({
          size: actionData.size,
          shopName: actionData.shopName,
          timestamp: Date.now()
        }));
      } catch (e) {
        console.warn("Failed to store script:", e);
      }
    } else if (actionData?.error) {
      setToast("Error: " + actionData.error);
    }
  }, [actionData]);
  React3.useEffect(() => {
    try {
      const storedScript = localStorage.getItem("proofkit_generated_script");
      const storedMeta = localStorage.getItem("proofkit_script_meta");
      if (storedScript && storedMeta) {
        const meta = JSON.parse(storedMeta);
        const hourAgo = Date.now() - 60 * 60 * 1e3;
        if (meta.timestamp > hourAgo) {
          setScriptCode(storedScript);
          setShowScript(true);
          setToast(`Loaded ${meta.size}KB script`);
        } else {
          localStorage.removeItem("proofkit_generated_script");
          localStorage.removeItem("proofkit_script_meta");
        }
      }
    } catch (e) {
      console.warn("localStorage error:", e);
    }
  }, []);
  function run() {
    const config2 = `Configuration:
Mode: ${mode}
Budget: $${budget}/day
CPC: $${cpc}
URL: ${url}
Shop: ${shopName || "unknown"}`;
    alert(`Autopilot would be enabled with:

${config2}

In production, this would start the automation.`);
    setToast("Demo: Configuration shown (would enable in production)");
  }
  return /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("h1", { children: "Autopilot" }, void 0, false, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 606,
      columnNumber: 7
    }, this),
    campaignLimits && !campaignLimits.canCreate && /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
      backgroundColor: "#fef2f2",
      border: "1px solid #fecaca",
      borderRadius: "6px",
      padding: "16px",
      margin: "16px 0",
      color: "#dc2626"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("h3", { style: {
        margin: "0 0 8px 0",
        fontSize: "16px",
        fontWeight: "bold"
      }, children: "Campaign Limit Reached" }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 617,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("p", { style: {
        margin: "0 0 12px 0"
      }, children: [
        "Your ",
        campaignLimits.tier,
        " plan allows up to ",
        campaignLimits.limit,
        " campaigns. You currently have ",
        campaignLimits.current,
        " active campaigns."
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 624,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("a", { href: campaignLimits.upgradeUrl, style: {
        backgroundColor: "#dc2626",
        color: "white",
        padding: "8px 16px",
        borderRadius: "4px",
        textDecoration: "none",
        display: "inline-block"
      }, children: "Upgrade Now" }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 630,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 609,
      columnNumber: 55
    }, this),
    campaignLimits && campaignLimits.canCreate && campaignLimits.remaining <= 2 && campaignLimits.limit !== -1 && /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
      backgroundColor: "#fef3c7",
      border: "1px solid #fcd34d",
      borderRadius: "6px",
      padding: "16px",
      margin: "16px 0",
      color: "#d97706"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("h3", { style: {
        margin: "0 0 8px 0",
        fontSize: "16px",
        fontWeight: "bold"
      }, children: "Campaign Usage Warning" }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 651,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("p", { style: {
        margin: "0 0 12px 0"
      }, children: [
        "You are using ",
        campaignLimits.current,
        " of ",
        campaignLimits.limit,
        " campaigns in your ",
        campaignLimits.tier,
        " plan.",
        campaignLimits.remaining > 0 && ` You have ${campaignLimits.remaining} campaigns remaining.`
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 658,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("a", { href: campaignLimits.upgradeUrl, style: {
        backgroundColor: "#d97706",
        color: "white",
        padding: "8px 16px",
        borderRadius: "4px",
        textDecoration: "none",
        display: "inline-block"
      }, children: "Upgrade for More Campaigns" }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 664,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 643,
      columnNumber: 118
    }, this),
    toast && /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("p", { style: {
      color: "#28a745",
      padding: "8px",
      background: "#d4edda",
      borderRadius: "4px"
    }, children: toast }, void 0, false, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 679,
      columnNumber: 17
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
      marginBottom: 16
    }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("button", { onClick: () => setShowAdvancedForm(!showAdvancedForm), style: {
      background: showAdvancedForm ? "#28a745" : "#007bff",
      color: "white",
      padding: "8px 16px",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "14px"
    }, children: showAdvancedForm ? "Switch to Simple Mode" : "Switch to Advanced Setup" }, void 0, false, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 689,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 686,
      columnNumber: 7
    }, this),
    showAdvancedForm ? /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)(CampaignSetupForm, { shopName: shopName || serverShopName || "", onGenerate: (config2) => {
      setBudget(config2.dailyBudget.toString());
      setCpc(config2.targetCPC.toString());
      setUrl(config2.hasOffer ? config2.offerText : url || "");
      let mappedMode = "protect";
      if (config2.goal === "sales")
        mappedMode = "scale";
      else if (config2.goal === "traffic")
        mappedMode = "grow";
      else if (config2.goal === "leads")
        mappedMode = "protect";
      setMode(mappedMode);
      const form = document.createElement("form");
      form.method = "POST";
      form.style.display = "none";
      const fields = {
        actionType: "generateScript",
        mode: mappedMode,
        budget: config2.dailyBudget.toString(),
        cpc: config2.targetCPC.toString(),
        url: url || "",
        advancedConfig: JSON.stringify(config2)
      };
      Object.entries(fields).forEach(([name, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } }, void 0, false, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 702,
      columnNumber: 27
    }, this) : /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)(import_jsx_dev_runtime4.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("section", { style: {
        border: "1px solid #eee",
        padding: 12
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("h3", { children: "Goal" }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 739,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("label", { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("input", { type: "radio", name: "goal", value: "protect", checked: mode === "protect", onChange: () => setMode("protect") }, void 0, false, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 741,
            columnNumber: 15
          }, this),
          " ",
          "Protect (Conservative)"
        ] }, void 0, true, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 740,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("br", {}, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 744,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("label", { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("input", { type: "radio", name: "goal", value: "grow", checked: mode === "grow", onChange: () => setMode("grow") }, void 0, false, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 746,
            columnNumber: 15
          }, this),
          " ",
          "Grow (Balanced)"
        ] }, void 0, true, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 745,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("br", {}, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 749,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("label", { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("input", { type: "radio", name: "goal", value: "scale", checked: mode === "scale", onChange: () => setMode("scale") }, void 0, false, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 751,
            columnNumber: 15
          }, this),
          " ",
          "Scale (Aggressive)"
        ] }, void 0, true, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 750,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 735,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("section", { style: {
        border: "1px solid #eee",
        padding: 12
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("h3", { children: "Budget & CPC" }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 759,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
          display: "flex",
          gap: "12px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
            flex: 1
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("label", { style: {
              fontSize: "14px",
              color: "#666"
            }, children: "Daily Budget" }, void 0, false, {
              fileName: "app/routes/app.autopilot.tsx",
              lineNumber: 767,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("input", { type: "number", step: "0.01", value: budget, onChange: (e) => setBudget(e.target.value), placeholder: "$ per day", style: {
              width: "100%",
              padding: "6px"
            } }, void 0, false, {
              fileName: "app/routes/app.autopilot.tsx",
              lineNumber: 771,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 764,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
            flex: 1
          }, children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("label", { style: {
              fontSize: "14px",
              color: "#666"
            }, children: "Max CPC" }, void 0, false, {
              fileName: "app/routes/app.autopilot.tsx",
              lineNumber: 779,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("input", { type: "number", step: "0.01", value: cpc, onChange: (e) => setCpc(e.target.value), placeholder: "Max CPC", style: {
              width: "100%",
              padding: "6px"
            } }, void 0, false, {
              fileName: "app/routes/app.autopilot.tsx",
              lineNumber: 783,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 776,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 760,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 755,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("section", { style: {
        border: "1px solid #eee",
        padding: 12
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("h3", { children: "Landing URL" }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 794,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("input", { value: url, onChange: (e) => setUrl(e.target.value), placeholder: "https://example.com", style: {
          width: "100%",
          padding: "6px"
        } }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 795,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 790,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 734,
      columnNumber: 13
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
      marginTop: 8,
      padding: 12,
      background: "#e7f3ff",
      borderRadius: 4,
      marginBottom: 16
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("h4", { style: {
        margin: "0 0 8px 0",
        color: "#0c5460"
      }, children: "Autopilot Status" }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 808,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 8
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("span", { style: {
          background: "#28a745",
          color: "white",
          padding: "4px 8px",
          borderRadius: "12px",
          fontSize: "12px"
        }, children: "ACTIVE" }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 820,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("span", { children: [
          "Automation running for:",
          " ",
          /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("strong", { children: shopName || serverShopName || "Loading..." }, void 0, false, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 831,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 829,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 814,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
        fontSize: "14px",
        color: "#666"
      }, children: [
        "Budget optimization: Active",
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("br", {}, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 839,
          columnNumber: 11
        }, this),
        "AI analysis: Running every 15min",
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("br", {}, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 841,
          columnNumber: 11
        }, this),
        "Performance monitoring: Continuous",
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("br", {}, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 843,
          columnNumber: 11
        }, this),
        "Script updates: Available below"
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 834,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 801,
      columnNumber: 7
    }, this),
    !showAdvancedForm && /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
      marginTop: 8
    }, children: /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
      display: "flex",
      gap: "12px",
      flexWrap: "wrap"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)(Form, { method: "post", children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("input", { type: "hidden", name: "actionType", value: "generateScript" }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 856,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("input", { type: "hidden", name: "mode", value: mode }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 857,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("input", { type: "hidden", name: "budget", value: budget }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 858,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("input", { type: "hidden", name: "cpc", value: cpc }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 859,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("input", { type: "hidden", name: "url", value: url }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 860,
          columnNumber: 15
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("button", { type: "submit", disabled: isGeneratingScript || campaignLimits && !campaignLimits.canCreate, style: {
          background: isGeneratingScript || campaignLimits && !campaignLimits.canCreate ? "#6c757d" : "#007bff",
          color: "white",
          padding: "12px 24px",
          border: "none",
          borderRadius: "4px",
          cursor: isGeneratingScript || campaignLimits && !campaignLimits.canCreate ? "not-allowed" : "pointer",
          fontSize: "16px"
        }, title: campaignLimits && !campaignLimits.canCreate ? `Campaign limit reached. Upgrade your ${campaignLimits.tier} plan to create more campaigns.` : void 0, children: isGeneratingScript ? "Generating..." : campaignLimits && !campaignLimits.canCreate ? "Campaign Limit Reached" : "Generate Current Script" }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 861,
          columnNumber: 15
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 855,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("button", { onClick: generateAIAds, disabled: isGeneratingAds || !shopName, style: {
        background: isGeneratingAds ? "#6c757d" : "#28a745",
        color: "white",
        padding: "12px 24px",
        border: "none",
        borderRadius: "4px",
        cursor: isGeneratingAds || !shopName ? "not-allowed" : "pointer",
        fontSize: "16px"
      }, title: !shopName ? "Shop name not available" : "Generate AI-powered ad content", children: isGeneratingAds ? "Generating AI Ads..." : "Generate AI Ads" }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 873,
        columnNumber: 13
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("button", { onClick: () => {
        setShowMLDashboard(!showMLDashboard);
        if (!showMLDashboard && !mlState) {
          fetchMLState();
        }
      }, style: {
        background: "#6f42c1",
        color: "white",
        padding: "12px 24px",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "16px"
      }, title: "View ML Autopilot insights and controls", children: showMLDashboard ? "Hide ML Dashboard" : "Show ML Dashboard" }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 884,
        columnNumber: 13
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 850,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 847,
      columnNumber: 29
    }, this),
    actionData?.success && /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
      background: "#d4edda",
      border: "1px solid #c3e6cb",
      padding: "12px",
      marginTop: "12px",
      borderRadius: "4px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("h3", { children: "Script Generated Successfully!" }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 910,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("p", { children: [
        "Size: ",
        actionData.size,
        "KB for shop: ",
        actionData.shopName
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 911,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("details", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("summary", { children: "View Script (Click to expand)" }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 913,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("textarea", { readOnly: true, value: actionData.script, style: {
          width: "100%",
          height: 300,
          fontFamily: "monospace",
          fontSize: "12px",
          marginTop: "8px"
        } }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 914,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 912,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 903,
      columnNumber: 31
    }, this),
    showGeneratedAds && generatedAds && /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("section", { style: {
      border: "1px solid #28a745",
      padding: 12,
      marginTop: 12,
      borderRadius: "4px",
      background: "#f8fff9"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("h3", { children: "AI Generated Ads" }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 937,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
          display: "flex",
          gap: "8px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("button", { onClick: acceptAIAds, style: {
            background: "#28a745",
            color: "white",
            padding: "8px 16px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }, children: "Accept & Apply" }, void 0, false, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 942,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("button", { onClick: () => {
            setShowGeneratedAds(false);
            setGeneratedAds(null);
            setToast("AI ads cleared");
          }, style: {
            background: "#6c757d",
            color: "white",
            padding: "8px 16px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }, children: "Reject" }, void 0, false, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 952,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 938,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 931,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
        display: "grid",
        gap: "16px",
        gridTemplateColumns: "1fr 1fr"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("h4", { style: {
            margin: "0 0 8px 0",
            color: "#28a745"
          }, children: [
            "Headlines (",
            generatedAds.headlines?.length || 0,
            ")"
          ] }, void 0, true, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 975,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
            maxHeight: 200,
            overflowY: "auto",
            background: "white",
            border: "1px solid #ddd",
            borderRadius: "4px",
            padding: "8px"
          }, children: generatedAds.headlines?.map((headline, index) => /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
            padding: "4px 8px",
            borderBottom: index < (generatedAds.headlines?.length || 0) - 1 ? "1px solid #eee" : "none",
            fontSize: "14px"
          }, children: headline }, index, false, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 987,
            columnNumber: 67
          }, this)) || /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("p", { children: "No headlines generated" }, void 0, false, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 993,
            columnNumber: 30
          }, this) }, void 0, false, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 979,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 974,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("h4", { style: {
            margin: "0 0 8px 0",
            color: "#28a745"
          }, children: [
            "Descriptions (",
            generatedAds.descriptions?.length || 0,
            ")"
          ] }, void 0, true, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 998,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
            maxHeight: 200,
            overflowY: "auto",
            background: "white",
            border: "1px solid #ddd",
            borderRadius: "4px",
            padding: "8px"
          }, children: generatedAds.descriptions?.map((description, index) => /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
            padding: "4px 8px",
            borderBottom: index < (generatedAds.descriptions?.length || 0) - 1 ? "1px solid #eee" : "none",
            fontSize: "14px"
          }, children: description }, index, false, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 1010,
            columnNumber: 73
          }, this)) || /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("p", { children: "No descriptions generated" }, void 0, false, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 1016,
            columnNumber: 30
          }, this) }, void 0, false, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 1002,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 997,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 969,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
        marginTop: "12px",
        padding: "8px",
        background: "#e6f7ff",
        borderRadius: "4px",
        fontSize: "12px",
        color: "#0c5460"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("strong", { children: "Preview:" }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 1029,
          columnNumber: 13
        }, this),
        ' These AI-generated ads will be added to your asset library and can be used in your Google Ads campaigns. Click "Accept & Apply" to save them or "Reject" to generate new ones.'
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 1021,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 924,
      columnNumber: 44
    }, this),
    showMLDashboard && /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)(ClientOnly, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)(MLAutopilotDashboard, { shopName: shopName || serverShopName || "", mlState, onRefresh: fetchMLState }, void 0, false, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 1036,
      columnNumber: 11
    }, this) }, void 0, false, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 1035,
      columnNumber: 27
    }, this),
    showScript && /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("section", { style: {
      border: "1px solid #eee",
      padding: 12,
      marginTop: 12
    }, children: [
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10
      }, children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("h3", { children: [
          "Google Ads Script (",
          Math.round(scriptCode.length / 1024),
          "KB)"
        ] }, void 0, true, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 1050,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("div", { style: {
          display: "flex",
          gap: "8px"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("button", { onClick: () => {
            navigator.clipboard.writeText(scriptCode).then(() => {
              setToast("Script copied to clipboard!");
            }).catch(() => {
              setToast("Copy failed - select text manually");
            });
          }, style: {
            background: "#28a745",
            color: "white",
            padding: "8px 16px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }, children: "Copy Script" }, void 0, false, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 1057,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("button", { onClick: () => {
            setShowScript(false);
            setScriptCode("");
            try {
              localStorage.removeItem("proofkit_generated_script");
              localStorage.removeItem("proofkit_script_meta");
            } catch (e) {
              console.warn("Failed to clear localStorage:", e);
            }
            setToast("Script cleared");
          }, style: {
            background: "#6c757d",
            color: "white",
            padding: "8px 16px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }, children: "Clear" }, void 0, false, {
            fileName: "app/routes/app.autopilot.tsx",
            lineNumber: 1073,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 1053,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 1044,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("textarea", { readOnly: true, value: scriptCode, style: {
        width: "100%",
        height: 300,
        fontFamily: "monospace",
        fontSize: "12px"
      }, placeholder: "Script will appear here when loaded..." }, void 0, false, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 1095,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("ol", { children: [
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("li", { children: "Google Ads \u2192 Tools \u2192 Bulk actions \u2192 Scripts \u2192 + New script" }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 1102,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("li", { children: "Paste, Authorize, then Preview first" }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 1103,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ (0, import_jsx_dev_runtime4.jsxDEV)("li", { children: "If ok, Run once, then Schedule daily" }, void 0, false, {
          fileName: "app/routes/app.autopilot.tsx",
          lineNumber: 1104,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "app/routes/app.autopilot.tsx",
        lineNumber: 1101,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "app/routes/app.autopilot.tsx",
      lineNumber: 1039,
      columnNumber: 22
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/app.autopilot.tsx",
    lineNumber: 605,
    columnNumber: 10
  }, this);
}
_s4(Autopilot, "mCTMS9GohUCmSAvgIzQC52WVnmQ=", false, function() {
  return [useLoaderData, useActionData, useNavigation];
});
_c4 = Autopilot;
var _c4;
$RefreshReg$(_c4, "Autopilot");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  Autopilot as default
};
//# sourceMappingURL=/assets/routes/app.autopilot-4MQI2N6G.js.map
