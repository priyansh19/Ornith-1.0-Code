/* Platform sniff for keyboard-shortcut labels. SSR renders the non-Mac
   default; <kbd> consumers add suppressHydrationWarning. */
export const isMac =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform ?? "");
