import { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  PanelLeftOpen,
  PanelLeftClose,
  Maximize,
  Columns2,
} from 'lucide-react';
import { Button } from '@perimeter/ui/button';
import { Spinner } from '@perimeter/ui/spinner';
import { proxyS3Url } from '../../lib/format';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?raw';

// Inline the pdf.js worker into the IIFE bundle to avoid a runtime dependency
// on unpkg.com and to satisfy strict CSP script-src rules. A blob URL is
// created once at module init and assigned to workerSrc; pdf.js spawns a Worker
// from it for all document loads.
pdfjs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(
  new Blob([pdfWorkerSrc], { type: 'application/javascript' }),
);

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SCALE_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5] as const;
const SCALE_LABELS: Record<number, string> = {
  0.5: '50%',
  0.75: '75%',
  1.0: '100%',
  1.25: '125%',
  1.5: '150%',
};
const MIN_SCALE = 0.25;
const MAX_SCALE = 3.0;
const SCALE_STEP = 0.25;
const THUMBNAIL_WIDTH = 120;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PdfViewer({ url: rawUrl }: { url: string }) {
  const url = proxyS3Url(rawUrl);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [pageInputValue, setPageInputValue] = useState('1');

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const thumbnailRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  /* ---- Document load ---- */

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setCurrentPage(1);
    setPageInputValue('1');
  }, []);

  /* ---- Page navigation ---- */

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(numPages, page));
      setCurrentPage(clamped);
      setPageInputValue(String(clamped));
    },
    [numPages],
  );

  const goToPrevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const goToNextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const handlePageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(e.target.value);
  }, []);

  const handlePageInputCommit = useCallback(() => {
    const parsed = parseInt(pageInputValue, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= numPages) {
      goToPage(parsed);
    } else {
      setPageInputValue(String(currentPage));
    }
  }, [pageInputValue, numPages, currentPage, goToPage]);

  const handlePageInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handlePageInputCommit();
      }
    },
    [handlePageInputCommit],
  );

  /* ---- Zoom ---- */

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(MAX_SCALE, s + SCALE_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(MIN_SCALE, s - SCALE_STEP));
  }, []);

  const handleScaleSelect = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setScale(Number(e.target.value));
  }, []);

  const fitWidth = useCallback(() => {
    if (!containerRef.current) return;
    // Approximate: PDF default width is ~612pt (US Letter)
    const containerWidth = containerRef.current.clientWidth - 48; // padding
    const pdfDefaultWidth = 612;
    setScale(containerWidth / pdfDefaultWidth);
  }, []);

  const fitPage = useCallback(() => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth - 48;
    const containerHeight = containerRef.current.clientHeight - 48;
    const pdfDefaultWidth = 612;
    const pdfDefaultHeight = 792;
    const scaleW = containerWidth / pdfDefaultWidth;
    const scaleH = containerHeight / pdfDefaultHeight;
    setScale(Math.min(scaleW, scaleH));
  }, []);

  /* ---- Scroll active thumbnail into view ---- */

  useEffect(() => {
    if (showThumbnails) {
      const el = thumbnailRefs.current.get(currentPage);
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentPage, showThumbnails]);

  /* ---- Render ---- */

  return (
    <div className="flex h-full w-full flex-col">
      {/* Controls bar */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-stone-200 bg-stone-100 px-3 py-1.5 dark:border-stone-700 dark:bg-stone-800">
        {/* Left: thumbnail toggle */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowThumbnails((v) => !v)}
          className="h-8 w-8 p-0"
          aria-label={showThumbnails ? 'Hide thumbnails' : 'Show thumbnails'}
        >
          {showThumbnails ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </Button>

        {/* Center: page navigation */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            className="h-8 w-8 p-0"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 text-xs text-stone-700 dark:text-stone-300">
            <span className="sr-only">Page</span>
            <input
              type="text"
              inputMode="numeric"
              value={pageInputValue}
              onChange={handlePageInputChange}
              onBlur={handlePageInputCommit}
              onKeyDown={handlePageInputKeyDown}
              className="h-7 w-10 rounded border border-stone-300 bg-white text-center text-xs tabular-nums dark:border-stone-600 dark:bg-stone-700"
              aria-label="Current page"
            />
            <span>/</span>
            <span className="tabular-nums">{numPages}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            className="h-8 w-8 p-0"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Right: zoom controls */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            disabled={scale <= MIN_SCALE}
            className="h-8 w-8 p-0"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <select
            value={SCALE_PRESETS.includes(scale as (typeof SCALE_PRESETS)[number]) ? scale : ''}
            onChange={handleScaleSelect}
            className="h-7 rounded border border-stone-300 bg-white px-1 text-xs dark:border-stone-600 dark:bg-stone-700 dark:text-stone-300"
            aria-label="Zoom level"
          >
            {!SCALE_PRESETS.includes(scale as (typeof SCALE_PRESETS)[number]) && (
              <option value={scale}>{Math.round(scale * 100)}%</option>
            )}
            {SCALE_PRESETS.map((s) => (
              <option key={s} value={s}>
                {SCALE_LABELS[s]}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            disabled={scale >= MAX_SCALE}
            className="h-8 w-8 p-0"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="ml-1 h-5 w-px bg-stone-300 dark:bg-stone-600" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={fitWidth}
            className="h-8 w-8 p-0"
            aria-label="Fit width"
          >
            <Columns2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={fitPage}
            className="h-8 w-8 p-0"
            aria-label="Fit page"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content area: optional sidebar + PDF page */}
      <div className="flex min-h-0 flex-1">
        {/* Thumbnail sidebar */}
        {showThumbnails && (
          <div className="flex w-[160px] shrink-0 flex-col overflow-y-auto border-r border-stone-200 bg-stone-50 p-3 dark:border-stone-700 dark:bg-stone-900">
            <Document file={url} loading={null}>
              {Array.from({ length: numPages }, (_, i) => {
                const pageNum = i + 1;
                const isActive = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    ref={(el) => {
                      if (el) {
                        thumbnailRefs.current.set(pageNum, el);
                      } else {
                        thumbnailRefs.current.delete(pageNum);
                      }
                    }}
                    type="button"
                    onClick={() => goToPage(pageNum)}
                    className={`mb-2 flex flex-col items-center rounded p-1 transition-colors ${
                      isActive
                        ? 'ring-2 ring-primary'
                        : 'hover:bg-stone-200 dark:hover:bg-stone-800'
                    }`}
                    aria-label={`Go to page ${pageNum}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Page
                      pageNumber={pageNum}
                      width={THUMBNAIL_WIDTH}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                    <span className="mt-1 text-[10px] text-stone-500 dark:text-stone-400">
                      {pageNum}
                    </span>
                  </button>
                );
              })}
            </Document>
          </div>
        )}

        {/* Main PDF view */}
        <div ref={containerRef} className="flex min-h-0 flex-1 overflow-auto">
          <div ref={pageRef} className="mx-auto p-6">
            <Document
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex h-full w-full items-center justify-center">
                  <Spinner className="size-8" aria-label="Loading PDF" />
                </div>
              }
              error={
                <div className="flex h-full w-full items-center justify-center text-sm text-stone-500">
                  Failed to load PDF
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />
            </Document>
          </div>
        </div>
      </div>
    </div>
  );
}
