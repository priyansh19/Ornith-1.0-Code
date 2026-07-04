import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Field label rendered above the control. */
  label?: string;
  /** Helper text below the control. */
  hint?: string;
  /** Error message — colors the border red and replaces the hint. */
  error?: string;
  /** Leading icon node (rendered inside, left). */
  prefix?: React.ReactNode;
  /** Use the monospace family (API keys, model IDs, paths). */
  mono?: boolean;
  /** Force the invalid style without an error message. */
  invalid?: boolean;
}

/** Single-line text input. */
export function Input(props: InputProps): React.JSX.Element;
