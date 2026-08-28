import * as React from 'react';
import { PERIMETER_MARK_WHITE_DATA_URI } from '../lib/perimeter-mark';

/**
 * The branded placeholder for a participant with no photo on file.
 *
 * Most of the roster has no photo — Contacts records carry one only if someone
 * uploaded it — so this is the common case, not the edge case, and it needs to
 * look deliberate rather than broken. A solid `primary` field with the arch
 * mark as a watermark reads as "Perimeter" instead of "missing image", and a
 * wall of them in the team grid stays calm because every tile is identical.
 *
 * Built from tokens rather than baked into the PNG: the mark ships as a white
 * silhouette and the field is `bg-primary`, so a host page that retints the
 * accent gets a placeholder that still matches it.
 *
 * It fills its parent, and takes its shape from the parent's `overflow-hidden`
 * — square in the team grid, a circle behind the participant portrait.
 */
export function PhotoFallback({
  className,
}: {
  className?: string | undefined;
}): React.JSX.Element {
  return (
    <div className={`flex h-full w-full items-center justify-center bg-primary ${className ?? ''}`}>
      {/* Decorative: the accessible name for this person is already on the
          tile (the team grid) or the heading beside it (the participant
          page), so announcing the mark would only repeat it. */}
      <img
        src={PERIMETER_MARK_WHITE_DATA_URI}
        alt=""
        aria-hidden="true"
        className="w-[58%] opacity-30"
      />
    </div>
  );
}
