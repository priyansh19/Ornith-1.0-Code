# Tooltip

Lightweight mono tooltip on hover/focus. Wrap any trigger (usually an `IconButton`).

```jsx
<Tooltip label="Clear chat (⌘K)">
  <IconButton aria-label="Clear chat"><Icon name="trash-2" /></IconButton>
</Tooltip>
<Tooltip label="Full trace → localhost:3000" side="bottom">
  <Badge tone="agent">trace</Badge>
</Tooltip>
```

Keep the label terse; mono styling suits shortcuts and paths.
