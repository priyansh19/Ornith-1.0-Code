import * as React from 'react';

export interface TooltipProps {
  /** Tooltip text. */
  label: React.ReactNode;
  /** Placement. @default 'top' */
  side?: 'top' | 'bottom';
  /** The trigger element. */
  children: React.ReactNode;
  className?: string;
}

/** Lightweight hover/focus tooltip wrapping its trigger. */
export function Tooltip(props: TooltipProps): React.JSX.Element;
