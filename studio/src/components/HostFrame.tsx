import type { ReactNode } from 'react';
import { hostProfile } from '@perimeter/theme';
import { hostFrameGutter } from '../lib/host-gutter';

/**
 * Replicates the production host page around a widget preview: the inheritable
 * properties that pierce the shadow root plus the real content-frame width.
 * The horizontal gutter ramps with `frameWidth` (the resolved canvas frame
 * width) so the Mobile/Tablet presets simulate a realistic phone/tablet host
 * instead of crushing the widget with the 90px desktop gutter. When `frameWidth`
 * is undefined (fluid preset), the desktop gutter is kept.
 */
export function HostFrame({
  children,
  frameWidth,
}: {
  children: ReactNode;
  frameWidth?: number | undefined;
}) {
  const gutter = hostFrameGutter(frameWidth);
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
          padding: `0 ${gutter}px`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
