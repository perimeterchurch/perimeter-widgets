import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

async function bootstrap() {
    // Start MSW in development (skip if VITE_API_MODE=local to use real local API)
    if (import.meta.env.DEV && import.meta.env.VITE_API_MODE !== 'local') {
        const { setupWorker } = await import('msw/browser');
        const { handlers } = await import('./mocks/handlers');
        const worker = setupWorker(...handlers);
        await worker.start({
            onUnhandledRequest: 'bypass',
        });
    }

    const root = document.getElementById('root');
    if (!root) throw new Error('Root element not found');

    createRoot(root).render(
        <StrictMode>
            <App />
        </StrictMode>,
    );
}

bootstrap();
