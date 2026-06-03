/// <reference types="vite/client" />

// @types/mdx provides `mdx/types` but does NOT declare `*.mdx` modules, so this
// shim is required for TS to accept `import Doc from './x.mdx'`.
declare module '*.mdx' {
  import type { ComponentType } from 'react';
  const C: ComponentType;
  export default C;
}
