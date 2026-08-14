export interface GrecaptchaV3 {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, opts: { action: string }) => Promise<string>;
}

declare global {
  interface Window {
    grecaptcha?: GrecaptchaV3;
  }
}

const SCRIPT_ID = 'perimeter-recaptcha-api';
const BADGE_STYLE_ID = 'perimeter-recaptcha-badge-style';
const LOAD_TIMEOUT_MS = 15000;

let loadPromise: Promise<GrecaptchaV3> | null = null;

/**
 * Hide the floating reCAPTCHA v3 badge. It's a light-DOM element Google appends
 * to `document.body`, so it can't be styled from inside the widget's shadow
 * root — inject a one-time light-DOM style instead. Google's terms allow hiding
 * the badge as long as the reCAPTCHA attribution is shown in the form, which the
 * widget does next to the submit button.
 */
function hideBadge(): void {
  if (typeof document === 'undefined' || document.getElementById(BADGE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = BADGE_STYLE_ID;
  style.textContent = '.grecaptcha-badge{visibility:hidden!important;}';
  document.head.appendChild(style);
}

/**
 * Load Google's reCAPTCHA **v3** API for a site key and resolve with the ready
 * `grecaptcha` object. v3 is invisible — it renders no widget, so unlike v2 it
 * works from inside the shadow root: we only ever call `execute()` to mint a
 * token. The script is loaded once into the host document `<head>`.
 */
export function loadRecaptchaV3(siteKey: string): Promise<GrecaptchaV3> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('reCAPTCHA requires a browser environment'));
  }
  if (!siteKey) return Promise.reject(new Error('Missing reCAPTCHA site key'));
  if (window.grecaptcha?.execute) return Promise.resolve(window.grecaptcha);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<GrecaptchaV3>((resolve, reject) => {
    hideBadge();
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        loadPromise = null;
        reject(new Error('Failed to load reCAPTCHA'));
      };
      document.head.appendChild(script);
    }

    const start = Date.now();
    const timer = window.setInterval(() => {
      if (window.grecaptcha?.execute) {
        window.clearInterval(timer);
        resolve(window.grecaptcha);
      } else if (Date.now() - start > LOAD_TIMEOUT_MS) {
        window.clearInterval(timer);
        loadPromise = null;
        reject(new Error('reCAPTCHA load timed out'));
      }
    }, 100);
  });

  return loadPromise;
}

/**
 * Mint a reCAPTCHA v3 token for an action, to send with the form submission.
 * Verified server-side (success + score) before the message is created.
 */
export function getRecaptchaToken(siteKey: string, action: string): Promise<string> {
  return loadRecaptchaV3(siteKey).then(
    (grecaptcha) =>
      new Promise<string>((resolve, reject) => {
        grecaptcha.ready(() => {
          grecaptcha.execute(siteKey, { action }).then(resolve, reject);
        });
      }),
  );
}
