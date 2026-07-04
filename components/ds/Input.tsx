import * as React from "react";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  prefix?: React.ReactNode;
  mono?: boolean;
  invalid?: boolean;
}

/** Single-line text input with optional label, hint/error, and leading icon. */
export function Input({
  label,
  hint,
  error,
  prefix,
  mono = false,
  invalid = false,
  className = "",
  id,
  ...rest
}: InputProps) {
  const isInvalid = invalid || !!error;
  const inputCls = [
    "lm-input",
    mono ? "lm-input--mono" : "",
    isInvalid ? "lm-input--invalid" : "",
    prefix ? "lm-input--with-prefix" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const field = (
    <div className="lm-input__wrap">
      {prefix && <span className="lm-input__prefix">{prefix}</span>}
      <input
        id={id}
        className={inputCls}
        aria-invalid={isInvalid || undefined}
        {...rest}
      />
    </div>
  );

  if (!label && !hint && !error) return field;
  return (
    <div className="lm-field">
      {label && (
        <label className="lm-field__label" htmlFor={id}>
          {label}
        </label>
      )}
      {field}
      {(error || hint) && (
        <span
          className={`lm-field__hint ${error ? "lm-field__hint--error" : ""}`}
        >
          {error || hint}
        </span>
      )}
    </div>
  );
}
