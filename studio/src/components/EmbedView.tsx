import { useMemo, useState } from 'react';
import { Button } from '@perimeter/ui/button';
import { Card } from '@perimeter/ui/card';
import { useCopiedFlash } from '@perimeter/ui/hooks/use-copied-flash';
import type { CatalogEntry } from '../lib/catalog';
import { buildEmbedSnippet, type PreviewTheme } from '../lib/embed-snippet';
import { CdnBundlePreview } from './CdnBundlePreview';
import { MpLoginPanel } from './MpLoginPanel';
import { ConfigPanel } from './ConfigPanel';
import { useChromeTheme } from '../lib/use-chrome-theme';

/**
 * The Embed tab: the SHIPPED bundle running live through the real
 * loader.js → manifest → immutable-bundle chain, the options playground, and the
 * copyable snippet carrying the identical attribute set as the preview. The
 * sign-in panel slots in above the embed for auth widgets.
 *
 * This is what a non-developer comes to the studio for — tune the options, copy
 * the snippet — which is why it is the default tab. It needs a released widget:
 * without a CDN entry there is no bundle to load, so the widget page offers the
 * Dev view alone in that case.
 *
 * Previously the whole of CatalogWidgetPage at /catalog/:slug.
 */
export function EmbedView({ entry }: { entry: CatalogEntry }) {
  const [overrides, setOverrides] = useState<Record<string, unknown>>({});
  // Preview theme follows the studio chrome until pinned by the local toggle;
  // ephemeral by design (not URL-persisted).
  const [pinnedTheme, setPinnedTheme] = useState<PreviewTheme | null>(null);
  const chromeTheme = useChromeTheme();
  const theme: PreviewTheme = pinnedTheme ?? chromeTheme;
  const snippet = useMemo(
    () => buildEmbedSnippet(entry.slug, overrides, theme),
    [entry.slug, overrides, theme],
  );

  return (
    <div className="space-y-6">
      {entry.definition && entry.definition.auth !== 'none' && (
        <MpLoginPanel mode={entry.definition.auth} />
      )}

      <CdnBundlePreview slug={entry.slug} overrides={overrides} theme={theme} />

      {entry.definition && (
        <Card data-testid="config-playground" className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-fg">Options</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPinnedTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              Theme: {theme}
            </Button>
          </div>
          <ConfigPanel
            definition={entry.definition}
            overrides={overrides}
            onChange={setOverrides}
          />
        </Card>
      )}

      <SnippetBlock snippet={snippet} />
    </div>
  );
}

function SnippetBlock({ snippet }: { snippet: string }) {
  const { copied, flash } = useCopiedFlash();
  const copy = () => {
    void navigator.clipboard?.writeText(snippet).then(flash);
  };
  return (
    <Card className="space-y-2 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-fg">Embed snippet</h2>
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-md bg-fg px-3 py-3 font-mono text-xs leading-relaxed text-bg">
        {snippet}
      </pre>
    </Card>
  );
}
