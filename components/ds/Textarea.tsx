import * as React from "react";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  mono?: boolean;
  seamless?: boolean;
}

/** Multi-line text area. `seamless` strips the chrome for use inside a composer shell. */
export function Textarea({
  mono = false,
  seamless = false,
  className = "",
  ...rest
}: TextareaProps) {
  const cls = [
    "lm-textarea",
    mono ? "lm-textarea--mono" : "",
    seamless ? "lm-textarea--seamless" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <textarea className={cls} {...rest} />;
}
