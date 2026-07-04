import * as React from "react";
import { Button, IconButton, Input, Select, Tooltip, Icon, Spinner } from "@/components/ds";
import { usePopover } from "./usePopover";
import type { InstalledModelDetail } from "./ollama";

// ── File attachments (real uploads — distinct from the @-mention "context
// files" pulled from the repo above). Binary rejection: extension check
// first, then a content-sniffing heuristic fallback so garbage/mojibake
// text never silently attaches. ──
export interface Attachment {
  id: string;
  name: string;
  content: string;
  truncated: boolean;
}

const MAX_ATTACHMENT_CHARS = 20000;

const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "bmp", "webp", "ico", "svg",
  "zip", "tar", "gz", "rar", "7z", "exe", "dll", "bin", "pdf",
  "mp3", "mp4", "wav", "mov", "avi", "woff", "woff2", "ttf",
]);

function hasBinaryExtension(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return BINARY_EXTENSIONS.has(ext);
}

/** Content-sniffing fallback for files whose extension didn't already flag
    them — a high density of replacement chars / NUL bytes in the decoded
    text means it wasn't really text. */
function looksBinary(text: string): boolean {
  if (text.length === 0) return false;
  const sample = text.slice(0, 2000);
  let suspicious = 0;
  for (const ch of sample) {
    if (ch === "�" || ch.charCodeAt(0) === 0) suspicious++;
  }
  return suspicious / sample.length > 0.01;
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

let attachmentSeq = 0;
/** Collision-safe unique id per attachment — a counter alone isn't enough
    across remounts, so pair it with a random suffix. */
function nextAttachmentId(): string {
  attachmentSeq += 1;
  return `att-${Date.now().toString(36)}-${attachmentSeq}-${Math.random().toString(36).slice(2, 7)}`;
}

const EXT_TO_LANG: Record<string, string> = {
  ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx", py: "python", css: "css",
  html: "html", json: "json", md: "markdown", yml: "yaml", yaml: "yaml", sh: "bash",
  go: "go", rs: "rust", java: "java", c: "c", cpp: "cpp", sql: "sql", txt: "text",
};

function langFor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TO_LANG[ext] ?? "text";
}

/** Renders attached files as fenced code blocks prefixed onto the outgoing
    message — the model sees file content inline with the prompt. */
export function attachmentsToPrefix(attachments: Attachment[]): string {
  if (attachments.length === 0) return "";
  return (
    attachments
      .map(
        (a) =>
          `File: ${a.name}${a.truncated ? " (truncated)" : ""}\n\`\`\`${langFor(a.name)}\n${a.content}\n\`\`\`\n`,
      )
      .join("\n") + "\n"
  );
}

export interface WorkspaceInfo {
  dir: string;
  onMove: (dir: string) => void;
}

export interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void; // stop the in-flight run (Stop button / Escape)
  loading: boolean;
  model: string;
  onChangeModel: (model: string) => void;
  /** true while a real Ollama load/unload swap is in flight for `model` */
  modelLoading?: boolean;
  /** seconds elapsed since the load/unload started — Ollama's API reports no
      granular load percentage (only pull/download progress does), so this
      elapsed counter is the honest signal, not a fabricated progress bar */
  modelLoadingElapsedS?: number;
  /** the model actually being loaded right now, if different from `model` —
      `model` only updates once the swap succeeds, so the tooltip/label must
      read this instead while a load is in flight or it shows the stale
      previous model for the whole loading window */
  pendingModel?: string | null;
  /** real models actually pulled in Ollama — shared with the command palette
      so both always offer the same, real set (falls back to a static list
      upstream if the live fetch hasn't resolved yet) */
  installedModels: string[];
  /** real per-model specs (size/quant/params) for the richer dropdown below */
  installedModelDetails?: InstalledModelDetail[];
  files: Attachment[];
  onAddFiles: (files: Attachment[]) => void;
  onRemoveFile: (id: string) => void;
  workspace?: WorkspaceInfo;
}

export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  loading,
  model,
  onChangeModel,
  modelLoading = false,
  modelLoadingElapsedS = 0,
  pendingModel = null,
  installedModels,
  installedModelDetails = [],
  files,
  onAddFiles,
  onRemoveFile,
  workspace,
}: ComposerProps) {
  const [moveOpen, setMoveOpen] = React.useState(false);
  const [moveDraft, setMoveDraft] = React.useState("");
  const [dragging, setDragging] = React.useState(false);
  const wsRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  // Enter/leave counter — drag events fire on every child element the pointer
  // crosses, so a naive dragenter/dragleave pair flickers the highlight as
  // the cursor moves over nested children. Counting nets it to zero only
  // when the pointer truly leaves the drop zone.
  const dragCounterRef = React.useRef(0);
  const closeWs = React.useCallback(() => setMoveOpen(false), []);
  usePopover(wsRef, closeWs);

  // Auto-resize the textarea to fit its content (capped by CSS max-height),
  // and collapse back to single-line height once the value is cleared after
  // sending — so a prior long message never leaves stale extra height.
  React.useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    if (!value) {
      el.style.height = "";
      return;
    }
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);


  const [fileHint, setFileHint] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!fileHint) return;
    const t = setTimeout(() => setFileHint(null), 3500);
    return () => clearTimeout(t);
  }, [fileHint]);

  const addFiles = React.useCallback(
    async (list: FileList | File[]) => {
      const accepted: Attachment[] = [];
      const skipped: string[] = [];
      for (const file of Array.from(list)) {
        if (hasBinaryExtension(file.name)) {
          skipped.push(file.name);
          continue;
        }
        try {
          const raw = await readFileAsText(file);
          if (looksBinary(raw)) {
            skipped.push(file.name);
            continue;
          }
          const truncated = raw.length > MAX_ATTACHMENT_CHARS;
          const content = truncated ? raw.slice(0, MAX_ATTACHMENT_CHARS) : raw;
          accepted.push({
            id: nextAttachmentId(),
            name: file.name,
            content,
            truncated,
          });
        } catch {
          skipped.push(file.name);
        }
      }
      if (accepted.length > 0) onAddFiles(accepted);
      if (skipped.length > 0) {
        setFileHint(
          `Skipped ${skipped.length === 1 ? `"${skipped[0]}"` : `${skipped.length} files`} — binary file type, not text`,
        );
      }
    },
    [onAddFiles],
  );
  // The textarea stays focusable during a run so Escape can stop it.
  const modelDetailByName = React.useMemo(
    () => new Map(installedModelDetails.map((d) => [d.name, d])),
    [installedModelDetails],
  );
  const placeholder = loading
    ? "Ornith is working…"
    : "Message Ornith — press Enter to send…";

  return (
    <div className="lm-composer">
      {fileHint && (
        <div className="lm-composer__hint-banner" role="status">
          {fileHint}
        </div>
      )}

      {files.length > 0 && (
        <div className="lm-composer__pills">
          {files.map((a) => (
            <span key={a.id} className="lm-ctxpill lm-ctxpill--file">
              <Icon name="paperclip" size={12} />
              <span className="lm-ctxpill__path">
                {a.name}
                {a.truncated ? " (truncated)" : ""}
              </span>
              <button
                className="lm-ctxpill__x"
                aria-label={`Remove ${a.name}`}
                onClick={() => onRemoveFile(a.id)}
              >
                <Icon name="x" size={11} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div
        className={`lm-composer__shell${dragging ? " lm-composer__shell--dragging" : ""}`}
        onDragEnter={(e) => {
          e.preventDefault();
          dragCounterRef.current++;
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => {
          e.preventDefault();
          dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
          if (dragCounterRef.current === 0) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          dragCounterRef.current = 0;
          setDragging(false);
          if (e.dataTransfer.files.length > 0) void addFiles(e.dataTransfer.files);
        }}
      >
        {dragging && (
          <div className="lm-composer__dropzone" aria-hidden>
            <Icon name="paperclip" size={16} /> Drop to attach
          </div>
        )}
        <div className="lm-composer__row lm-composer__row--input">
          <textarea
            ref={inputRef}
            className="lm-composer__input"
            rows={1}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && loading) {
                e.preventDefault();
                onStop();
                return;
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (!loading) onSend();
              }
            }}
          />
        </div>

        <div className="lm-composer__row lm-composer__row--tools">
          <div className="lm-composer__tools">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="lm-composer__fileinput"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  void addFiles(e.target.files);
                }
                e.target.value = "";
              }}
            />
            <Tooltip label="Attach a file">
              <IconButton
                variant="plain"
                aria-label="Attach a file"
                disabled={loading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon name="paperclip" size={17} />
              </IconButton>
            </Tooltip>

            {loading && (
              <span
                className="lm-composer__status"
                aria-label="Working on your request"
              />
            )}

            {workspace && <span className="lm-composer__divider" aria-hidden />}

            {workspace && (
              <div className="lm-ws__anchor" ref={wsRef}>
                <Tooltip label={workspace.dir} side="top">
                  <button
                    className="lm-wsbtn"
                    aria-label="Workspace folder"
                    onClick={() => {
                      setMoveDraft(workspace.dir);
                      setMoveOpen((o) => !o);
                    }}
                  >
                    <Icon name="folder" size={13} />
                    <span className="lm-wsbtn__name">
                      {workspace.dir.split("/").filter(Boolean).pop() ||
                        workspace.dir}
                    </span>
                  </button>
                </Tooltip>
                {moveOpen && (
                  <div className="lm-ws__menu">
                    <div className="lm-ctxmenu__head">Workspace</div>
                    <div className="lm-ws__path">{workspace.dir}</div>
                    <div className="lm-ws__menurow">
                      <Input
                        mono
                        value={moveDraft}
                        onChange={(e) => setMoveDraft(e.target.value)}
                        prefix={<Icon name="terminal" size={14} />}
                        placeholder="~/projects/my-repo"
                      />
                    </div>
                    <div className="lm-ws__menufoot">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={!moveDraft.trim()}
                        onClick={() => {
                          workspace.onMove(moveDraft.trim());
                          setMoveOpen(false);
                        }}
                      >
                        Move
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lm-composer__actions">
            <Tooltip
              label={
                modelLoading
                  ? `Loading ${pendingModel ?? model}… (${modelLoadingElapsedS}s — Ollama reports no load percentage, only elapsed time)`
                  : modelDetailByName.get(model)
                    ? `${model} — ${modelDetailByName.get(model)!.params} · ${modelDetailByName.get(model)!.quant} · ${modelDetailByName.get(model)!.sizeGB.toFixed(1)}GB, loaded in Ollama`
                    : `${model} — loaded in Ollama`
              }
              side="top"
            >
              <span className={`lm-composer__modelsel${modelLoading ? " is-loading" : ""}`}>
                {modelLoading ? <Spinner size={13} /> : <Icon name="cpu" size={13} />}
                <Select
                  aria-label="Model"
                  value={model}
                  disabled={modelLoading}
                  onChange={onChangeModel}
                  options={installedModels.map((m) => {
                    const d = modelDetailByName.get(m);
                    return { value: m, label: d ? `${m}  ·  ${d.params}  ·  ${d.quant}  ·  ${d.sizeGB.toFixed(1)}GB` : m };
                  })}
                />
              </span>
            </Tooltip>

            <div className="lm-composer__send">
              {loading ? (
                <button
                  className="lm-composer__sqbtn lm-composer__sqbtn--stop"
                  aria-label="Stop"
                  onClick={onStop}
                >
                  <Icon name="square" size={15} />
                </button>
              ) : (
                <button
                  className="lm-composer__sqbtn"
                  aria-label="Send"
                  disabled={!value.trim()}
                  onClick={onSend}
                >
                  <Icon name="arrow-up" size={17} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
