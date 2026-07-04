import * as React from 'react';

export type CritiqueSeverity = 'blocker' | 'major' | 'minor' | 'info';

export interface SeverityBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Severity level. @default 'info' */
  level?: CritiqueSeverity;
}

/** Square-dot severity chip used on critique items. */
export function SeverityBadge(props: SeverityBadgeProps): React.JSX.Element;
