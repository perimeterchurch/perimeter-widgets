import { Outlet } from 'react-router';
import { useMemo } from 'react';
import { Sidebar } from './Sidebar';
import { ErrorBoundary } from './ErrorBoundary';
import { buildNav } from '../lib/nav';
import { listGuides } from '../lib/guide-docs';
import { useCatalog } from '../lib/catalog';
import {
  toWidgetEntries,
  toComponentEntries,
  widgetDefGlob,
  widgetCssGlob,
  componentGlob,
} from '../lib/discovery';

/**
 * The persistent SPA shell: a fixed-width sidebar plus a scrolling content region
 * fed by the matched route via <Outlet/>. The inspector (config/theme) is NOT here —
 * it lives inside the widget route, since only widget pages have config/theme.
 *
 * The sidebar's Catalog group is the canonical widget list, so it is fed by the
 * runtime catalog (live CDN manifest ∩ definitions) rather than raw discovery:
 * released widgets link to /catalog/<slug> with an auth lock where sign-in is
 * required. Until the manifest resolves, buildNav falls back to the single
 * catalog landing link. The source-preview pages keep a nav group only in local
 * dev — deployed visitors reach them through each catalog page's docs link.
 *
 * Below `lg` the grid collapses to a single column and the Sidebar becomes an
 * off-canvas drawer (it manages its own toggle), so content gets full width.
 */
export function Layout() {
  const { entries } = useCatalog();

  const nav = useMemo(() => {
    const catalog = entries.map((e) => ({
      slug: e.slug,
      authRequired: e.definition?.auth === 'required',
    }));
    const components = toComponentEntries(componentGlob);
    const guides = listGuides().map((g) => ({ slug: g.slug, label: g.title }));
    const devWidgets = import.meta.env.DEV ? toWidgetEntries(widgetDefGlob, widgetCssGlob) : null;
    return buildNav(catalog, components, guides, devWidgets);
  }, [entries]);

  // Geist for the chrome; the brand sans belongs to the widgets.
  return (
    <div className="grid h-screen grid-cols-1 bg-bg font-studio text-fg lg:grid-cols-[16rem_1fr]">
      <Sidebar nav={nav} />
      <main className="overflow-auto">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
