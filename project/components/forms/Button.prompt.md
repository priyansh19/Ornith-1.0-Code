# Button

The primary action control. Orange brand fill (`primary`) for the main CTA; violet `agent` fill when the action relates to the harness/agent layer.

```jsx
<Button variant="primary" onClick={send}>Send</Button>
<Button variant="agent" iconLeft={<Icon name="git-branch" />}>Run harness</Button>
<Button variant="secondary" size="sm">Cancel</Button>
<Button variant="ghost" size="sm">Skip</Button>
<Button variant="danger" size="sm">Clear chat</Button>
<Button loading block>Processing…</Button>
```

Variants: `primary` (brand orange), `agent` (violet), `secondary` (outlined dark), `ghost` (transparent), `danger` (red outline). Sizes: `sm` / `md` / `lg`. Use `loading` for in-flight state and `block` to fill width. Reserve `primary` for the single most important action per view.
