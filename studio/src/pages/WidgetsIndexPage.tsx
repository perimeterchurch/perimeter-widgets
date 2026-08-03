import { Link } from 'react-router';
import { Card } from '@perimeter/ui/card';
import { Badge } from '@perimeter/ui/badge';
import { Button } from '@perimeter/ui/button';
import { Skeleton } from '@perimeter/ui/skeleton';
import { useCatalog, type CatalogEntry } from '../lib/catalog';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { widgetTitle } from '../lib/labels';

/**
 * The widgets index: every RELEASED widget (live CDN manifest ∩ repo definitions,
 * `example` hidden) as a card linking to its page. No live embeds here — the grid
 * stays fast with zero iframes.
 *
 * Released only, deliberately: this is the shipped set, and an unreleased widget
 * has no version or description to show. Local dev reaches the in-progress ones
 * from the sidebar, which marks them.
 */
export function WidgetsIndexPage() {
  const { entries, isLoading, error, retry } = useCatalog();

  return (
    <div className="p-6">
      <Breadcrumbs crumbs={[{ label: 'Home', to: '/' }, { label: 'Widgets' }]} />
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-fg">Widgets</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-fg">
        Released widgets running on widgets.perimeter.org. Open one to see it live, tune its
        options, and copy the embed snippet.
      </p>

      {error ? (
        <div role="alert" className="mt-6 space-y-2 rounded-md border border-border bg-muted p-4">
          <p className="text-sm text-fg">Couldn&apos;t reach widgets.perimeter.org: {error}</p>
          <Button type="button" variant="outline" size="sm" onClick={retry}>
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <div
          data-testid="catalog-skeleton"
          className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4"
        >
          {[0, 1, 2].map((i) => (
            <Card key={i} className="space-y-3 p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-full" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {entries.map((entry) => (
            <WidgetCard key={entry.slug} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function WidgetCard({ entry }: { entry: CatalogEntry }) {
  return (
    <Link to={`/widgets/${entry.slug}`} className="block focus:outline-hidden">
      <Card className="h-full space-y-2 p-5 transition-colors hover:border-ring">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-fg">{widgetTitle(entry.slug)}</span>
          <code className="text-xs text-muted-fg">{entry.version}</code>
        </div>
        {entry.definition?.auth === 'required' && <Badge>Sign-in required</Badge>}
        {entry.definition?.auth === 'optional' && (
          <Badge variant="outline">Personalized when signed in</Badge>
        )}
        {entry.description && <p className="text-sm text-muted-fg">{entry.description}</p>}
      </Card>
    </Link>
  );
}
