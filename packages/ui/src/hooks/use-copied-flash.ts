import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * The "Copied!" affordance: `flash()` sets `copied` and arms ONE timer to
 * reset it. Re-flashing restarts the window instead of letting an earlier
 * untracked timer truncate the fresh feedback, and unmount clears the timer.
 */
export function useCopiedFlash(durationMs = 1500): { copied: boolean; flash: () => void } {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = useCallback(() => {
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), durationMs);
  }, [durationMs]);

  return { copied, flash };
}
