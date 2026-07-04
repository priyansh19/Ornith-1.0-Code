import * as React from 'react';

export type ButtonVariant = 'primary' | 'agent' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. `primary` = orange brand CTA, `agent` = violet harness accent. */
  variant?: ButtonVariant;
  /** Control height. @default 'md' */
  size?: ButtonSize;
  /** Stretch to fill the container width. */
  block?: boolean;
  /** Show a spinner and disable interaction. */
  loading?: boolean;
  /** Icon node rendered before the label. */
  iconLeft?: React.ReactNode;
  /** Icon node rendered after the label. */
  iconRight?: React.ReactNode;
}

/**
 * Primary action button for LMChat.
 *
 * @startingPoint section="Forms" subtitle="Brand + agent action buttons" viewport="700x150"
 */
export function Button(props: ButtonProps): React.JSX.Element;
