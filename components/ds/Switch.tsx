import * as React from "react";

export interface SwitchProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "type"
  > {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  accent?: "brand" | "agent";
  disabled?: boolean;
}

/** Boolean on/off switch. */
export function Switch({
  checked,
  onChange,
  label,
  accent = "brand",
  disabled = false,
  className = "",
  ...rest
}: SwitchProps) {
  const cls = [
    "lm-switch",
    accent === "agent" ? "lm-switch--agent" : "",
    disabled ? "lm-switch--disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <label className={cls}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange && onChange(e.target.checked)}
        {...rest}
      />
      <span className="lm-switch__track">
        <span className="lm-switch__thumb" />
      </span>
      {label && <span className="lm-switch__label">{label}</span>}
    </label>
  );
}
