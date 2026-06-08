import { useId, useState } from 'react';
import type { WidgetDefinition } from '@perimeter/widget-runtime';
import { Button } from '@perimeter/ui/button';
import { SegmentedTabs, segmentedTabId } from '@perimeter/ui/segmented-tabs';
import { ConfigPanel } from './ConfigPanel';
import { ThemeEditor } from './ThemeEditor';
import { InfoPanel } from './InfoPanel';
import { configToDataAttrs } from '../lib/data-attr';

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
 * Build the production embed snippet for a widget. The canonical CDN host/path a
 * host page (WordPress) uses — kept in sync with docs/hosting-and-release.md. Any
 * config the developer has set in the Config tab is reflected as `data-*`
 * attributes on the widget div (`{ perPage: 20 }` → `data-per-page="20"`), so the
 * snippet is paste-ready for the configured widget. With no config set it is the
 * bare form (what the WidgetPage test asserts).
 */
export function embedSnippet(slug: string, config: Record<string, unknown> = {}): string {
  return (
    `<div data-perimeter-widget="${slug}"${configToDataAttrs(config)}></div>\n` +
    `<script src="https://widgets.perimeter.org/${slug}/latest.js" async></script>`
  );
}

/**
 * The generated embed snippet with a copy-to-clipboard control. Dogfoods Button.
 * Re-renders as `config` changes, so adjusting the Config tab updates the embed.
 */
function EmbedSnippet({ slug, config }: { slug: string; config: Record<string, unknown> }) {
  const code = embedSnippet(slug, config);
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
 * The tab bar is the shared `@perimeter/ui` SegmentedTabs control (rounded
 * `bg-muted` track, lifted active segment, roving tabIndex + arrow-key focus) —
 * the same control the sermons widget uses — rather than the `@perimeter/ui`
 * Tabs compound, whose orientation handling (and content-sized
 * `inline-flex w-fit` list) fights a full-width drawer header. Only the active
 * panel mounts below the bar, filling the drawer width with comfortable padding
 * (no per-panel Card nesting). The embed snippet sits in a persistent footer so
 * it shows once regardless of the active tab.
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
  const panelId = `${baseId}-panel`;

  return (
    <div className="flex flex-col gap-4">
      <SegmentedTabs
        items={TABS}
        value={active}
        onChange={(id) => setActive(id as TabId)}
        aria-label="Inspector sections"
        idBase={baseId}
        panelId={panelId}
      />

      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={segmentedTabId(baseId, active)}
        className="min-w-0"
      >
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
        <EmbedSnippet slug={slug} config={configOverrides} />
      </div>
    </div>
  );
}
