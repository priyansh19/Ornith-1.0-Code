import React from 'react';

function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id; el.textContent = css;
  document.head.appendChild(el);
}

const CSS = `
.lm-textarea {
  width: 100%;
  min-height: 76px;
  background: var(--bg-inset);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  line-height: var(--lh-body);
  padding: 10px 12px;
  outline: none;
  resize: vertical;
  transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}
.lm-textarea::placeholder { color: var(--faint); }
.lm-textarea:hover:not(:disabled) { border-color: var(--border-strong); }
.lm-textarea:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(224,108,58,0.16); }
.lm-textarea:disabled { opacity: 0.5; cursor: not-allowed; }
.lm-textarea--mono { font-family: var(--font-mono); }
.lm-textarea--seamless { background: transparent; border-color: transparent; box-shadow: none; resize: none; padding: 0; }
.lm-textarea--seamless:focus { border-color: transparent; box-shadow: none; }
`;

/** Multi-line text area. `seamless` strips the chrome for use inside a composer shell. */
export function Textarea({ mono = false, seamless = false, className = '', ...rest }) {
  useInjectCSS('lm-textarea-css', CSS);
  const cls = ['lm-textarea', mono ? 'lm-textarea--mono' : '', seamless ? 'lm-textarea--seamless' : '', className].filter(Boolean).join(' ');
  return <textarea className={cls} {...rest} />;
}
