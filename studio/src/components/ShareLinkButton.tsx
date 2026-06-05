import { useState } from 'react';
import { Button } from '@perimeter/ui/button';

interface Props {
  /** Builds the shareable deep link for the current page at copy time (so it
   *  captures the freshest preview state, not a stale render-time snapshot). */
  copyUrl: () => string;
  /** Href for the full-bleed standalone /preview/:slug route, opened in a new tab. */
  standaloneUrl: string;
}

/**
 * Header control pair for the widget preview: "Copy link" writes a deep link
 * carrying the current preview state (config + tokens + theme + viewport) to the
 * clipboard, and "Open standalone" opens the full-bleed /preview/:slug route in a
 * new tab. Mirrors the embed-snippet copy affordance (transient "Copied" label).
 */
export function ShareLinkButton({ copyUrl, standaloneUrl }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard?.writeText(copyUrl()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        {copied ? 'Copied' : 'Copy link'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={
          <a href={standaloneUrl} target="_blank" rel="noreferrer">
            Open standalone
          </a>
        }
      />
    </div>
  );
}
