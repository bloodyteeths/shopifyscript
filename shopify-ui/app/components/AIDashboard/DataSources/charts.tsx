/**
 * Reusable Chart Components for AI Dashboard Data Sources
 * Built with Recharts and Polaris design system
 */

import React from 'react';
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
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Card, Box, Text, Stack, ButtonGroup, Button } from '@shopify/polaris';
import { ChartDataPoint, FilterOption } from './types';

// ========================
// Color Palettes
// ========================

export const CHART_COLORS = {
  primary: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
  success: ['#28a745', '#34ce57', '#40e069', '#4df27b'],
  warning: ['#ffc107', '#ffcd39', '#ffd96b', '#ffe69d'],
  danger: ['#dc3545', '#e55467', '#ee7589', '#f796ab'],
  info: ['#17a2b8', '#3ab5ca', '#5dc8dc', '#80dbee'],
  neutral: ['#6c757d', '#85929e', '#9eafbf', '#b7ccdf']
};

// ========================
// Base Chart Wrapper
// ========================

interface BaseChartProps {
  title: string;
  subtitle?: string;
  height?: number;
  children: React.ReactNode;
  loading?: boolean;
  error?: string;
  className?: string;
  actions?: React.ReactNode;
  fullWidth?: boolean;
}

export function BaseChart({
  title,
  subtitle,
  height = 300,
  children,
  loading = false,
  error,
  className,
  actions,
  fullWidth = true
}: BaseChartProps) {
  return (
    <Card>
      <Box padding="4">
        <Stack alignment="center" distribution="equalSpacing">
          <Stack vertical spacing="tight">
            <Text variant="headingMd" as="h3">
              {title}
            </Text>
            {subtitle && (
              <Text variant="bodySm" color="subdued">
                {subtitle}
              </Text>
            )}
          </Stack>
          {actions && <Box>{actions}</Box>}
        </Stack>

        <Box paddingBlockStart="4">
          {loading ? (
            <Box
              minHeight={`${height}px`}
              background="surface"
              borderRadius="1"
              padding="4"
            >
              <Stack alignment="center" distribution="center">
                <Text variant="bodySm" color="subdued">
                  Loading chart data...
                </Text>
              </Stack>
            </Box>
          ) : error ? (
            <Box
              minHeight={`${height}px`}
              background="surface"
              borderRadius="1"
              padding="4"
            >
              <Stack alignment="center" distribution="center">
                <Text variant="bodySm" color="critical">
                  Error loading chart: {error}
                </Text>
              </Stack>
            </Box>
          ) : (
            <Box height={`${height}px`} className={className}>
              <ResponsiveContainer width="100%" height="100%">
                {children}
              </ResponsiveContainer>
            </Box>
          )}
        </Box>
      </Box>
    </Card>
  );
}

// ========================
// Custom Tooltip Components
// ========================

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatter?: (value: any, name: string) => [string, string];
  labelFormatter?: (label: string) => string;
}

export function CustomTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter
}: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <Box
      background="surface"
      padding="2"
      borderRadius="1"
      shadow="md"
      borderWidth="1"
      borderColor="border"
    >
      {label && (
        <Text variant="bodyMd" fontWeight="medium">
          {labelFormatter ? labelFormatter(label) : label}
        </Text>
      )}
      <Stack vertical spacing="extraTight">
        {payload.map((entry, index) => (
          <Stack key={index} spacing="tight" alignment="center">
            <Box
              width="12px"
              height="12px"
              borderRadius="1"
              background={entry.color}
            />
            <Text variant="bodySm">
              {entry.name}: {formatter ? formatter(entry.value, entry.name)[0] : entry.value}
            </Text>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

// ========================
// Trend Line Chart
// ========================

interface TrendLineChartProps {
  title: string;
  subtitle?: string;
  data: ChartDataPoint[];
  dataKey: string;
  xAxisKey?: string;
  height?: number;
  loading?: boolean;
  error?: string;
  showGrid?: boolean;
  color?: string;
  strokeWidth?: number;
  showDots?: boolean;
  yAxisFormatter?: (value: any) => string;
  tooltipFormatter?: (value: any, name: string) => [string, string];
}

export function TrendLineChart({
  title,
  subtitle,
  data,
  dataKey,
  xAxisKey = 'date',
  height = 300,
  loading = false,
  error,
  showGrid = true,
  color = CHART_COLORS.primary[0],
  strokeWidth = 2,
  showDots = false,
  yAxisFormatter,
  tooltipFormatter
}: TrendLineChartProps) {
  return (
    <BaseChart title={title} subtitle={subtitle} height={height} loading={loading} error={error}>
      <LineChart data={data}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis dataKey={xAxisKey} />
        <YAxis tickFormatter={yAxisFormatter} />
        <Tooltip content={<CustomTooltip formatter={tooltipFormatter} />} />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={strokeWidth}
          dot={showDots}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </BaseChart>
  );
}

// ========================
// Multi-Line Chart
// ========================

interface MultiLineChartProps {
  title: string;
  subtitle?: string;
  data: ChartDataPoint[];
  lines: {
    dataKey: string;
    name: string;
    color?: string;
    strokeWidth?: number;
  }[];
  xAxisKey?: string;
  height?: number;
  loading?: boolean;
  error?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  yAxisFormatter?: (value: any) => string;
  tooltipFormatter?: (value: any, name: string) => [string, string];
}

export function MultiLineChart({
  title,
  subtitle,
  data,
  lines,
  xAxisKey = 'date',
  height = 300,
  loading = false,
  error,
  showGrid = true,
  showLegend = true,
  yAxisFormatter,
  tooltipFormatter
}: MultiLineChartProps) {
  return (
    <BaseChart title={title} subtitle={subtitle} height={height} loading={loading} error={error}>
      <LineChart data={data}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis dataKey={xAxisKey} />
        <YAxis tickFormatter={yAxisFormatter} />
        <Tooltip content={<CustomTooltip formatter={tooltipFormatter} />} />
        {showLegend && <Legend />}
        {lines.map((line, index) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color || CHART_COLORS.primary[index % CHART_COLORS.primary.length]}
            strokeWidth={line.strokeWidth || 2}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </BaseChart>
  );
}

// ========================
// Area Chart
// ========================

interface AreaChartProps {
  title: string;
  subtitle?: string;
  data: ChartDataPoint[];
  dataKey: string;
  xAxisKey?: string;
  height?: number;
  loading?: boolean;
  error?: string;
  showGrid?: boolean;
  color?: string;
  fillOpacity?: number;
  stackId?: string;
  yAxisFormatter?: (value: any) => string;
  tooltipFormatter?: (value: any, name: string) => [string, string];
}

export function AreaChartComponent({
  title,
  subtitle,
  data,
  dataKey,
  xAxisKey = 'date',
  height = 300,
  loading = false,
  error,
  showGrid = true,
  color = CHART_COLORS.primary[0],
  fillOpacity = 0.3,
  stackId,
  yAxisFormatter,
  tooltipFormatter
}: AreaChartProps) {
  return (
    <BaseChart title={title} subtitle={subtitle} height={height} loading={loading} error={error}>
      <AreaChart data={data}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis dataKey={xAxisKey} />
        <YAxis tickFormatter={yAxisFormatter} />
        <Tooltip content={<CustomTooltip formatter={tooltipFormatter} />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stackId={stackId}
          stroke={color}
          fill={color}
          fillOpacity={fillOpacity}
        />
      </AreaChart>
    </BaseChart>
  );
}

// ========================
// Bar Chart
// ========================

interface BarChartProps {
  title: string;
  subtitle?: string;
  data: ChartDataPoint[];
  dataKey: string;
  xAxisKey?: string;
  height?: number;
  loading?: boolean;
  error?: string;
  showGrid?: boolean;
  color?: string;
  horizontal?: boolean;
  yAxisFormatter?: (value: any) => string;
  tooltipFormatter?: (value: any, name: string) => [string, string];
}

export function BarChartComponent({
  title,
  subtitle,
  data,
  dataKey,
  xAxisKey = 'date',
  height = 300,
  loading = false,
  error,
  showGrid = true,
  color = CHART_COLORS.primary[0],
  horizontal = false,
  yAxisFormatter,
  tooltipFormatter
}: BarChartProps) {
  return (
    <BaseChart title={title} subtitle={subtitle} height={height} loading={loading} error={error}>
      <BarChart data={data} layout={horizontal ? 'horizontal' : undefined}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis dataKey={horizontal ? dataKey : xAxisKey} type={horizontal ? 'number' : 'category'} />
        <YAxis dataKey={horizontal ? xAxisKey : dataKey} type={horizontal ? 'category' : 'number'} tickFormatter={yAxisFormatter} />
        <Tooltip content={<CustomTooltip formatter={tooltipFormatter} />} />
        <Bar dataKey={dataKey} fill={color} />
      </BarChart>
    </BaseChart>
  );
}

// ========================
// Pie Chart
// ========================

interface PieChartProps {
  title: string;
  subtitle?: string;
  data: ChartDataPoint[];
  dataKey: string;
  nameKey?: string;
  height?: number;
  loading?: boolean;
  error?: string;
  colors?: string[];
  showLabels?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  tooltipFormatter?: (value: any, name: string) => [string, string];
}

export function PieChartComponent({
  title,
  subtitle,
  data,
  dataKey,
  nameKey = 'name',
  height = 300,
  loading = false,
  error,
  colors = CHART_COLORS.primary,
  showLabels = true,
  innerRadius = 0,
  outerRadius = 100,
  tooltipFormatter
}: PieChartProps) {
  return (
    <BaseChart title={title} subtitle={subtitle} height={height} loading={loading} error={error}>
      <PieChart>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey={nameKey}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          label={showLabels}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip formatter={tooltipFormatter} />} />
        <Legend />
      </PieChart>
    </BaseChart>
  );
}

// ========================
// Scatter Plot
// ========================

interface ScatterPlotProps {
  title: string;
  subtitle?: string;
  data: ChartDataPoint[];
  xDataKey: string;
  yDataKey: string;
  height?: number;
  loading?: boolean;
  error?: string;
  showGrid?: boolean;
  color?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  xAxisFormatter?: (value: any) => string;
  yAxisFormatter?: (value: any) => string;
  tooltipFormatter?: (value: any, name: string) => [string, string];
}

export function ScatterPlot({
  title,
  subtitle,
  data,
  xDataKey,
  yDataKey,
  height = 300,
  loading = false,
  error,
  showGrid = true,
  color = CHART_COLORS.primary[0],
  xAxisLabel,
  yAxisLabel,
  xAxisFormatter,
  yAxisFormatter,
  tooltipFormatter
}: ScatterPlotProps) {
  return (
    <BaseChart title={title} subtitle={subtitle} height={height} loading={loading} error={error}>
      <ScatterChart data={data}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis
          dataKey={xDataKey}
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={xAxisFormatter}
          label={{ value: xAxisLabel, position: 'insideBottom', offset: -5 }}
        />
        <YAxis
          dataKey={yDataKey}
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={yAxisFormatter}
          label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
        />
        <Tooltip content={<CustomTooltip formatter={tooltipFormatter} />} />
        <Scatter fill={color} />
      </ScatterChart>
    </BaseChart>
  );
}

// ========================
// Heatmap Chart
// ========================

interface HeatmapData {
  x: string | number;
  y: string | number;
  value: number;
}

interface HeatmapProps {
  title: string;
  subtitle?: string;
  data: HeatmapData[];
  height?: number;
  loading?: boolean;
  error?: string;
  colorScale?: string[];
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export function HeatmapChart({
  title,
  subtitle,
  data,
  height = 300,
  loading = false,
  error,
  colorScale = ['#f7fbff', '#08519c'],
  xAxisLabel,
  yAxisLabel
}: HeatmapProps) {
  // For now, we'll create a simple grid-based heatmap using divs
  // since recharts doesn't have built-in heatmap support
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));

  const getColor = (value: number) => {
    const intensity = (value - minValue) / (maxValue - minValue);
    // Simple linear interpolation between two colors
    return `rgba(8, 81, 156, ${intensity})`;
  };

  const uniqueX = Array.from(new Set(data.map(d => d.x))).sort();
  const uniqueY = Array.from(new Set(data.map(d => d.y))).sort();

  return (
    <BaseChart title={title} subtitle={subtitle} height={height} loading={loading} error={error}>
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `auto repeat(${uniqueX.length}, 1fr)`, gap: '2px' }}>
          <div></div>
          {uniqueX.map(x => (
            <div key={x} style={{ textAlign: 'center', fontSize: '12px', padding: '4px' }}>
              {x}
            </div>
          ))}
          {uniqueY.map(y => (
            <React.Fragment key={y}>
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', padding: '4px' }}>
                {y}
              </div>
              {uniqueX.map(x => {
                const cellData = data.find(d => d.x === x && d.y === y);
                const value = cellData ? cellData.value : 0;
                return (
                  <div
                    key={`${x}-${y}`}
                    style={{
                      backgroundColor: getColor(value),
                      minHeight: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: value > (maxValue / 2) ? 'white' : 'black'
                    }}
                    title={`${x}, ${y}: ${value}`}
                  >
                    {value > 0 ? value.toFixed(0) : ''}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </BaseChart>
  );
}

// ========================
// Chart Export Utilities
// ========================

export const exportChart = (element: HTMLElement, filename: string, format: 'png' | 'svg' = 'png') => {
  // This would integrate with html2canvas or similar library
  console.log('Exporting chart:', filename, format);
  // Implementation would go here
};

// ========================
// Format Utilities
// ========================

export const formatters = {
  currency: (value: number, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value),

  percentage: (value: number, decimals = 1) =>
    `${(value * 100).toFixed(decimals)}%`,

  number: (value: number, decimals = 0) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(value),

  compact: (value: number) =>
    new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value),

  date: (value: string) =>
    new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),

  dateTime: (value: string) =>
    new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
};