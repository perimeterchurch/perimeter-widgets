import type { z } from 'zod';
import { mountWidget, type MountOptions, type MountedWidget } from './mount';

/**
 * Studio uses this entry to render a widget natively (React owned by the host app).
 * Identical to mountWidget today; the `hostRoot` argument is reserved for future use
 * (e.g. portaling overlays out of the shadow root).
 */
export function nativeRender<S extends z.ZodTypeAny>(
  opts: MountOptions<S> & { hostRoot: HTMLElement },
): MountedWidget {
  void opts.hostRoot;
  return mountWidget(opts);
}
