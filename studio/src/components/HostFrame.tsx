import type { ReactNode } from 'react';
import { hostProfile } from '@perimeter/theme';

/**
 * Replicates the production host page around a widget preview: the inheritable
 * properties that pierce the shadow root (parity finding H4 — all four probed
 * properties inherit) plus the real content-frame width. Values from
 * hostProfile (single source of truth with the audit fixture).
 * Phase 3 adds the canvas toggle; in Phase 2 this is the default-and-only canvas.
 */
export function HostFrame({ children }: { children: ReactNode }) {
  return (
    <div
      data-host-frame
      style={{
        fontFamily: hostProfile.bodyFontFamily,
        fontSize: hostProfile.bodyFontSize,
        lineHeight: hostProfile.bodyLineHeight,
        color: hostProfile.bodyColor,
        background: hostProfile.bodyBackground,
      }}
    >
      <div
        style={{
          maxWidth: hostProfile.contentMaxWidth,
          margin: '0 auto',
          padding: `0 ${hostProfile.contentPaddingX}`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
