/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { useEffect, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// jsdom doesn't implement Element.scrollIntoView; the thumbnail effect calls
// it whenever the panel opens or the active page changes.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// The pdf.js worker source is bundled via ?raw (a Vite build feature).
// Vitest returns an empty string for raw imports; mock it explicitly so
// URL.createObjectURL (also mocked below) receives a predictable value.
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?raw', () => ({ default: '' }));

// Mock react-pdf before the component imports it. The mock fires
// onLoadSuccess synchronously with a fixed page count so tests can drive
// the toolbar without going near a real PDF or worker.
vi.mock('react-pdf', () => {
  // The component renders TWO Documents — main view + thumbnails sidebar.
  // Only the main view passes onLoadSuccess; the sidebar one doesn't.
  const Document = ({
    file,
    onLoadSuccess,
    children,
  }: {
    file: string;
    onLoadSuccess?: (info: { numPages: number }) => void;
    children: ReactNode;
  }) => {
    useEffect(() => {
      onLoadSuccess?.({ numPages: 5 });
    }, [onLoadSuccess]);
    return (
      <div data-testid="pdf-document" data-file={file}>
        {children}
      </div>
    );
  };
  const Page = ({
    pageNumber,
    scale,
    onLoadSuccess,
  }: {
    pageNumber: number;
    scale?: number;
    onLoadSuccess?: (page: { originalWidth: number; originalHeight: number }) => void;
  }) => {
    useEffect(() => {
      // Report a non-US-Letter (A4-ish landscape) natural size so tests can
      // prove the viewer derives fit-scale from REAL page dimensions.
      onLoadSuccess?.({ originalWidth: 1000, originalHeight: 500 });
    }, [onLoadSuccess]);
    return (
      <div data-testid={`pdf-page-${pageNumber}`} data-scale={scale}>
        page {pageNumber}
      </div>
    );
  };
  return {
    Document,
    Page,
    pdfjs: {
      version: '5.0.0',
      GlobalWorkerOptions: { workerSrc: '' },
    },
  };
});

vi.mock('react-pdf/dist/Page/AnnotationLayer.css', () => ({}));
vi.mock('react-pdf/dist/Page/TextLayer.css', () => ({}));

import { PdfViewer } from '../../../src/components/players/PdfViewer';

const TEST_URL = 'https://example.com/sermon.pdf';

function renderViewer(url = TEST_URL) {
  return render(<PdfViewer url={url} />);
}

describe('PdfViewer', () => {
  it('passes the URL through to react-pdf Document', () => {
    renderViewer();
    expect(screen.getByTestId('pdf-document')).toHaveAttribute('data-file', TEST_URL);
  });

  it('initializes on page 1 and shows the page count', () => {
    renderViewer();
    const pageInput = screen.getByLabelText<HTMLInputElement>('Current page');
    expect(pageInput.value).toBe('1');
    // numPages is rendered as text in the toolbar
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('disables Previous on page 1 and Next on the last page', async () => {
    renderViewer();
    const prev = screen.getByLabelText('Previous page');
    const next = screen.getByLabelText('Next page');
    expect(prev).toBeDisabled();
    expect(next).not.toBeDisabled();

    // Advance to last page
    const pageInput = screen.getByLabelText<HTMLInputElement>('Current page');
    await userEvent.clear(pageInput);
    await userEvent.type(pageInput, '5{Enter}');
    expect(prev).not.toBeDisabled();
    expect(next).toBeDisabled();
  });

  it('Next/Previous step the current page', async () => {
    renderViewer();
    const next = screen.getByLabelText('Next page');
    const pageInput = screen.getByLabelText<HTMLInputElement>('Current page');

    await userEvent.click(next);
    expect(pageInput.value).toBe('2');
    await userEvent.click(next);
    expect(pageInput.value).toBe('3');

    const prev = screen.getByLabelText('Previous page');
    await userEvent.click(prev);
    expect(pageInput.value).toBe('2');
  });

  it('rejects out-of-range page input on commit (reverts to current page)', async () => {
    renderViewer();
    const pageInput = screen.getByLabelText<HTMLInputElement>('Current page');

    await userEvent.clear(pageInput);
    await userEvent.type(pageInput, '99{Enter}');
    // Was on page 1; invalid input rolls the input value back.
    expect(pageInput.value).toBe('1');

    await userEvent.clear(pageInput);
    await userEvent.type(pageInput, 'abc{Enter}');
    expect(pageInput.value).toBe('1');
  });

  it('zoom out is disabled at MIN_SCALE; zoom in clamps at MAX_SCALE', async () => {
    renderViewer();
    const zoomIn = screen.getByLabelText('Zoom in');
    const zoomOut = screen.getByLabelText('Zoom out');

    // Default scale 1.0 — neither button disabled
    expect(zoomIn).not.toBeDisabled();
    expect(zoomOut).not.toBeDisabled();

    // SCALE_STEP = 0.25; MIN_SCALE = 0.25.
    // From 1.0 → click out 3× to land at 0.25 (the floor).
    await userEvent.click(zoomOut);
    await userEvent.click(zoomOut);
    await userEvent.click(zoomOut);
    expect(zoomOut).toBeDisabled();

    // SCALE_STEP = 0.25; MAX_SCALE = 3.0.
    // From 0.25 we need 11 increments to reach 3.0 (the ceiling).
    for (let i = 0; i < 11; i++) {
      await userEvent.click(zoomIn);
    }
    expect(zoomIn).toBeDisabled();
  });

  it('toggles thumbnails panel via the toolbar button', async () => {
    renderViewer();
    const toggle = screen.getByLabelText('Show thumbnails');
    await userEvent.click(toggle);
    // After opening, the same button is now labelled "Hide thumbnails"
    expect(screen.getByLabelText('Hide thumbnails')).toBeInTheDocument();
    expect(screen.queryByLabelText('Show thumbnails')).toBeNull();
  });

  it('fits width using the loaded page real dimensions, not the US-Letter constant', async () => {
    const { container } = renderViewer();
    // Give the scroll container a known width; jsdom reports 0 otherwise.
    const scroll = container.querySelector('.overflow-auto') as HTMLElement;
    Object.defineProperty(scroll, 'clientWidth', { value: 1048, configurable: true });

    await userEvent.click(screen.getByLabelText('Fit width'));

    // (1048 - 48 padding) / 1000 real width = 1.0 — NOT 1000/612 (the old constant).
    const page = screen.getByTestId('pdf-page-1');
    expect(Number(page.getAttribute('data-scale'))).toBeCloseTo(1.0, 2);
  });

  // Theme contract: the viewer CHROME (toolbar, inputs) must read from design
  // tokens so the data-theme swap on the shadow host themes it. The PDF page
  // canvas itself is the document's own (light) media surface — out of scope.
  it('renders its chrome from design tokens, not hardcoded grays', () => {
    const { container } = renderViewer();
    // The page-number input is representative toolbar chrome.
    const pageInput = screen.getByLabelText<HTMLInputElement>('Current page');
    expect(pageInput.className).toContain('bg-bg');
    expect(pageInput.className).toContain('border-border');

    // No widget-chrome element should carry a hardcoded gray-family palette
    // class. (bg-black/text-white live only in the always-dark VideoPlayer
    // media stage, which is a different component.)
    const html = container.innerHTML;
    expect(html).not.toMatch(/\b(?:bg|text|border|ring)-(?:gray|slate|zinc|neutral|stone)-\d/);
  });
});
