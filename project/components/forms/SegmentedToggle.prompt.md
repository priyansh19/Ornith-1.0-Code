# SegmentedToggle

Compact segmented single-select for 2–3 short options — view filters, panel switches, or picking among a small set of harnesses. (For 4+ harnesses, use `Select` instead.)

```jsx
<SegmentedToggle
  value={view}
  onChange={setView}
  accent="agent"
  options={[
    { value: 'chat',  label: 'Chat',  icon: <Icon name="message-square" /> },
    { value: 'trace', label: 'Trace', icon: <Icon name="list-tree" /> },
  ]}
/>
```

`accent`: `neutral` (gray active), `brand` (orange), `agent` (violet — use for anything in the agent/harness layer).
