// @vitest-environment happy-dom
// @vitest-environment-options { "settings": { "disableJavaScriptEvaluation": true, "disableIframePageLoading": true } }
// Regression tests for the preview frame's write timing. Every case here is a
// bug that actually shipped: writing into the transient `about:blank` document
// (which blanked every preview in Safari), depending on a `load` event that had
// already fired, and re-writing the same window instead of navigating (so the
// widget never re-mounted after a config change).
//
// The frame's window/document are stubbed on the prototype BEFORE render, so the
// hook sees the state under test from its very first attempt. Stubbing after
// render is useless here: the hook writes during its mount effect, so a later
// stub would only ever be checked against an already-satisfied write.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { usePreviewFrame, PREVIEW_FRAME_URL } from './preview-frame';

const REAL_URL = 'https://style.perimeter.org/preview-frame.html';

interface FrameStub {
  href: string;
  doc: Document;
  /** Held directly so assertions never reference an unbound method. */
  write: ReturnType<typeof vi.fn>;
  win: { location: { href: string; replace: ReturnType<typeof vi.fn> } };
}

let stub: FrameStub;
let originalDoc: PropertyDescriptor | undefined;
let originalWin: PropertyDescriptor | undefined;

function makeDoc(): { doc: Document; write: ReturnType<typeof vi.fn> } {
  const write = vi.fn();
  const doc = { open: vi.fn(), write, close: vi.fn() } as unknown as Document;
  return { doc, write };
}

/** Point the frame at a new document, as a completed navigation would. */
function navigateTo(href: string) {
  const { doc, write } = makeDoc();
  stub.href = href;
  stub.win.location.href = href;
  stub.doc = doc;
  stub.write = write;
}

// No `src` here: the hook drives the frame through the stubbed
// contentWindow/contentDocument, and a real `src` would make happy-dom attempt a
// network fetch. The components' own tests assert that they set `src`.
function Harness({ html }: { html: string }) {
  const { ref, src } = usePreviewFrame(html);
  // `src` is asserted (a change must re-point it), but not set on the element:
  // a real URL would make happy-dom attempt a network fetch of the frame page.
  return <iframe title="preview" ref={ref} data-src={src} />;
}

function frameEl(container: HTMLElement): HTMLIFrameElement {
  return container.querySelector('iframe') as HTMLIFrameElement;
}

beforeEach(() => {
  vi.useFakeTimers();
  const replace = vi.fn();
  const { doc, write } = makeDoc();
  stub = {
    href: 'about:blank',
    doc,
    write,
    win: { location: { href: 'about:blank', replace } },
  };
  originalDoc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentDocument');
  originalWin = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
  Object.defineProperty(HTMLIFrameElement.prototype, 'contentDocument', {
    get: () => stub.doc,
    configurable: true,
  });
  Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
    get: () => stub.win,
    configurable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  if (originalDoc) {
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentDocument', originalDoc);
  }
  if (originalWin) {
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', originalWin);
  }
});

describe('usePreviewFrame', () => {
  it('never writes into the transient about:blank document', () => {
    const { container } = render(<Harness html="<p>harness</p>" />);
    const blankWrite = stub.write;

    // Safari fires `load` for about:blank as well as for the real navigation,
    // so both paths are exercised.
    act(() => {
      frameEl(container).dispatchEvent(new Event('load'));
      vi.advanceTimersByTime(500);
    });

    expect(blankWrite).not.toHaveBeenCalled();
  });

  it('writes once the frame has a real document, with no load event at all', () => {
    // The frame can finish loading before the effect runs, so `load` has already
    // fired and never comes again — the poll is the only thing that saves it.
    const { container } = render(<Harness html="<p>harness</p>" />);
    expect(stub.write).not.toHaveBeenCalled(); // still about:blank

    navigateTo(REAL_URL);
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(stub.write).toHaveBeenCalledWith('<p>harness</p>');
    expect(frameEl(container)).toBeTruthy();
  });

  it('writes the harness only once per document', () => {
    const { container } = render(<Harness html="<p>harness</p>" />);
    navigateTo(REAL_URL);

    act(() => {
      vi.advanceTimersByTime(1000);
      frameEl(container).dispatchEvent(new Event('load'));
      vi.advanceTimersByTime(1000);
    });

    expect(stub.write).toHaveBeenCalledTimes(1);
  });

  it('navigates the frame for a fresh document when the harness changes', () => {
    const { container, rerender } = render(<Harness html="<p>first</p>" />);
    navigateTo(REAL_URL);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(stub.write).toHaveBeenCalledWith('<p>first</p>');
    const firstSrc = frameEl(container).getAttribute('data-src');
    expect(firstSrc).toBe(PREVIEW_FRAME_URL);

    // Re-writing the same window would leave the widget loader's globals and its
    // body observer in place, so the new harness would never mount. A changed
    // `src` makes the browser navigate into a fresh window instead.
    rerender(<Harness html="<p>second</p>" />);
    const secondSrc = frameEl(container).getAttribute('data-src');
    expect(secondSrc).not.toBe(firstSrc);
    expect(secondSrc?.startsWith(PREVIEW_FRAME_URL)).toBe(true);

    // …and the new document receives the new harness.
    navigateTo(REAL_URL);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(stub.write).toHaveBeenCalledWith('<p>second</p>');
  });

  it('gives up polling rather than spinning forever', () => {
    const clearSpy = vi.spyOn(window, 'clearInterval');
    render(<Harness html="<p>harness</p>" />);

    act(() => {
      vi.advanceTimersByTime(11_000);
    });

    expect(clearSpy).toHaveBeenCalled();
    expect(stub.write).not.toHaveBeenCalled();
  });
});
