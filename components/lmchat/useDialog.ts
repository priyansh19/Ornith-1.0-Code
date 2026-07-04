import * as React from "react";

const FOCUSABLE = "button, [href], input, select, textarea";

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("disabled"),
  );
}

/** Modal dialog behavior: Escape closes; focus moves into the dialog on
    mount (the [autofocus] element or the first focusable), Tab is trapped
    inside the ref'd card, and focus is restored to the previously focused
    element on unmount. Use in mount-gated dialogs only. */
export function useDialog(
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  // Mount-only: capture the opener, focus the dialog, restore on cleanup.
  React.useEffect(() => {
    const prev =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const node = ref.current;
    if (node) {
      const target =
        node.querySelector<HTMLElement>("[autofocus]") ?? focusables(node)[0];
      target?.focus();
    }
    return () => {
      prev?.focus();
    };
  }, [ref]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !ref.current) return;
      const items = focusables(ref.current);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      const inside =
        current instanceof HTMLElement && ref.current.contains(current);
      if (e.shiftKey) {
        if (!inside || current === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || current === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ref, onClose]);
}
