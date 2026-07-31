import { Outlet, useLocation } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from './AppHeader';
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
 * The persistent SPA shell, laid out like the Knowledge Base subsite: a sticky
 * 4rem AppHeader across the top, then an 18rem sidebar beside a scrolling content
 * region fed by the matched route via <Outlet/>. The inspector (config/theme) is
 * NOT here — it lives inside the widget route, since only widget pages have
 * config/theme.
 *
 * The sidebar's Catalog group is the canonical widget list, so it is fed by the
 * runtime catalog (live CDN manifest ∩ definitions) rather than raw discovery:
 * released widgets link to /catalog/<slug> with an auth lock where sign-in is
 * required. Until the manifest resolves, buildNav falls back to the single
 * catalog landing link. The source-preview pages keep a nav group only in local
 * dev — deployed visitors reach them through each catalog page's docs link.
 *
 * Below `lg` the grid collapses to a single column and the Sidebar becomes an
 * off-canvas drawer, so content gets full width. The drawer's open state lives
 * here because two children need it: the header owns the menu button (as the KB
 * does) and the sidebar is what slides.
 */
export function Layout() {
  const { entries } = useCatalog();
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();

  // Navigating closes the drawer — otherwise it stays over the page you just
  // asked for. (The nav links close it too; this also covers Breadcrumbs, the
  // wordmark, and in-page links.)
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

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

  // The chrome scale and face; the brand tokens belong to the widgets.
  return (
    <div className="min-h-screen bg-chrome-bg font-studio text-chrome-fg">
      <AppHeader navOpen={navOpen} onNavOpenChange={setNavOpen} />
      {/* `items-start` keeps the sticky rail from being stretched to the row
          height, which would defeat position: sticky. */}
      <div className="grid grid-cols-1 items-start lg:grid-cols-[18rem_1fr]">
        <Sidebar nav={nav} open={navOpen} onOpenChange={setNavOpen} />
        {/*
          `overflow-x-auto` keeps content wider than the column — the widget
          canvas toolbar on a phone, wide doc tables — scrolling INSIDE the
          content region instead of scrolling the whole page sideways. It does
          not create a vertical scroll container: main's height stays
          content-based, so the document still scrolls vertically, which is what
          the sticky header and rail hang off. `min-w-0` is what lets a grid item
          shrink below its content width at all.
        */}
        <main className="min-w-0 overflow-x-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
