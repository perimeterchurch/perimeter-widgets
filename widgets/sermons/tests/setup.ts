import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom doesn't implement URL.createObjectURL. PdfViewer calls it at module
// init to create a blob URL for the inlined worker source. Stub it globally
// so the module can be imported without error.
URL.createObjectURL = vi.fn(() => 'blob:mock-pdf-worker');

afterEach(() => {
  cleanup();
});
