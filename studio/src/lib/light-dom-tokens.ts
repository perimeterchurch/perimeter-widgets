import { globalTokens } from '@perimeter/theme';

/**
 * The global design tokens as a `:root` rule for the studio's LIGHT DOM, so the
 * studio chrome (built from @perimeter/ui) resolves `var(--color-*)`/`var(--radius-*)`.
 * Widget + gallery PREVIEWS are unaffected — they receive tokens inside their shadow
 * root via mount()/ComponentStage. This is chrome-only.
 */
export function rootTokenCss(): string {
  const decls = Object.entries(globalTokens)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join('\n');
  return `:root {\n${decls}\n}`;
}

/** Inject the token layer once into <head>. Idempotent. */
export function installRootTokens(doc: Document = document): void {
  if (doc.getElementById('studio-root-tokens')) return;
  const style = doc.createElement('style');
  style.id = 'studio-root-tokens';
  style.textContent = rootTokenCss();
  doc.head.appendChild(style);
}
