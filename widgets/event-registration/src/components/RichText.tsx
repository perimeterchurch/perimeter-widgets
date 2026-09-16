import * as React from 'react';
import { useSafeHtml } from '@perimeter/ui/hooks/use-safe-html';

/**
 * Staff-authored HTML from Ministry Platform (event description, meeting
 * instructions, section `Enable_Label` / `Instructions`, product and form
 * text). Always through DOMPurify — it is stored markup rendered inside
 * someone else's page — with hand-applied prose spacing because the widget
 * ships no typography plugin.
 */
export function RichText({
  html,
  className = '',
}: {
  html: string | null | undefined;
  className?: string;
}): React.JSX.Element | null {
  const safe = useSafeHtml(html);
  if (!html || html.trim().length === 0) return null;

  return (
    <div
      className={`text-fg [&_a]:text-primary [&_a]:underline [&_b]:font-semibold [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:font-semibold [&_li]:mb-1 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 ${className}`}
      dangerouslySetInnerHTML={safe}
    />
  );
}
