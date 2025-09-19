import {
  boundary
} from "/assets/_shared/chunk-FRQP2GCA.js";
import {
  require_jsx_runtime
} from "/assets/_shared/chunk-I7NKL5T4.js";
import {
  AppProvider
} from "/assets/_shared/chunk-LJFOIJQN.js";
import "/assets/_shared/chunk-QDIWRKG7.js";
import {
  require_shopify
} from "/assets/_shared/chunk-7OUBBUAS.js";
import {
  require_node
} from "/assets/_shared/chunk-5LF5TODQ.js";
import {
  Link,
  Outlet,
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

// app/routes/app.tsx
var import_node = __toESM(require_node());

// node_modules/@shopify/shopify-app-remix/dist/esm/react/components/AppProvider/AppProvider.mjs
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);

// ../node_modules/@shopify/polaris/locales/en.json
var en_default = {
  Polaris: {
    ActionMenu: {
      Actions: {
        moreActions: "More actions"
      },
      RollupActions: {
        rollupButton: "View actions"
      }
    },
    ActionList: {
      SearchField: {
        clearButtonLabel: "Clear",
        search: "Search",
        placeholder: "Search actions"
      }
    },
    Avatar: {
      label: "Avatar",
      labelWithInitials: "Avatar with initials {initials}"
    },
    Autocomplete: {
      spinnerAccessibilityLabel: "Loading",
      ellipsis: "{content}\u2026"
    },
    Badge: {
      PROGRESS_LABELS: {
        incomplete: "Incomplete",
        partiallyComplete: "Partially complete",
        complete: "Complete"
      },
      TONE_LABELS: {
        info: "Info",
        success: "Success",
        warning: "Warning",
        critical: "Critical",
        attention: "Attention",
        new: "New",
        readOnly: "Read-only",
        enabled: "Enabled"
      },
      progressAndTone: "{toneLabel} {progressLabel}"
    },
    Banner: {
      dismissButton: "Dismiss notification"
    },
    Button: {
      spinnerAccessibilityLabel: "Loading"
    },
    Common: {
      checkbox: "checkbox",
      undo: "Undo",
      cancel: "Cancel",
      clear: "Clear",
      close: "Close",
      submit: "Submit",
      more: "More"
    },
    ContextualSaveBar: {
      save: "Save",
      discard: "Discard"
    },
    DataTable: {
      sortAccessibilityLabel: "sort {direction} by",
      navAccessibilityLabel: "Scroll table {direction} one column",
      totalsRowHeading: "Totals",
      totalRowHeading: "Total"
    },
    DatePicker: {
      previousMonth: "Show previous month, {previousMonthName} {showPreviousYear}",
      nextMonth: "Show next month, {nextMonth} {nextYear}",
      today: "Today ",
      start: "Start of range",
      end: "End of range",
      months: {
        january: "January",
        february: "February",
        march: "March",
        april: "April",
        may: "May",
        june: "June",
        july: "July",
        august: "August",
        september: "September",
        october: "October",
        november: "November",
        december: "December"
      },
      days: {
        monday: "Monday",
        tuesday: "Tuesday",
        wednesday: "Wednesday",
        thursday: "Thursday",
        friday: "Friday",
        saturday: "Saturday",
        sunday: "Sunday"
      },
      daysAbbreviated: {
        monday: "Mo",
        tuesday: "Tu",
        wednesday: "We",
        thursday: "Th",
        friday: "Fr",
        saturday: "Sa",
        sunday: "Su"
      }
    },
    DiscardConfirmationModal: {
      title: "Discard all unsaved changes",
      message: "If you discard changes, you\u2019ll delete any edits you made since you last saved.",
      primaryAction: "Discard changes",
      secondaryAction: "Continue editing"
    },
    DropZone: {
      single: {
        overlayTextFile: "Drop file to upload",
        overlayTextImage: "Drop image to upload",
        overlayTextVideo: "Drop video to upload",
        actionTitleFile: "Add file",
        actionTitleImage: "Add image",
        actionTitleVideo: "Add video",
        actionHintFile: "or drop file to upload",
        actionHintImage: "or drop image to upload",
        actionHintVideo: "or drop video to upload",
        labelFile: "Upload file",
        labelImage: "Upload image",
        labelVideo: "Upload video"
      },
      allowMultiple: {
        overlayTextFile: "Drop files to upload",
        overlayTextImage: "Drop images to upload",
        overlayTextVideo: "Drop videos to upload",
        actionTitleFile: "Add files",
        actionTitleImage: "Add images",
        actionTitleVideo: "Add videos",
        actionHintFile: "or drop files to upload",
        actionHintImage: "or drop images to upload",
        actionHintVideo: "or drop videos to upload",
        labelFile: "Upload files",
        labelImage: "Upload images",
        labelVideo: "Upload videos"
      },
      errorOverlayTextFile: "File type is not valid",
      errorOverlayTextImage: "Image type is not valid",
      errorOverlayTextVideo: "Video type is not valid"
    },
    EmptySearchResult: {
      altText: "Empty search results"
    },
    Frame: {
      skipToContent: "Skip to content",
      navigationLabel: "Navigation",
      Navigation: {
        closeMobileNavigationLabel: "Close navigation"
      }
    },
    FullscreenBar: {
      back: "Back",
      accessibilityLabel: "Exit fullscreen mode"
    },
    Filters: {
      moreFilters: "More filters",
      moreFiltersWithCount: "More filters ({count})",
      filter: "Filter {resourceName}",
      noFiltersApplied: "No filters applied",
      cancel: "Cancel",
      done: "Done",
      clearAllFilters: "Clear all filters",
      clear: "Clear",
      clearLabel: "Clear {filterName}",
      addFilter: "Add filter",
      clearFilters: "Clear all",
      searchInView: "in:{viewName}"
    },
    FilterPill: {
      clear: "Clear",
      unsavedChanges: "Unsaved changes - {label}"
    },
    IndexFilters: {
      searchFilterTooltip: "Search and filter",
      searchFilterTooltipWithShortcut: "Search and filter (F)",
      searchFilterAccessibilityLabel: "Search and filter results",
      sort: "Sort your results",
      addView: "Add a new view",
      newView: "Custom search",
      SortButton: {
        ariaLabel: "Sort the results",
        tooltip: "Sort",
        title: "Sort by",
        sorting: {
          asc: "Ascending",
          desc: "Descending",
          az: "A-Z",
          za: "Z-A"
        }
      },
      EditColumnsButton: {
        tooltip: "Edit columns",
        accessibilityLabel: "Customize table column order and visibility"
      },
      UpdateButtons: {
        cancel: "Cancel",
        update: "Update",
        save: "Save",
        saveAs: "Save as",
        modal: {
          title: "Save view as",
          label: "Name",
          sameName: "A view with this name already exists. Please choose a different name.",
          save: "Save",
          cancel: "Cancel"
        }
      }
    },
    IndexProvider: {
      defaultItemSingular: "Item",
      defaultItemPlural: "Items",
      allItemsSelected: "All {itemsLength}+ {resourceNamePlural} are selected",
      selected: "{selectedItemsCount} selected",
      a11yCheckboxDeselectAllSingle: "Deselect {resourceNameSingular}",
      a11yCheckboxSelectAllSingle: "Select {resourceNameSingular}",
      a11yCheckboxDeselectAllMultiple: "Deselect all {itemsLength} {resourceNamePlural}",
      a11yCheckboxSelectAllMultiple: "Select all {itemsLength} {resourceNamePlural}"
    },
    IndexTable: {
      emptySearchTitle: "No {resourceNamePlural} found",
      emptySearchDescription: "Try changing the filters or search term",
      onboardingBadgeText: "New",
      resourceLoadingAccessibilityLabel: "Loading {resourceNamePlural}\u2026",
      selectAllLabel: "Select all {resourceNamePlural}",
      selected: "{selectedItemsCount} selected",
      undo: "Undo",
      selectAllItems: "Select all {itemsLength}+ {resourceNamePlural}",
      selectItem: "Select {resourceName}",
      selectButtonText: "Select",
      sortAccessibilityLabel: "sort {direction} by"
    },
    Loading: {
      label: "Page loading bar"
    },
    Modal: {
      iFrameTitle: "body markup",
      modalWarning: "These required properties are missing from Modal: {missingProps}"
    },
    Page: {
      Header: {
        rollupActionsLabel: "View actions for {title}",
        pageReadyAccessibilityLabel: "{title}. This page is ready"
      }
    },
    Pagination: {
      previous: "Previous",
      next: "Next",
      pagination: "Pagination"
    },
    ProgressBar: {
      negativeWarningMessage: "Values passed to the progress prop shouldn\u2019t be negative. Resetting {progress} to 0.",
      exceedWarningMessage: "Values passed to the progress prop shouldn\u2019t exceed 100. Setting {progress} to 100."
    },
    ResourceList: {
      sortingLabel: "Sort by",
      defaultItemSingular: "item",
      defaultItemPlural: "items",
      showing: "Showing {itemsCount} {resource}",
      showingTotalCount: "Showing {itemsCount} of {totalItemsCount} {resource}",
      loading: "Loading {resource}",
      selected: "{selectedItemsCount} selected",
      allItemsSelected: "All {itemsLength}+ {resourceNamePlural} in your store are selected",
      allFilteredItemsSelected: "All {itemsLength}+ {resourceNamePlural} in this filter are selected",
      selectAllItems: "Select all {itemsLength}+ {resourceNamePlural} in your store",
      selectAllFilteredItems: "Select all {itemsLength}+ {resourceNamePlural} in this filter",
      emptySearchResultTitle: "No {resourceNamePlural} found",
      emptySearchResultDescription: "Try changing the filters or search term",
      selectButtonText: "Select",
      a11yCheckboxDeselectAllSingle: "Deselect {resourceNameSingular}",
      a11yCheckboxSelectAllSingle: "Select {resourceNameSingular}",
      a11yCheckboxDeselectAllMultiple: "Deselect all {itemsLength} {resourceNamePlural}",
      a11yCheckboxSelectAllMultiple: "Select all {itemsLength} {resourceNamePlural}",
      Item: {
        actionsDropdownLabel: "Actions for {accessibilityLabel}",
        actionsDropdown: "Actions dropdown",
        viewItem: "View details for {itemName}"
      },
      BulkActions: {
        actionsActivatorLabel: "Actions",
        moreActionsActivatorLabel: "More actions"
      }
    },
    SkeletonPage: {
      loadingLabel: "Page loading"
    },
    Tabs: {
      newViewAccessibilityLabel: "Create new view",
      newViewTooltip: "Create view",
      toggleTabsLabel: "More views",
      Tab: {
        rename: "Rename view",
        duplicate: "Duplicate view",
        edit: "Edit view",
        editColumns: "Edit columns",
        delete: "Delete view",
        copy: "Copy of {name}",
        deleteModal: {
          title: "Delete view?",
          description: "This can\u2019t be undone. {viewName} view will no longer be available in your admin.",
          cancel: "Cancel",
          delete: "Delete view"
        }
      },
      RenameModal: {
        title: "Rename view",
        label: "Name",
        cancel: "Cancel",
        create: "Save",
        errors: {
          sameName: "A view with this name already exists. Please choose a different name."
        }
      },
      DuplicateModal: {
        title: "Duplicate view",
        label: "Name",
        cancel: "Cancel",
        create: "Create view",
        errors: {
          sameName: "A view with this name already exists. Please choose a different name."
        }
      },
      CreateViewModal: {
        title: "Create new view",
        label: "Name",
        cancel: "Cancel",
        create: "Create view",
        errors: {
          sameName: "A view with this name already exists. Please choose a different name."
        }
      }
    },
    Tag: {
      ariaLabel: "Remove {children}"
    },
    TextField: {
      characterCount: "{count} characters",
      characterCountWithMaxLength: "{count} of {limit} characters used"
    },
    TooltipOverlay: {
      accessibilityLabel: "Tooltip: {label}"
    },
    TopBar: {
      toggleMenuLabel: "Toggle menu",
      SearchField: {
        clearButtonLabel: "Clear",
        search: "Search"
      }
    },
    MediaCard: {
      dismissButton: "Dismiss",
      popoverButton: "Actions"
    },
    VideoThumbnail: {
      playButtonA11yLabel: {
        default: "Play video",
        defaultWithDuration: "Play video of length {duration}",
        duration: {
          hours: {
            other: {
              only: "{hourCount} hours",
              andMinutes: "{hourCount} hours and {minuteCount} minutes",
              andMinute: "{hourCount} hours and {minuteCount} minute",
              minutesAndSeconds: "{hourCount} hours, {minuteCount} minutes, and {secondCount} seconds",
              minutesAndSecond: "{hourCount} hours, {minuteCount} minutes, and {secondCount} second",
              minuteAndSeconds: "{hourCount} hours, {minuteCount} minute, and {secondCount} seconds",
              minuteAndSecond: "{hourCount} hours, {minuteCount} minute, and {secondCount} second",
              andSeconds: "{hourCount} hours and {secondCount} seconds",
              andSecond: "{hourCount} hours and {secondCount} second"
            },
            one: {
              only: "{hourCount} hour",
              andMinutes: "{hourCount} hour and {minuteCount} minutes",
              andMinute: "{hourCount} hour and {minuteCount} minute",
              minutesAndSeconds: "{hourCount} hour, {minuteCount} minutes, and {secondCount} seconds",
              minutesAndSecond: "{hourCount} hour, {minuteCount} minutes, and {secondCount} second",
              minuteAndSeconds: "{hourCount} hour, {minuteCount} minute, and {secondCount} seconds",
              minuteAndSecond: "{hourCount} hour, {minuteCount} minute, and {secondCount} second",
              andSeconds: "{hourCount} hour and {secondCount} seconds",
              andSecond: "{hourCount} hour and {secondCount} second"
            }
          },
          minutes: {
            other: {
              only: "{minuteCount} minutes",
              andSeconds: "{minuteCount} minutes and {secondCount} seconds",
              andSecond: "{minuteCount} minutes and {secondCount} second"
            },
            one: {
              only: "{minuteCount} minute",
              andSeconds: "{minuteCount} minute and {secondCount} seconds",
              andSecond: "{minuteCount} minute and {secondCount} second"
            }
          },
          seconds: {
            other: "{secondCount} seconds",
            one: "{secondCount} second"
          }
        }
      }
    }
  }
};

// node_modules/@shopify/shopify-app-remix/dist/esm/react/const.mjs
var APP_BRIDGE_URL = "https://cdn.shopify.com/shopifycloud/app-bridge.js";

// node_modules/@shopify/shopify-app-remix/dist/esm/react/components/RemixPolarisLink.mjs
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var import_react = __toESM(require_react(), 1);
var RemixPolarisLink = import_react.default.forwardRef((props, ref) => (0, import_jsx_runtime.jsx)(Link, { ...props, to: props.url ?? props.to, ref }));

// node_modules/@shopify/shopify-app-remix/dist/esm/react/components/AppProvider/AppProvider.mjs
function AppProvider2(props) {
  const { children, apiKey, i18n, isEmbeddedApp = true, __APP_BRIDGE_URL = APP_BRIDGE_URL, ...polarisProps } = props;
  return (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [isEmbeddedApp && (0, import_jsx_runtime2.jsx)("script", { src: __APP_BRIDGE_URL, "data-api-key": apiKey }), (0, import_jsx_runtime2.jsx)(AppProvider, { ...polarisProps, linkComponent: RemixPolarisLink, i18n: i18n || en_default, children })] });
}

// node_modules/@shopify/shopify-app-remix/dist/esm/react/components/AppProxyProvider/AppProxyProvider.mjs
var import_jsx_runtime3 = __toESM(require_jsx_runtime(), 1);
var import_react3 = __toESM(require_react(), 1);
var AppProxyProviderContext = (0, import_react3.createContext)(null);

// node_modules/@shopify/shopify-app-remix/dist/esm/react/components/AppProxyForm/AppProxyForm.mjs
var import_jsx_runtime4 = __toESM(require_jsx_runtime(), 1);
var import_react4 = __toESM(require_react(), 1);

// node_modules/@shopify/shopify-app-remix/dist/esm/react/components/AppProxyLink/AppProxyLink.mjs
var import_jsx_runtime5 = __toESM(require_jsx_runtime(), 1);
var import_react5 = __toESM(require_react(), 1);

// ../node_modules/@shopify/polaris/build/esm/styles.css
var styles_default = "/assets/_assets/styles-M6EFPFNU.css";

// app/routes/app.tsx
var import_shopify = __toESM(require_shopify());

// app/components/ErrorBoundary.tsx
var import_react6 = __toESM(require_react());
var import_jsx_dev_runtime = __toESM(require_jsx_dev_runtime());
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/components/ErrorBoundary.tsx"
  );
  import.meta.hot.lastModified = "1758233065510.3484";
}
var ErrorBoundary = class extends import_react6.default.Component {
  constructor(props) {
    super(props);
    this.reset = () => {
      this.setState({ hasError: false, error: void 0 });
    };
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(FallbackComponent, { error: this.state.error, reset: this.reset }, void 0, false, {
          fileName: "app/components/ErrorBoundary.tsx",
          lineNumber: 46,
          columnNumber: 16
        }, this);
      }
      return /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(
        "div",
        {
          style: {
            padding: "2rem",
            background: "#fee",
            border: "1px solid #fcc",
            borderRadius: "8px",
            margin: "1rem"
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("h2", { children: "Application Error" }, void 0, false, {
              fileName: "app/components/ErrorBoundary.tsx",
              lineNumber: 59,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("p", { children: "We're sorry, but something went wrong while loading this page. Please try refreshing the page or contact support if the problem persists." }, void 0, false, {
              fileName: "app/components/ErrorBoundary.tsx",
              lineNumber: 60,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("details", { style: { marginTop: "1rem" }, children: [
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("summary", { children: "Error Details" }, void 0, false, {
                fileName: "app/components/ErrorBoundary.tsx",
                lineNumber: 62,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)("pre", { style: { fontSize: "12px", overflow: "auto" }, children: this.state.error?.message || "Unknown error" }, void 0, false, {
                fileName: "app/components/ErrorBoundary.tsx",
                lineNumber: 63,
                columnNumber: 13
              }, this)
            ] }, void 0, true, {
              fileName: "app/components/ErrorBoundary.tsx",
              lineNumber: 61,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(
              "button",
              {
                onClick: this.reset,
                style: {
                  marginTop: "1rem",
                  padding: "8px 16px",
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                },
                children: "Try Again"
              },
              void 0,
              false,
              {
                fileName: "app/components/ErrorBoundary.tsx",
                lineNumber: 67,
                columnNumber: 11
              },
              this
            ),
            /* @__PURE__ */ (0, import_jsx_dev_runtime.jsxDEV)(
              "button",
              {
                onClick: () => window.location.href = "/app",
                style: {
                  marginTop: "1rem",
                  marginLeft: "8px",
                  padding: "8px 16px",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer"
                },
                children: "Go to Dashboard"
              },
              void 0,
              false,
              {
                fileName: "app/components/ErrorBoundary.tsx",
                lineNumber: 81,
                columnNumber: 11
              },
              this
            )
          ]
        },
        void 0,
        true,
        {
          fileName: "app/components/ErrorBoundary.tsx",
          lineNumber: 50,
          columnNumber: 9
        },
        this
      );
    }
    return this.props.children;
  }
};

// app/routes/app.tsx
var import_jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime());
if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
  console.warn("remix:hmr: React Fast Refresh only works when the Remix compiler is running in development mode.");
} else {
  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = (type, id) => {
    window.$RefreshRuntime$.register(type, '"app/routes/app.tsx"' + id);
  };
  window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
}
var prevRefreshReg;
var prevRefreshSig;
var _s = $RefreshSig$();
if (import.meta) {
  import.meta.hot = createHotContext(
    //@ts-expect-error
    "app/routes/app.tsx"
  );
}
var links = () => [{
  rel: "stylesheet",
  href: styles_default
}];
function App() {
  _s();
  const {
    apiKey,
    shopName
  } = useLoaderData();
  return /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(AppProvider2, { isEmbeddedApp: true, apiKey, children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(ErrorBoundary, { children: /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { style: {
    minHeight: "100vh",
    backgroundColor: "#f6f6f7",
    padding: "0"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)("div", { id: "__shop", "data-shop-name": shopName, style: {
      display: "none"
    } }, void 0, false, {
      fileName: "app/routes/app.tsx",
      lineNumber: 84,
      columnNumber: 11
    }, this),
    /* @__PURE__ */ (0, import_jsx_dev_runtime2.jsxDEV)(Outlet, {}, void 0, false, {
      fileName: "app/routes/app.tsx",
      lineNumber: 88,
      columnNumber: 11
    }, this)
  ] }, void 0, true, {
    fileName: "app/routes/app.tsx",
    lineNumber: 77,
    columnNumber: 9
  }, this) }, void 0, false, {
    fileName: "app/routes/app.tsx",
    lineNumber: 76,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "app/routes/app.tsx",
    lineNumber: 75,
    columnNumber: 10
  }, this);
}
_s(App, "XM9QwyjgKMvz/kbJdEAuBCgM+Sw=", false, function() {
  return [useLoaderData];
});
_c = App;
var ErrorBoundary2 = boundary.error;
var _c;
$RefreshReg$(_c, "App");
window.$RefreshReg$ = prevRefreshReg;
window.$RefreshSig$ = prevRefreshSig;
export {
  ErrorBoundary2 as ErrorBoundary,
  App as default,
  links
};
//# sourceMappingURL=/assets/routes/app-KWVFUCQ3.js.map
