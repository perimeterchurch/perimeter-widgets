import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { installRootTokens } from './lib/light-dom-tokens';
import { applyInitialStudioTheme } from './lib/use-studio-theme';
import { bridgeMpToken } from './lib/mp-token-bridge';
import { ImpersonationProvider } from './lib/impersonation-context';
import './styles.css';

installRootTokens();
// Set data-theme before React renders so the chrome paints dark on first frame
// (no light flash). useStudioTheme keeps it in sync thereafter.
applyInitialStudioTheme();

// Behind the auth shell, hand the signed-in user's MP token to the widget auth
// layer (localStorage) so auth-gated widget previews show live data. Fire-and-
// forget: MPLocalStorageAuth polls localStorage and flips when it lands. Inert
// in standalone dev (no shell → no token).
void bridgeMpToken();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ImpersonationProvider>
      <RouterProvider router={router} />
    </ImpersonationProvider>
  </StrictMode>,
);
