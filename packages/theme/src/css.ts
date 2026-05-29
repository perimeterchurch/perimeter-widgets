/**
 * Rewrite `:root` selectors to `:host` so any custom-property declarations
 * Tailwind/preflight emit under `:root` resolve inside a shadow root, where
 * `:root` matches the host document, not the shadow tree.
 */
export function rewriteRootToHost(css: string): string {
  return css.replace(/:root\b/g, ':host');
}
