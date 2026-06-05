import { globalTokens, darkTokens } from '@perimeter/theme';

function declBlock(selector: string, tokens: Record<string, string>): string {
  const decls = Object.entries(tokens)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join('\n');
  return `${selector} {\n${decls}\n}`;
}

/**
 * The global design tokens as a `:root` rule for the studio's LIGHT DOM, so the
 * studio chrome (built from @perimeter/ui) resolves `var(--color-*)`/`var(--radius-*)`.
 * The dark palette is emitted under `:root[data-theme="dark"]`, so the chrome theme
 * is a pure CSS-variable swap toggled by `data-theme` on `document.documentElement`
 * (see {@link useStudioTheme}).
 *
 * Widget + gallery PREVIEWS are unaffected — they receive tokens inside their shadow
 * root via mount()/ComponentStage, and the preview canvas has its own independent
 * `:host([data-theme="dark"])` toggle. This is chrome-only.
 */
export function rootTokenCss(): string {
  return `${declBlock(':root', globalTokens)}\n${declBlock(':root[data-theme="dark"]', darkTokens)}`;
}

/** Inject the token layer once into <head>. Idempotent. */
export function installRootTokens(doc: Document = document): void {
  if (doc.getElementById('studio-root-tokens')) return;
  const style = doc.createElement('style');
  style.id = 'studio-root-tokens';
  style.textContent = rootTokenCss();
  doc.head.appendChild(style);
}
