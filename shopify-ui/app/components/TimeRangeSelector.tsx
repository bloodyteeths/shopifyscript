/**
 * TimeRangeSelector Component
 * Provides a consistent time period selector across the AI dashboard
 */

import { Select } from '@shopify/polaris';
import { useState, useCallback } from 'react';

export type TimePeriod = 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'ALL_TIME';

interface TimeRangeSelectorProps {
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
  label?: string;
  helpText?: string;
}

export const TIME_PERIOD_OPTIONS = [
  { label: 'Today', value: 'TODAY' },
  { label: 'Yesterday', value: 'YESTERDAY' },
  { label: 'Last 7 Days', value: 'LAST_7_DAYS' },
  { label: 'Last 30 Days', value: 'LAST_30_DAYS' },
  { label: 'All Time', value: 'ALL_TIME' },
];

export function TimeRangeSelector({
  value,
  onChange,
  label = 'Time Period',
  helpText
}: TimeRangeSelectorProps) {
  const handleChange = useCallback((selectedValue: string) => {
    onChange(selectedValue as TimePeriod);
  }, [onChange]);

  return (
    <Select
      label={label}
      options={TIME_PERIOD_OPTIONS}
      value={value}
      onChange={handleChange}
      helpText={helpText}
    />
  );
}

/**
 * Helper function to get human-readable period name
 */
export function getPeriodLabel(period: TimePeriod): string {
  const option = TIME_PERIOD_OPTIONS.find(opt => opt.value === period);
  return option?.label || period;
}

/**
 * Helper function to convert period to days for backward compatibility
 */
export function periodToDays(period: TimePeriod): number {
  switch (period) {
    case 'TODAY':
      return 1;
    case 'YESTERDAY':
      return 1;
    case 'LAST_7_DAYS':
      return 7;
    case 'LAST_30_DAYS':
      return 30;
    case 'ALL_TIME':
      return 365; // or any large number
    default:
      return 7;
  }
}

/**
 * Helper function to get query parameter for period
 */
export function getPeriodQueryParam(period: TimePeriod): string {
  return `period=${period}`;
}
