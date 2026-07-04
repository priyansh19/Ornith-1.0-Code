# Select

Native `<select>` restyled to the dark tokens with a custom chevron. Good for model pickers and config dropdowns.

```jsx
<Select
  mono
  value={model}
  onChange={setModel}
  options={['ornith:9b', 'gemma4:latest', 'claude-via-cli']}
/>
```

Pass `options` (strings or `{value,label}`) or your own `<option>` children. Use `mono` for model IDs.
