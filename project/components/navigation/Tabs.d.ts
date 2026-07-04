import * as React from 'react';

export interface TabItem {
  value: string;
  label: string;
  /** Optional count pill (e.g. open critiques). */
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  /** Tabs as strings or `{ value, label, count, icon }`. */
  tabs: Array<string | TabItem>;
  value: string;
  onChange?: (value: string) => void;
  /** Active underline color. @default 'brand' */
  accent?: 'brand' | 'agent';
  className?: string;
}

/** Underline tab bar (Thinking / Critiques, settings sections). */
export function Tabs(props: TabsProps): React.JSX.Element;
