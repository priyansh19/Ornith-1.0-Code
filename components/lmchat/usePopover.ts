import * as React from "react";

/** Light-dismiss behavior for hand-rolled popovers: closes on Escape and on
    any pointerdown outside the ref'd container (trigger + menu). Attach the
    ref to a wrapper that contains BOTH the trigger and the popover so opening
    clicks don't immediately re-close it. */
export function usePopover(
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [ref, onClose]);
}
