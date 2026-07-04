# MessageBubble

A chat message. `user` aligns right with a cyan label and violet-tinted fill; `assistant` aligns left with a green label.

```jsx
<MessageBubble role="user" time="14:02">Fix the login race condition.</MessageBubble>
<MessageBubble role="assistant" name="ornith" time="14:02">
  Reading src/auth/session.py first.
</MessageBubble>
<MessageBubble loading />
```

Pass `name` to override the sender (e.g. "Synthesizer"), `loading` for the in-flight spinner state. Stack inside the chat panel column with `gap`.
