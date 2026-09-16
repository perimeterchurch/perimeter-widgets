/**
 * A controllable ResizeObserver for jsdom. Observed elements are recorded so
 * a test can push a width with `fireResize(el, 343)`; nothing fires on its own.
 */
type Callback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;

const observers = new Map<ResizeObserver, { callback: Callback; targets: Set<Element> }>();

class MockResizeObserver implements ResizeObserver {
  constructor(callback: Callback) {
    observers.set(this, { callback, targets: new Set() });
  }
  observe(target: Element): void {
    observers.get(this)?.targets.add(target);
  }
  unobserve(target: Element): void {
    observers.get(this)?.targets.delete(target);
  }
  disconnect(): void {
    observers.delete(this);
  }
}

export function installResizeObserver(): void {
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = MockResizeObserver;
  }
}

/** Report `inlineSize` for `el` to every observer watching it. */
export function fireResize(el: Element, inlineSize: number): void {
  for (const [observer, { callback, targets }] of observers) {
    if (!targets.has(el)) continue;
    const entry = {
      target: el,
      contentBoxSize: [{ inlineSize, blockSize: 0 }],
      borderBoxSize: [{ inlineSize, blockSize: 0 }],
      devicePixelContentBoxSize: [{ inlineSize, blockSize: 0 }],
      contentRect: {
        x: 0,
        y: 0,
        width: inlineSize,
        height: 0,
        top: 0,
        left: 0,
        right: inlineSize,
        bottom: 0,
        toJSON: () => ({}),
      },
    } as unknown as ResizeObserverEntry;
    callback([entry], observer);
  }
}
