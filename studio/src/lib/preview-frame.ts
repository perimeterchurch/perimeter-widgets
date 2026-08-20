import { useEffect, useRef } from 'react';

/**
 * The blank same-origin document every preview iframe loads before its harness
 * HTML is written in (`studio/public/preview-frame.html`).
 *
 * Previously the previews passed their harness to the iframe's `srcdoc`
 * attribute. A srcdoc document has no URL of its own — it reports
 * `about:srcdoc`, so `location.hostname` is empty — and anything that verifies
 * the page's origin breaks inside such a frame. The visible casualty was Google
 * reCAPTCHA on the staff-contact widget: `grecaptcha.enterprise.execute()`
 * returned a short error token from the frame, which the API rejected as
 * `browser-error`, so the form could never be submitted from the studio no
 * matter how the key was configured.
 *
 * Loading a real URL from the studio's own origin gives the frame a real
 * hostname (verified: the same token minted in a real-URL frame passes, while
 * the srcdoc one fails), and it stays same-origin — so `parent.postMessage`,
 * shared `localStorage`, and MP sign-in all keep working.
 */
export const PREVIEW_FRAME_URL = '/preview-frame.html';

/**
 * Drive a preview iframe: attach the returned ref to an
 * `<iframe src={PREVIEW_FRAME_URL}>` and the harness `html` is written into the
 * frame once it loads, and re-run in a fresh document whenever it changes.
 *
 * Two things here are load-bearing:
 *
 * 1. **Write on `load`, never before.** A freshly created iframe exposes a
 *    transient `about:blank` document; anything written there is discarded when
 *    the real URL finishes loading, leaving a blank preview.
 * 2. **Re-navigate on change instead of just re-writing.** `document.open()`
 *    replaces the document but keeps the same *window*, so the widget loader's
 *    globals and its `document.body` MutationObserver survive from the previous
 *    harness and it never mounts into the new one — the preview goes blank
 *    (observed: the mount div appears with the new config, but no shadow root).
 *    Reloading the frame gives each harness a fresh window, which is what
 *    swapping `srcdoc` used to do.
 */
export function usePreviewFrame(html: string) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const loadedRef = useRef(false);
  const htmlRef = useRef(html);
  htmlRef.current = html;

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    function onLoad() {
      loadedRef.current = true;
      const doc = frame?.contentDocument;
      if (!doc) return;
      doc.open();
      doc.write(htmlRef.current);
      doc.close();
    }
    frame.addEventListener('load', onLoad);
    return () => frame.removeEventListener('load', onLoad);
  }, []);

  useEffect(() => {
    // The first harness is written by the load handler above; only a later change
    // needs to force a new document.
    if (!loadedRef.current) return;
    frameRef.current?.contentWindow?.location.replace(PREVIEW_FRAME_URL);
  }, [html]);

  return frameRef;
}
