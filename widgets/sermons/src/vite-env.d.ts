/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Override API base URL (default: same-origin in dev, api.perimeter.org in prod) */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
