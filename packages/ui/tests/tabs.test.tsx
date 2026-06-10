import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../src/tabs';

describe('Tabs', () => {
  it('renders triggers and the active panel', () => {
    render(
      <Tabs defaultValue="one">
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">First panel</TabsContent>
        <TabsContent value="two">Second panel</TabsContent>
      </Tabs>,
    );
    expect(screen.getByRole('tab', { name: 'One' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Two' })).toBeInTheDocument();
    expect(screen.getByText('First panel')).toBeInTheDocument();
  });

  it('forwards orientation to Base UI so vertical tabs get vertical aria + keyboard axis', () => {
    render(
      <Tabs defaultValue="one" orientation="vertical">
        <TabsList>
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="one">First panel</TabsContent>
        <TabsContent value="two">Second panel</TabsContent>
      </Tabs>,
    );
    // Base UI derives aria-orientation (and the ArrowUp/Down key axis) from
    // its own orientation prop — a manual data-orientation attribute alone
    // leaves the tablist announced and navigated as horizontal.
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
  });
});

describe('Tabs line-variant indicator', () => {
  // jsdom has no layout and no ResizeObserver, so we run rAF synchronously and
  // stub ResizeObserver (capturing its callback to drive a re-measure), while
  // leaving the real MutationObserver intact (base-ui relies on it). base-ui
  // drives `data-active` from the controlled value. This verifies the indicator
  // math (relative-to-list position + active-trigger content width), not real
  // rendered geometry.
  let resizeCallbacks: (() => void)[] = [];

  beforeEach(() => {
    resizeCallbacks = [];
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private cb: () => void) {
          resizeCallbacks.push(cb);
        }
        observe() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function rect(left: number, width: number): DOMRect {
    return {
      left,
      top: 0,
      width,
      height: 40,
      right: left + width,
      bottom: 40,
      x: left,
      y: 0,
      toJSON() {},
    };
  }

  /**
   * Stub the list + its triggers (keyed by label text — base-ui renders `value`
   * as an internal id, not a DOM attribute) with fixed viewport geometry so the
   * indicator is verified RELATIVE TO THE LIST and sized to the active trigger's
   * full content width (not an arbitrary 60% fraction offset by 20%).
   * list-x origin 10; "One" spans 20..100 (width 80); "Two" spans 110..230 (width 120).
   */
  function stubGeometry(list: HTMLElement) {
    list.getBoundingClientRect = () => rect(10, 220);
    const byLabel: Record<string, DOMRect> = { One: rect(20, 80), Two: rect(110, 120) };
    for (const trigger of list.querySelectorAll<HTMLElement>("[data-slot='tabs-trigger']")) {
      const r = byLabel[trigger.textContent ?? ''] ?? rect(0, 0);
      trigger.getBoundingClientRect = () => r;
    }
  }

  // Drive a re-measure deterministically via the captured ResizeObserver
  // callback (the runtime trigger is the data-active MutationObserver; this
  // exercises the same updateIndicator code path synchronously).
  function reMeasure() {
    act(() => {
      for (const cb of resizeCallbacks) cb();
    });
  }

  it('positions the indicator under the active tab and re-measures on tab change', () => {
    const { container, rerender } = render(
      <Tabs value="one" onValueChange={() => {}}>
        <TabsList variant="line">
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    const list = container.querySelector<HTMLElement>("[data-slot='tabs-list']")!;
    const indicator = container.querySelector<HTMLElement>("[data-slot='tabs-indicator']")!;
    expect(list).not.toBeNull();
    expect(indicator).not.toBeNull();
    // The list is the indicator's containing block.
    expect(list.className).toContain('relative');
    // base-ui marks the controlled value's trigger active.
    expect(list.querySelector('[data-active]')?.textContent).toBe('One');

    stubGeometry(list);
    reMeasure();

    // Active "One": left 20 - listLeft 10 = 10; width = full content width 80.
    expect(indicator.style.width).toBe('80px');
    expect(indicator.style.transform).toBe('translateX(10px)');

    // Drive a controlled tab change to "two" and re-measure.
    rerender(
      <Tabs value="two" onValueChange={() => {}}>
        <TabsList variant="line">
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
      </Tabs>,
    );
    expect(list.querySelector('[data-active]')?.textContent).toBe('Two');
    stubGeometry(list);
    reMeasure();

    // Active "Two": left 110 - listLeft 10 = 100; width = its full width 120.
    expect(indicator.style.width).toBe('120px');
    expect(indicator.style.transform).toBe('translateX(100px)');
  });
});
