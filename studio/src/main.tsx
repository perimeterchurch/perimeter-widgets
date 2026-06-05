import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { installRootTokens } from './lib/light-dom-tokens';
import { applyInitialStudioTheme } from './lib/use-studio-theme';
import './styles.css';

installRootTokens();
// Set data-theme before React renders so the chrome paints dark on first frame
// (no light flash). useStudioTheme keeps it in sync thereafter.
applyInitialStudioTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
