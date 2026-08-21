import { useEffect, useRef, useState, type RefObject } from 'react';

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

/** How long to keep looking for the frame's document before giving up. */
const WRITE_TIMEOUT_MS = 10_000;
const WRITE_POLL_MS = 50;

/**
 * Drive a preview iframe: attach the returned ref to an
 * `<iframe src={PREVIEW_FRAME_URL}>` and the harness `html` is written into the
 * frame's real document, re-run in a fresh document whenever it changes.
 *
 * Three things here are load-bearing, each one a bug that shipped:
 *
 * 1. **Never write into `about:blank`.** An iframe exposes a transient
 *    `about:blank` document until its `src` finishes loading, and Safari fires
 *    `load` for that document too. Writing there is worse than useless: the real
 *    navigation replaces the document a moment later and the preview goes blank.
 *    Chrome does not fire that event, which is why this looked fine there and
 *    broke every widget preview in Safari.
 * 2. **Never depend on the `load` event alone.** The frame can finish loading
 *    (small static file, warm cache) before this effect runs, so `load` has
 *    already fired and never comes again — nothing is written and the preview
 *    stays blank. A bounded poll covers that; the listener stays attached so a
 *    later navigation still re-writes.
 * 3. **Re-navigate on change instead of just re-writing.** `document.open()`
 *    replaces the document but keeps the same *window*, so the widget loader's
 *    globals and its `document.body` MutationObserver survive from the previous
 *    harness and it never mounts into the new one — the mount div appears with
 *    the new config but has no shadow root. Each harness therefore gets its own
 *    `src` (a bumped `?n=` nonce) so the browser navigates into a fresh window —
 *    which is what swapping `srcdoc` used to do.
 */
export function usePreviewFrame(html: string): {
  ref: RefObject<HTMLIFrameElement | null>;
  src: string;
} {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  // The document each harness was written into, so the poll writes once per
  // document and never re-writes the harness the frame is already running.
  const writtenDocRef = useRef<Document | null>(null);
  const htmlRef = useRef(html);
  htmlRef.current = html;

  // Navigation is declarative: a new harness gets a new `src`, React sets the
  // attribute, and the browser performs a real navigation into a fresh window.
  // Driving it imperatively through `contentWindow.location.replace()` also
  // works in a browser but reaches across documents for no benefit.
  const [src, setSrc] = useState(PREVIEW_FRAME_URL);
  const navigationsRef = useRef(0);
  const firstRef = useRef(true);

  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false; // the initial `src` already loads the frame
      return;
    }
    navigationsRef.current += 1;
    setSrc(`${PREVIEW_FRAME_URL}?n=${navigationsRef.current}`);
  }, [html]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let cancelled = false;
    let pollId = 0;
    let waited = 0;

    function writeHarness(): boolean {
      if (cancelled || !frame) return false;
      const win = frame.contentWindow;
      const doc = frame.contentDocument;
      if (!win || !doc || doc === writtenDocRef.current) return false;
      let href: string;
      try {
        href = win.location.href;
      } catch {
        return false; // mid-navigation; try again on the next tick
      }
      if (!href || href === 'about:blank') return false;
      doc.open();
      doc.write(htmlRef.current);
      doc.close();
      writtenDocRef.current = doc;
      return true;
    }

    function attempt() {
      if (writeHarness() || (waited += WRITE_POLL_MS) > WRITE_TIMEOUT_MS) {
        window.clearInterval(pollId);
      }
    }

    frame.addEventListener('load', attempt);
    pollId = window.setInterval(attempt, WRITE_POLL_MS);
    attempt();

    return () => {
      cancelled = true;
      frame.removeEventListener('load', attempt);
      window.clearInterval(pollId);
    };
  }, [html, src]);

  return { ref: frameRef, src };
}
