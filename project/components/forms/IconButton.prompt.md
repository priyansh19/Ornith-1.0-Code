# IconButton

Square, icon-only button for toolbars, composer controls, and close/clear actions. Always supply `aria-label`.

```jsx
<IconButton aria-label="Attach file"><Icon name="paperclip" /></IconButton>
<IconButton variant="outlined" aria-label="Settings"><Icon name="settings" /></IconButton>
<IconButton variant="solid" aria-label="Send"><Icon name="arrow-up" /></IconButton>
<IconButton variant="danger" aria-label="Clear chat"><Icon name="trash-2" /></IconButton>
```

Variants: `plain` (default, hover fill), `outlined`, `solid` (brand fill), `danger`. Sizes `sm` / `md` / `lg`. Drop a Lucide `<Icon>` (or any 16–18px SVG) inside.
