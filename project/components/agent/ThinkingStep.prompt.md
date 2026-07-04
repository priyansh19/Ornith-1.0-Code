# ThinkingStep

One node in the ReAct trace shown in the Thinking panel: a `thought`, a `tool` call, or an `observation`. Connected by a vertical rail; tool/observation content gets mono treatment.

```jsx
<ThinkingStep kind="thought" agent="Harness" content="User wants the login race condition fixed. Reading session.py first." />
<ThinkingStep kind="tool" agent="Scout 3" content="search_web({ query: 'token refresh race' })" />
<ThinkingStep kind="observation" content="3 results — top match describes a mutex fix." last />
```

Set `last` on the final step to drop the trailing connector. Stack inside a scrollable panel.
