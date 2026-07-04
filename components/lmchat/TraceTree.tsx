import * as React from "react";
import { Icon } from "@/components/ds";
import {
  computeIntervals,
  type Span,
  type SpanIO,
  type SpanType,
  type Interval,
} from "./data";

const TYPE_ICON: Record<SpanType, string> = {
  agent: "users",
  llm: "cpu",
  tool: "wrench",
  thought: "brain",
  observation: "check",
};

const toolIcon = (io?: SpanIO) =>
  io?.kind === "edit"
    ? "file-pen"
    : io?.kind === "read"
      ? "file-text"
      : io?.kind === "run"
        ? "terminal"
        : "wrench";

function collectParents(s: Span, acc: string[] = []): string[] {
  if (s.children && s.children.length) {
    acc.push(s.id);
    s.children.forEach((c) => collectParents(c, acc));
  }
  return acc;
}

function IOView({ io }: { io: SpanIO }) {
  if (io.kind === "read") {
    return (
      <div className="lm-tr__io">
        <span className="lm-tr__path">{io.path}</span>
        {io.lines && <span className="lm-tr__lines"> · lines {io.lines}</span>}
      </div>
    );
  }
  if (io.kind === "run" && io.shell) {
    return (
      <div className="lm-tr__io lm-tr__shell">
        <div className="lm-tr__cmd">
          <span className="lm-tr__prompt">$</span> {io.shell.cmd}
        </div>
        {io.shell.out.map((l, i) => (
          <div key={i} className="lm-tr__out">
            {l}
          </div>
        ))}
        <div
          className={`lm-tr__exit ${io.shell.exit === 0 ? "ok" : "bad"}`}
        >
          exit {io.shell.exit}
        </div>
      </div>
    );
  }
  if (io.kind === "edit" && io.diff) {
    return (
      <div className="lm-tr__io lm-tr__diff">
        {io.path && <div className="lm-tr__path">{io.path}</div>}
        <pre className="lm-tr__diffbody">
          {io.diff.removed.map((l, i) => (
            <div key={`r${i}`} className="lm-tr__del">
              − {l}
            </div>
          ))}
          {io.diff.added.map((l, i) => (
            <div key={`a${i}`} className="lm-tr__add">
              + {l}
            </div>
          ))}
        </pre>
      </div>
    );
  }
  return null;
}

interface RowProps {
  span: Span;
  depth: number;
  total: number;
  intervals: Record<string, Interval>;
  open: Set<string>;
  toggle: (id: string) => void;
  focus?: string;
}

function SpanRow({ span, depth, total, intervals, open, toggle, focus }: RowProps) {
  const hasChildren = !!span.children?.length;
  const hasDetail = !!span.io || !!span.detail;
  const expandable = hasChildren || hasDetail;
  const isOpen = open.has(span.id);
  const iv = intervals[span.id] || { t0: 0, ms: span.ms };
  const left = (iv.t0 / total) * 100;
  const width = Math.max(1.5, (iv.ms / total) * 100);
  // Fallback icon guards against span types from older persisted runs that
  // are no longer in the SpanType union.
  const icon = span.type === "tool" ? toolIcon(span.io) : (TYPE_ICON[span.type] ?? "layers");

  return (
    <>
      <div
        className={`lm-tr__row lm-tr__row--${span.type} ${
          focus === span.id ? "is-focus" : ""
        }`}
        style={{ paddingLeft: 6 + depth * 14 }}
      >
        <button
          className="lm-tr__main"
          onClick={() => expandable && toggle(span.id)}
          aria-expanded={expandable ? isOpen : undefined}
        >
          <span className={`lm-tr__chev ${isOpen ? "is-open" : ""}`}>
            {expandable ? <Icon name="chevron-right" size={12} /> : null}
          </span>
          <span className="lm-tr__icon">
            <Icon name={icon} size={13} />
          </span>
          <span className="lm-tr__label">
            {span.label}
            {span.agent && <em className="lm-tr__agent"> · {span.agent}</em>}
          </span>
          {span.tokens != null && (
            <span className="lm-tr__tok">{span.tokens}t</span>
          )}
          <span className="lm-tr__ms">{Math.round(iv.ms)}ms</span>
        </button>
        <span className="lm-tr__wf">
          <span
            className={`lm-tr__wfbar lm-tr__wfbar--${span.type}`}
            style={{ left: `${left}%`, width: `${width}%` }}
          />
        </span>
        {isOpen && hasDetail && (
          <div className="lm-tr__detail">
            {span.detail && <div className="lm-tr__text">{span.detail}</div>}
            {span.io && <IOView io={span.io} />}
          </div>
        )}
      </div>
      {isOpen &&
        hasChildren &&
        span.children!.map((c) => (
          <SpanRow
            key={c.id}
            span={c}
            depth={depth + 1}
            total={total}
            intervals={intervals}
            open={open}
            toggle={toggle}
            focus={focus}
          />
        ))}
    </>
  );
}

export interface TraceTreeProps {
  /** span tree of the run being viewed (key the component by run id so the
      expanded-row state resets when paging between runs) */
  spans: Span;
  focus?: string;
}

/** Unified run trace: a span tree with a latency waterfall. Folds the
    agent → llm/tool/observation hierarchy into one debuggable view. */
export function TraceTree({ spans, focus }: TraceTreeProps) {
  const { map, total } = React.useMemo(() => computeIntervals(spans), [spans]);
  // all structural spans open by default (so any focused leaf is already visible)
  const [open, setOpen] = React.useState<Set<string>>(
    () => new Set(collectParents(spans)),
  );

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="lm-tr">
      <div className="lm-tr__head">
        <span className="lm-tr__total">{Math.round(total)}ms total</span>
        <span className="lm-tr__legend">latency →</span>
      </div>
      <SpanRow
        span={spans}
        depth={0}
        total={total}
        intervals={map}
        open={open}
        toggle={toggle}
        focus={focus}
      />
    </div>
  );
}
