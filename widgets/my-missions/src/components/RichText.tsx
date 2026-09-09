import * as React from 'react';
import { useSafeHtml } from '@perimeter/ui/hooks/use-safe-html';

/**
 * Render trusted-ish HTML from Ministry Platform (a campaign's long
 * description, a participant's saved letter).
 *
 * The legacy widget passed these straight to `dangerouslySetInnerHTML`. The
 * content is staff- and participant-authored rather than anonymous, but it is
 * still stored markup rendered inside someone else's page, so it goes through
 * the shared DOMPurify hook. `prose`-ish spacing is applied by hand: the
 * widget doesn't ship the typography plugin, and unstyled MP markup otherwise
 * renders as one undifferentiated block.
 */
export function RichText({ html }: { html: string | null }): React.JSX.Element | null {
  const safe = useSafeHtml(html);
  if (html === null || html.trim().length === 0) return null;

  return (
    <div
      className="text-fg [&_a]:text-primary [&_a]:underline [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:font-semibold [&_li]:mb-1 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5"
      dangerouslySetInnerHTML={safe}
    />
  );
}
