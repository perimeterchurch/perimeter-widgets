import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';
import '@/styles.css';

async function bootstrap() {
    // Start MSW if mocks are enabled (persisted toggle state)
    // Skip entirely if VITE_API_MODE=local (env override)
    if (import.meta.env.DEV && import.meta.env.VITE_API_MODE !== 'local') {
        const { shouldUseMocks, initMockWorker } = await import(
            '@/mocks/worker'
        );
        if (shouldUseMocks()) {
            await initMockWorker();
        }
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
