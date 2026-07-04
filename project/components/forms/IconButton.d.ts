import * as React from 'react';

export type IconButtonVariant = 'plain' | 'outlined' | 'solid' | 'danger';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. @default 'plain' */
  variant?: IconButtonVariant;
  /** @default 'md' */
  size?: IconButtonSize;
  /** Required for accessibility — describe the action. */
  'aria-label': string;
}

/** Square icon-only button (toolbar actions, composer controls, close buttons). */
export function IconButton(props: IconButtonProps): React.JSX.Element;
