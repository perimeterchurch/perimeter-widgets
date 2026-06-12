/**
 * The widget's own immutable base URL (".../sermons/<version>/"), captured at
 * IIFE evaluation time from the <script> tag that loaded it. Every module's
 * top-level code in the bundle runs synchronously during script evaluation
 * (the build inlines dynamic imports), so `document.currentScript` still
 * points at our tag here. Null in the studio/dev, where the widget loads as
 * an ES module and `currentScript` is never set.
 */
export const scriptBase: string | null = (() => {
  const script = document.currentScript;
  return script instanceof HTMLScriptElement && script.src
    ? script.src.slice(0, script.src.lastIndexOf('/') + 1)
    : null;
})();
