import { Outlet } from 'react-router';
import { useMemo } from 'react';
import { Sidebar } from './Sidebar';
import { buildNav } from '../lib/nav';
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
 * Below `lg` the grid collapses to a single column and the Sidebar becomes an
 * off-canvas drawer (it manages its own toggle), so content gets full width.
 */
export function Layout() {
  // Discovery is module-level/stable for the app's lifetime; memoize once.
  const nav = useMemo(() => {
    const widgets = toWidgetEntries(widgetDefGlob, widgetCssGlob);
    const components = toComponentEntries(componentGlob);
    return buildNav(widgets, components);
  }, []);

  return (
    <div className="grid h-screen grid-cols-1 bg-bg font-sans text-fg lg:grid-cols-[16rem_1fr]">
      <Sidebar nav={nav} />
      <main className="overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
