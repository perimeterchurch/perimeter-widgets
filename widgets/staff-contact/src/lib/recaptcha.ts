export interface GrecaptchaRenderParams {
  sitekey: string;
  callback?: (token: string) => void;
  'expired-callback'?: () => void;
  'error-callback'?: () => void;
  theme?: 'light' | 'dark';
  size?: 'normal' | 'compact';
}

export interface Grecaptcha {
  render: (container: HTMLElement, params: GrecaptchaRenderParams) => number;
  reset: (widgetId?: number) => void;
  getResponse: (widgetId?: number) => string;
}

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

const SCRIPT_ID = 'perimeter-recaptcha-api';
// `render=explicit` — the widget lives in a shadow root, so Google's automatic
// scan for `.g-recaptcha` elements in the document can't find it; we render
// explicitly against the element reference instead.
const SCRIPT_SRC = 'https://www.google.com/recaptcha/api.js?render=explicit';
const LOAD_TIMEOUT_MS = 15000;

let loadPromise: Promise<Grecaptcha> | null = null;

/**
 * Load Google's reCAPTCHA v2 API script once and resolve with the ready
 * `grecaptcha` object. Injects the script into the host document `<head>` (the
 * shadow root can't host it) and polls until `grecaptcha.render` is available.
 */
export function loadRecaptchaApi(): Promise<Grecaptcha> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('reCAPTCHA requires a browser environment'));
  }
  if (window.grecaptcha?.render) return Promise.resolve(window.grecaptcha);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<Grecaptcha>((resolve, reject) => {
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
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
      if (window.grecaptcha?.render) {
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
