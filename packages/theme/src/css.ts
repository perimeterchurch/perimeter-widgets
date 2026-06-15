/**
 * Rewrite `:root` selectors to `:host` so any custom-property declarations
 * Tailwind/preflight emit under `:root` resolve inside a shadow root, where
 * `:root` matches the host document, not the shadow tree.
 */
export function rewriteRootToHost(css: string): string {
  return css.replace(/:root\b/g, ':host');
}

const PROPERTY_RULE_RE = /@property\s+(--[\w-]+)\s*\{([^}]*)\}/g;
const INITIAL_VALUE_RE = /initial-value\s*:\s*([^;}]+)/;
const SYNTAX_RE = /syntax\s*:\s*"([^"]*)"/;

/**
 * Minifiers collapse `0px` to `0` inside initial-value. Real @property
 * registration re-normalizes through the typed syntax, but a plain custom
 * property substitutes the raw token — and `calc(1px + 0)` is invalid CSS,
 * which is exactly how `--tw-ring-offset-width:0` silently killed every
 * ring/shadow composite. Untyped (`syntax:"*"`) properties store textually
 * under real registration too, so their bare zeros stay as-is.
 */
function restoreZeroUnit(value: string, syntax: string): string {
  if (value !== '0') return value;
  if (syntax.includes('<length')) return '0px';
  if (syntax.includes('<time')) return '0s';
  if (syntax.includes('<angle')) return '0deg';
  return value;
}

/**
 * Make Tailwind v4's registered custom properties effective inside a shadow
 * root. Browsers process `@property` rules only in DOCUMENT stylesheets — in
 * a shadow root's (constructable or <style>) sheet they are inert, so the
 * `--tw-*` variables that border/ring/shadow/transition utilities depend on
 * never get their initial values and those declarations collapse (invalid at
 * computed-value time). The studio masks this because its own page-level
 * Tailwind CSS registers the same properties globally; bare host pages
 * (WordPress, the embed lab) do not.
 *
 * The fix mirrors Tailwind's own no-@property browser fallback: one
 * universal rule assigning every registered initial value, emitted inside
 * `@layer properties` and PREPENDED so `properties` is the first declared
 * layer — it loses to theme/base/components/utilities and to every utility
 * that sets a `--tw-*` value, exactly like real registration. Zero
 * specificity, zero document mutation, no CSP surface.
 */
export function inlinePropertyFallbacks(css: string): string {
  const declarations: string[] = [];
  for (const match of css.matchAll(PROPERTY_RULE_RE)) {
    const body = match[2]!;
    const initial = INITIAL_VALUE_RE.exec(body);
    if (!initial) continue;
    const syntax = SYNTAX_RE.exec(body)?.[1] ?? '*';
    declarations.push(`${match[1]}:${restoreZeroUnit(initial[1]!.trim(), syntax)}`);
  }
  if (declarations.length === 0) return css;
  return `@layer properties{*,::before,::after,::backdrop{${declarations.join(';')};}}${css}`;
}
