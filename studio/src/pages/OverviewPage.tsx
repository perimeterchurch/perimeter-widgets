import { useMemo } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@perimeter/ui/card';
import {
  toWidgetEntries,
  toComponentEntries,
  widgetDefGlob,
  widgetCssGlob,
  componentGlob,
} from '../lib/discovery';
import { titleFromSlug } from '../lib/labels';
import { useCatalog } from '../lib/catalog';

interface OverviewItem {
  to: string;
  /** Human-friendly title derived from the slug/name. */
  title: string;
  /** Raw slug/name, kept as a secondary code reference. */
  slug: string;
}

/** One section card: a labelled count plus the discovered items as quick links. */
function SectionCard({
  title,
  count,
  items,
  empty,
}: {
  title: string;
  count: number;
  items: OverviewItem[];
  empty: string;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-baseline justify-between gap-3 pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <span className="text-sm font-medium tabular-nums text-muted-fg">{count}</span>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length > 0 ? (
          <ul className="space-y-0.5">
            {items.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="-mx-2 flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="text-sm font-medium text-fg">{item.title}</span>
                  <code className="font-mono text-xs text-muted-fg">{item.slug}</code>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-fg">{empty}</p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * The landing page: a brief intro to the studio plus discovery-driven section
 * cards (Widgets / Components) that double as a directory. Counts and links come
 * from the same discovery globs the sidebar uses — never hard-coded.
 */
export function OverviewPage() {
  // Released widgets get the catalog viewer as their canonical page (same rule
  // as the sidebar); unreleased ones only exist as source previews.
  const { entries } = useCatalog();
  const released = useMemo(() => new Set(entries.map((e) => e.slug)), [entries]);

  const { widgets, components } = useMemo(() => {
    const w = toWidgetEntries(widgetDefGlob, widgetCssGlob);
    const c = toComponentEntries(componentGlob);
    return {
      widgets: w.map((x) => ({
        to: released.has(x.slug) ? `/catalog/${x.slug}` : `/widgets/${x.slug}`,
        title: titleFromSlug(x.slug),
        slug: x.slug,
      })),
      components: c.map((x) => ({
        to: `/components/${x.name}`,
        title: titleFromSlug(x.name),
        slug: x.name,
      })),
    };
  }, [released]);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">
          Design system
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-fg">Perimeter Studio</h1>
        <p className="mt-3 text-base leading-relaxed text-muted-fg">
          Preview every widget through the real mount pipeline, browse the{' '}
          <span className="text-fg">@perimeter/ui</span> component library, and reference the design
          tokens — the same source that ships to production.
        </p>
        <div className="mt-5">
          <Link
            to="/tokens"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            View design tokens →
          </Link>
        </div>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SectionCard
          title="Widgets"
          count={widgets.length}
          items={widgets}
          empty="No widgets discovered."
        />
        <SectionCard
          title="Components"
          count={components.length}
          items={components}
          empty="No components discovered."
        />
      </div>
    </div>
  );
}
