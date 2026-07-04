import * as React from 'react';

export interface SegmentedOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedToggleProps {
  /** Options as strings or `{ value, label, icon }`. */
  options: Array<string | SegmentedOption>;
  /** Currently selected value. */
  value: string;
  /** Selection handler. */
  onChange?: (value: string) => void;
  /** Active-segment color. @default 'neutral' */
  accent?: 'neutral' | 'brand' | 'agent';
  className?: string;
}

/**
 * Segmented single-select control for 2–3 short options (view filters, panel switches).
 *
 * @startingPoint section="Forms" subtitle="Segmented single-select" viewport="700x150"
 */
export function SegmentedToggle(props: SegmentedToggleProps): React.JSX.Element;
