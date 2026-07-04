import React from 'react';

function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id; el.textContent = css;
  document.head.appendChild(el);
}

const GLYPH = {
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>,
  read: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>,
  run: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 17 6-6-6-6"/><path d="M12 19h8"/></svg>,
  tool: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.7 2.7-2-2 2.7-2.7Z"/></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>,
};
const KIND_COLOR = { edit: 'var(--brand)', read: 'var(--cyan)', run: 'var(--green)', tool: 'var(--agent-hover)', search: 'var(--amber)' };

const CSS = `
.lm-tool { border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-inset); overflow: hidden; }
.lm-tool__sum {
  display: flex; align-items: center; gap: 9px; width: 100%; text-align: left;
  background: transparent; border: none; cursor: pointer; padding: 8px 11px;
  font-family: var(--font-mono); font-size: var(--text-caption); color: var(--text-soft);
  transition: background var(--dur-fast) var(--ease-out);
}
.lm-tool__sum:hover { background: var(--surface-2); }
.lm-tool__lead { display: inline-flex; color: var(--muted); flex-shrink: 0; }
.lm-tool__lead svg { width: 14px; height: 14px; }
.lm-tool__label { flex: 1; color: var(--text-soft); }
.lm-tool__label b { color: var(--text); font-weight: var(--fw-medium); }
.lm-tool__count { color: var(--muted); }
.lm-tool__chev { display: inline-flex; color: var(--muted); transition: transform var(--dur-fast) var(--ease-out); flex-shrink: 0; }
.lm-tool__chev svg { width: 14px; height: 14px; }
.lm-tool--open .lm-tool__chev { transform: rotate(90deg); }
.lm-tool__spin { width: 12px; height: 12px; border-radius: 50%; border: 2px solid var(--border-strong); border-top-color: var(--brand); animation: lm-spin .7s linear infinite; flex-shrink: 0; }
.lm-tool__items { border-top: 1px solid var(--border); padding: 7px 11px; display: flex; flex-direction: column; gap: 5px; }
.lm-tool__item { display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: var(--text-caption); color: var(--text-soft); }
.lm-tool__icon { display: inline-flex; flex-shrink: 0; }
.lm-tool__icon svg { width: 13px; height: 13px; }
.lm-tool__path { color: var(--text); }
.lm-tool__diff { margin-left: auto; font-size: var(--text-micro); }
.lm-tool__diff .add { color: var(--green); }
.lm-tool__diff .del { color: var(--red); }
`;

const Chevron = () => (<span className="lm-tool__chev"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg></span>);

/**
 * Collapsible agent tool-activity row — the "Edited a file, used a tool ›"
 * disclosure shown inline in a coding-agent conversation.
 */
export function ToolCall({ summary, items = [], running = false, defaultOpen = false, className = '', ...rest }) {
  useInjectCSS('lm-tool-css', CSS);
  const [open, setOpen] = React.useState(defaultOpen);
  const cls = ['lm-tool', open ? 'lm-tool--open' : '', className].filter(Boolean).join(' ');
  return (
    <div className={cls} {...rest}>
      <button className="lm-tool__sum" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="lm-tool__lead">{running ? <span className="lm-tool__spin" /> : GLYPH.tool}</span>
        <span className="lm-tool__label">{summary}{items.length > 0 && <span className="lm-tool__count">  · {items.length} step{items.length > 1 ? 's' : ''}</span>}</span>
        {items.length > 0 && <Chevron />}
      </button>
      {open && items.length > 0 && (
        <div className="lm-tool__items">
          {items.map((it, i) => (
            <div className="lm-tool__item" key={i}>
              <span className="lm-tool__icon" style={{ color: KIND_COLOR[it.kind] || 'var(--muted)' }}>{GLYPH[it.kind] || GLYPH.tool}</span>
              <span className="lm-tool__path">{it.text}</span>
              {it.diff && <span className="lm-tool__diff"><span className="add">+{it.diff[0]}</span> <span className="del">−{it.diff[1]}</span></span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
