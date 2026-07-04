import * as React from "react";
import {
  Button,
  IconButton,
  Badge,
  Tag,
  Input,
  Icon,
  Tabs,
  SegmentedToggle,
  Switch,
  Select,
} from "@/components/ds";
import type { Provider } from "./data";
import { useDialog } from "./useDialog";
import { listRunningModels, unloadModel, setModelKeepAlive, type RunningModel } from "./ollama";

const KEEP_ALIVE_OPTIONS = [
  { value: "10m", label: "10 min" },
  { value: "30m", label: "30 min" },
  { value: "1h", label: "1 hour" },
  { value: "6h", label: "6 hours (default)" },
  { value: "24h", label: "24 hours" },
];

export type Density = "comfortable" | "compact";

export interface SettingsModalProps {
  provider: Provider;
  models: string[];
  density: Density;
  setDensity: (d: Density) => void;
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;
  onClose: () => void;
  onSaveUrl: (url: string) => void;
  initialTab?: string;
}

/** Settings: Provider (Ollama base URL + real model residency), General
   (density, motion), MCP servers. Mounted only while open (by the parent),
   so local state starts fresh from current props each time it opens — no
   effect-driven resync. */
export function SettingsModal({
  provider,
  models,
  density,
  setDensity,
  reduceMotion,
  setReduceMotion,
  onClose,
  onSaveUrl,
  initialTab = "provider",
}: SettingsModalProps) {
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  useDialog(cardRef, onClose);
  const [url, setUrl] = React.useState(provider.url);
  const [tab, setTab] = React.useState(initialTab);
  const [running, setRunning] = React.useState<RunningModel[]>([]);
  const [keepAliveBusy, setKeepAliveBusy] = React.useState<string | null>(null);

  const refreshRunning = React.useCallback((signal?: AbortSignal) => {
    listRunningModels(signal).then(setRunning).catch(() => setRunning([]));
  }, []);

  React.useEffect(() => {
    if (tab !== "provider") return;
    const controller = new AbortController();
    refreshRunning(controller.signal);
    const id = setInterval(() => refreshRunning(controller.signal), 5000);
    return () => {
      controller.abort();
      clearInterval(id);
    };
  }, [tab, refreshRunning]);
  return (
    <div className="lm-modal" onClick={onClose}>
      <div
        className="lm-modal__card"
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lm-modal__head">
          <div className="lm-modal__title">
            <Icon name="settings" size={17} />
            <span>Settings</span>
          </div>
          <IconButton
            variant="plain"
            aria-label="Close"
            onClick={onClose}
            className="lm-modal__x"
          >
            <Icon name="x" size={17} />
          </IconButton>
        </div>

        <Tabs
          className="lm-set__tabs"
          tabs={[
            { value: "provider", label: "Provider" },
            { value: "general", label: "General" },
            { value: "mcp", label: "MCP servers" },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === "provider" ? (
          <>
            <div className="lm-modal__sub">
              LMChat runs open-source models through Ollama. The default provider stays
              loaded; point it at any reachable Ollama URL.
            </div>
            <div className="lm-modal__body">
              <div className="lm-mdl__section">Model provider</div>
              <div className="lm-provider">
                <div className="lm-provider__row">
                  <span className="lm-provider__name">
                    <Icon name="server" size={14} /> Ollama (local)
                  </span>
                  <Badge tone={provider.connected ? "success" : "danger"} dot>
                    {provider.connected ? "connected" : "offline"}
                  </Badge>
                  <Badge tone="brand">default</Badge>
                </div>
                <label className="lm-provider__label">Base URL</label>
                <div className="lm-provider__url">
                  <Input
                    mono
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    prefix={<Icon name="link" size={15} />}
                  />
                  <Button variant="primary" size="md" onClick={() => onSaveUrl(url)}>
                    Save
                  </Button>
                </div>
                <div className="lm-provider__models">
                  <span className="lm-provider__mlabel">
                    Models available at this URL
                  </span>
                  <div className="lm-provider__tags">
                    {models.map((m) => (
                      <Tag key={m} icon={<Icon name="cpu" size={12} />}>
                        {m}
                      </Tag>
                    ))}
                  </div>
                </div>
                <div className="lm-provider__models">
                  <span className="lm-provider__mlabel">
                    Loaded in memory right now
                  </span>
                  {running.length === 0 ? (
                    <div className="lm-dim" style={{ marginTop: 4 }}>
                      Nothing resident — the next chat turn or model switch will load one.
                    </div>
                  ) : (
                    <div className="lm-provider__running">
                      {running.map((m) => (
                        <div className="lm-provider__runrow" key={m.name}>
                          <span className="lm-provider__runname">
                            <Icon name="cpu" size={13} /> {m.name}
                          </span>
                          <span className="lm-provider__runmeta">
                            {(m.size / 1e9).toFixed(1)} GB · keeps alive until{" "}
                            {new Date(m.expires_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <Select
                            aria-label={`Keep-alive for ${m.name}`}
                            value=""
                            disabled={keepAliveBusy === m.name}
                            onChange={(v) => {
                              setKeepAliveBusy(m.name);
                              setModelKeepAlive(m.name, v)
                                .catch(() => {})
                                .then(() => refreshRunning())
                                .finally(() => setKeepAliveBusy(null));
                            }}
                            options={[
                              { value: "", label: "Set keep-alive…" },
                              ...KEEP_ALIVE_OPTIONS,
                            ]}
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={keepAliveBusy === m.name}
                            onClick={() =>
                              unloadModel(m.name)
                                .catch(() => {})
                                .then(() => refreshRunning())
                            }
                          >
                            Unload
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : tab === "general" ? (
          <div className="lm-modal__body">
            <div className="lm-set__row">
              <div className="lm-set__info">
                <div className="lm-set__label">Density</div>
                <div className="lm-set__hint">
                  Compact tightens chat, session, and panel spacing.
                </div>
              </div>
              <SegmentedToggle
                options={["comfortable", "compact"]}
                value={density}
                onChange={(v) => setDensity(v as Density)}
              />
            </div>
            <div className="lm-set__row">
              <div className="lm-set__info">
                <div className="lm-set__label">Reduce motion</div>
                <div className="lm-set__hint">
                  Minimize animations and transitions across the app.
                </div>
              </div>
              <Switch checked={reduceMotion} onChange={setReduceMotion} />
            </div>
          </div>
        ) : (
          <div className="lm-modal__body">
            <div className="lm-mdl__section">Model Context Protocol servers</div>
            <div className="lm-dim" style={{ lineHeight: 1.6, marginBottom: 12 }}>
              MCP lets the agent reach external tools through a standard protocol instead of
              hand-written tool functions.
            </div>
            <div className="lm-provider">
              <div className="lm-provider__row">
                <span className="lm-provider__name">
                  <Icon name="wrench" size={14} /> filesystem (stdio · @modelcontextprotocol/server-filesystem)
                </span>
                <Badge tone="success" dot>
                  connected
                </Badge>
              </div>
              <div className="lm-dim" style={{ marginTop: 8 }}>
                14 tools discovered and registered — read/write/edit
                files, directory trees, search-by-pattern, move/rename, file info — scoped to this
                project&apos;s <code>workspace/</code> directory. As more
                MCP servers are connected, they&apos;ll list here too.
              </div>
            </div>
          </div>
        )}

        <div className="lm-modal__foot">
          <span
            className="lm-dim"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}
          >
            {tab === "provider"
              ? "+ add another provider URL"
              : "applies instantly · this session only"}
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
