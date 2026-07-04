# Input

Single-line text field with optional label, hint/error text, and a leading icon. Dark inset well, brand-orange focus ring.

```jsx
<Input label="Workspace name" placeholder="e.g. mach2-dev" />
<Input prefix={<Icon name="search" />} placeholder="Search models…" />
<Input label="API key" mono error="Key is invalid" defaultValue="sk-lf-…" />
```

Use `mono` for keys / IDs / paths. Pass `error` to surface validation; it recolors the border and replaces `hint`.
