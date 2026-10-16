import DOMPurify from 'dompurify';
import { useMemo } from 'react';

export interface SafeHtmlOptions {
  /**
   * Every anchor with an href gets `target="_blank" rel="noopener noreferrer"`.
   * DOMPurify drops `target` by default (tabnabbing), so staff who write
   * `target="_blank"` in MP lose it unless the widget asks for this. Use it
   * where a link must not navigate the host page away, such as a form the
   * visitor is in the middle of (event-registration, 2026-10-15).
   */
  linksInNewTab?: boolean;
}

// One hook on the shared DOMPurify instance; it acts only while a call
// that asked for new-tab links is sanitizing (sanitize is synchronous).
let forcingNewTab = false;
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (!forcingNewTab) return;
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

export function sanitizeHtml(
  html: string | null | undefined,
  options: SafeHtmlOptions = {},
): string {
  if (!options.linksInNewTab) return DOMPurify.sanitize(html ?? '');
  forcingNewTab = true;
  try {
    return DOMPurify.sanitize(html ?? '', { ADD_ATTR: ['target'] });
  } finally {
    forcingNewTab = false;
  }
}

export function useSafeHtml(
  html: string | null | undefined,
  options: SafeHtmlOptions = {},
): {
  __html: string;
} {
  const linksInNewTab = options.linksInNewTab === true;
  return useMemo(() => ({ __html: sanitizeHtml(html, { linksInNewTab }) }), [html, linksInNewTab]);
}
