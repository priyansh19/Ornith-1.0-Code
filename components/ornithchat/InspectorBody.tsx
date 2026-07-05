import * as React from "react";
import { Card, Badge, KeyValueRow, Tag, Spinner } from "@/components/ds";
import type { Insp, Provider } from "./data";

export interface InspectorBodyProps {
  state: Insp;
  model: string;
  provider: Provider;
  project: string | null;
}

/** Live context-window meter — real token usage from Ollama's response
    metadata (prompt_eval_count + eval_count) against the configured num_ctx,
    with Ornith's 262,144 hard ceiling shown for context. Renders only once a
    real count has arrived, so it never fabricates a reading. */
function ContextMeter({ used, max, modelMax }: { used?: number; max?: number; modelMax?: number }) {
  if (!max || used == null) return null;
  const pct = Math.min(100, Math.round((used / max) * 100));
  const hot = pct >= 85;
  return (
    <div className="lm-ctx">
      <div className="lm-ctx__head">
        <span className="lm-ctx__label">Context</span>
        <span className={`lm-ctx__nums ${hot ? "lm-ctx__nums--hot" : ""}`}>
          {used.toLocaleString()} / {max.toLocaleString()} tok · {pct}%
        </span>
      </div>
      <div className="lm-ctx__bar">
        <span
          className={`lm-ctx__fill ${hot ? "lm-ctx__fill--hot" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {modelMax && modelMax > max && (
        <div className="lm-ctx__foot">
          num_ctx {max.toLocaleString()} of {modelMax.toLocaleString()} model max
        </div>
      )}
    </div>
  );
}

export function InspectorBody({
  state,
  model,
  provider,
  project,
}: InspectorBodyProps) {
  return (
    <div className="lm-insp">
      <Card
        title="Session"
        headerActions={
          <Badge tone="agent" dot>
            ornith
          </Badge>
        }
      >
        {project && <KeyValueRow label="Directory" value={project} tone="muted" />}
        <KeyValueRow label="Model">
          <Tag>{model}</Tag>
        </KeyValueRow>
        <KeyValueRow label="Provider" value={provider.url} tone="muted" />
        <ContextMeter used={state.ctxUsed} max={state.ctxMax} modelMax={state.ctxModelMax} />
        {state.status === "idle" && (
          <div className="lm-dim" style={{ marginTop: 10 }}>
            Waiting for input…
          </div>
        )}
        {state.status === "running" && (
          <div style={{ marginTop: 10 }}>
            <div
              className="lm-dim"
              style={{ display: "flex", gap: 8, alignItems: "center" }}
            >
              <Spinner size={13} accent="agent" />
              {state.liveRound
                ? `Round ${state.liveRound} → ${state.liveAction || "thinking"}…`
                : "Running…"}
            </div>
            {state.session && (
              <KeyValueRow
                label="Session id"
                value={`${state.session.slice(0, 8)}…`}
                tone="muted"
              />
            )}
          </div>
        )}
        {state.status === "done" && state.session && (
          <>
            <div style={{ height: 8 }} />
            <KeyValueRow
              label="Session id"
              value={`${state.session.slice(0, 8)}…`}
              divided
            />
          </>
        )}
      </Card>
    </div>
  );
}
