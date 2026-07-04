import * as React from "react";

type LineKind = "add" | "del" | "hunk" | "file" | "ctx";

function classify(line: string): LineKind {
  if (line.startsWith("+++") || line.startsWith("---")) return "file";
  if (line.startsWith("@@")) return "hunk";
  if (line.startsWith("+")) return "add";
  if (line.startsWith("-")) return "del";
  return "ctx";
}

function stripMarker(line: string, kind: LineKind): string {
  if (kind === "add" || kind === "del") return line.slice(1);
  if (kind === "ctx" && line.startsWith(" ")) return line.slice(1);
  return line;
}

export interface DiffViewProps {
  diff: string;
}

/** Unified-diff viewer: "Added N / Removed M" summary header, small square
    change-markers (no +/- text prefixes), subtle row-tint highlights, and
    blank context lines preserved (never filtered out). */
export function DiffView({ diff }: DiffViewProps) {
  const raw = diff.split("\n");
  const rows = raw[raw.length - 1] === "" ? raw.slice(0, -1) : raw;
  if (rows.length === 0) return null;

  const lines = rows
    .map((line) => ({ line, kind: classify(line) }))
    .filter((l) => l.kind !== "file");

  const added = lines.filter((l) => l.kind === "add").length;
  const removed = lines.filter((l) => l.kind === "del").length;

  return (
    <div className="lm-diff">
      <div className="lm-diff__summary">
        {added > 0 && (
          <span className="lm-diff__stat lm-diff__stat--add">
            <span className="lm-diff__dot lm-diff__dot--add" />
            Added {added} line{added === 1 ? "" : "s"}
          </span>
        )}
        {removed > 0 && (
          <span className="lm-diff__stat lm-diff__stat--del">
            <span className="lm-diff__dot lm-diff__dot--del" />
            Removed {removed} line{removed === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <div className="lm-diff__body">
        {lines.map(({ line, kind }, i) =>
          kind === "hunk" ? (
            <div key={i} className="lm-diff__hunk">
              {line}
            </div>
          ) : (
            <div key={i} className={`lm-diff__row lm-diff__row--${kind}`}>
              <span
                className={`lm-diff__marker ${kind === "add" ? "lm-diff__marker--add" : kind === "del" ? "lm-diff__marker--del" : ""}`}
              />
              <span className="lm-diff__text">{stripMarker(line, kind)}</span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
