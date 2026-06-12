import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * lib/pdf-worker installs the pdf.js worker by fetching the sibling artifact
 * and wrapping it in a same-origin blob URL (cross-origin Workers are blocked
 * by browsers, so the CDN URL can never be handed to pdf.js directly). These
 * tests pin the install, the once-per-page singleton, and the retry-after-
 * transient-failure reset. The module is re-imported fresh per test because
 * the singleton is module state.
 */

const workerOptions = { workerSrc: '' };
vi.mock('react-pdf', () => ({ pdfjs: { GlobalWorkerOptions: workerOptions } }));

async function freshEnsure() {
  vi.resetModules();
  const mod = await import('../../src/lib/pdf-worker');
  return mod.ensurePdfWorker;
}

const okResponse = {
  ok: true,
  status: 200,
  text: () => Promise.resolve('// worker source'),
};

beforeEach(() => {
  workerOptions.workerSrc = '';
  // jsdom's URL has no createObjectURL; patch the static on the real class so
  // `new URL(...)` keeps working for the module's dev-path resolution.
  (URL as { createObjectURL?: (blob: Blob) => string }).createObjectURL = vi.fn(
    () => 'blob:pdf-worker',
  );
});

describe('ensurePdfWorker', () => {
  it('fetches the worker and installs a blob workerSrc', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse);
    vi.stubGlobal('fetch', fetchMock);
    const ensurePdfWorker = await freshEnsure();

    await ensurePdfWorker();

    // jsdom has no currentScript, so the module resolves the DEV path — the
    // widget's own pdfjs-dist worker relative to the module URL.
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
    );
    expect(workerOptions.workerSrc).toBe('blob:pdf-worker');
  });

  it('is a singleton — concurrent and repeat calls fetch once', async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse);
    vi.stubGlobal('fetch', fetchMock);
    const ensurePdfWorker = await freshEnsure();

    await Promise.all([ensurePdfWorker(), ensurePdfWorker()]);
    await ensurePdfWorker();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects on a non-OK response and retries on the next call', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, text: () => Promise.resolve('') })
      .mockResolvedValue(okResponse);
    vi.stubGlobal('fetch', fetchMock);
    const ensurePdfWorker = await freshEnsure();

    await expect(ensurePdfWorker()).rejects.toThrow('404');
    await ensurePdfWorker();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(workerOptions.workerSrc).toBe('blob:pdf-worker');
  });
});
