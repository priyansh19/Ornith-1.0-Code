# ToolCall

A collapsible tool-activity row shown inline in a coding-agent conversation — the "Edited a file, used a tool ›" disclosure. Collapsed it reads as a quiet log line; expanded it lists each file edit / read / shell run / tool call.

```jsx
<ToolCall
  summary={<span><b>Edited</b> session.py, read 2 files, ran a tool</span>}
  items={[
    { kind: 'read', text: 'src/auth/session.py' },
    { kind: 'edit', text: 'src/auth/session.py', diff: [12, 3] },
    { kind: 'run',  text: 'pytest tests/auth -q' },
  ]}
/>
<ToolCall summary="Running pytest…" running />
```

`kind` colors each line (edit=orange, read=cyan, run=green, tool=violet, search=amber). Use `running` for the in-flight state, `defaultOpen` to start expanded. Place between the assistant label and its final answer.
