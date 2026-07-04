/* Thin wrapper around the IPC bridge electron/preload.js exposes (only
   present when actually running inside the Electron shell — undefined in a
   plain browser tab). Real desktop capabilities (like a native folder
   picker) need main-process OS access that a sandboxed renderer can't reach
   directly; this is the one legitimate way across that boundary. */
import * as React from "react";

declare global {
  interface Window {
    electronAPI?: {
      pickDirectory: () => Promise<string | null>;
    };
  }
}

export function isElectron(): boolean {
  return typeof window !== "undefined" && !!window.electronAPI;
}

/** Hydration-safe version of isElectron() for use during render. Next.js
    server-renders with no `window`, so isElectron() always returns false
    there — but the client hydration pass inside the real Electron shell sees
    window.electronAPI and returns true, a guaranteed server/client text
    mismatch for anything rendered from it directly. Returning false on the
    first client render (matching SSR) and flipping true only after mount
    avoids that mismatch entirely. */
export function useIsElectron(): boolean {
  const [electron, setElectron] = React.useState(false);
  React.useEffect(() => {
    setElectron(isElectron());
  }, []);
  return electron;
}

/** Opens a real native folder picker.
    - Inside Electron: returns an absolute filesystem path.
    - In a plain browser: falls back to the File System Access API, which
      DOES show a real native OS folder dialog, but browsers deliberately
      never expose an absolute path for a picked folder (a security
      boundary, not a bug) — only the folder's own name is available.
    - Neither available (older browser, no Electron): returns null. */
export async function pickDirectory(): Promise<{ path: string; isFullPath: boolean } | null> {
  if (window.electronAPI) {
    const picked = await window.electronAPI.pickDirectory();
    return picked ? { path: picked, isFullPath: true } : null;
  }
  const picker = (window as unknown as { showDirectoryPicker?: () => Promise<{ name: string }> })
    .showDirectoryPicker;
  if (picker) {
    try {
      const handle = await picker();
      return { path: handle.name, isFullPath: false };
    } catch {
      return null; // user cancelled
    }
  }
  return null;
}
