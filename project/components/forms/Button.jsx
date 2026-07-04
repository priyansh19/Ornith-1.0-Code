import React from 'react';

/* Injects a component's CSS once into the document head. Lets primitives
   carry real :hover / :focus-visible / :active / :disabled states while
   staying self-contained (React-only, styled via design-system tokens). */
function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}

const CSS = `
.lm-btn {
  --_bg: var(--brand);
  --_fg: var(--on-brand);
  --_bd: transparent;
  display: inline-flex; align-items: center; justify-content: center;
  gap: var(--space-2);
  font-family: var(--font-sans);
  font-weight: var(--fw-medium);
  font-size: var(--text-sm);
  line-height: 1;
  white-space: nowrap;
  border: 1px solid var(--_bd);
  border-radius: var(--radius-md);
  background: var(--_bg);
  color: var(--_fg);
  height: var(--control-md);
  padding: 0 14px;
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out),
              border-color var(--dur-fast) var(--ease-out),
              transform var(--dur-fast) var(--ease-out),
              filter var(--dur-fast) var(--ease-out);
  user-select: none;
}
.lm-btn:focus-visible { outline: none; box-shadow: var(--ring); }
.lm-btn:active:not(:disabled) { transform: translateY(0.5px); }
.lm-btn:disabled { opacity: 0.45; cursor: not-allowed; }

/* sizes */
.lm-btn--sm { height: var(--control-sm); padding: 0 10px; font-size: var(--text-caption); }
.lm-btn--lg { height: var(--control-lg); padding: 0 20px; font-size: var(--text-body); }

/* variants */
.lm-btn--primary { --_bg: var(--brand); --_fg: var(--on-brand); }
.lm-btn--primary:hover:not(:disabled) { --_bg: var(--brand-hover); }
.lm-btn--primary:active:not(:disabled) { --_bg: var(--brand-active); }

.lm-btn--agent { --_bg: var(--agent); --_fg: #fff; }
.lm-btn--agent:hover:not(:disabled) { --_bg: var(--agent-hover); }
.lm-btn--agent:active:not(:disabled) { --_bg: var(--agent-active); }

.lm-btn--secondary { --_bg: var(--surface-2); --_fg: var(--text); --_bd: var(--border-strong); }
.lm-btn--secondary:hover:not(:disabled) { --_bg: var(--surface-3); --_bd: var(--faint); }

.lm-btn--ghost { --_bg: transparent; --_fg: var(--text-soft); --_bd: transparent; }
.lm-btn--ghost:hover:not(:disabled) { --_bg: var(--surface-3); --_fg: var(--text); }

.lm-btn--danger { --_bg: transparent; --_fg: var(--red); --_bd: color-mix(in srgb, var(--red) 45%, transparent); }
.lm-btn--danger:hover:not(:disabled) { --_bg: var(--red-soft); --_bd: var(--red); }

.lm-btn--block { display: flex; width: 100%; }
.lm-btn__spinner {
  width: 13px; height: 13px; border-radius: 50%;
  border: 2px solid currentColor; border-top-color: transparent;
  animation: lm-spin 0.7s linear infinite; flex-shrink: 0;
}
`;

/**
 * LMChat primary button. Warm-orange brand fill by default; `agent` variant
 * uses the violet harness accent.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  className = '',
  ...rest
}) {
  useInjectCSS('lm-btn-css', CSS);
  const cls = [
    'lm-btn',
    `lm-btn--${variant}`,
    size !== 'md' ? `lm-btn--${size}` : '',
    block ? 'lm-btn--block' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading ? <span className="lm-btn__spinner" /> : iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
