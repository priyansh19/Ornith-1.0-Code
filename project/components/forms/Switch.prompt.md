# Switch

Boolean on/off toggle for settings (e.g. "Show thinking trace", "Stream tokens", "Enable tracing").

```jsx
<Switch checked={trace} onChange={setTrace} label="Show thinking trace" />
<Switch checked={stream} onChange={setStream} accent="agent" label="Stream tokens" />
```

`accent` colors the on-state — `brand` (orange) by default, `agent` (violet) for harness-related toggles.
