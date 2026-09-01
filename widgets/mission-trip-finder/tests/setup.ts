import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom implements no scrolling at all, so Element.prototype.scrollIntoView is
// simply absent and the full-width detail's scroll throws on mount. Stubbed
// here rather than per file: it is a gap in the environment, not a fixture.
// Specs that assert on the call replace it with their own spy.
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
});
