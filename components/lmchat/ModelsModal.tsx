import * as React from "react";
import { Button, IconButton, Badge, Icon } from "@/components/ds";
import { useDialog } from "./useDialog";
import {
  listInstalledModelDetails,
  listRunningModels,
  unloadModel,
  type InstalledModelDetail,
  type RunningModel,
} from "./ollama";

export interface ModelsModalProps {
  model: string;
  setModel: (m: string) => void;
  onClose: () => void;
  modelLoading?: boolean;
  pendingModel?: string | null;
  modelSwapPhase?: { phase: "unloading" | "loading"; detail: string } | null;
  modelLoadingElapsedS?: number;
}

/** Ollama-native model management: loaded tray + installed-model library,
    both sourced live from Ollama's own API (:11434) — no invented specs, no
    VRAM-fit estimate (this app targets CPU-only local setups same as GPU
    ones, and Ollama exposes no VRAM budget API to estimate against). */
export function ModelsModal({
  model,
  setModel,
  onClose,
  modelLoading = false,
  pendingModel = null,
  modelSwapPhase = null,
  modelLoadingElapsedS = 0,
}: ModelsModalProps) {
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  useDialog(cardRef, onClose);
  const [library, setLibrary] = React.useState<InstalledModelDetail[]>([]);
  const [loaded, setLoaded] = React.useState<RunningModel[]>([]);

  const refresh = React.useCallback((signal?: AbortSignal) => {
    listInstalledModelDetails(signal).then(setLibrary).catch(() => {});
    listRunningModels(signal).then(setLoaded).catch(() => {});
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal);
    // Poll faster while a swap is actually in flight so "Resident right now"
    // reflects the real unload/load transition instead of lagging behind by
    // up to 5s (the tray otherwise looked frozen during the exact window the
    // status banner below is describing).
    const id = setInterval(() => refresh(controller.signal), modelLoading ? 1000 : 5000);
    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [refresh, modelLoading]);

  const residentGB = loaded.reduce((n, m) => n + m.size / 1e9, 0);

  const unload = (name: string) =>
    unloadModel(name)
      .catch(() => {})
      .then(() => refresh());

  const use = (m: InstalledModelDetail) => {
    setModel(m.name);
    // Deliberately not closing here — the swap runs in the background either
    // way, but leaving the modal open lets the status banner below actually
    // show the unload/load transition instead of it happening invisibly.
  };

  return (
    <div className="lm-modal" onClick={onClose}>
      <div
        className="lm-modal__card lm-modal__card--wide"
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lm-modal__head">
          <div className="lm-modal__title">
            <Icon name="server" size={17} />
            <span>Models</span>
          </div>
          <Badge tone="neutral">{loaded.length === 0 ? "CPU only" : `${residentGB.toFixed(1)} GB resident`}</Badge>
          <IconButton
            variant="plain"
            aria-label="Close"
            onClick={onClose}
            className="lm-modal__x"
          >
            <Icon name="x" size={17} />
          </IconButton>
        </div>

        {modelLoading && (
          <div className="lm-mdl__swap" role="status">
            <div className="lm-mdl__swapbar">
              <div className="lm-mdl__swapbar-fill" />
            </div>
            <div className="lm-mdl__swaptext">
              {modelSwapPhase?.phase === "unloading" ? (
                <>Unloading <b>{modelSwapPhase.detail}</b>…</>
              ) : (
                <>Loading <b>{pendingModel}</b> into memory…</>
              )}
              <span className="lm-dim"> {modelLoadingElapsedS}s elapsed</span>
            </div>
            <div className="lm-mdl__swapnote lm-dim">
              Ollama doesn&rsquo;t report byte-level load progress for an
              already-downloaded model, so this is an activity indicator, not
              a real percentage — it will resolve on its own.
            </div>
          </div>
        )}

        <div className="lm-modal__body">
          <div className="lm-mdl__section">Resident right now</div>
          {loaded.length === 0 ? (
            <div className="lm-dim" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
              No models resident.
            </div>
          ) : (
            loaded.map((m) => (
              <div key={m.name} className="lm-mdl__loaded">
                <span className="lm-mdl__pulse" />
                <span className="lm-mdl__name">{m.name}</span>
                <span className="lm-mdl__meta">
                  {(m.size / 1e9).toFixed(1)} GB · keeps alive until{" "}
                  {new Date(m.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <Button variant="ghost" size="sm" onClick={() => unload(m.name)}>
                  Unload
                </Button>
              </div>
            ))
          )}

          <div className="lm-mdl__section" style={{ marginTop: 14 }}>Installed</div>
          {library.length === 0 ? (
            <div className="lm-dim" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
              No models found at this Ollama URL.
            </div>
          ) : (
            library.map((m) => {
              const active = m.name === model;
              const isResident = loaded.some((r) => r.name === m.name);
              return (
                <div key={m.name} className={`lm-mdl__row ${active ? "is-active" : ""}`}>
                  <div className="lm-mdl__main">
                    <div className="lm-mdl__title">
                      <span className="lm-mdl__name">{m.name}</span>
                      {active && <Badge tone="agent">in use</Badge>}
                      {isResident && <Badge tone="info">resident</Badge>}
                    </div>
                    <div className="lm-mdl__meta">
                      {m.params} · {m.quant} · {m.sizeGB.toFixed(1)} GB
                    </div>
                  </div>
                  <Button
                    variant={active ? "secondary" : "primary"}
                    size="sm"
                    disabled={active || modelLoading}
                    onClick={() => use(m)}
                  >
                    {modelLoading && pendingModel === m.name
                      ? "Loading…"
                      : active
                        ? "Current"
                        : "Use"}
                  </Button>
                </div>
              );
            })
          )}
        </div>

        <div className="lm-modal__foot">
          <span className="lm-dim" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
            {library.length} model{library.length === 1 ? "" : "s"} installed · pulling new models isn't wired up yet — use `ollama pull` in a terminal
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
