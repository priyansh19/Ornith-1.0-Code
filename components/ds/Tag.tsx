import * as React from "react";

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon?: React.ReactNode;
  active?: boolean;
  onRemove?: () => void;
}

const X = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

/** Rounded label chip for tags, filters, attached files, and model labels. */
export function Tag({
  children,
  icon,
  active = false,
  onRemove,
  className = "",
  ...rest
}: TagProps) {
  const cls = [
    "lm-tag",
    onRemove ? "lm-tag--removable" : "",
    active ? "lm-tag--active" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} {...rest}>
      {icon && <span className="lm-tag__icon">{icon}</span>}
      {children}
      {onRemove && (
        <button className="lm-tag__remove" onClick={onRemove} aria-label="Remove">
          <X />
        </button>
      )}
    </span>
  );
}
