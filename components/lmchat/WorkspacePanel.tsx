import * as React from "react";
import { Icon, IconButton, Tooltip } from "@/components/ds";

const WORKSPACE_URL = "http://localhost:8000/workspace/files";
const CHECKPOINTS_URL = "http://localhost:8000/checkpoints";

type Status = "loading" | "unavailable" | "malformed" | "ok";

interface TreeNode {
  name: string;
  type: "file" | "dir";
  children?: TreeNode[];
}

interface WorkspaceFilesResponse {
  files: string[];
  tree?: TreeNode[];
}

function TreeRow({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = React.useState(depth < 1);
  if (node.type === "file") {
    return (
      <li className="lm-ftree__row" style={{ paddingLeft: depth * 14 }}>
        <Icon name="file-text" size={13} />
        <span className="lm-ftree__name">{node.name}</span>
      </li>
    );
  }
  return (
    <>
      <li className="lm-ftree__row lm-ftree__row--dir" style={{ paddingLeft: depth * 14 }}>
        <button
          type="button"
          className="lm-ftree__toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span className={`lm-ftree__chev ${open ? "lm-ftree__chev--open" : ""}`}>
            <Icon name="chevron-right" size={12} />
          </span>
          <Icon name="folder" size={13} />
          <span className="lm-ftree__name">{node.name}</span>
          <span className="lm-dim lm-ftree__count">
            {node.children?.length ?? 0}
          </span>
        </button>
      </li>
      {open && node.children?.map((child) => (
        <TreeRow key={`${child.type}:${child.name}`} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

interface Checkpoint {
  id: string;
  file: string;
  created_at: string;
}

function formatTimestamp(value: string | undefined): string {
  if (!value) return "unknown time";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
}

/** Fetches `url`, validating the response shape before rendering. Never
    fabricates data — distinguishes "endpoint doesn't exist yet" (network
    error / non-2xx) from "endpoint responded but the shape was wrong"
    (fetched fine, but the expected array field wasn't an array). */
function useEndpointList<T>(url: string, field: string, refreshKey: number) {
  const [items, setItems] = React.useState<T[]>([]);
  const [status, setStatus] = React.useState<Status>("loading");

  React.useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("unavailable");
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (!Array.isArray(data?.[field])) {
          setStatus("malformed");
          return;
        }
        setItems(data[field]);
        setStatus("ok");
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [url, field, refreshKey]);

  return { items, status };
}

function RefreshButton({ onClick, refreshing }: { onClick: () => void; refreshing: boolean }) {
  return (
    <Tooltip label="Refresh" side="bottom">
      <IconButton
        variant="plain"
        size="sm"
        aria-label="Refresh"
        onClick={onClick}
        disabled={refreshing}
      >
        <Icon name="refresh-cw" size={14} />
      </IconButton>
    </Tooltip>
  );
}

/** Same "never fabricate data" contract as useEndpointList, but for the
    richer {files, tree} shape workspace/files now returns — a real nested
    directory tree, not just a flat top-level name list. */
function useWorkspaceTree(refreshKey: number) {
  const [files, setFiles] = React.useState<string[]>([]);
  const [tree, setTree] = React.useState<TreeNode[] | null>(null);
  const [status, setStatus] = React.useState<Status>("loading");

  React.useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetch(WORKSPACE_URL)
      .then((r) => {
        if (!r.ok) throw new Error("unavailable");
        return r.json() as Promise<WorkspaceFilesResponse>;
      })
      .then((data) => {
        if (cancelled) return;
        if (!Array.isArray(data?.files)) {
          setStatus("malformed");
          return;
        }
        setFiles(data.files);
        setTree(Array.isArray(data.tree) ? data.tree : null);
        setStatus("ok");
      })
      .catch(() => {
        if (!cancelled) setStatus("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { files, tree, status };
}

function WorkspaceFilesSection() {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const { files, tree, status } = useWorkspaceTree(refreshKey);

  return (
    <div className="lm-ws__section">
      <div className="lm-ws__head">
        <span className="lm-ws__title">
          <Icon name="folder" size={13} /> Workspace files
        </span>
        <RefreshButton onClick={() => setRefreshKey((k) => k + 1)} refreshing={status === "loading"} />
      </div>
      <div aria-live="polite">
        {status === "loading" && <p className="lm-dim lm-ws__msg">{refreshKey > 0 ? "Refreshing…" : "Loading workspace…"}</p>}
        {status === "unavailable" && (
          <p className="lm-dim lm-ws__msg">
            Backend endpoint <code>GET /workspace/files</code> isn&apos;t implemented yet — this
            panel is ready as soon as it is.
          </p>
        )}
        {status === "malformed" && (
          <p className="lm-dim lm-ws__msg">
            Backend responded, but the data wasn&apos;t shaped as expected — check the server response.
          </p>
        )}
        {status === "ok" && files.length === 0 && <p className="lm-dim lm-ws__msg">Workspace is empty.</p>}
        {status === "ok" && files.length > 0 && tree && (
          <ul className="lm-ftree">
            {tree.map((node) => (
              <TreeRow key={`${node.type}:${node.name}`} node={node} depth={0} />
            ))}
          </ul>
        )}
        {status === "ok" && files.length > 0 && !tree && (
          // Defensive fallback if an older backend response ever lacks `tree`
          <ul className="lm-ws__list">
            {files.map((f) => (
              <li key={f}>
                <Icon name="file-text" size={13} /> {f}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CheckpointsSection() {
  const [refreshKey, setRefreshKey] = React.useState(0);
  const { items: checkpoints, status } = useEndpointList<Checkpoint>(CHECKPOINTS_URL, "checkpoints", refreshKey);

  return (
    <div className="lm-ws__section">
      <div className="lm-ws__head">
        <span className="lm-ws__title">
          <Icon name="history" size={13} /> Checkpoints
        </span>
        <RefreshButton onClick={() => setRefreshKey((k) => k + 1)} refreshing={status === "loading"} />
      </div>
      <div aria-live="polite">
        {status === "loading" && <p className="lm-dim lm-ws__msg">{refreshKey > 0 ? "Refreshing…" : "Loading checkpoints…"}</p>}
        {status === "unavailable" && (
          <p className="lm-dim lm-ws__msg">
            No checkpoint system on the backend yet — once file edits snapshot before writing,
            restorable versions will list here.
          </p>
        )}
        {status === "malformed" && (
          <p className="lm-dim lm-ws__msg">
            Backend responded, but the data wasn&apos;t shaped as expected — check the server response.
          </p>
        )}
        {status === "ok" && checkpoints.length === 0 && <p className="lm-dim lm-ws__msg">No checkpoints yet.</p>}
        {status === "ok" && checkpoints.length > 0 && (
          <ul className="lm-ws__list">
            {checkpoints.map((c) => (
              <li key={c.id}>
                <Icon name="history" size={13} /> {c.file} — {formatTimestamp(c.created_at)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Workspace files + Checkpoints — both real UI shells waiting on backend
    endpoints that don't exist yet (GET /workspace/files, GET /checkpoints).
    Renders an honest "not implemented yet" state rather than any fabricated
    data, exactly mirroring the pattern already established elsewhere in this
    project (e.g. ContextMeter, InspectorBody's live-only fields). */
export function WorkspacePanel() {
  return (
    <div className="lm-ws">
      <WorkspaceFilesSection />
      <div className="lm-ws__divider" />
      <CheckpointsSection />
    </div>
  );
}
