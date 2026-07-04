import * as React from "react";
import { ctxZones, modelCtx, type CtxFile } from "./data";

export interface ContextMeterProps {
  model: string;
  attached: CtxFile[];
  /** true when the turn streams from the real backend (always, today) — it
      doesn't emit context/token usage yet, so the meter must show an honest
      "not reported" state instead of the illustrative demo numbers below. */
  live?: boolean;
}

const fmt = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`;

/** Context-budget meter: a stacked bar of context zones vs the model window,
    with a "rot risk" band (C1). For live runs it honestly reports that the
    backend doesn't emit this data yet rather than fabricating numbers. */
export function ContextMeter({ model, attached, live }: ContextMeterProps) {
  if (live) {
    return (
      <div className="lm-ctx lm-ctx--unreported">
        <span className="lm-dim">Context usage not reported by backend yet.</span>
      </div>
    );
  }

  const windowTok = modelCtx(model);
  const attachedTok = attached.reduce((n, f) => n + f.tokens, 0);
  const { zones, used } = ctxZones(attachedTok);
  const pct = Math.min(100, (used / windowTok) * 100);
  const over = used > windowTok;
  const warn = !over && pct >= 80;

  return (
    <div className="lm-ctx">
      <div className="lm-ctx__top">
        <span className="lm-ctx__used">
          {fmt(used)} <span className="lm-ctx__win">/ {fmt(windowTok)} tokens</span>
        </span>
        <span className={`lm-ctx__pct ${over ? "is-over" : warn ? "is-warn" : ""}`}>
          {Math.round(pct)}%
        </span>
      </div>
      <div
        className={`lm-ctx__bar ${over ? "is-over" : warn ? "is-warn" : ""}`}
        role="img"
        aria-label="context budget"
      >
        {zones.map(
          (z) =>
            z.tokens > 0 && (
              <span
                key={z.key}
                className="lm-ctx__seg"
                title={`${z.label} · ${fmt(z.tokens)}`}
                style={{ width: `${(z.tokens / windowTok) * 100}%`, background: z.color }}
              />
            ),
        )}
        <span className="lm-ctx__rot" style={{ left: "75%" }} title="rot risk ~75%" />
      </div>
      <div className="lm-ctx__legend">
        {zones.map(
          (z) =>
            z.tokens > 0 && (
              <span key={z.key} className="lm-ctx__leg">
                <span className="lm-ctx__dot" style={{ background: z.color }} />
                {z.label} <b>{fmt(z.tokens)}</b>
              </span>
            ),
        )}
      </div>
    </div>
  );
}
