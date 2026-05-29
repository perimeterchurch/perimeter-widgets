/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Override API base URL (default: same-origin in dev, api.perimeter.org in prod) */
  readonly VITE_API_URL?: string;
  /**
   * Override the pdf.js web-worker URL used by PdfViewer. `${version}` is
   * interpolated against pdfjs.version. Defaults to the unpkg CDN worker.
   */
  readonly VITE_PDFJS_WORKER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
