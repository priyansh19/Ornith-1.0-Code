# Tabs

Underline tab bar with optional count pills. The canonical use is the Thinking & Critique panel's **Thinking / Critiques** switch.

```jsx
<Tabs
  value={tab}
  onChange={setTab}
  accent="agent"
  tabs={[
    { value: 'thinking',  label: 'Thinking' },
    { value: 'critiques', label: 'Critiques', count: 3 },
  ]}
/>
```

`count` renders a small pill (open blockers/majors). `accent` sets the active underline color.
