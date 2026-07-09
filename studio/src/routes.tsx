import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { OverviewPage } from './pages/OverviewPage';
import { WidgetPage } from './pages/WidgetPage';
import { PreviewPage } from './pages/PreviewPage';
import { ComponentPage } from './pages/ComponentPage';
import { TokensPage } from './pages/TokensPage';
import { GuidePage } from './pages/GuidePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { CatalogPage } from './pages/CatalogPage';
import { CatalogWidgetPage } from './pages/CatalogWidgetPage';

/**
 * Single source of truth for the studio's routes. The persistent shell (Layout)
 * wraps every route EXCEPT the standalone preview (/preview/:slug), which renders
 * full-bleed with no studio chrome so a shared preview link shows only the widget.
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
      { path: 'widgets/:slug', element: <WidgetPage /> },
      { path: 'components/:name', element: <ComponentPage /> },
      { path: 'tokens', element: <TokensPage /> },
      { path: 'guides/:slug', element: <GuidePage /> },
      { path: 'catalog', element: <CatalogPage /> },
      { path: 'catalog/:slug', element: <CatalogWidgetPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
