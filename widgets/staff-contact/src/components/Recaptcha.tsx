import * as React from 'react';
import { loadRecaptchaApi } from '../lib/recaptcha';

export interface RecaptchaHandle {
  /** Clear the current challenge response (call after a successful submit). */
  reset: () => void;
}

interface RecaptchaProps {
  siteKey: string;
  /** Fires with the token when solved, or `null` when cleared/expired/errored. */
  onChange: (token: string | null) => void;
}

/**
 * Renders a Google reCAPTCHA v2 "I'm not a robot" checkbox inside the widget's
 * shadow root. Uses explicit rendering against the element reference — passing
 * the element (not an id) is what lets it work inside a shadow DOM.
 */
export const Recaptcha = React.forwardRef<RecaptchaHandle, RecaptchaProps>(function Recaptcha(
  { siteKey, onChange },
  ref,
) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const widgetIdRef = React.useRef<number | null>(null);
  const [failed, setFailed] = React.useState(false);

  // Keep the latest onChange without re-running the render effect.
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  React.useImperativeHandle(
    ref,
    () => ({
      reset: () => {
        if (widgetIdRef.current !== null) {
          window.grecaptcha?.reset(widgetIdRef.current);
          onChangeRef.current(null);
        }
      },
    }),
    [],
  );

  React.useEffect(() => {
    let cancelled = false;

    loadRecaptchaApi()
      .then((grecaptcha) => {
        if (cancelled || !containerRef.current) return;
        // Guard against a second render into the same element (React strict
        // mode re-invokes effects; grecaptcha throws on a double render).
        if (widgetIdRef.current !== null) return;
        widgetIdRef.current = grecaptcha.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onChangeRef.current(token),
          'expired-callback': () => onChangeRef.current(null),
          'error-callback': () => onChangeRef.current(null),
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [siteKey]);

  if (failed) {
    return (
      <p className="text-sm text-destructive">
        Could not load the verification challenge. Please refresh and try again.
      </p>
    );
  }

  return <div ref={containerRef} data-testid="recaptcha" />;
});
