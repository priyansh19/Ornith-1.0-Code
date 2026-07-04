import * as React from "react";

export type IconButtonVariant =
  | "plain"
  | "outlined"
  | "solid"
  | "danger";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

/** Square icon-only button. Pair every instance with an `aria-label`. */
export function IconButton({
  children,
  variant = "plain",
  size = "md",
  className = "",
  ...rest
}: IconButtonProps) {
  const cls = [
    "lm-iconbtn",
    variant !== "plain" ? `lm-iconbtn--${variant}` : "",
    size !== "md" ? `lm-iconbtn--${size}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
