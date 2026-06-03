import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { OverviewPage } from './pages/OverviewPage';
import { WidgetPage } from './pages/WidgetPage';
import { ComponentPage } from './pages/ComponentPage';
import { TokensPage } from './pages/TokensPage';
import { GuidePage } from './pages/GuidePage';
import { NotFoundPage } from './pages/NotFoundPage';

/**
 * Single source of truth for the studio's routes. The persistent shell (Layout)
 * wraps every route; page bodies are thin (Task 4 / Chunk 3 fill them in).
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'widgets/:slug', element: <WidgetPage /> },
      { path: 'components/:name', element: <ComponentPage /> },
      { path: 'tokens', element: <TokensPage /> },
      { path: 'guides/:slug', element: <GuidePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
