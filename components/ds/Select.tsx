import * as React from "react";

export type SelectOption = string | { value: string; label: string };

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  options?: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  mono?: boolean;
}

const Chevron = () => (
  <span className="lm-select__chevron" aria-hidden="true">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  </span>
);

/** Native select, styled to the dark token system with a custom chevron. */
export function Select({
  options = [],
  value,
  onChange,
  mono = false,
  className = "",
  children,
  ...rest
}: SelectProps) {
  const cls = ["lm-select", mono ? "lm-select--mono" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className="lm-select__wrap">
      <select
        className={cls}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        {...rest}
      >
        {children ||
          options.map((opt) => {
            const v = typeof opt === "string" ? opt : opt.value;
            const label = typeof opt === "string" ? opt : opt.label;
            return (
              <option key={v} value={v}>
                {label}
              </option>
            );
          })}
      </select>
      <Chevron />
    </span>
  );
}
