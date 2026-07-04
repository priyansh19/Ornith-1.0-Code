import * as React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Use the monospace family (prompts, JSON). */
  mono?: boolean;
  /** Strip border/background so it nests inside a composer shell. */
  seamless?: boolean;
}

/** Multi-line text area for prompts and the message composer. */
export function Textarea(props: TextareaProps): React.JSX.Element;
