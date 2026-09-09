/// <reference types="vite/client" />
declare const __PERIMETER_WIDGET_VERSION__: string;

interface ImportMetaEnv {
  /** Dev-only perimeter-api origin, so `<img>` URLs resolve to :5500. */
  readonly VITE_API_URL?: string;
}
