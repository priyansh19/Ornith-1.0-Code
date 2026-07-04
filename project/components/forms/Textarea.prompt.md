# Textarea

Multi-line input for prompts, system messages, and the chat composer. Use `seamless` when nesting inside a `Card`/composer shell that already provides the border.

```jsx
<Textarea placeholder="Type a message…" rows={3} />
<Textarea mono placeholder="{ &quot;system&quot;: &quot;…&quot; }" />
<Textarea seamless placeholder="Send a message…" />
```
