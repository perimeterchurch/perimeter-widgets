import { createBrowserRouter, Navigate, useLocation, useParams } from 'react-router';
import { Layout } from './components/Layout';
import { OverviewPage } from './pages/OverviewPage';
import { WidgetsIndexPage } from './pages/WidgetsIndexPage';
import { WidgetPage } from './pages/WidgetPage';
import { PreviewPage } from './pages/PreviewPage';
import { ComponentsPage } from './pages/ComponentsPage';
import { ComponentPage } from './pages/ComponentPage';
import { TokensPage } from './pages/TokensPage';
import { GuidePage } from './pages/GuidePage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * Carries `/catalog/:slug` links to the merged `/widgets/:slug`, keeping the
 * search string so a shared preview link (theme, viewport, config) survives the
 * hop. `replace` so Back returns to wherever the visitor came from rather than
 * bouncing through the dead URL.
 */
function CatalogSlugRedirect() {
  const { slug } = useParams();
  const { search } = useLocation();
  return <Navigate to={`/widgets/${slug}${search}`} replace />;
}

/**
 * Single source of truth for the studio's routes. The persistent shell (Layout)
 * wraps every route EXCEPT the standalone preview (/preview/:slug), which renders
 * full-bleed with no studio chrome so a shared preview link shows only the widget.
 *
 * `/catalog` and `/catalog/:slug` are retained as redirects, not deleted: the
 * catalog was the deployed studio's entry point for months, so those URLs are in
 * bookmarks, Slack messages and docs. They now point at the merged widget route.
 */
export const router = createBrowserRouter([
  {
    // Full-bleed standalone preview — deliberately outside the Layout shell.
    path: '/preview/:slug',
    element: <PreviewPage />,
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'widgets', element: <WidgetsIndexPage /> },
      { path: 'widgets/:slug', element: <WidgetPage /> },
      { path: 'components', element: <ComponentsPage /> },
      { path: 'components/:name', element: <ComponentPage /> },
      { path: 'tokens', element: <TokensPage /> },
      { path: 'guides/:slug', element: <GuidePage /> },
      // Pre-merge routes, kept working.
      { path: 'catalog', element: <Navigate to="/widgets" replace /> },
      { path: 'catalog/:slug', element: <CatalogSlugRedirect /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
