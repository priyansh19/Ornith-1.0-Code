import * as React from "react";
import { Card, Badge, KeyValueRow, Tag, Spinner, Icon } from "@/components/ds";
import { ContextMeter } from "./ContextMeter";
import type { CtxFile, Insp, Provider } from "./data";

export interface InspectorBodyProps {
  state: Insp;
  model: string;
  provider: Provider;
  project: string | null;
  attached: CtxFile[];
}

export function InspectorBody({
  state,
  model,
  provider,
  project,
  attached,
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
        {state.status === "waiting" && (
          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 8,
              alignItems: "center",
              color: "var(--amber)",
              fontSize: 13,
            }}
          >
            <Icon name="file-pen" size={13} />
            Waiting for your approval…
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

      <Card title="Context" style={{ marginTop: 14 }}>
        <ContextMeter model={model} attached={attached} live />
      </Card>
    </div>
  );
}
