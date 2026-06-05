import { useId, useState } from 'react';
import type { WidgetDefinition } from '@perimeter/widget-runtime';
import { Button } from '@perimeter/ui/button';
import { cn } from '@perimeter/ui/utils/cn';
import { ConfigPanel } from './ConfigPanel';
import { ThemeEditor } from './ThemeEditor';
import { InfoPanel } from './InfoPanel';

interface Props {
  /** The loaded widget definition (null while its module is still loading). */
  definition: WidgetDefinition | null;
  /** Widget slug — drives the production embed snippet. */
  slug: string;
  configOverrides: Record<string, unknown>;
  tokenOverrides: Record<string, string>;
  onConfigChange: (next: Record<string, unknown>) => void;
  onThemeChange: (next: Record<string, string>) => void;
}

/**
 * Build the production embed snippet for a widget. This is the canonical CDN
 * host/path a host page (WordPress) uses — keep it byte-for-byte in sync with
 * docs/hosting-and-release.md and the WidgetPage test, which asserts it exactly.
 */
export function embedSnippet(slug: string): string {
  return (
    `<div data-perimeter-widget="${slug}"></div>\n` +
    `<script src="https://widgets.perimeter.org/${slug}/latest.js" async></script>`
  );
}

/** The generated embed snippet with a copy-to-clipboard control. Dogfoods Button. */
function EmbedSnippet({ slug }: { slug: string }) {
  const code = embedSnippet(slug);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-fg">Embed</span>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-md bg-fg px-3 py-3 font-mono text-xs leading-relaxed text-bg">
        {code}
      </pre>
    </div>
  );
}

type TabId = 'config' | 'theme' | 'info';

const TABS: { id: TabId; label: string }[] = [
  { id: 'config', label: 'Config' },
  { id: 'theme', label: 'Theme' },
  { id: 'info', label: 'Info' },
];

/**
 * The widget inspector, laid out as a header tab bar over a single active panel.
 *
 * The tab bar is built directly here — a `role="tablist"` row of `role="tab"`
 * buttons with `aria-selected`, evenly distributed via `flex` + per-trigger
 * `flex-1` — rather than the `@perimeter/ui` Tabs compound, whose orientation
 * handling (and content-sized `inline-flex w-fit` list) fights a full-width
 * drawer header. Only the active panel mounts below the bar, filling the drawer
 * width with comfortable padding (no per-panel Card nesting). The embed snippet
 * sits in a persistent footer so it shows once regardless of the active tab.
 */
export function Inspector({
  definition,
  slug,
  configOverrides,
  tokenOverrides,
  onConfigChange,
  onThemeChange,
}: Props) {
  const [active, setActive] = useState<TabId>('config');
  const baseId = useId();
  const tabId = (id: TabId) => `${baseId}-tab-${id}`;
  const panelId = `${baseId}-panel`;

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Inspector sections"
        className="flex w-full gap-1 rounded-lg bg-muted p-[3px]"
      >
        {TABS.map(({ id, label }) => {
          const selected = active === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={tabId(id)}
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(id)}
              className={cn(
                'flex-1 rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors',
                'focus-visible:outline-1 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
                selected
                  ? 'bg-bg text-fg shadow-sm'
                  : 'text-fg/60 hover:text-fg dark:text-muted-fg dark:hover:text-fg',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={panelId} aria-labelledby={tabId(active)} className="min-w-0">
        {active === 'config' &&
          (definition ? (
            <ConfigPanel
              definition={definition}
              overrides={configOverrides}
              onChange={onConfigChange}
            />
          ) : (
            <p className="p-3 text-sm text-muted-fg">Loading schema…</p>
          ))}

        {active === 'theme' && <ThemeEditor overrides={tokenOverrides} onChange={onThemeChange} />}

        {active === 'info' &&
          (definition ? (
            <InfoPanel definition={definition} />
          ) : (
            <p className="p-3 text-sm text-muted-fg">Loading schema…</p>
          ))}
      </div>

      <div className="border-t border-border px-3 pt-4">
        <EmbedSnippet slug={slug} />
      </div>
    </div>
  );
}
