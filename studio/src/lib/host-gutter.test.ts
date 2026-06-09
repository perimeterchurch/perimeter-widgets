import { describe, it, expect } from 'vitest';
import { hostFrameGutter } from './host-gutter';

describe('hostFrameGutter', () => {
  it('returns the desktop gutter (90) when frame width is unknown (fluid)', () => {
    expect(hostFrameGutter(undefined)).toBe(90);
  });
  it('floors at 16px for phone-width frames (<= 640)', () => {
    expect(hostFrameGutter(375)).toBe(16);
    expect(hostFrameGutter(640)).toBe(16);
  });
  it('caps at 90px for desktop-width frames (>= 1200)', () => {
    expect(hostFrameGutter(1200)).toBe(90);
    expect(hostFrameGutter(1920)).toBe(90);
  });
  it('ramps linearly between 640 and 1200 (tablet ~33 at 768)', () => {
    expect(hostFrameGutter(768)).toBe(33);
  });
  it('produces realistic widget widths at the studio presets', () => {
    expect(375 - 2 * hostFrameGutter(375)).toBe(343); // Mobile → phone bucket (<480)
    expect(768 - 2 * hostFrameGutter(768)).toBe(702); // Tablet → tablet bucket (480–767)
    expect(1280 - 2 * hostFrameGutter(1280)).toBe(1100); // Desktop → desktop bucket (>=768)
  });
});
