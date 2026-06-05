import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom doesn't implement URL.createObjectURL. PdfViewer calls it at module
// init to create a blob URL for the inlined worker source. Stub it globally
// so the module can be imported without error.
URL.createObjectURL = vi.fn(() => 'blob:mock-pdf-worker');

// jsdom doesn't implement ResizeObserver. The @perimeter/ui Tabs `line` variant
// (used by SermonTabs) observes its list to position the underline indicator.
// In the real browser/shadow-DOM runtime ResizeObserver exists; stub it here so
// the render path can be exercised in tests.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

afterEach(() => {
  cleanup();
});
