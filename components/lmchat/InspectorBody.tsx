import * as React from "react";
import { Card, Badge, KeyValueRow, Tag, Spinner } from "@/components/ds";
import type { Insp, Provider } from "./data";

export interface InspectorBodyProps {
  state: Insp;
  model: string;
  provider: Provider;
  project: string | null;
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
