/* @ds-bundle: {"format":3,"namespace":"LMChatDesignSystem_bc9736","components":[{"name":"CritiqueCard","sourcePath":"components/agent/CritiqueCard.jsx"},{"name":"MessageBubble","sourcePath":"components/agent/MessageBubble.jsx"},{"name":"SeverityBadge","sourcePath":"components/agent/SeverityBadge.jsx"},{"name":"ThinkingStep","sourcePath":"components/agent/ThinkingStep.jsx"},{"name":"ToolCall","sourcePath":"components/agent/ToolCall.jsx"},{"name":"Avatar","sourcePath":"components/data/Avatar.jsx"},{"name":"Badge","sourcePath":"components/data/Badge.jsx"},{"name":"Card","sourcePath":"components/data/Card.jsx"},{"name":"KeyValueRow","sourcePath":"components/data/KeyValueRow.jsx"},{"name":"Spinner","sourcePath":"components/data/Spinner.jsx"},{"name":"Tag","sourcePath":"components/data/Tag.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"IconButton","sourcePath":"components/forms/IconButton.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"SegmentedToggle","sourcePath":"components/forms/SegmentedToggle.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"Tooltip","sourcePath":"components/navigation/Tooltip.jsx"}],"sourceHashes":{"components/agent/CritiqueCard.jsx":"6018d2b10262","components/agent/MessageBubble.jsx":"b963dd3c70d3","components/agent/SeverityBadge.jsx":"a0e39d382c2c","components/agent/ThinkingStep.jsx":"6d751d7b869b","components/agent/ToolCall.jsx":"47b02ff88fff","components/data/Avatar.jsx":"fddb5551defc","components/data/Badge.jsx":"df04ffa2b38d","components/data/Card.jsx":"a91f1ae0dc01","components/data/KeyValueRow.jsx":"7ee9943db4da","components/data/Spinner.jsx":"a8bace9497f0","components/data/Tag.jsx":"c538baf65536","components/forms/Button.jsx":"b286a3d6dad8","components/forms/IconButton.jsx":"fcd72c737dfa","components/forms/Input.jsx":"7f181f3dcd9e","components/forms/SegmentedToggle.jsx":"60beecea232a","components/forms/Select.jsx":"f33042db4785","components/forms/Switch.jsx":"4e33e263f9c5","components/forms/Textarea.jsx":"2ecbd4df25b2","components/navigation/Tabs.jsx":"53416460fd36","components/navigation/Tooltip.jsx":"94a346da5da8","ui_kits/lmchat/app.jsx":"7d5acab93ceb","ui_kits/lmchat/parts.jsx":"0b52b2a20e28","ui_kits/lmchat/rightpanel.jsx":"73f37661eee4","ui_kits/lmchat/screens.jsx":"2ae374d9081d","ui_kits/lmchat/sidebar.jsx":"5851811075e9"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.LMChatDesignSystem_bc9736 = window.LMChatDesignSystem_bc9736 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/agent/CritiqueCard.jsx
try { (() => {
function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}
const SEV_COLOR = {
  blocker: 'var(--red)',
  major: 'var(--amber)',
  minor: 'var(--cyan)',
  info: 'var(--muted)'
};
const CSS = `
.lm-crit {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4) var(--space-3) calc(var(--space-4) + 3px);
  overflow: hidden;
}
.lm-crit::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--_sev, var(--muted));
}
.lm-crit__top { display: flex; align-items: center; gap: var(--space-2); margin-bottom: 6px; }
.lm-crit__cat {
  font-family: var(--font-mono); font-size: var(--text-micro); text-transform: uppercase;
  letter-spacing: var(--tracking-wide); color: var(--muted);
  background: var(--surface-3); border: 1px solid var(--border); border-radius: var(--radius-xs);
  padding: 2px 6px;
}
.lm-crit__round { margin-left: auto; font-family: var(--font-mono); font-size: var(--text-micro); color: var(--faint); }
.lm-crit__id { font-family: var(--font-mono); font-size: var(--text-micro); color: var(--faint); }
.lm-crit__msg { font-size: var(--text-sm); line-height: var(--lh-body); color: var(--text); }
.lm-crit__action {
  margin-top: 8px; display: block; font-family: var(--font-mono); font-size: var(--text-caption);
  color: var(--agent-hover); background: var(--bg-inset);
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 6px 9px; word-break: break-word;
}
.lm-crit__action-label { color: var(--muted); margin-right: 6px; }
.lm-crit--resolved { opacity: 0.55; }
.lm-crit--resolved .lm-crit__msg { text-decoration: line-through; text-decoration-color: var(--faint); }
`;

/** A structured critique item from the Critic pipeline. */
function CritiqueCard({
  severity = 'info',
  category,
  round,
  id,
  message,
  suggestedAction,
  resolved = false,
  className = '',
  children
}) {
  useInjectCSS('lm-crit-css', CSS);
  const cls = ['lm-crit', resolved ? 'lm-crit--resolved' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    className: cls,
    style: {
      '--_sev': SEV_COLOR[severity]
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "lm-crit__top"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-micro)',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)',
      color: SEV_COLOR[severity],
      padding: '3px 8px 3px 7px',
      borderRadius: 'var(--radius-xs)',
      border: `1px solid color-mix(in srgb, ${SEV_COLOR[severity]} 35%, transparent)`,
      background: 'color-mix(in srgb, ' + SEV_COLOR[severity] + ' 12%, transparent)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: 2,
      background: 'currentColor'
    }
  }), severity), category && /*#__PURE__*/React.createElement("span", {
    className: "lm-crit__cat"
  }, category), id && /*#__PURE__*/React.createElement("span", {
    className: "lm-crit__id"
  }, id), round != null && /*#__PURE__*/React.createElement("span", {
    className: "lm-crit__round"
  }, "round ", round)), /*#__PURE__*/React.createElement("div", {
    className: "lm-crit__msg"
  }, message ?? children), suggestedAction && /*#__PURE__*/React.createElement("code", {
    className: "lm-crit__action"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lm-crit__action-label"
  }, "\u2192"), suggestedAction));
}
Object.assign(__ds_scope, { CritiqueCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/agent/CritiqueCard.jsx", error: String((e && e.message) || e) }); }

// components/agent/MessageBubble.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}
const CSS = `
.lm-bubble { display: flex; flex-direction: column; gap: 4px; max-width: 90%; }
.lm-bubble--user { align-self: flex-end; align-items: flex-end; }
.lm-bubble--assistant { align-self: flex-start; align-items: flex-start; }
.lm-bubble__label {
  font-family: var(--font-mono); font-size: var(--text-micro);
  text-transform: uppercase; letter-spacing: var(--tracking-caps);
  color: var(--muted); display: inline-flex; gap: 7px; align-items: center;
}
.lm-bubble--user .lm-bubble__label { color: var(--cyan); }
.lm-bubble--assistant .lm-bubble__label { color: var(--green); }
.lm-bubble__time { color: var(--faint); letter-spacing: 0; }
.lm-bubble__text {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 9px 13px; line-height: var(--lh-body); font-size: var(--text-sm);
  color: var(--text); white-space: pre-wrap; word-break: break-word;
}
.lm-bubble--user .lm-bubble__text { background: var(--agent-soft); border-color: color-mix(in srgb, var(--agent) 50%, transparent); }
.lm-bubble__loading { display: inline-flex; align-items: center; gap: var(--space-2); color: var(--muted); font-style: italic; }
.lm-bubble__spinner { width: 13px; height: 13px; border-radius: 50%; border: 2px solid var(--border-strong); border-top-color: var(--green); animation: lm-spin .7s linear infinite; }
`;

/** Chat message bubble — user (right, cyan) or assistant (left, green). */
function MessageBubble({
  role = 'assistant',
  name,
  time,
  loading = false,
  children,
  className = '',
  ...rest
}) {
  useInjectCSS('lm-bubble-css', CSS);
  const cls = ['lm-bubble', `lm-bubble--${role}`, className].filter(Boolean).join(' ');
  const defaultName = role === 'user' ? 'You' : 'ornith';
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "lm-bubble__label"
  }, name || defaultName, time && /*#__PURE__*/React.createElement("span", {
    className: "lm-bubble__time"
  }, time)), /*#__PURE__*/React.createElement("div", {
    className: "lm-bubble__text"
  }, loading ? /*#__PURE__*/React.createElement("span", {
    className: "lm-bubble__loading"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lm-bubble__spinner"
  }), "Processing\u2026") : children));
}
Object.assign(__ds_scope, { MessageBubble });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/agent/MessageBubble.jsx", error: String((e && e.message) || e) }); }

// components/agent/SeverityBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}
const CSS = `
.lm-sev {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-mono); font-size: var(--text-micro); font-weight: var(--fw-semibold);
  text-transform: uppercase; letter-spacing: var(--tracking-wide);
  padding: 3px 8px 3px 7px; border-radius: var(--radius-xs);
  border: 1px solid transparent; line-height: 1;
}
.lm-sev__dot { width: 7px; height: 7px; border-radius: 2px; background: currentColor; flex-shrink: 0; }
.lm-sev--blocker { color: var(--red); background: var(--red-soft); border-color: color-mix(in srgb, var(--red) 38%, transparent); }
.lm-sev--major   { color: var(--amber); background: var(--amber-soft); border-color: color-mix(in srgb, var(--amber) 32%, transparent); }
.lm-sev--minor   { color: var(--cyan); background: var(--cyan-soft); border-color: color-mix(in srgb, var(--cyan) 30%, transparent); }
.lm-sev--info    { color: var(--muted); background: var(--surface-3); border-color: var(--border-strong); }
`;

/** Severity chip for the critique pipeline (blocker / major / minor / info). */
function SeverityBadge({
  level = 'info',
  className = '',
  ...rest
}) {
  useInjectCSS('lm-sev-css', CSS);
  const cls = ['lm-sev', `lm-sev--${level}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "lm-sev__dot"
  }), level);
}
Object.assign(__ds_scope, { SeverityBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/agent/SeverityBadge.jsx", error: String((e && e.message) || e) }); }

// components/agent/ThinkingStep.jsx
try { (() => {
function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}
const CSS = `
.lm-think { display: flex; gap: var(--space-3); padding: 2px 0; }
.lm-think__rail { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; }
.lm-think__node {
  width: 22px; height: 22px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--border-strong); background: var(--surface-2);
  color: var(--muted); font-family: var(--font-mono); font-size: 10px;
}
.lm-think__node svg { width: 12px; height: 12px; }
.lm-think__line { width: 1px; flex: 1; background: var(--border); margin: 2px 0; min-height: 8px; }
.lm-think--thought .lm-think__node { color: var(--text-soft); }
.lm-think--tool .lm-think__node { color: var(--agent-hover); border-color: color-mix(in srgb, var(--agent) 45%, transparent); }
.lm-think--observation .lm-think__node { color: var(--green); border-color: color-mix(in srgb, var(--green) 40%, transparent); }
.lm-think__body { padding-bottom: var(--space-3); min-width: 0; flex: 1; }
.lm-think__kind {
  font-family: var(--font-mono); font-size: var(--text-micro); text-transform: uppercase;
  letter-spacing: var(--tracking-caps); color: var(--muted); margin-bottom: 3px;
  display: flex; align-items: center; gap: var(--space-2);
}
.lm-think__agent { color: var(--text-soft); }
.lm-think__content { font-size: var(--text-sm); line-height: var(--lh-body); color: var(--text-soft); }
.lm-think--tool .lm-think__content { font-family: var(--font-mono); font-size: var(--text-caption); color: var(--text); background: var(--bg-inset); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 6px 9px; }
`;
const GLYPH = {
  thought: '…',
  tool: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.7 2.7-2-2 2.7-2.7Z"
  })),
  observation: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  }))
};

/** One ReAct trace step: thought → tool call → observation. */
function ThinkingStep({
  kind = 'thought',
  agent,
  content,
  last = false,
  className = '',
  children
}) {
  useInjectCSS('lm-think-css', CSS);
  const cls = ['lm-think', `lm-think--${kind}`, className].filter(Boolean).join(' ');
  const kindLabel = kind === 'tool' ? 'Tool call' : kind === 'observation' ? 'Observation' : 'Thought';
  return /*#__PURE__*/React.createElement("div", {
    className: cls
  }, /*#__PURE__*/React.createElement("div", {
    className: "lm-think__rail"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lm-think__node"
  }, GLYPH[kind]), !last && /*#__PURE__*/React.createElement("span", {
    className: "lm-think__line"
  })), /*#__PURE__*/React.createElement("div", {
    className: "lm-think__body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lm-think__kind"
  }, kindLabel, agent && /*#__PURE__*/React.createElement("span", {
    className: "lm-think__agent"
  }, "\xB7 ", agent)), /*#__PURE__*/React.createElement("div", {
    className: "lm-think__content"
  }, content ?? children)));
}
Object.assign(__ds_scope, { ThinkingStep });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/agent/ThinkingStep.jsx", error: String((e && e.message) || e) }); }

// components/agent/ToolCall.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}
const GLYPH = {
  edit: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"
  })),
  read: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 2v6h6"
  })),
  run: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "m4 17 6-6-6-6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 19h8"
  })),
  tool: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.7 2.7-2-2 2.7-2.7Z"
  })),
  search: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "7"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 21-4.3-4.3"
  }))
};
const KIND_COLOR = {
  edit: 'var(--brand)',
  read: 'var(--cyan)',
  run: 'var(--green)',
  tool: 'var(--agent-hover)',
  search: 'var(--amber)'
};
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
const Chevron = () => /*#__PURE__*/React.createElement("span", {
  className: "lm-tool__chev"
}, /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2.2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "m9 18 6-6-6-6"
})));

/**
 * Collapsible agent tool-activity row — the "Edited a file, used a tool ›"
 * disclosure shown inline in a coding-agent conversation.
 */
function ToolCall({
  summary,
  items = [],
  running = false,
  defaultOpen = false,
  className = '',
  ...rest
}) {
  useInjectCSS('lm-tool-css', CSS);
  const [open, setOpen] = React.useState(defaultOpen);
  const cls = ['lm-tool', open ? 'lm-tool--open' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, rest), /*#__PURE__*/React.createElement("button", {
    className: "lm-tool__sum",
    onClick: () => setOpen(o => !o),
    "aria-expanded": open
  }, /*#__PURE__*/React.createElement("span", {
    className: "lm-tool__lead"
  }, running ? /*#__PURE__*/React.createElement("span", {
    className: "lm-tool__spin"
  }) : GLYPH.tool), /*#__PURE__*/React.createElement("span", {
    className: "lm-tool__label"
  }, summary, items.length > 0 && /*#__PURE__*/React.createElement("span", {
    className: "lm-tool__count"
  }, "  \xB7 ", items.length, " step", items.length > 1 ? 's' : '')), items.length > 0 && /*#__PURE__*/React.createElement(Chevron, null)), open && items.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "lm-tool__items"
  }, items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    className: "lm-tool__item",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "lm-tool__icon",
    style: {
      color: KIND_COLOR[it.kind] || 'var(--muted)'
    }
  }, GLYPH[it.kind] || GLYPH.tool), /*#__PURE__*/React.createElement("span", {
    className: "lm-tool__path"
  }, it.text), it.diff && /*#__PURE__*/React.createElement("span", {
    className: "lm-tool__diff"
  }, /*#__PURE__*/React.createElement("span", {
    className: "add"
  }, "+", it.diff[0]), " ", /*#__PURE__*/React.createElement("span", {
    className: "del"
  }, "\u2212", it.diff[1]))))));
}
Object.assign(__ds_scope, { ToolCall });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/agent/ToolCall.jsx", error: String((e && e.message) || e) }); }

// components/data/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}
const CSS = `
.lm-avatar {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; flex-shrink: 0;
  border-radius: var(--radius-md);
  font-family: var(--font-mono); font-weight: var(--fw-semibold); font-size: 12px;
  color: var(--text); background: var(--surface-3);
  border: 1px solid var(--border-strong);
  overflow: hidden; user-select: none; position: relative;
}
.lm-avatar img { width: 100%; height: 100%; object-fit: cover; }
.lm-avatar--sm { width: 24px; height: 24px; font-size: 10px; border-radius: var(--radius-sm); }
.lm-avatar--lg { width: 44px; height: 44px; font-size: 16px; border-radius: var(--radius-lg); }
.lm-avatar--round { border-radius: var(--radius-full); }
.lm-avatar svg { width: 56%; height: 56%; }

.lm-avatar--user    { background: var(--cyan-soft); color: var(--cyan); border-color: color-mix(in srgb, var(--cyan) 40%, transparent); }
.lm-avatar--harness { background: var(--brand-soft); color: var(--brand); border-color: color-mix(in srgb, var(--brand) 40%, transparent); }
.lm-avatar--research{ background: var(--agent-soft); color: var(--agent-hover); border-color: color-mix(in srgb, var(--agent) 40%, transparent); }
.lm-avatar--critic  { background: var(--amber-soft); color: var(--amber); border-color: color-mix(in srgb, var(--amber) 40%, transparent); }
.lm-avatar--synth   { background: var(--green-soft); color: var(--green); border-color: color-mix(in srgb, var(--green) 40%, transparent); }
.lm-avatar__status {
  position: absolute; right: -2px; bottom: -2px; width: 9px; height: 9px;
  border-radius: 50%; border: 2px solid var(--surface);
}
.lm-avatar__status--online { background: var(--green); }
.lm-avatar__status--busy { background: var(--amber); }
.lm-avatar__status--off { background: var(--faint); }
`;
const ROLE_GLYPH = {
  user: 'U',
  harness: 'H',
  research: 'R',
  critic: 'C',
  synth: 'S'
};

/** Square (or round) identity chip for users and harness agents. */
function Avatar({
  src,
  alt = '',
  label,
  role,
  size = 'md',
  round = false,
  status,
  className = '',
  ...rest
}) {
  useInjectCSS('lm-avatar-css', CSS);
  const cls = ['lm-avatar', size !== 'md' ? `lm-avatar--${size}` : '', round ? 'lm-avatar--round' : '', role ? `lm-avatar--${role}` : '', className].filter(Boolean).join(' ');
  const initials = label ? label.slice(0, 2).toUpperCase() : role ? ROLE_GLYPH[role] : '?';
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: alt
  }) : initials, status && /*#__PURE__*/React.createElement("span", {
    className: `lm-avatar__status lm-avatar__status--${status}`
  }));
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/data/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}
const CSS = `
.lm-badge {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--font-mono); font-size: var(--text-micro); font-weight: var(--fw-medium);
  letter-spacing: var(--tracking-wide); text-transform: uppercase;
  padding: 3px 8px; border-radius: var(--radius-xs);
  border: 1px solid transparent; line-height: 1; white-space: nowrap;
}
.lm-badge__dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
.lm-badge--neutral { background: var(--surface-3); color: var(--text-soft); border-color: var(--border-strong); }
.lm-badge--brand   { background: var(--brand-soft); color: var(--brand); border-color: color-mix(in srgb, var(--brand) 35%, transparent); }
.lm-badge--agent   { background: var(--agent-soft); color: var(--agent-hover); border-color: color-mix(in srgb, var(--agent) 35%, transparent); }
.lm-badge--success { background: var(--green-soft); color: var(--green); border-color: color-mix(in srgb, var(--green) 30%, transparent); }
.lm-badge--info    { background: var(--cyan-soft); color: var(--cyan); border-color: color-mix(in srgb, var(--cyan) 30%, transparent); }
.lm-badge--warning { background: var(--amber-soft); color: var(--amber); border-color: color-mix(in srgb, var(--amber) 30%, transparent); }
.lm-badge--danger  { background: var(--red-soft); color: var(--red); border-color: color-mix(in srgb, var(--red) 35%, transparent); }
.lm-badge--solid.lm-badge--brand   { background: var(--brand); color: var(--on-brand); border-color: transparent; }
.lm-badge--solid.lm-badge--danger  { background: var(--red); color: #2a0d0d; border-color: transparent; }
.lm-badge--solid.lm-badge--success { background: var(--green); color: #06210f; border-color: transparent; }
`;
const SEVERITY_TONE = {
  blocker: 'danger',
  major: 'warning',
  minor: 'info',
  info: 'neutral',
  approved: 'success'
};

/** Compact status / metadata badge. Pass `severity` to map a critique level to a tone. */
function Badge({
  children,
  tone = 'neutral',
  severity,
  solid = false,
  dot = false,
  className = '',
  ...rest
}) {
  useInjectCSS('lm-badge-css', CSS);
  const resolved = severity ? SEVERITY_TONE[severity] || 'neutral' : tone;
  const cls = ['lm-badge', `lm-badge--${resolved}`, solid ? 'lm-badge--solid' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    className: "lm-badge__dot"
  }), children || severity);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Badge.jsx", error: String((e && e.message) || e) }); }

// components/data/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}
const CSS = `
.lm-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.lm-card--inset { background: var(--bg-inset); }
.lm-card--pop { background: var(--surface-2); box-shadow: var(--shadow-pop); }
.lm-card--ghost { background: transparent; }
.lm-card--pad { padding: var(--space-5); }
.lm-card--interactive { transition: border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out); cursor: pointer; }
.lm-card--interactive:hover { border-color: var(--border-strong); background: var(--surface-2); }
.lm-card--accent-brand { border-color: color-mix(in srgb, var(--brand) 45%, transparent); }
.lm-card--accent-agent { border-color: color-mix(in srgb, var(--agent) 45%, transparent); }

.lm-card__header {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
}
.lm-card__title { font-family: var(--font-mono); font-size: var(--text-caption); color: var(--muted); text-transform: uppercase; letter-spacing: var(--tracking-wide); }
.lm-card__header-actions { margin-left: auto; display: flex; align-items: center; gap: var(--space-2); }
.lm-card__body { padding: var(--space-4); }
`;

/** Generic surface container. Optional header bar with title + actions. */
function Card({
  children,
  title,
  headerActions,
  variant = 'default',
  accent,
  pad = false,
  interactive = false,
  className = '',
  ...rest
}) {
  useInjectCSS('lm-card-css', CSS);
  const cls = ['lm-card', variant !== 'default' ? `lm-card--${variant}` : '', accent ? `lm-card--accent-${accent}` : '', pad && !title ? 'lm-card--pad' : '', interactive ? 'lm-card--interactive' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, rest), (title || headerActions) && /*#__PURE__*/React.createElement("div", {
    className: "lm-card__header"
  }, title && /*#__PURE__*/React.createElement("span", {
    className: "lm-card__title"
  }, title), headerActions && /*#__PURE__*/React.createElement("span", {
    className: "lm-card__header-actions"
  }, headerActions)), title ? /*#__PURE__*/React.createElement("div", {
    className: "lm-card__body"
  }, children) : children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Card.jsx", error: String((e && e.message) || e) }); }

// components/data/KeyValueRow.jsx
try { (() => {
function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}
const CSS = `
.lm-kv { display: flex; align-items: baseline; gap: var(--space-3); justify-content: space-between; padding: 5px 0; }
.lm-kv__label { font-family: var(--font-mono); font-size: var(--text-caption); color: var(--muted); white-space: nowrap; }
.lm-kv__value { font-family: var(--font-mono); font-size: var(--text-caption); color: var(--text); text-align: right; word-break: break-all; }
.lm-kv__value--brand { color: var(--brand); }
.lm-kv__value--agent { color: var(--agent-hover); }
.lm-kv__value--muted { color: var(--muted); }
.lm-kv--divided { border-bottom: 1px solid var(--border); }
`;

/** Aligned label → value row for inspector panels and metadata lists. */
function KeyValueRow({
  label,
  value,
  tone = 'default',
  divided = false,
  className = '',
  children
}) {
  useInjectCSS('lm-kv-css', CSS);
  const cls = ['lm-kv', divided ? 'lm-kv--divided' : '', className].filter(Boolean).join(' ');
  const valCls = ['lm-kv__value', tone !== 'default' ? `lm-kv__value--${tone}` : ''].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    className: cls
  }, /*#__PURE__*/React.createElement("span", {
    className: "lm-kv__label"
  }, label), /*#__PURE__*/React.createElement("span", {
    className: valCls
  }, children ?? value));
}
Object.assign(__ds_scope, { KeyValueRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/KeyValueRow.jsx", error: String((e && e.message) || e) }); }

// components/data/Spinner.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}
const CSS = `
.lm-spinner { display: inline-block; border-radius: 50%; border-style: solid; border-color: var(--border-strong); border-top-color: var(--brand); animation: lm-spin 0.7s linear infinite; vertical-align: middle; }
.lm-spinner--agent { border-top-color: var(--agent); }
.lm-spinner--current { border-color: color-mix(in srgb, currentColor 30%, transparent); border-top-color: currentColor; }
.lm-loading { display: inline-flex; align-items: center; gap: var(--space-2); color: var(--muted); font-size: var(--text-sm); font-style: italic; }
`;

/** Indeterminate spinner. */
function Spinner({
  size = 14,
  accent = 'brand',
  label,
  className = '',
  ...rest
}) {
  useInjectCSS('lm-spinner-css', CSS);
  const border = Math.max(2, Math.round(size / 7));
  const cls = ['lm-spinner', accent !== 'brand' ? `lm-spinner--${accent}` : '', className].filter(Boolean).join(' ');
  const spinner = /*#__PURE__*/React.createElement("span", _extends({
    className: cls,
    style: {
      width: size,
      height: size,
      borderWidth: border
    }
  }, rest));
  if (!label) return spinner;
  return /*#__PURE__*/React.createElement("span", {
    className: "lm-loading"
  }, spinner, label);
}
Object.assign(__ds_scope, { Spinner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Spinner.jsx", error: String((e && e.message) || e) }); }

// components/data/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}
const CSS = `
.lm-tag {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-mono); font-size: var(--text-caption);
  color: var(--text-soft);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  padding: 3px 10px; line-height: 1.3; white-space: nowrap;
}
.lm-tag--removable { padding-right: 5px; }
.lm-tag__icon { display: inline-flex; color: var(--muted); }
.lm-tag__icon svg { width: 13px; height: 13px; }
.lm-tag__remove {
  display: inline-flex; align-items: center; justify-content: center;
  width: 16px; height: 16px; border: none; background: transparent; color: var(--muted);
  border-radius: 50%; cursor: pointer; padding: 0;
}
.lm-tag__remove:hover { background: var(--surface-3); color: var(--text); }
.lm-tag__remove svg { width: 11px; height: 11px; }
.lm-tag--active { border-color: var(--brand); color: var(--brand); background: var(--brand-soft); }
`;
const X = () => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2.4",
  strokeLinecap: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "M18 6 6 18M6 6l12 12"
}));

/** Rounded label chip for tags, filters, attached files, and model labels. */
function Tag({
  children,
  icon,
  active = false,
  onRemove,
  className = '',
  ...rest
}) {
  useInjectCSS('lm-tag-css', CSS);
  const cls = ['lm-tag', onRemove ? 'lm-tag--removable' : '', active ? 'lm-tag--active' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), icon && /*#__PURE__*/React.createElement("span", {
    className: "lm-tag__icon"
  }, icon), children, onRemove && /*#__PURE__*/React.createElement("button", {
    className: "lm-tag__remove",
    onClick: onRemove,
    "aria-label": "Remove"
  }, /*#__PURE__*/React.createElement(X, null)));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Tag.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function Button({
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
  const cls = ['lm-btn', `lm-btn--${variant}`, size !== 'md' ? `lm-btn--${size}` : '', block ? 'lm-btn--block' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls,
    disabled: disabled || loading
  }, rest), loading ? /*#__PURE__*/React.createElement("span", {
    className: "lm-btn__spinner"
  }) : iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}
const CSS = `
.lm-iconbtn {
  display: inline-flex; align-items: center; justify-content: center;
  width: var(--control-md); height: var(--control-md);
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-soft);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}
.lm-iconbtn:hover:not(:disabled) { background: var(--surface-3); color: var(--text); }
.lm-iconbtn:focus-visible { outline: none; box-shadow: var(--ring); }
.lm-iconbtn:active:not(:disabled) { transform: translateY(0.5px); }
.lm-iconbtn:disabled { opacity: 0.4; cursor: not-allowed; }
.lm-iconbtn--sm { width: var(--control-sm); height: var(--control-sm); }
.lm-iconbtn--lg { width: var(--control-lg); height: var(--control-lg); }
.lm-iconbtn--outlined { border-color: var(--border-strong); background: var(--surface-2); }
.lm-iconbtn--outlined:hover:not(:disabled) { border-color: var(--faint); background: var(--surface-3); }
.lm-iconbtn--solid { background: var(--brand); color: var(--on-brand); }
.lm-iconbtn--solid:hover:not(:disabled) { background: var(--brand-hover); }
.lm-iconbtn--danger:hover:not(:disabled) { background: var(--red-soft); color: var(--red); }
.lm-iconbtn svg { width: 17px; height: 17px; display: block; }
.lm-iconbtn--sm svg { width: 15px; height: 15px; }
`;

/** Square icon-only button. Pair every instance with an `aria-label`. */
function IconButton({
  children,
  variant = 'plain',
  size = 'md',
  className = '',
  ...rest
}) {
  useInjectCSS('lm-iconbtn-css', CSS);
  const cls = ['lm-iconbtn', variant !== 'plain' ? `lm-iconbtn--${variant}` : '', size !== 'md' ? `lm-iconbtn--${size}` : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    className: cls
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
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
function Input({
  label,
  hint,
  error,
  prefix,
  mono = false,
  invalid = false,
  className = '',
  id,
  ...rest
}) {
  useInjectCSS('lm-input-css', CSS);
  const isInvalid = invalid || !!error;
  const inputCls = ['lm-input', mono ? 'lm-input--mono' : '', isInvalid ? 'lm-input--invalid' : '', prefix ? 'lm-input--with-prefix' : '', className].filter(Boolean).join(' ');
  const field = /*#__PURE__*/React.createElement("div", {
    className: "lm-input__wrap"
  }, prefix && /*#__PURE__*/React.createElement("span", {
    className: "lm-input__prefix"
  }, prefix), /*#__PURE__*/React.createElement("input", _extends({
    id: id,
    className: inputCls,
    "aria-invalid": isInvalid || undefined
  }, rest)));
  if (!label && !hint && !error) return field;
  return /*#__PURE__*/React.createElement("div", {
    className: "lm-field"
  }, label && /*#__PURE__*/React.createElement("label", {
    className: "lm-field__label",
    htmlFor: id
  }, label), field, (error || hint) && /*#__PURE__*/React.createElement("span", {
    className: `lm-field__hint ${error ? 'lm-field__hint--error' : ''}`
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/SegmentedToggle.jsx
try { (() => {
function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}
const CSS = `
.lm-seg {
  display: inline-flex;
  padding: 3px;
  gap: 2px;
  background: var(--bg-inset);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.lm-seg__opt {
  display: inline-flex; align-items: center; gap: var(--space-2);
  border: none; background: transparent;
  color: var(--muted);
  font-family: var(--font-sans); font-size: var(--text-caption); font-weight: var(--fw-medium);
  padding: 5px 13px; border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out);
}
.lm-seg__opt:hover:not(.lm-seg__opt--active) { color: var(--text); }
.lm-seg__opt:focus-visible { outline: none; box-shadow: var(--ring-inset); }
.lm-seg__opt--active { background: var(--surface-3); color: var(--text); }
.lm-seg--brand .lm-seg__opt--active { background: var(--brand); color: var(--on-brand); }
.lm-seg--agent .lm-seg__opt--active { background: var(--agent); color: #fff; }
.lm-seg__opt svg { width: 14px; height: 14px; }
.lm-seg__dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
`;

/**
 * Segmented single-select toggle. The LMChat mode switch
 * (Direct / Harness) is the canonical use.
 */
function SegmentedToggle({
  options,
  value,
  onChange,
  accent = 'neutral',
  className = ''
}) {
  useInjectCSS('lm-seg-css', CSS);
  const cls = ['lm-seg', accent !== 'neutral' ? `lm-seg--${accent}` : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    className: cls,
    role: "tablist"
  }, options.map(opt => {
    const v = typeof opt === 'string' ? opt : opt.value;
    const label = typeof opt === 'string' ? opt : opt.label;
    const icon = typeof opt === 'string' ? null : opt.icon;
    const active = v === value;
    return /*#__PURE__*/React.createElement("button", {
      key: v,
      role: "tab",
      "aria-selected": active,
      className: `lm-seg__opt ${active ? 'lm-seg__opt--active' : ''}`,
      onClick: () => onChange && onChange(v)
    }, icon, label);
  }));
}
Object.assign(__ds_scope, { SegmentedToggle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/SegmentedToggle.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}
const CSS = `
.lm-select__wrap { position: relative; display: inline-flex; width: 100%; }
.lm-select {
  appearance: none; -webkit-appearance: none;
  width: 100%; height: var(--control-md);
  background: var(--bg-inset);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text);
  font-family: var(--font-sans); font-size: var(--text-sm);
  padding: 0 32px 0 12px;
  cursor: pointer; outline: none;
  transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}
.lm-select:hover { border-color: var(--border-strong); }
.lm-select:focus { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(224,108,58,0.16); }
.lm-select:disabled { opacity: 0.5; cursor: not-allowed; }
.lm-select--mono { font-family: var(--font-mono); }
.lm-select__chevron {
  position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
  pointer-events: none; color: var(--muted);
}
.lm-select__chevron svg { width: 15px; height: 15px; display: block; }
`;
const Chevron = () => /*#__PURE__*/React.createElement("span", {
  className: "lm-select__chevron",
  "aria-hidden": "true"
}, /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "m6 9 6 6 6-6"
})));

/** Native select, styled to the dark token system with a custom chevron. */
function Select({
  options = [],
  value,
  onChange,
  mono = false,
  className = '',
  children,
  ...rest
}) {
  useInjectCSS('lm-select-css', CSS);
  const cls = ['lm-select', mono ? 'lm-select--mono' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", {
    className: "lm-select__wrap"
  }, /*#__PURE__*/React.createElement("select", _extends({
    className: cls,
    value: value,
    onChange: e => onChange && onChange(e.target.value)
  }, rest), children || options.map(opt => {
    const v = typeof opt === 'string' ? opt : opt.value;
    const label = typeof opt === 'string' ? opt : opt.label;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, label);
  })), /*#__PURE__*/React.createElement(Chevron, null));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}
const CSS = `
.lm-switch { display: inline-flex; align-items: center; gap: var(--space-3); cursor: pointer; user-select: none; }
.lm-switch__track {
  position: relative; width: 36px; height: 20px; flex-shrink: 0;
  background: var(--surface-3); border: 1px solid var(--border-strong);
  border-radius: var(--radius-pill);
  transition: background var(--dur-base) var(--ease-out), border-color var(--dur-base) var(--ease-out);
}
.lm-switch__thumb {
  position: absolute; top: 2px; left: 2px; width: 14px; height: 14px;
  background: var(--text-soft); border-radius: 50%;
  transition: transform var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-out);
}
.lm-switch input { position: absolute; opacity: 0; width: 0; height: 0; }
.lm-switch input:checked + .lm-switch__track { background: var(--brand); border-color: var(--brand); }
.lm-switch input:checked + .lm-switch__track .lm-switch__thumb { transform: translateX(16px); background: var(--on-brand); }
.lm-switch input:focus-visible + .lm-switch__track { box-shadow: var(--ring); }
.lm-switch--agent input:checked + .lm-switch__track { background: var(--agent); border-color: var(--agent); }
.lm-switch--agent input:checked + .lm-switch__track .lm-switch__thumb { background: #fff; }
.lm-switch__label { font-size: var(--text-sm); color: var(--text); }
.lm-switch--disabled { opacity: 0.45; cursor: not-allowed; }
`;

/** Boolean on/off switch. */
function Switch({
  checked,
  onChange,
  label,
  accent = 'brand',
  disabled = false,
  className = '',
  ...rest
}) {
  useInjectCSS('lm-switch-css', CSS);
  const cls = ['lm-switch', accent === 'agent' ? 'lm-switch--agent' : '', disabled ? 'lm-switch--disabled' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("label", {
    className: cls
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    checked: checked,
    disabled: disabled,
    onChange: e => onChange && onChange(e.target.checked)
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "lm-switch__track"
  }, /*#__PURE__*/React.createElement("span", {
    className: "lm-switch__thumb"
  })), label && /*#__PURE__*/React.createElement("span", {
    className: "lm-switch__label"
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
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
function Textarea({
  mono = false,
  seamless = false,
  className = '',
  ...rest
}) {
  useInjectCSS('lm-textarea-css', CSS);
  const cls = ['lm-textarea', mono ? 'lm-textarea--mono' : '', seamless ? 'lm-textarea--seamless' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("textarea", _extends({
    className: cls
  }, rest));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}
const CSS = `
.lm-tabs { display: flex; gap: 2px; border-bottom: 1px solid var(--border); }
.lm-tabs__tab {
  position: relative; border: none; background: transparent;
  color: var(--muted); font-family: var(--font-sans); font-size: var(--text-sm); font-weight: var(--fw-medium);
  padding: 9px 13px; cursor: pointer; display: inline-flex; align-items: center; gap: var(--space-2);
  transition: color var(--dur-fast) var(--ease-out);
}
.lm-tabs__tab:hover { color: var(--text); }
.lm-tabs__tab:focus-visible { outline: none; box-shadow: var(--ring-inset); border-radius: var(--radius-sm); }
.lm-tabs__tab--active { color: var(--text); }
.lm-tabs__tab--active::after {
  content: ''; position: absolute; left: 8px; right: 8px; bottom: -1px; height: 2px;
  background: var(--brand); border-radius: var(--radius-pill);
}
.lm-tabs--agent .lm-tabs__tab--active::after { background: var(--agent); }
.lm-tabs__count {
  font-family: var(--font-mono); font-size: var(--text-micro); color: var(--muted);
  background: var(--surface-3); border-radius: var(--radius-pill); padding: 1px 6px; line-height: 1.4;
}
.lm-tabs__tab--active .lm-tabs__count { color: var(--text); }
`;

/** Underline tab bar for switching panel views (e.g. Thinking / Critiques). */
function Tabs({
  tabs = [],
  value,
  onChange,
  accent = 'brand',
  className = ''
}) {
  useInjectCSS('lm-tabs-css', CSS);
  const cls = ['lm-tabs', accent === 'agent' ? 'lm-tabs--agent' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    className: cls,
    role: "tablist"
  }, tabs.map(t => {
    const v = typeof t === 'string' ? t : t.value;
    const label = typeof t === 'string' ? t : t.label;
    const count = typeof t === 'string' ? undefined : t.count;
    const icon = typeof t === 'string' ? null : t.icon;
    const active = v === value;
    return /*#__PURE__*/React.createElement("button", {
      key: v,
      role: "tab",
      "aria-selected": active,
      className: `lm-tabs__tab ${active ? 'lm-tabs__tab--active' : ''}`,
      onClick: () => onChange && onChange(v)
    }, icon, label, count != null && /*#__PURE__*/React.createElement("span", {
      className: "lm-tabs__count"
    }, count));
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tooltip.jsx
try { (() => {
function useInjectCSS(id, css) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}
const CSS = `
.lm-tip { position: relative; display: inline-flex; }
.lm-tip__pop {
  position: absolute; z-index: 40; pointer-events: none;
  background: var(--surface-2); color: var(--text);
  border: 1px solid var(--border-strong); border-radius: var(--radius-sm);
  box-shadow: var(--shadow-pop);
  font-family: var(--font-mono); font-size: var(--text-micro); line-height: 1.4;
  padding: 5px 8px; white-space: nowrap;
  opacity: 0; transform: translate(-50%, 2px); left: 50%;
  transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}
.lm-tip__pop--top { bottom: calc(100% + 7px); }
.lm-tip__pop--bottom { top: calc(100% + 7px); }
.lm-tip:hover .lm-tip__pop, .lm-tip:focus-within .lm-tip__pop { opacity: 1; transform: translate(-50%, 0); }
.lm-tip__pop::after {
  content: ''; position: absolute; left: 50%; transform: translateX(-50%) rotate(45deg);
  width: 7px; height: 7px; background: var(--surface-2); border: 1px solid var(--border-strong);
}
.lm-tip__pop--top::after { bottom: -4px; border-top: none; border-left: none; }
.lm-tip__pop--bottom::after { top: -4px; border-bottom: none; border-right: none; }
`;

/** Lightweight hover/focus tooltip. Wraps its trigger child. */
function Tooltip({
  label,
  side = 'top',
  children,
  className = ''
}) {
  useInjectCSS('lm-tip-css', CSS);
  return /*#__PURE__*/React.createElement("span", {
    className: `lm-tip ${className}`.trim(),
    tabIndex: -1
  }, children, /*#__PURE__*/React.createElement("span", {
    className: `lm-tip__pop lm-tip__pop--${side}`,
    role: "tooltip"
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tooltip.jsx", error: String((e && e.message) || e) }); }

// ui_kits/lmchat/app.jsx
try { (() => {
/* LMChat UI kit — app shell.
   Coding-agent chat: choose a working directory + harness before the first prompt,
   watch inline tool activity, and read thinking/critiques in the right sidebar.
   Per-session harness · folders · server harness registry · Ollama provider. */
(function () {
  const DS = window.LMChatDesignSystem_bc9736;
  const {
    MessageBubble,
    ToolCall
  } = DS;
  const K = window.LMKit;
  const {
    Icon,
    refreshIcons,
    harnessById
  } = K;
  const SUGGEST = ['Fix the login race condition in session.py', 'Add a test for concurrent token refresh', 'Refactor the scout dispatch loop'];
  const replyFor = h => h.agents <= 1 ? 'Done. The token-refresh path wasn\u2019t mutex-guarded \u2014 I wrapped it in an async lock so late callers await the in-flight refresh instead of starting their own. Auth tests pass.' : 'Routed through the harness \u2014 ' + h.agents + ' agents collaborated. Scouts gathered references, the Critic ran L2\u2013L7 across 2 rounds, and the Synthesizer wrote the patch from the approved ledger. Auth tests pass; see the Critiques tab for the open items.';
  const toolItems = proj => [{
    kind: 'read',
    text: 'src/auth/session.py'
  }, {
    kind: 'edit',
    text: 'src/auth/session.py',
    diff: [12, 3]
  }, {
    kind: 'run',
    text: 'pytest tests/auth -q'
  }];
  const SEED_PROJECTS = {
    s1: '~/projects/mach2-harness',
    s2: '~/projects/mach2-harness',
    s3: '~/work/design-system',
    s4: '~/projects/mach2-harness',
    s5: '~/projects/mach2-harness'
  };
  let uid = 100;
  function App() {
    const [harnesses, setHarnesses] = React.useState(K.HARNESSES.map(h => ({
      ...h
    })));
    const [folders, setFolders] = React.useState(K.FOLDERS.map(f => ({
      ...f
    })));
    const [sessions, setSessions] = React.useState(K.SEED_SESSIONS.map(s => ({
      ...s,
      project: SEED_PROJECTS[s.id],
      messages: [],
      insp: {
        status: 'idle'
      }
    })));
    const [activeId, setActiveId] = React.useState('s1');
    const [model, setModel] = React.useState('ornith:9b');
    const [provider, setProvider] = React.useState({
      ...K.DEFAULT_PROVIDER
    });
    const [openFolders, setOpenFolders] = React.useState({});
    const [input, setInput] = React.useState('');
    const [dir, setDir] = React.useState('~/projects/mach2-harness');
    const [loading, setLoading] = React.useState(false);
    const [rightOpen, setRightOpen] = React.useState(true);
    const [rightTab, setRightTab] = React.useState('inspector');
    const [harnessesOpen, setHarnessesOpen] = React.useState(false);
    const [settingsOpen, setSettingsOpen] = React.useState(false);
    const scrollRef = React.useRef(null);
    React.useEffect(() => {
      refreshIcons();
    });
    const active = sessions.find(s => s.id === activeId) || sessions[0];
    const ready = active && active.harnessId && active.project;
    const harness = ready ? harnessById(harnesses, active.harnessId) : null;
    React.useEffect(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [active && active.messages.length, loading]);
    const patchActive = patch => setSessions(p => p.map(s => s.id === activeId ? {
      ...s,
      ...(typeof patch === 'function' ? patch(s) : patch)
    } : s));
    function newSession() {
      const id = 'n' + uid++;
      setSessions(p => [{
        id,
        title: 'New session',
        harnessId: null,
        project: null,
        folderId: null,
        when: 'now',
        messages: [],
        insp: {
          status: 'idle'
        }
      }, ...p]);
      setActiveId(id);
      setInput('');
      setDir('~/projects/mach2-harness');
    }
    function newFolder() {
      const id = 'd' + uid++;
      setFolders(p => [...p, {
        id,
        name: 'New folder'
      }]);
    }
    function startSession(hid) {
      patchActive({
        harnessId: hid,
        project: dir.trim() || '~/projects'
      });
      setRightTab('inspector');
    }
    function changeHarness(hid) {
      patchActive({
        harnessId: hid,
        messages: [],
        insp: {
          status: 'idle'
        }
      });
    }
    function clearSession() {
      patchActive({
        messages: [],
        insp: {
          status: 'idle'
        }
      });
      setInput('');
    }
    function toggleFolder(fid) {
      setOpenFolders(p => ({
        ...p,
        [fid]: p[fid] === false ? true : false
      }));
    }
    function toggleLoad(hid) {
      setHarnesses(p => p.map(h => h.id === hid ? {
        ...h,
        loaded: !h.loaded
      } : h));
    }
    function saveUrl(url) {
      setProvider(p => ({
        ...p,
        url
      }));
      setSettingsOpen(false);
    }
    function toggleRight() {
      setRightOpen(o => {
        const n = !o;
        if (n) setRightTab('thinking');
        return n;
      });
    }
    function send(text) {
      const body = (text ?? input).trim();
      if (!body || loading || !harness) return;
      const h = harness;
      setInput('');
      patchActive(s => ({
        title: s.title === 'New session' ? body.slice(0, 38) : s.title,
        messages: [...s.messages, {
          role: 'user',
          content: body
        }, {
          type: 'tool',
          running: true
        }, {
          role: 'assistant',
          content: '',
          pending: true
        }],
        insp: {
          status: 'running'
        }
      }));
      setLoading(true);
      setRightOpen(true);
      setRightTab('thinking');
      const reply = replyFor(h);
      setTimeout(() => {
        patchActive(s => {
          const m = [...s.messages];
          m[m.length - 2] = {
            type: 'tool',
            running: false,
            summary: 'Edited session.py, read a file, ran a tool',
            items: toolItems(s.project)
          };
          m[m.length - 1] = {
            role: 'assistant',
            content: reply
          };
          return {
            messages: m,
            insp: {
              status: 'done',
              session: 'a1b2c3d4…',
              agents: h.agents,
              critiques: h.agents > 1 ? K.CRITIQUES.length : 0,
              elapsed: h.agents > 1 ? '8.4s' : '2.1s'
            }
          };
        });
        setLoading(false);
      }, h.agents > 1 ? 1500 : 900);
    }
    const openBlockers = K.CRITIQUES.filter(c => !c.resolved && (c.severity === 'blocker' || c.severity === 'major')).length;
    const insp = active ? active.insp : {
      status: 'idle'
    };
    return /*#__PURE__*/React.createElement("div", {
      className: "lm-app"
    }, /*#__PURE__*/React.createElement(K.TopBar, {
      session: active,
      project: active && active.project,
      harness: harness,
      harnesses: harnesses,
      onChangeHarness: changeHarness,
      model: model,
      setModel: setModel,
      onOpenHarnesses: () => setHarnessesOpen(true),
      onClear: clearSession,
      onToggleRight: toggleRight,
      rightOpen: rightOpen,
      openBlockers: openBlockers,
      serverUp: true
    }), /*#__PURE__*/React.createElement("div", {
      className: "lm-body"
    }, /*#__PURE__*/React.createElement(K.Sidebar, {
      folders: folders,
      sessions: sessions,
      active: activeId,
      onSelect: setActiveId,
      onNew: newSession,
      onNewFolder: newFolder,
      openFolders: openFolders,
      toggleFolder: toggleFolder,
      onOpenSettings: () => setSettingsOpen(true),
      provider: provider
    }), /*#__PURE__*/React.createElement("main", {
      className: "lm-main"
    }, !ready ? /*#__PURE__*/React.createElement(K.HarnessSelectScreen, {
      harnesses: harnesses,
      dir: dir,
      setDir: setDir,
      onPick: startSession,
      onOpenHarnesses: () => setHarnessesOpen(true)
    }) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      className: "lm-chat",
      ref: scrollRef
    }, active.messages.length === 0 ? /*#__PURE__*/React.createElement("div", {
      className: "lm-empty"
    }, /*#__PURE__*/React.createElement("span", {
      className: "lm-empty__mark"
    }, "M2"), /*#__PURE__*/React.createElement("div", {
      className: "lm-empty__h"
    }, harness.label, " harness ready."), /*#__PURE__*/React.createElement("div", {
      className: "lm-empty__p"
    }, "Working in ", /*#__PURE__*/React.createElement("span", {
      className: "lm-empty__file"
    }, active.project), " via ", /*#__PURE__*/React.createElement("span", {
      className: "lm-empty__file"
    }, harness.file), ". Try:"), /*#__PURE__*/React.createElement("div", {
      className: "lm-empty__chips"
    }, SUGGEST.map(s => /*#__PURE__*/React.createElement("button", {
      key: s,
      className: "lm-suggest",
      onClick: () => send(s)
    }, Icon('sparkles', 14), s)))) : /*#__PURE__*/React.createElement("div", {
      className: "lm-chat__list"
    }, active.messages.map((m, i) => m.type === 'tool' ? /*#__PURE__*/React.createElement(ToolCall, {
      key: i,
      running: m.running,
      summary: m.running ? 'Working…' : m.summary,
      items: m.items || []
    }) : /*#__PURE__*/React.createElement(MessageBubble, {
      key: i,
      role: m.role,
      loading: m.pending,
      name: m.role === 'assistant' ? harness.id : undefined
    }, m.content)))), /*#__PURE__*/React.createElement(K.Composer, {
      value: input,
      onChange: setInput,
      onSend: () => send(),
      loading: loading,
      harness: harness
    }))), /*#__PURE__*/React.createElement(K.RightPanel, {
      open: rightOpen,
      tab: rightTab,
      setTab: setRightTab,
      onClose: () => setRightOpen(false),
      insp: insp,
      harness: harness,
      model: model,
      provider: provider,
      project: active && active.project
    })), /*#__PURE__*/React.createElement(K.HarnessesPanel, {
      open: harnessesOpen,
      harnesses: harnesses,
      onToggleLoad: toggleLoad,
      onClose: () => setHarnessesOpen(false)
    }), /*#__PURE__*/React.createElement(K.SettingsModal, {
      open: settingsOpen,
      provider: provider,
      models: K.MODELS,
      onClose: () => setSettingsOpen(false),
      onSaveUrl: saveUrl
    }));
  }
  window.LMKit = Object.assign(window.LMKit || {}, {
    App
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/lmchat/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/lmchat/parts.jsx
try { (() => {
/* LMChat UI kit — seed data + top bar / composer / inspector.
   LMChat is harness-only: every session is driven by an agent harness (a Python
   module under agent/) that talks to a local model via Ollama. Each session keeps
   its own harness; harnesses are loaded on the server, then chosen per session. */
(function () {
  const DS = window.LMChatDesignSystem_bc9736;
  const {
    Button,
    IconButton,
    Select,
    KeyValueRow,
    Card,
    Badge,
    Tag,
    Spinner,
    Avatar,
    Tooltip
  } = DS;
  const Icon = (name, size = 16) => React.createElement('i', {
    'data-lucide': name,
    style: {
      width: size,
      height: size
    }
  });
  function refreshIcons() {
    requestAnimationFrame(() => window.lucide && window.lucide.createIcons());
  }

  // ── Harness registry (what the server knows about) ──
  // loaded: in memory on the harness server (:8000) and selectable for a session.
  const HARNESSES = [{
    id: 'agent-base',
    label: 'ReAct Agent',
    file: 'agent/p1-agent-base',
    desc: 'Single ReAct loop — think → tool → observe',
    agents: 1,
    loaded: true,
    isDefault: true
  }, {
    id: 'harness',
    label: 'Orchestrator',
    file: 'agent/p2-harness',
    desc: 'Central harness routes between agents',
    agents: 3,
    loaded: true
  }, {
    id: 'research',
    label: 'Research + Critic',
    file: 'agent/p4-specialization',
    desc: 'Scouts → L2–L7 critic → synthesizer',
    agents: 6,
    loaded: true
  }, {
    id: 'a2a',
    label: 'Agent-to-Agent',
    file: 'agent/p3-agent-to-agent',
    desc: 'Agents call other agents as tools',
    agents: 4,
    loaded: false
  }, {
    id: 'memory',
    label: 'Memory Harness',
    file: 'agent/p5-memory',
    desc: 'Shared + per-agent memory layers',
    agents: 6,
    loaded: false
  }];
  const HARNESS_DOT = {
    'agent-base': 'var(--cyan)',
    harness: 'var(--brand)',
    a2a: 'var(--amber)',
    research: 'var(--agent)',
    memory: 'var(--green)'
  };
  const harnessById = (list, id) => (list || HARNESSES).find(h => h.id === id) || null;

  // ── Model providers (Ollama; URL configurable in Settings) ──
  const DEFAULT_PROVIDER = {
    id: 'ollama-local',
    name: 'Ollama (local)',
    url: 'http://localhost:11434',
    isDefault: true,
    connected: true
  };
  const MODELS = ['ornith:9b', 'gemma4:latest', 'qwen3:8b', 'nomic-embed-text'];

  // ── Folders + sessions (left nav) ──
  const FOLDERS = [{
    id: 'f1',
    name: 'Auth bugs'
  }, {
    id: 'f2',
    name: 'Design research'
  }];
  const SEED_SESSIONS = [{
    id: 's1',
    title: 'Login race condition fix',
    harnessId: 'research',
    folderId: 'f1',
    when: '2m'
  }, {
    id: 's2',
    title: 'Session token refresh',
    harnessId: 'harness',
    folderId: 'f1',
    when: '1h'
  }, {
    id: 's3',
    title: 'Dark-mode dashboard',
    harnessId: 'research',
    folderId: 'f2',
    when: '3h'
  }, {
    id: 's4',
    title: 'Scout dispatch refactor',
    harnessId: 'harness',
    folderId: null,
    when: 'Tue'
  }, {
    id: 's5',
    title: 'Critique ledger explained',
    harnessId: 'agent-base',
    folderId: null,
    when: 'Mon'
  }];

  // ── Top bar ──────────────────────────────────────────────
  function TopBar({
    session,
    project,
    harness,
    harnesses,
    onChangeHarness,
    model,
    setModel,
    onOpenHarnesses,
    onClear,
    onToggleRight,
    rightOpen,
    openBlockers,
    serverUp
  }) {
    refreshIcons();
    const loaded = harnesses.filter(h => h.loaded);
    return /*#__PURE__*/React.createElement("header", {
      className: "lm-topbar"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lm-topbar__brand"
    }, /*#__PURE__*/React.createElement("span", {
      className: "lm-mark"
    }, "M2"), /*#__PURE__*/React.createElement("span", {
      className: "lm-wordmark"
    }, "LMChat")), /*#__PURE__*/React.createElement("div", {
      className: "lm-picker"
    }, /*#__PURE__*/React.createElement("span", {
      className: "lm-picker__label"
    }, Icon('git-branch', 13), " harness"), /*#__PURE__*/React.createElement("div", {
      className: "lm-picker__select lm-picker__select--harness"
    }, harness ? /*#__PURE__*/React.createElement(Select, {
      value: harness.id,
      onChange: onChangeHarness,
      options: loaded.map(h => ({
        value: h.id,
        label: h.label
      }))
    }) : /*#__PURE__*/React.createElement("div", {
      className: "lm-picker__empty"
    }, "Not selected")), /*#__PURE__*/React.createElement(Tooltip, {
      label: "Browse harnesses on server",
      side: "bottom"
    }, /*#__PURE__*/React.createElement(IconButton, {
      variant: "outlined",
      "aria-label": "Harnesses",
      onClick: onOpenHarnesses
    }, Icon('layers', 16)))), /*#__PURE__*/React.createElement("div", {
      className: "lm-topbar__right"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lm-picker"
    }, /*#__PURE__*/React.createElement("span", {
      className: "lm-picker__label"
    }, Icon('cpu', 13), " model"), /*#__PURE__*/React.createElement("div", {
      className: "lm-picker__select"
    }, /*#__PURE__*/React.createElement(Select, {
      mono: true,
      value: model,
      onChange: setModel,
      options: MODELS.filter(m => !m.includes('embed')).map(m => ({
        value: m,
        label: m
      }))
    }))), /*#__PURE__*/React.createElement(Tooltip, {
      label: serverUp ? 'Harness server running · uvicorn :8000' : 'Server stopped',
      side: "bottom"
    }, /*#__PURE__*/React.createElement("span", {
      className: `lm-server ${serverUp ? 'lm-server--up' : ''}`
    }, /*#__PURE__*/React.createElement("span", {
      className: "lm-server__dot"
    }), ":8000")), /*#__PURE__*/React.createElement(Button, {
      variant: rightOpen ? 'agent' : 'secondary',
      size: "sm",
      iconLeft: Icon('panel-right', 14),
      onClick: onToggleRight
    }, "Thinking & Critiques", openBlockers > 0 && /*#__PURE__*/React.createElement("span", {
      className: "lm-trigger__count"
    }, openBlockers)), /*#__PURE__*/React.createElement(Tooltip, {
      label: "Clear session",
      side: "bottom"
    }, /*#__PURE__*/React.createElement(IconButton, {
      variant: "plain",
      "aria-label": "Clear session",
      onClick: onClear
    }, Icon('eraser', 16)))));
  }

  // ── Composer ─────────────────────────────────────────────
  function Composer({
    value,
    onChange,
    onSend,
    loading,
    harness
  }) {
    refreshIcons();
    const placeholder = loading ? 'Harness is working…' : `Message the ${harness.label} harness — press Enter to send…`;
    return /*#__PURE__*/React.createElement("div", {
      className: "lm-composer"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lm-composer__shell"
    }, /*#__PURE__*/React.createElement(Tooltip, {
      label: "Attach file"
    }, /*#__PURE__*/React.createElement(IconButton, {
      variant: "plain",
      "aria-label": "Attach"
    }, Icon('paperclip', 17))), /*#__PURE__*/React.createElement("textarea", {
      className: "lm-composer__input",
      rows: 1,
      value: value,
      disabled: loading,
      placeholder: placeholder,
      onChange: e => onChange(e.target.value),
      onKeyDown: e => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onSend();
        }
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "lm-composer__send"
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "sm",
      disabled: loading || !value.trim(),
      onClick: onSend,
      iconRight: loading ? null : Icon('arrow-up', 15)
    }, loading ? /*#__PURE__*/React.createElement(Spinner, {
      size: 14,
      accent: "current"
    }) : 'Send'))), /*#__PURE__*/React.createElement("div", {
      className: "lm-composer__hint"
    }, /*#__PURE__*/React.createElement("span", null, harness.file, " ", /*#__PURE__*/React.createElement("span", {
      className: "lm-arrow"
    }, "\u2192"), " local model"), /*#__PURE__*/React.createElement("span", {
      className: "lm-kbd"
    }, "\u23CE send \xA0\xB7\xA0 \u21E7\u23CE newline")));
  }

  // ── Inspector ────────────────────────────────────────────
  function InspectorBody({
    state,
    harness,
    model,
    provider,
    project
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "lm-insp"
    }, /*#__PURE__*/React.createElement(Card, {
      title: "Session",
      headerActions: /*#__PURE__*/React.createElement(Badge, {
        tone: "agent",
        dot: true
      }, harness ? harness.id : 'none')
    }, project && /*#__PURE__*/React.createElement(KeyValueRow, {
      label: "Directory",
      value: project,
      tone: "muted"
    }), harness ? /*#__PURE__*/React.createElement(KeyValueRow, {
      label: "Harness"
    }, /*#__PURE__*/React.createElement(Tag, null, harness.label)) : /*#__PURE__*/React.createElement(KeyValueRow, {
      label: "Harness",
      value: "\u2014 pick one \u2014",
      tone: "muted"
    }), harness && /*#__PURE__*/React.createElement(KeyValueRow, {
      label: "Module",
      value: harness.file,
      tone: "agent"
    }), /*#__PURE__*/React.createElement(KeyValueRow, {
      label: "Model"
    }, /*#__PURE__*/React.createElement(Tag, null, model)), /*#__PURE__*/React.createElement(KeyValueRow, {
      label: "Provider",
      value: provider.url,
      tone: "muted"
    }), state.status === 'idle' && /*#__PURE__*/React.createElement("div", {
      className: "lm-dim",
      style: {
        marginTop: 10
      }
    }, "Waiting for input\u2026"), state.status === 'running' && /*#__PURE__*/React.createElement("div", {
      className: "lm-dim",
      style: {
        marginTop: 10,
        display: 'flex',
        gap: 8,
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement(Spinner, {
      size: 13,
      accent: "agent"
    }), "Running ", harness.label, "\u2026"), state.status === 'done' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        height: 8
      }
    }), /*#__PURE__*/React.createElement(KeyValueRow, {
      label: "Session id",
      value: state.session,
      divided: true
    }), /*#__PURE__*/React.createElement(KeyValueRow, {
      label: "Agents",
      value: state.agents
    }), /*#__PURE__*/React.createElement(KeyValueRow, {
      label: "Critiques",
      value: state.critiques
    }), /*#__PURE__*/React.createElement(KeyValueRow, {
      label: "Time",
      value: state.elapsed
    }), /*#__PURE__*/React.createElement("div", {
      className: "lm-dim",
      style: {
        marginTop: 10
      }
    }, "Full trace \u2192 localhost:3000"))), state.status === 'done' && harness && harness.agents > 1 && /*#__PURE__*/React.createElement(Card, {
      title: "Agents",
      style: {
        marginTop: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "lm-agentlist"
    }, [['harness', 'Harness', 'online'], ['research', 'Research · 3 scouts', 'online'], ['critic', 'Critic · L2–L7', 'busy'], ['synth', 'Synthesizer', 'off']].slice(0, harness.agents >= 6 ? 4 : harness.agents).map(([role, label, st]) => /*#__PURE__*/React.createElement("div", {
      className: "lm-agentlist__row",
      key: role
    }, /*#__PURE__*/React.createElement(Avatar, {
      role: role,
      size: "sm",
      status: st
    }), /*#__PURE__*/React.createElement("span", {
      className: "lm-agentlist__name"
    }, label))))));
  }
  window.LMKit = Object.assign(window.LMKit || {}, {
    Icon,
    refreshIcons,
    HARNESSES,
    HARNESS_DOT,
    harnessById,
    MODELS,
    DEFAULT_PROVIDER,
    FOLDERS,
    SEED_SESSIONS,
    TopBar,
    Composer,
    InspectorBody
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/lmchat/parts.jsx", error: String((e && e.message) || e) }); }

// ui_kits/lmchat/rightpanel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* LMChat UI kit — persistent right sidebar: Inspector · Thinking · Critiques.
   This is the default home for the agent's steps, thought process, and critiques. */
(function () {
  const DS = window.LMChatDesignSystem_bc9736;
  const {
    IconButton,
    Tabs,
    ThinkingStep,
    CritiqueCard,
    Badge,
    Tooltip
  } = DS;
  const {
    Icon,
    refreshIcons
  } = window.LMKit;
  const TRACE = [{
    kind: 'thought',
    agent: 'Harness',
    content: 'User wants the login race condition fixed. Read the auth code before editing.'
  }, {
    kind: 'tool',
    agent: 'Harness',
    content: 'read_file({ path: "src/auth/session.py" })'
  }, {
    kind: 'observation',
    agent: 'Harness',
    content: 'Token refresh isn\u2019t mutex-guarded \u2014 two requests can refresh in parallel.'
  }, {
    kind: 'thought',
    agent: 'Harness',
    content: 'Guard the refresh with an async mutex; late callers await the in-flight promise.'
  }, {
    kind: 'tool',
    agent: 'Harness',
    content: 'edit_file({ path: "src/auth/session.py", +12, -3 })'
  }, {
    kind: 'observation',
    agent: 'Critic \u00b7 L4',
    content: 'Patch is scoped and consistent. pytest auth suite passes.'
  }];
  const CRITIQUES = [{
    severity: 'blocker',
    category: 'fact',
    id: 'c-017',
    round: 1,
    message: 'Recommendation cites a source URL that 404s \u2014 unverifiable.',
    suggestedAction: 'spawn_scout({ mission: "verify mutex pattern", sources: ["web"] })'
  }, {
    severity: 'major',
    category: 'gap',
    id: 'c-042',
    round: 1,
    message: 'No test covers two concurrent refreshes racing.',
    suggestedAction: 'add_test({ name: "test_refresh_race", file: "tests/auth" })'
  }, {
    severity: 'minor',
    category: 'logic',
    id: 'c-051',
    round: 2,
    message: 'Comment says "lock acquired" but logs before the await.'
  }, {
    severity: 'minor',
    category: 'efficiency',
    id: 'c-055',
    round: 2,
    message: 'Two reads of session.py \u2014 cache the first.',
    resolved: true
  }, {
    severity: 'info',
    category: 'scope',
    id: 'c-060',
    round: 2,
    message: 'Refresh-token rotation out of scope \u2014 noted, not actioned.'
  }];
  function RightPanel({
    open,
    tab,
    setTab,
    onClose,
    insp,
    harness,
    model,
    provider,
    project
  }) {
    refreshIcons();
    const openCount = CRITIQUES.filter(c => !c.resolved && (c.severity === 'blocker' || c.severity === 'major')).length;
    const InspectorBody = window.LMKit.InspectorBody;
    return /*#__PURE__*/React.createElement("aside", {
      className: `lm-right ${open ? 'lm-right--open' : ''}`,
      "aria-hidden": !open
    }, /*#__PURE__*/React.createElement("div", {
      className: "lm-right__head"
    }, /*#__PURE__*/React.createElement("span", {
      className: "lm-right__title"
    }, Icon('panel-right', 15), " Trace"), /*#__PURE__*/React.createElement(Tooltip, {
      label: "Hide panel",
      side: "bottom"
    }, /*#__PURE__*/React.createElement(IconButton, {
      variant: "plain",
      "aria-label": "Hide panel",
      onClick: onClose
    }, Icon('panel-right-close', 16)))), /*#__PURE__*/React.createElement("div", {
      className: "lm-right__tabs"
    }, /*#__PURE__*/React.createElement(Tabs, {
      accent: "agent",
      value: tab,
      onChange: setTab,
      tabs: [{
        value: 'inspector',
        label: 'Inspector'
      }, {
        value: 'thinking',
        label: 'Thinking'
      }, {
        value: 'critiques',
        label: 'Critiques',
        count: openCount
      }]
    })), /*#__PURE__*/React.createElement("div", {
      className: "lm-right__body"
    }, tab === 'inspector' && InspectorBody && /*#__PURE__*/React.createElement(InspectorBody, {
      state: insp,
      harness: harness,
      model: model,
      provider: provider,
      project: project
    }), tab === 'thinking' && (harness ? /*#__PURE__*/React.createElement("div", {
      className: "lm-trace"
    }, TRACE.slice(0, harness.agents <= 1 ? 6 : 6).map((s, i) => /*#__PURE__*/React.createElement(ThinkingStep, _extends({
      key: i
    }, s, {
      last: i === TRACE.length - 1
    })))) : /*#__PURE__*/React.createElement("div", {
      className: "lm-dim lm-right__empty"
    }, "Pick a harness to see its reasoning trace.")), tab === 'critiques' && (harness && harness.agents > 1 ? /*#__PURE__*/React.createElement("div", {
      className: "lm-critlist"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lm-critlist__head"
    }, /*#__PURE__*/React.createElement(Badge, {
      severity: "blocker"
    }), /*#__PURE__*/React.createElement(Badge, {
      severity: "major"
    }), /*#__PURE__*/React.createElement(Badge, {
      severity: "minor"
    }), /*#__PURE__*/React.createElement("span", {
      className: "lm-dim",
      style: {
        marginLeft: 'auto',
        fontFamily: 'var(--font-mono)',
        fontSize: 11
      }
    }, "L2\\u2013L7 \\u00b7 2 rounds")), CRITIQUES.map((c, i) => /*#__PURE__*/React.createElement(CritiqueCard, _extends({
      key: i
    }, c)))) : /*#__PURE__*/React.createElement("div", {
      className: "lm-dim lm-right__empty"
    }, harness ? 'This harness runs a single agent \u2014 no critic layers.' : 'Pick a multi-agent harness to see critiques.'))));
  }
  window.LMKit = Object.assign(window.LMKit || {}, {
    RightPanel,
    TRACE,
    CRITIQUES
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/lmchat/rightpanel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/lmchat/screens.jsx
try { (() => {
/* LMChat UI kit — full-panel + modal screens:
   - HarnessSelectScreen: shown first when a new session has no harness yet.
   - HarnessesPanel: server registry; load/unload harnesses.
   - SettingsModal: configure the Ollama provider URL. */
(function () {
  const DS = window.LMChatDesignSystem_bc9736;
  const {
    Button,
    IconButton,
    Badge,
    Tag,
    Switch,
    Input,
    Spinner
  } = DS;
  const {
    Icon,
    refreshIcons,
    HARNESS_DOT
  } = window.LMKit;

  // ── New-session harness picker (main panel) ──────────────
  function HarnessSelectScreen({
    harnesses,
    dir,
    setDir,
    onPick,
    onOpenHarnesses
  }) {
    refreshIcons();
    const loaded = harnesses.filter(h => h.loaded);
    return /*#__PURE__*/React.createElement("div", {
      className: "lm-pick"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lm-pick__head"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lm-empty__mark"
    }, "M2"), /*#__PURE__*/React.createElement("h2", {
      className: "lm-pick__h"
    }, "Start a coding session"), /*#__PURE__*/React.createElement("p", {
      className: "lm-pick__p"
    }, "Pick a working directory and an agent harness. The harness reads & writes code in this directory for the whole session \u2014 chosen once, before your first prompt.")), /*#__PURE__*/React.createElement("div", {
      className: "lm-pick__dir"
    }, /*#__PURE__*/React.createElement("label", {
      className: "lm-pick__dirlabel"
    }, Icon('folder', 13), " Working directory"), /*#__PURE__*/React.createElement("div", {
      className: "lm-pick__dirrow"
    }, /*#__PURE__*/React.createElement(Input, {
      mono: true,
      value: dir,
      onChange: e => setDir(e.target.value),
      prefix: Icon('terminal', 15),
      placeholder: "~/projects/my-repo"
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      iconLeft: Icon('folder-search', 15),
      onClick: () => setDir('~/projects/mach2-harness')
    }, "Browse\u2026"))), /*#__PURE__*/React.createElement("div", {
      className: "lm-pick__sub"
    }, "Choose a harness ", /*#__PURE__*/React.createElement("span", {
      className: "lm-dim"
    }, "\xB7 ", loaded.length, " loaded on server")), /*#__PURE__*/React.createElement("div", {
      className: "lm-pick__grid"
    }, loaded.map(h => /*#__PURE__*/React.createElement("button", {
      key: h.id,
      className: "lm-hcard",
      disabled: !dir.trim(),
      onClick: () => onPick(h.id)
    }, /*#__PURE__*/React.createElement("div", {
      className: "lm-hcard__top"
    }, /*#__PURE__*/React.createElement("span", {
      className: "lm-hcard__dot",
      style: {
        background: HARNESS_DOT[h.id]
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "lm-hcard__name"
    }, h.label), h.isDefault && /*#__PURE__*/React.createElement(Badge, {
      tone: "brand"
    }, "default")), /*#__PURE__*/React.createElement("div", {
      className: "lm-hcard__desc"
    }, h.desc), /*#__PURE__*/React.createElement("div", {
      className: "lm-hcard__foot"
    }, /*#__PURE__*/React.createElement("span", {
      className: "lm-hcard__file"
    }, h.file), /*#__PURE__*/React.createElement("span", {
      className: "lm-hcard__agents"
    }, Icon('users', 12), h.agents, " agent", h.agents > 1 ? 's' : '')))), /*#__PURE__*/React.createElement("button", {
      className: "lm-hcard lm-hcard--more",
      onClick: onOpenHarnesses
    }, Icon('layers', 20), /*#__PURE__*/React.createElement("span", {
      className: "lm-hcard__name"
    }, "Browse all harnesses"), /*#__PURE__*/React.createElement("span", {
      className: "lm-hcard__desc"
    }, "Load more from the server registry"))));
  }

  // ── Harnesses panel (modal) — server registry ────────────
  function HarnessesPanel({
    open,
    harnesses,
    onToggleLoad,
    onUse,
    onClose
  }) {
    refreshIcons();
    if (!open) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "lm-modal",
      onClick: onClose
    }, /*#__PURE__*/React.createElement("div", {
      className: "lm-modal__card",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      className: "lm-modal__head"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lm-modal__title"
    }, Icon('layers', 17), /*#__PURE__*/React.createElement("span", null, "Harnesses on server")), /*#__PURE__*/React.createElement(Badge, {
      tone: "success",
      dot: true
    }, ":8000 online"), /*#__PURE__*/React.createElement(IconButton, {
      variant: "plain",
      "aria-label": "Close",
      onClick: onClose,
      className: "lm-modal__x"
    }, Icon('x', 17))), /*#__PURE__*/React.createElement("div", {
      className: "lm-modal__sub"
    }, "Python harness modules discovered on the server. Load one into memory to use it in a session."), /*#__PURE__*/React.createElement("div", {
      className: "lm-modal__body"
    }, harnesses.map(h => /*#__PURE__*/React.createElement("div", {
      key: h.id,
      className: `lm-hrow ${h.loaded ? 'lm-hrow--loaded' : ''}`
    }, /*#__PURE__*/React.createElement("span", {
      className: "lm-hrow__dot",
      style: {
        background: HARNESS_DOT[h.id]
      }
    }), /*#__PURE__*/React.createElement("div", {
      className: "lm-hrow__main"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lm-hrow__name"
    }, h.label, h.isDefault && /*#__PURE__*/React.createElement(Badge, {
      tone: "brand"
    }, "default")), /*#__PURE__*/React.createElement("div", {
      className: "lm-hrow__meta"
    }, /*#__PURE__*/React.createElement("span", {
      className: "lm-hrow__file"
    }, h.file), " \xB7 ", h.agents, " agent", h.agents > 1 ? 's' : '')), h.loaded ? /*#__PURE__*/React.createElement(Badge, {
      tone: "success",
      dot: true
    }, "loaded") : /*#__PURE__*/React.createElement("span", {
      className: "lm-hrow__avail"
    }, "available"), /*#__PURE__*/React.createElement(Switch, {
      checked: h.loaded,
      accent: "agent",
      onChange: () => onToggleLoad(h.id)
    })))), /*#__PURE__*/React.createElement("div", {
      className: "lm-modal__foot"
    }, /*#__PURE__*/React.createElement("span", {
      className: "lm-dim",
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 11
      }
    }, harnesses.filter(h => h.loaded).length, " of ", harnesses.length, " loaded"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      onClick: onClose
    }, "Done"))));
  }

  // ── Settings modal — Ollama provider ─────────────────────
  function SettingsModal({
    open,
    provider,
    models,
    onClose,
    onSaveUrl
  }) {
    const [url, setUrl] = React.useState(provider.url);
    React.useEffect(() => {
      if (open) setUrl(provider.url);
    }, [open, provider.url]);
    refreshIcons();
    if (!open) return null;
    return /*#__PURE__*/React.createElement("div", {
      className: "lm-modal",
      onClick: onClose
    }, /*#__PURE__*/React.createElement("div", {
      className: "lm-modal__card",
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      className: "lm-modal__head"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lm-modal__title"
    }, Icon('settings', 17), /*#__PURE__*/React.createElement("span", null, "Model provider")), /*#__PURE__*/React.createElement(IconButton, {
      variant: "plain",
      "aria-label": "Close",
      onClick: onClose,
      className: "lm-modal__x"
    }, Icon('x', 17))), /*#__PURE__*/React.createElement("div", {
      className: "lm-modal__sub"
    }, "LMChat runs open-source models through Ollama. The default provider stays loaded; point it at any reachable Ollama URL."), /*#__PURE__*/React.createElement("div", {
      className: "lm-modal__body"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lm-provider"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lm-provider__row"
    }, /*#__PURE__*/React.createElement("span", {
      className: "lm-provider__name"
    }, Icon('server', 14), " Ollama (local)"), /*#__PURE__*/React.createElement(Badge, {
      tone: provider.connected ? 'success' : 'danger',
      dot: true
    }, provider.connected ? 'connected' : 'offline'), /*#__PURE__*/React.createElement(Badge, {
      tone: "brand"
    }, "default")), /*#__PURE__*/React.createElement("label", {
      className: "lm-provider__label"
    }, "Base URL"), /*#__PURE__*/React.createElement("div", {
      className: "lm-provider__url"
    }, /*#__PURE__*/React.createElement(Input, {
      mono: true,
      value: url,
      onChange: e => setUrl(e.target.value),
      prefix: Icon('link', 15)
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "md",
      onClick: () => onSaveUrl(url)
    }, "Save")), /*#__PURE__*/React.createElement("div", {
      className: "lm-provider__models"
    }, /*#__PURE__*/React.createElement("span", {
      className: "lm-provider__mlabel"
    }, "Models available at this URL"), /*#__PURE__*/React.createElement("div", {
      className: "lm-provider__tags"
    }, models.map(m => /*#__PURE__*/React.createElement(Tag, {
      key: m,
      icon: Icon('cpu', 12)
    }, m)))))), /*#__PURE__*/React.createElement("div", {
      className: "lm-modal__foot"
    }, /*#__PURE__*/React.createElement("span", {
      className: "lm-dim",
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 11
      }
    }, "+ add another provider URL"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      size: "sm",
      onClick: onClose
    }, "Done"))));
  }
  window.LMKit = Object.assign(window.LMKit || {}, {
    HarnessSelectScreen,
    HarnessesPanel,
    SettingsModal
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/lmchat/screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/lmchat/sidebar.jsx
try { (() => {
/* LMChat UI kit — left nav: chat sessions organized into folders. */
(function () {
  const DS = window.LMChatDesignSystem_bc9736;
  const {
    Button,
    IconButton,
    Tooltip,
    Avatar
  } = DS;
  const {
    Icon,
    refreshIcons,
    HARNESS_DOT
  } = window.LMKit;
  function SessionRow({
    s,
    active,
    onSelect
  }) {
    return /*#__PURE__*/React.createElement("button", {
      className: `lm-ses ${active ? 'lm-ses--active' : ''}`,
      onClick: () => onSelect(s.id)
    }, /*#__PURE__*/React.createElement("span", {
      className: "lm-ses__dot",
      style: {
        background: s.harnessId ? HARNESS_DOT[s.harnessId] : 'var(--faint)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: "lm-ses__title"
    }, s.title), /*#__PURE__*/React.createElement("span", {
      className: "lm-ses__when"
    }, s.when));
  }
  function Sidebar({
    folders,
    sessions,
    active,
    onSelect,
    onNew,
    onNewFolder,
    openFolders,
    toggleFolder,
    onOpenSettings,
    provider
  }) {
    refreshIcons();
    const loose = sessions.filter(s => !s.folderId);
    return /*#__PURE__*/React.createElement("nav", {
      className: "lm-sidebar"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lm-sidebar__top"
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      block: true,
      iconLeft: Icon('plus', 15),
      onClick: onNew
    }, "New session"), /*#__PURE__*/React.createElement(Tooltip, {
      label: "New folder",
      side: "bottom"
    }, /*#__PURE__*/React.createElement(IconButton, {
      variant: "outlined",
      "aria-label": "New folder",
      onClick: onNewFolder
    }, Icon('folder-plus', 16)))), /*#__PURE__*/React.createElement("div", {
      className: "lm-sidebar__list"
    }, folders.map(f => {
      const items = sessions.filter(s => s.folderId === f.id);
      const open = openFolders[f.id] !== false;
      return /*#__PURE__*/React.createElement("div", {
        className: "lm-folder",
        key: f.id
      }, /*#__PURE__*/React.createElement("button", {
        className: "lm-folder__head",
        onClick: () => toggleFolder(f.id)
      }, /*#__PURE__*/React.createElement("span", {
        className: `lm-folder__chev ${open ? 'lm-folder__chev--open' : ''}`
      }, Icon('chevron-right', 13)), Icon(open ? 'folder-open' : 'folder', 14), /*#__PURE__*/React.createElement("span", {
        className: "lm-folder__name"
      }, f.name), /*#__PURE__*/React.createElement("span", {
        className: "lm-folder__count"
      }, items.length)), open && /*#__PURE__*/React.createElement("div", {
        className: "lm-folder__items"
      }, items.length === 0 ? /*#__PURE__*/React.createElement("div", {
        className: "lm-folder__empty"
      }, "No chats") : items.map(s => /*#__PURE__*/React.createElement(SessionRow, {
        key: s.id,
        s: s,
        active: active === s.id,
        onSelect: onSelect
      }))));
    }), loose.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "lm-sesgroup"
    }, /*#__PURE__*/React.createElement("div", {
      className: "lm-sesgroup__label"
    }, "Recent"), loose.map(s => /*#__PURE__*/React.createElement(SessionRow, {
      key: s.id,
      s: s,
      active: active === s.id,
      onSelect: onSelect
    })))), /*#__PURE__*/React.createElement("div", {
      className: "lm-sidebar__foot"
    }, /*#__PURE__*/React.createElement(Avatar, {
      role: "user",
      size: "sm"
    }), /*#__PURE__*/React.createElement("div", {
      className: "lm-sidebar__user"
    }, /*#__PURE__*/React.createElement("span", {
      className: "lm-sidebar__name"
    }, "priyansh"), /*#__PURE__*/React.createElement("span", {
      className: "lm-sidebar__host"
    }, provider.connected ? 'ollama · connected' : 'ollama · offline')), /*#__PURE__*/React.createElement(Tooltip, {
      label: "Settings \xB7 model provider",
      side: "top"
    }, /*#__PURE__*/React.createElement(IconButton, {
      variant: "plain",
      "aria-label": "Settings",
      onClick: onOpenSettings
    }, Icon('settings', 16)))));
  }
  window.LMKit = Object.assign(window.LMKit || {}, {
    Sidebar
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/lmchat/sidebar.jsx", error: String((e && e.message) || e) }); }

__ds_ns.CritiqueCard = __ds_scope.CritiqueCard;

__ds_ns.MessageBubble = __ds_scope.MessageBubble;

__ds_ns.SeverityBadge = __ds_scope.SeverityBadge;

__ds_ns.ThinkingStep = __ds_scope.ThinkingStep;

__ds_ns.ToolCall = __ds_scope.ToolCall;

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.KeyValueRow = __ds_scope.KeyValueRow;

__ds_ns.Spinner = __ds_scope.Spinner;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.SegmentedToggle = __ds_scope.SegmentedToggle;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.Tooltip = __ds_scope.Tooltip;

})();
