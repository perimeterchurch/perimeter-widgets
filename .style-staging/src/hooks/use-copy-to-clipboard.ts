import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Copy text to clipboard with a 2-second "copied" feedback state.
 * Optionally pass a key to track which item was copied (for lists).
 * Handles timeout cleanup on unmount.
 */
export function useCopyToClipboard() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(async (text: string, key?: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key ?? text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopiedKey(null), 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return {
    /** Whether anything was recently copied */
    copied: copiedKey !== null,
    /** The key of the most recently copied item (for identifying which item in a list) */
    copiedKey,
    copy,
  };
}
