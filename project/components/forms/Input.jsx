import React from 'react';

function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id; el.textContent = css;
  document.head.appendChild(el);
}

const CSS = `
.lm-field { display: flex; flex-direction: column; gap: var(--space-2); }
.lm-field__label {
  font-family: var(--font-sans); font-size: var(--text-caption); font-weight: var(--fw-medium);
  color: var(--text-soft);
}
.lm-field__hint { font-size: var(--text-caption); color: var(--muted); }
.lm-field__hint--error { color: var(--red); }

.lm-input {
  width: 100%;
  height: var(--control-md);
  background: var(--bg-inset);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  padding: 0 12px;
  outline: none;
  transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}
.lm-input::placeholder { color: var(--faint); }
.lm-input:hover:not(:disabled) { border-color: var(--border-strong); }
.lm-input:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(224,108,58,0.16); }
.lm-input:disabled { opacity: 0.5; cursor: not-allowed; }
.lm-input--mono { font-family: var(--font-mono); }
.lm-input--invalid { border-color: var(--red); }
.lm-input--invalid:focus { box-shadow: 0 0 0 3px rgba(248,113,113,0.16); }
.lm-input--with-prefix { padding-left: 34px; }

.lm-input__wrap { position: relative; display: flex; align-items: center; }
.lm-input__prefix {
  position: absolute; left: 11px; display: flex; color: var(--muted); pointer-events: none;
}
.lm-input__prefix svg { width: 15px; height: 15px; }
`;

/** Single-line text input with optional label, hint/error, and leading icon. */
export function Input({
  label, hint, error, prefix, mono = false, invalid = false,
  className = '', id, ...rest
}) {
  useInjectCSS('lm-input-css', CSS);
  const isInvalid = invalid || !!error;
  const inputCls = [
    'lm-input',
    mono ? 'lm-input--mono' : '',
    isInvalid ? 'lm-input--invalid' : '',
    prefix ? 'lm-input--with-prefix' : '',
    className,
  ].filter(Boolean).join(' ');

  const field = (
    <div className="lm-input__wrap">
      {prefix && <span className="lm-input__prefix">{prefix}</span>}
      <input id={id} className={inputCls} aria-invalid={isInvalid || undefined} {...rest} />
    </div>
  );

  if (!label && !hint && !error) return field;
  return (
    <div className="lm-field">
      {label && <label className="lm-field__label" htmlFor={id}>{label}</label>}
      {field}
      {(error || hint) && (
        <span className={`lm-field__hint ${error ? 'lm-field__hint--error' : ''}`}>{error || hint}</span>
      )}
    </div>
  );
}
