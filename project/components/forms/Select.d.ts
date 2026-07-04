import * as React from 'react';

export interface SelectOption { value: string; label: string; }

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  /** Options as strings or `{ value, label }`. Ignored if `children` provided. */
  options?: Array<string | SelectOption>;
  value?: string;
  onChange?: (value: string) => void;
  /** Use the monospace family (model IDs). */
  mono?: boolean;
}

/** Native dropdown select, styled to the dark token system. */
export function Select(props: SelectProps): React.JSX.Element;
