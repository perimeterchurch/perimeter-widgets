import { lazy, Suspense, useMemo, type ComponentType } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { Button } from '@perimeter/ui/button';
import { Skeleton } from '@perimeter/ui/skeleton';
import { Spinner } from '@perimeter/ui/spinner';
import { SegmentedTabs } from '@perimeter/ui/segmented-tabs';
import { toWidgetEntries, widgetDefGlob, widgetCssGlob, type WidgetEntry } from '../lib/discovery';
import { useCatalog, type CatalogEntry } from '../lib/catalog';
import { widgetDoc } from '../lib/widget-docs';
import { StudioMDXProvider } from '../lib/mdx';
import { EmbedView } from '../components/EmbedView';
import { DevView } from '../components/DevView';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { titleFromSlug } from '../lib/labels';
import { NotFoundPage } from './NotFoundPage';

/** Tab ids, also the `?tab=` values. */
const EMBED = 'embed';
const DEV = 'dev';

/** The Dev tab is a developer tool — local dev only, as the old nav group was. */
const DEV_AVAILABLE = import.meta.env.DEV;

/**
 * The one widget route, replacing the old split between `/catalog/:slug` (shipped
 * bundle + options + snippet) and `/widgets/:slug` (source canvas + inspector).
 * Those were two views of the same widget on two routes, so the sidebar listed
 * everything twice; now they are tabs on one page.
 *
 * - **Embed** — the shipped CDN bundle, options playground, copyable snippet.
 *   Needs a release; the default, since it is what non-developers come for.
 * - **Dev** — source preview through the real `mount()` + Inspector. Local dev
 *   only, and the only tab for a widget that has no shipped bundle yet.
 *
 * The MDX doc renders below the tabs, not inside one: it documents the widget
 * whichever view you are in, and the options reference wants to be readable while
 * you tune the options above it.
 *
 * The active tab lives in `?tab=` so a link can point at either view. That sits
 * alongside the Dev tab's own preview params (usePreviewConfig), which is why the
 * tab is read from useSearchParams here rather than held in component state.
 */
export function WidgetPage() {
  const { slug } = useParams();
  const { entries, isLoading, error, retry } = useCatalog();
  const devWidgets = useMemo(() => toWidgetEntries(widgetDefGlob, widgetCssGlob), []);

  const released = slug ? entries.find((e) => e.slug === slug) : undefined;
  const source = slug ? devWidgets.find((w) => w.slug === slug) : undefined;

  const canDev = DEV_AVAILABLE && source !== undefined;

  // Only the manifest-dependent cases wait on the manifest. When a source view is
  // available, render it immediately and let the Embed tab appear once the fetch
  // resolves — gating the whole page on a remote request would make the developer
  // view hostage to widgets.perimeter.org being reachable, which it is not when
  // offline, and which stalled the visual harness.
  if (!canDev) {
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
    // Unknown slug, or an unreleased widget on the deployed site.
    if (!released) return <NotFoundPage />;
  }

  return (
    <WidgetView
      key={slug}
      slug={slug!}
      released={released}
      source={source}
      manifestError={error}
      manifestResolved={!isLoading}
    />
  );
}

function WidgetView({
  slug,
  released,
  source,
  manifestError,
  manifestResolved,
}: {
  slug: string;
  released: CatalogEntry | undefined;
  source: WidgetEntry | undefined;
  manifestError: string | null;
  /** False while the CDN manifest is still in flight — `released` is not yet
   * authoritative, so nothing may claim the widget is unreleased. */
  manifestResolved: boolean;
}) {
  const [params, setParams] = useSearchParams();
  const doc = widgetDoc(slug);

  const canEmbed = released !== undefined;
  const canDev = DEV_AVAILABLE && source !== undefined;

  const tabs = [
    ...(canEmbed ? [{ id: EMBED, label: 'Embed' }] : []),
    ...(canDev ? [{ id: DEV, label: 'Dev' }] : []),
  ];
  // Embed wins when available; an unreleased widget lands on Dev because that is
  // its only view. A `?tab=` naming an unavailable tab falls back rather than
  // rendering blank.
  const requested = params.get('tab');
  const active =
    requested && tabs.some((t) => t.id === requested) ? requested : (tabs[0]?.id ?? EMBED);

  const selectTab = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === tabs[0]?.id) next.delete('tab');
    else next.set('tab', id);
    // `replace` so tab flicks don't stack history entries between the page and
    // the thing the visitor was reading before it.
    setParams(next, { replace: true });
  };

  return (
    <>
      <div className="space-y-6 p-6">
        <header>
          <Breadcrumbs
            crumbs={[
              { label: 'Home', to: '/' },
              { label: 'Widgets', to: '/widgets' },
              { label: titleFromSlug(slug) },
            ]}
          />
          <div className="mt-1 flex items-center justify-between gap-4">
            <h1 className="text-xl font-semibold tracking-tight text-fg">{titleFromSlug(slug)}</h1>
            {/* Nothing until the manifest resolves: on a cold dev server the join
                imports every released widget's module, and labelling a widget
                "not released" in the meantime is simply wrong. */}
            {released ? (
              <code className="text-xs text-muted-fg">v{released.version}</code>
            ) : manifestResolved ? (
              <code className="text-xs text-muted-fg">not released</code>
            ) : null}
          </div>
          {released?.description && (
            <p className="mt-1 text-sm text-muted-fg">{released.description}</p>
          )}
        </header>

        {/* One tab needs no chooser — an unreleased widget in dev, or the
            deployed site where Dev does not exist. */}
        {tabs.length > 1 && (
          <SegmentedTabs
            items={tabs}
            value={active}
            onChange={selectTab}
            aria-label="Widget view"
            className="w-fit"
          />
        )}

        {manifestError && canDev && (
          <p role="status" className="text-sm text-muted-fg">
            Couldn&apos;t reach widgets.perimeter.org ({manifestError}), so the shipped-bundle view
            is unavailable. The source view below still works.
          </p>
        )}

        {active === EMBED && released ? <EmbedView entry={released} /> : null}
        {active === DEV && source ? <DevView entry={source} /> : null}
      </div>

      {/* The widget's own doc — purpose, options reference, embed instructions —
          when docs/widgets/<slug>.mdx exists. Nothing otherwise. */}
      {doc ? (
        <section className="border-t border-border">
          <WidgetDoc loader={doc} />
        </section>
      ) : null}
    </>
  );
}

/**
 * Renders the lazily-loaded per-widget MDX doc inside the studio's MDX provider,
 * matching the guide/component doc treatment (own heading, comfortable measure,
 * Suspense spinner while the async chunk streams in).
 */
function WidgetDoc({ loader }: { loader: () => Promise<{ default: ComponentType }> }) {
  const Doc = useMemo(() => lazy(loader), [loader]);
  return (
    <StudioMDXProvider>
      <article className="mx-auto max-w-3xl px-6 py-10">
        <Suspense
          fallback={
            <div className="flex justify-center py-16 text-muted-fg">
              <Spinner />
            </div>
          }
        >
          <Doc />
        </Suspense>
      </article>
    </StudioMDXProvider>
  );
}
