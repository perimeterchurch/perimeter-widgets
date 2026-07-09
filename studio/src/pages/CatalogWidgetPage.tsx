import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Button } from '@perimeter/ui/button';
import { Card } from '@perimeter/ui/card';
import { Skeleton } from '@perimeter/ui/skeleton';
import { useCopiedFlash } from '@perimeter/ui/hooks/use-copied-flash';
import { useCatalog, type CatalogEntry } from '../lib/catalog';
import { buildEmbedSnippet, type PreviewTheme } from '../lib/embed-snippet';
import { CdnBundlePreview } from '../components/CdnBundlePreview';
import { MpLoginPanel } from '../components/MpLoginPanel';
import { ConfigPanel } from '../components/ConfigPanel';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { useChromeTheme } from '../lib/use-chrome-theme';
import { titleFromSlug } from '../lib/labels';
import { NotFoundPage } from './NotFoundPage';

/**
 * The catalog viewer: the SHIPPED bundle live (CdnBundlePreview), the config
 * playground, the copyable snippet (identical attribute set to the preview),
 * and the docs link. Sign-in panel (auth widgets) slots in above the embed.
 */
export function CatalogWidgetPage() {
  const { slug } = useParams();
  const { entries, isLoading, error, retry } = useCatalog();

  if (isLoading) {
    return (
      <div data-testid="viewer-skeleton" className="space-y-4 p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-[40vh] w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="m-6 space-y-2 rounded-md border border-border bg-muted p-4">
        <p className="text-sm text-fg">Couldn&apos;t reach widgets.perimeter.org: {error}</p>
        <Button type="button" variant="outline" size="sm" onClick={retry}>
          Retry
        </Button>
      </div>
    );
  }
  const entry = entries.find((e) => e.slug === slug);
  if (!entry) return <NotFoundPage />;
  return <ViewerView key={entry.slug} entry={entry} />;
}

function ViewerView({ entry }: { entry: CatalogEntry }) {
  const [overrides, setOverrides] = useState<Record<string, unknown>>({});
  // Preview theme follows the studio chrome until pinned by the local toggle
  // (same pattern as WidgetPage); ephemeral by design (not URL-persisted).
  const [pinnedTheme, setPinnedTheme] = useState<PreviewTheme | null>(null);
  const chromeTheme = useChromeTheme();
  const theme: PreviewTheme = pinnedTheme ?? chromeTheme;
  const snippet = useMemo(
    () => buildEmbedSnippet(entry.slug, overrides, theme),
    [entry.slug, overrides, theme],
  );

  return (
    <div className="space-y-6 p-6">
      <header>
        <Breadcrumbs
          crumbs={[
            { label: 'Home', to: '/' },
            { label: 'Catalog', to: '/catalog' },
            { label: titleFromSlug(entry.slug) },
          ]}
        />
        <div className="mt-1 flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight text-fg">
            {titleFromSlug(entry.slug)}
          </h1>
          <code className="text-xs text-muted-fg">v{entry.version}</code>
        </div>
        {entry.description && <p className="mt-1 text-sm text-muted-fg">{entry.description}</p>}
      </header>

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

      {entry.definition && (
        <p className="text-sm text-muted-fg">
          <Link className="underline" to={`/widgets/${entry.slug}`}>
            Widget docs
          </Link>{' '}
          — usage, options reference, and design notes.
        </p>
      )}
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
