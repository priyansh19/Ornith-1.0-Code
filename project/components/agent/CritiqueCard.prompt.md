# CritiqueCard

A structured critique item from the Critic pipeline. Left rail + severity badge color-code the level; optional category chip, round number, id, and a mono `suggestedAction` line.

```jsx
<CritiqueCard
  severity="major"
  category="gap"
  id="c-042"
  round={1}
  message="No dark-mode UI references in the design scout report."
  suggestedAction="spawn_scout({ mission: 'dark mode dashboard patterns', sources: ['mobbin'] })"
/>
<CritiqueCard severity="minor" category="efficiency" message="Two findings overlap — merge." resolved />
```

Severity drives the accent (blocker red, major amber, minor cyan, info muted). Set `resolved` to dim + strike the item. Stack in the Critiques tab.
