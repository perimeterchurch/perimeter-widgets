import { inlinePropertyFallbacks, rewriteRootToHost } from '@perimeter/theme';

export interface StyleHandle {
  /** Replace the per-instance token layer (studio live theme edits). */
  update(tokenCss: string): void;
  /** Remove all applied styles from the shadow root. */
  dispose(): void;
}

const widgetSheets = new Map<string, CSSStyleSheet>();

function supportsConstructable(): boolean {
  return (
    typeof CSSStyleSheet !== 'undefined' &&
    typeof CSSStyleSheet.prototype.replaceSync === 'function' &&
    typeof Document !== 'undefined' &&
    'adoptedStyleSheets' in Document.prototype
  );
}

/**
 * Inject the widget's compiled CSS (shared, one parse per name) and a
 * per-instance token sheet into a shadow root. Uses constructable
 * stylesheets when available, else two <style> elements.
 */
export function applyStyles(
  shadow: ShadowRoot,
  widgetName: string,
  widgetCss: string,
  tokenCss: string,
): StyleHandle {
  // Shadow sheets ignore @property registration; inline the initial values
  // (see inlinePropertyFallbacks) or border/ring/shadow utilities collapse on
  // any host page that doesn't itself register Tailwind's --tw-* properties.
  const rewritten = inlinePropertyFallbacks(rewriteRootToHost(widgetCss));

  if (supportsConstructable()) {
    let widgetSheet = widgetSheets.get(widgetName);
    if (!widgetSheet) {
      widgetSheet = new CSSStyleSheet();
      widgetSheet.replaceSync(rewritten);
      widgetSheets.set(widgetName, widgetSheet);
    }
    const tokenSheet = new CSSStyleSheet();
    tokenSheet.replaceSync(tokenCss);
    shadow.adoptedStyleSheets = [widgetSheet, tokenSheet];
    return {
      update(next) {
        const t = new CSSStyleSheet();
        t.replaceSync(next);
        shadow.adoptedStyleSheets = [widgetSheet, t];
      },
      dispose() {
        shadow.adoptedStyleSheets = [];
      },
    };
  }

  const widgetStyle = document.createElement('style');
  widgetStyle.setAttribute('data-perimeter-widget-css', '');
  widgetStyle.textContent = rewritten;
  const tokenStyle = document.createElement('style');
  tokenStyle.setAttribute('data-perimeter-tokens', '');
  tokenStyle.textContent = tokenCss;
  shadow.append(widgetStyle, tokenStyle);
  return {
    update(next) {
      tokenStyle.textContent = next;
    },
    dispose() {
      widgetStyle.remove();
      tokenStyle.remove();
    },
  };
}

/** Count applied style layers regardless of mode. Test + introspection helper. */
export function countAppliedSheets(shadow: ShadowRoot): number {
  if (shadow.adoptedStyleSheets && shadow.adoptedStyleSheets.length > 0) {
    return shadow.adoptedStyleSheets.length;
  }
  return shadow.querySelectorAll('style[data-perimeter-widget-css], style[data-perimeter-tokens]')
    .length;
}

/** Test helper — drop the shared-sheet cache between tests. */
export function clearStyleCache(): void {
  widgetSheets.clear();
}
