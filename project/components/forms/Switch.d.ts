import * as React from 'react';

export interface SwitchProps {
  /** Controlled on/off state. */
  checked: boolean;
  /** Change handler — receives the next boolean. */
  onChange?: (checked: boolean) => void;
  /** Optional trailing label. */
  label?: string;
  /** On-color. @default 'brand' */
  accent?: 'brand' | 'agent';
  disabled?: boolean;
  className?: string;
}

/** Boolean on/off switch (settings toggles, e.g. "Show thinking trace"). */
export function Switch(props: SwitchProps): React.JSX.Element;
