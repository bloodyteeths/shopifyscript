/**
 * Enterprise Dashboard Builder Component
 * Drag-and-drop interface for building custom dashboards
 *
 * Features:
 * - React Grid Layout for drag-and-drop positioning
 * - Widget library with various chart types
 * - Real-time preview and configuration
 * - Responsive grid system
 * - Theme customization
 */

import React, { useState, useCallback, useMemo, useRef } from "react";
// @ts-expect-error no type declarations for react-grid-layout
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import {
  Card,
  InlineStack,
  BlockStack,
  Text,
  Button,
  Modal,
  Select,
  TextField,
  ButtonGroup,
  Badge,
  Spinner,
  Banner,
  Popover,
  ActionList,
  Tooltip,
  ColorPicker,
  Checkbox,
  RangeSlider,
  Tabs,
  Divider,
  Box
} from "@shopify/polaris";
import {
  PlusIcon,
  EditIcon,
  DeleteIcon,
  DragHandleIcon,
  SettingsIcon,
  ViewIcon,
  SaveIcon,
  UndoIcon,
  RedoIcon
} from "@shopify/polaris-icons";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from "recharts";

// CSS imports for react-grid-layout
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

// Types
interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  dataSource: DataSource;
  config: any;
  position: Layout;
}

type WidgetType =
  | 'metric_card'
  | 'line_chart'
  | 'bar_chart'
  | 'area_chart'
  | 'pie_chart'
  | 'table'
  | 'kpi_grid'
  | 'heatmap'
  | 'funnel';

type DataSource = 'metrics' | 'campaigns' | 'search_terms' | 'kpis';

interface DashboardBuilderProps {
  initialWidgets?: WidgetConfig[];
  onSave: (config: DashboardConfig) => void;
  onPreview: () => void;
  isLoading?: boolean;
  theme?: DashboardTheme;
}

interface DashboardConfig {
  layout: Layout[];
  widgets: WidgetConfig[];
  theme: DashboardTheme;
  settings: DashboardSettings;
}

interface DashboardTheme {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  cardStyle: 'elevated' | 'bordered' | 'minimal';
  fontFamily: string;
}

interface DashboardSettings {
  autoRefresh: boolean;
  refreshInterval: number;
  showGrid: boolean;
  compactMode: boolean;
}

// Widget type configurations
const WIDGET_TYPES: Record<string, {
  name: string;
  icon: string;
  defaultSize: { w: number; h: number; minW: number; minH: number };
  description: string;
}> = {
  metric_card: {
    name: 'Metric Card',
    icon: 'Chart',
    defaultSize: { w: 3, h: 2, minW: 2, minH: 2 },
    description: 'Display a single metric with trend'
  },
  line_chart: {
    name: 'Line Chart',
    icon: 'Line',
    defaultSize: { w: 6, h: 4, minW: 4, minH: 3 },
    description: 'Show trends over time'
  },
  bar_chart: {
    name: 'Bar Chart',
    icon: 'Bar',
    defaultSize: { w: 6, h: 4, minW: 4, minH: 3 },
    description: 'Compare values across categories'
  },
  area_chart: {
    name: 'Area Chart',
    icon: 'Area',
    defaultSize: { w: 8, h: 4, minW: 4, minH: 3 },
    description: 'Filled area chart for cumulative data'
  },
  pie_chart: {
    name: 'Pie Chart',
    icon: 'Pie',
    defaultSize: { w: 4, h: 4, minW: 3, minH: 3 },
    description: 'Show proportional data'
  },
  table: {
    name: 'Data Table',
    icon: 'Table',
    defaultSize: { w: 8, h: 4, minW: 4, minH: 3 },
    description: 'Tabular data display'
  },
  kpi_grid: {
    name: 'KPI Grid',
    icon: 'KPI',
    defaultSize: { w: 12, h: 3, minW: 6, minH: 2 },
    description: 'Grid of key performance indicators'
  }
};

const DATA_SOURCES = {
  metrics: { name: 'Performance Metrics', icon: '' },
  campaigns: { name: 'Campaign Data', icon: '' },
  search_terms: { name: 'Search Terms', icon: '' },
  kpis: { name: 'Custom KPIs', icon: '' }
};

// Default theme
const DEFAULT_THEME: DashboardTheme = {
  primaryColor: '#5C6AC4',
  secondaryColor: '#00A047',
  backgroundColor: '#f8f9fa',
  cardStyle: 'elevated',
  fontFamily: 'Inter, sans-serif'
};

// Default settings
const DEFAULT_SETTINGS: DashboardSettings = {
  autoRefresh: true,
  refreshInterval: 300, // 5 minutes
  showGrid: true,
  compactMode: false
};

// Mock data for preview
const MOCK_DATA = {
  metrics: [
    { date: '2023-10-01', value: 1200 },
    { date: '2023-10-02', value: 1350 },
    { date: '2023-10-03', value: 1100 },
    { date: '2023-10-04', value: 1800 },
    { date: '2023-10-05', value: 1650 }
  ],
  kpi: {
    clicks: 45621,
    cost: 1250.50,
    conversions: 142,
    ctr: 3.2,
    cpc: 0.87
  }
};

export const DashboardBuilder: React.FC<DashboardBuilderProps> = ({
  initialWidgets = [],
  onSave,
  onPreview,
  isLoading = false,
  theme = DEFAULT_THEME
}) => {
  // State management
  const [widgets, setWidgets] = useState<WidgetConfig[]>(initialWidgets);
  const [selectedWidget, setSelectedWidget] = useState<WidgetConfig | null>(null);
  const [showWidgetModal, setShowWidgetModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<DashboardTheme>(theme);
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS);
  const [history, setHistory] = useState<DashboardConfig[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);

  // Current selected tab for widget configuration
  const [configTab, setConfigTab] = useState(0);
  const configTabs = useMemo(() => [
    { id: 'basic', content: 'Basic Settings' },
    { id: 'data', content: 'Data Source' },
    { id: 'display', content: 'Display Options' }
  ], []);

  // Generate unique widget ID
  const generateWidgetId = useCallback(() => {
    return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Convert widgets to layout format
  const getLayoutFromWidgets = useCallback((widgetList: WidgetConfig[]): Layout[] => {
    return widgetList.map(widget => ({
      i: widget.id,
      x: widget.position.x,
      y: widget.position.y,
      w: widget.position.w,
      h: widget.position.h,
      minW: widget.position.minW,
      minH: widget.position.minH
    }));
  }, []);

  // Handle layout change (drag/resize)
  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    setWidgets(prevWidgets =>
      prevWidgets.map(widget => {
        const layoutItem = newLayout.find(item => item.i === widget.id);
        if (layoutItem) {
          return {
            ...widget,
            position: { ...widget.position, ...layoutItem }
          };
        }
        return widget;
      })
    );
  }, []);

  // Add new widget
  const addWidget = useCallback((type: WidgetType, dataSource: DataSource) => {
    const widgetType = WIDGET_TYPES[type];
    const newWidget: WidgetConfig = {
      id: generateWidgetId(),
      type,
      title: `New ${widgetType.name}`,
      dataSource,
      config: {
        metrics: type === 'kpi_grid' ? ['clicks', 'cost', 'conversions'] : ['clicks'],
        dateRange: '30d',
        showTrend: true,
        chartColor: currentTheme.primaryColor
      },
      position: {
        i: '',
        x: 0,
        y: 0,
        ...widgetType.defaultSize
      }
    };

    // Find available position
    const currentLayout = getLayoutFromWidgets(widgets);
    let x = 0;
    let y = 0;

    // Simple algorithm to find next available position
    while (currentLayout.some(item =>
      item.x === x && item.y === y &&
      item.x + item.w > x && item.y + item.h > y
    )) {
      x += 1;
      if (x + newWidget.position.w > 12) {
        x = 0;
        y += 1;
      }
    }

    newWidget.position.x = x;
    newWidget.position.y = y;
    newWidget.position.i = newWidget.id;

    setWidgets(prev => [...prev, newWidget]);
    setSelectedWidget(newWidget);
  }, [widgets, generateWidgetId, getLayoutFromWidgets, currentTheme.primaryColor]);

  // Remove widget
  const removeWidget = useCallback((widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId));
    if (selectedWidget?.id === widgetId) {
      setSelectedWidget(null);
    }
  }, [selectedWidget]);

  // Update widget configuration
  const updateWidget = useCallback((widgetId: string, updates: Partial<WidgetConfig>) => {
    setWidgets(prev =>
      prev.map(widget =>
        widget.id === widgetId
          ? { ...widget, ...updates }
          : widget
      )
    );
  }, []);

  // Save dashboard
  const handleSave = useCallback(() => {
    const config: DashboardConfig = {
      layout: getLayoutFromWidgets(widgets),
      widgets,
      theme: currentTheme,
      settings
    };

    // Add to history
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(config);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    onSave(config);
  }, [widgets, currentTheme, settings, getLayoutFromWidgets, onSave, history, historyIndex]);

  // Undo/Redo functionality
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevConfig = history[historyIndex - 1];
      setWidgets(prevConfig.widgets);
      setCurrentTheme(prevConfig.theme);
      setSettings(prevConfig.settings);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextConfig = history[historyIndex + 1];
      setWidgets(nextConfig.widgets);
      setCurrentTheme(nextConfig.theme);
      setSettings(nextConfig.settings);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // Widget renderer
  const renderWidget = useCallback((widget: WidgetConfig) => {
    const isSelected = selectedWidget?.id === widget.id;

    const widgetContent = () => {
      switch (widget.type) {
        case 'metric_card':
          return (
            <div style={{ padding: '1rem', textAlign: 'center' }}>
              <Text variant="headingLg" as="h2">{MOCK_DATA.kpi.clicks.toLocaleString()}</Text>
              <Text variant="bodyMd" as="p" tone="subdued">Clicks</Text>
            </div>
          );

        case 'line_chart':
          return (
            <div style={{ height: '100%', padding: '0.5rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MOCK_DATA.metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis fontSize={10} />
                  <RechartsTooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={widget.config.chartColor || currentTheme.primaryColor}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          );

        case 'bar_chart':
          return (
            <div style={{ height: '100%', padding: '0.5rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_DATA.metrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis fontSize={10} />
                  <RechartsTooltip />
                  <Bar
                    dataKey="value"
                    fill={widget.config.chartColor || currentTheme.primaryColor}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          );

        case 'kpi_grid':
          return (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: '1rem',
              padding: '1rem',
              height: '100%'
            }}>
              <div style={{ textAlign: 'center' }}>
                <Text variant="headingMd" as="h3">45.6K</Text>
                <Text variant="bodySm" as="span" tone="subdued">Clicks</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text variant="headingMd" as="h3">$1.2K</Text>
                <Text variant="bodySm" as="span" tone="subdued">Cost</Text>
              </div>
              <div style={{ textAlign: 'center' }}>
                <Text variant="headingMd" as="h3">142</Text>
                <Text variant="bodySm" as="span" tone="subdued">Conversions</Text>
              </div>
            </div>
          );

        default:
          return (
            <div style={{
              padding: '1rem',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%'
            }}>
              <Text variant="bodyMd" as="p" tone="subdued">
                {WIDGET_TYPES[widget.type]?.name || 'Widget'} Preview
              </Text>
            </div>
          );
      }
    };

    return (
      <div
        key={widget.id}
        style={{
          border: isSelected ? `2px solid ${currentTheme.primaryColor}` : '1px solid #e1e3e5',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          overflow: 'hidden',
          position: 'relative',
          height: '100%'
        }}
        onClick={() => setSelectedWidget(widget)}
      >
        {/* Widget Header */}
        <div style={{
          padding: '0.5rem 1rem',
          borderBottom: '1px solid #e1e3e5',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: '#f8f9fa'
        }}>
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            {widget.title}
          </Text>
          <ButtonGroup>
            <Button
              size="micro"
              icon={EditIcon}
              onClick={() => {
                setSelectedWidget(widget);
                setShowWidgetModal(true);
              }}
            />
            <Button
              size="micro"
              icon={DeleteIcon}
              onClick={() => {
                removeWidget(widget.id);
              }}
            />
          </ButtonGroup>
        </div>

        {/* Widget Content */}
        <div style={{ height: 'calc(100% - 50px)' }}>
          {widgetContent()}
        </div>

        {/* Drag Handle */}
        <div
          className="react-grid-item-handle"
          style={{
            position: 'absolute',
            top: '0.5rem',
            left: '0.5rem',
            cursor: 'move',
            opacity: isSelected ? 1 : 0.3
          }}
        >
          <DragHandleIcon />
        </div>
      </div>
    );
  }, [selectedWidget, currentTheme, removeWidget]);

  return (
    <div style={{
      fontFamily: currentTheme.fontFamily,
      backgroundColor: currentTheme.backgroundColor,
      minHeight: '100vh'
    }}>
      {/* Toolbar */}
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #e1e3e5',
        backgroundColor: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <InlineStack gap="200">
          <ButtonGroup>
            <Button
              icon={UndoIcon}
              disabled={historyIndex <= 0}
              onClick={handleUndo}
            >
              Undo
            </Button>
            <Button
              icon={RedoIcon}
              disabled={historyIndex >= history.length - 1}
              onClick={handleRedo}
            >
              Redo
            </Button>
          </ButtonGroup>

          <Button
            icon={PlusIcon}
            onClick={() => setShowWidgetModal(true)}
          >
            Add Widget
          </Button>

          <Button
            icon={SettingsIcon}
            onClick={() => setShowThemeModal(true)}
          >
            Theme
          </Button>
        </InlineStack>

        <InlineStack gap="200">
          <Button onClick={onPreview}>
            Preview
          </Button>
          <Button
            variant="primary"
            icon={SaveIcon}
            onClick={handleSave}
            loading={isLoading}
          >
            Save Dashboard
          </Button>
        </InlineStack>
      </div>

      {/* Dashboard Grid */}
      <div style={{ padding: '1rem' }}>
        <ResponsiveGridLayout
          className="layout"
          layouts={{
            lg: getLayoutFromWidgets(widgets),
            md: getLayoutFromWidgets(widgets),
            sm: getLayoutFromWidgets(widgets),
            xs: getLayoutFromWidgets(widgets),
            xxs: getLayoutFromWidgets(widgets)
          }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          onLayoutChange={handleLayoutChange}
          margin={[10, 10]}
          containerPadding={[0, 0]}
          useCSSTransforms={true}
          isDragDisabled={false}
          isResizable={true}
          draggableHandle=".react-grid-item-handle"
        >
          {widgets.map(renderWidget)}
        </ResponsiveGridLayout>

        {widgets.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            color: '#637381'
          }}>
            <Text variant="headingMd" as="h3">Start building your dashboard</Text>
            <div style={{ marginTop: '0.5rem' }}>
              <Text variant="bodyMd" as="p">
                Add widgets to create your custom analytics dashboard
              </Text>
            </div>
            <div style={{ marginTop: '2rem' }}>
              <Button
                variant="primary"
                icon={PlusIcon}
                onClick={() => setShowWidgetModal(true)}
              >
                Add Your First Widget
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add Widget Modal */}
      <Modal
        open={showWidgetModal}
        onClose={() => setShowWidgetModal(false)}
        title="Add Widget"
        size="large"
      >
        <Modal.Section>
          <Text variant="headingMd" as="h3">Choose Widget Type</Text>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem',
            marginTop: '1rem'
          }}>
            {Object.entries(WIDGET_TYPES).map(([type, config]) => (
              <Card key={type}>
                <div
                  style={{ padding: '1rem', cursor: 'pointer' }}
                  onClick={() => {
                    addWidget(type as WidgetType, 'metrics');
                    setShowWidgetModal(false);
                  }}
                >
                  <BlockStack gap="200">
                    <InlineStack gap="200">
                      <Text variant="bodyLg" as="p">{config.icon}</Text>
                      <Text variant="bodyMd" as="p" fontWeight="semibold">
                        {config.name}
                      </Text>
                    </InlineStack>
                    <Text variant="bodySm" as="span" tone="subdued">
                      {config.description}
                    </Text>
                    <Badge>{`${config.defaultSize.w}x${config.defaultSize.h} grid`}</Badge>
                  </BlockStack>
                </div>
              </Card>
            ))}
          </div>
        </Modal.Section>
      </Modal>

      {/* Theme Customization Modal */}
      <Modal
        open={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        title="Dashboard Theme"
        primaryAction={{
          content: "Apply Theme",
          onAction: () => setShowThemeModal(false)
        }}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <div>
              <Text variant="bodyMd" as="p" fontWeight="semibold">Primary Color</Text>
              <div style={{ marginTop: '0.5rem' }}>
                <input
                  type="color"
                  value={currentTheme.primaryColor}
                  onChange={(e) => setCurrentTheme(prev => ({
                    ...prev,
                    primaryColor: e.target.value
                  }))}
                />
              </div>
            </div>

            <div>
              <Text variant="bodyMd" as="p" fontWeight="semibold">Secondary Color</Text>
              <div style={{ marginTop: '0.5rem' }}>
                <input
                  type="color"
                  value={currentTheme.secondaryColor}
                  onChange={(e) => setCurrentTheme(prev => ({
                    ...prev,
                    secondaryColor: e.target.value
                  }))}
                />
              </div>
            </div>

            <Select
              label="Card Style"
              options={[
                { label: 'Elevated', value: 'elevated' },
                { label: 'Bordered', value: 'bordered' },
                { label: 'Minimal', value: 'minimal' }
              ]}
              value={currentTheme.cardStyle}
              onChange={(value) => setCurrentTheme(prev => ({
                ...prev,
                cardStyle: value as any
              }))}
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </div>
  );
};

export default DashboardBuilder;
