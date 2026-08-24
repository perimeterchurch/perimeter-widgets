/**
 * reCAPTCHA **Enterprise** (score-based) client. Perimeter's key is an
 * Enterprise key, which MUST be driven by `enterprise.js` +
 * `grecaptcha.enterprise.execute()`. Loading the classic `api.js` +
 * `grecaptcha.execute()` against an Enterprise key mints tokens that Google's
 * verification rejects with `browser-error` (never scored) — so the standard v3
 * snippet silently fails every submission. The server still verifies the token
 * via the legacy `siteverify` endpoint with the key's legacy secret.
 */
export interface RecaptchaEnterprise {
  ready: (cb: () => void) => void;
  execute: (siteKey: string, opts: { action: string }) => Promise<string>;
}

interface Grecaptcha {
  enterprise?: RecaptchaEnterprise;
}

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

const SCRIPT_ID = 'perimeter-recaptcha-enterprise';
const BADGE_STYLE_ID = 'perimeter-recaptcha-badge-style';
const LOAD_TIMEOUT_MS = 15000;

let loadPromise: Promise<RecaptchaEnterprise> | null = null;

/**
 * Hide the floating reCAPTCHA badge. It's a light-DOM element Google appends to
 * `document.body`, so it can't be styled from inside the widget's shadow root —
 * inject a one-time light-DOM style instead. Google's terms allow hiding the
 * badge as long as the reCAPTCHA attribution is shown in the form, which the
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
 * Load Google's reCAPTCHA **Enterprise** API for a site key and resolve with the
 * ready `grecaptcha.enterprise` object. Score-based Enterprise is invisible — it
 * renders no widget, so unlike the v2 checkbox it works from inside the shadow
 * root: we only ever call `execute()` to mint a token. The script is loaded once
 * into the host document `<head>`.
 */
export function loadRecaptchaV3(siteKey: string): Promise<RecaptchaEnterprise> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('reCAPTCHA requires a browser environment'));
  }
  if (!siteKey) return Promise.reject(new Error('Missing reCAPTCHA site key'));
  if (window.grecaptcha?.enterprise?.execute) {
    return Promise.resolve(window.grecaptcha.enterprise);
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<RecaptchaEnterprise>((resolve, reject) => {
    hideBadge();
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(siteKey)}`;
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
      if (window.grecaptcha?.enterprise?.execute) {
        window.clearInterval(timer);
        resolve(window.grecaptcha.enterprise);
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
 * Mint a reCAPTCHA Enterprise token for an action, to send with the form
 * submission. Verified server-side (success + score) before the message is
 * created.
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
