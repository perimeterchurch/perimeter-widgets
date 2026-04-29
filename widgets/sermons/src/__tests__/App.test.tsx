import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
    createQueryClient,
    AuthProvider,
    ConfigProvider,
} from '@perimeter-widgets/shared';
import { SermonsApp } from '../App';

// jsdom 26 on Node 25 has broken localStorage — stub it
const store: Record<string, string> = {};
beforeEach(() => {
    for (const key of Object.keys(store)) {
        delete store[key];
    }
    vi.stubGlobal('localStorage', {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
            store[key] = value;
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            for (const key of Object.keys(store)) {
                delete store[key];
            }
        },
    });
});

function renderWithProviders(config: Record<string, unknown> = {}) {
    const queryClient = createQueryClient();
    return render(
        <QueryClientProvider client={queryClient}>
            <AuthProvider requiresAuth={false}>
                <ConfigProvider
                    config={{
                        perPage: 12,
                        defaultTab: 'sermons',
                        defaultView: 'grid',
                        ...config,
                    }}
                >
                    <SermonsApp />
                </ConfigProvider>
            </AuthProvider>
        </QueryClientProvider>,
    );
}

describe('SermonsApp', () => {
    it('renders the Sermons tab', () => {
        renderWithProviders();
        expect(screen.getByText('Sermons')).toBeInTheDocument();
    });

    it('renders the Series tab', () => {
        renderWithProviders();
        expect(screen.getByText('Series')).toBeInTheDocument();
    });

    it('hides tabs when config.tab pins a single view', () => {
        // Embedder pinned to sermons — the tab strip should not render
        // because there's nothing the user can switch to.
        renderWithProviders({ tab: 'sermons' });
        expect(screen.queryByRole('tab', { name: /sermons/i })).toBeNull();
        expect(screen.queryByRole('tab', { name: /series/i })).toBeNull();
    });

    it('hides tabs in headless display mode', () => {
        renderWithProviders({ display: 'headless' });
        expect(screen.queryByRole('tab', { name: /sermons/i })).toBeNull();
        expect(screen.queryByRole('tab', { name: /series/i })).toBeNull();
    });

    it('marks the configured defaultTab as active', () => {
        renderWithProviders({ defaultTab: 'series' });
        const seriesTab = screen.getByRole('tab', { name: /series/i });
        const sermonsTab = screen.getByRole('tab', { name: /sermons/i });
        expect(seriesTab).toHaveAttribute('aria-selected', 'true');
        expect(sermonsTab).toHaveAttribute('aria-selected', 'false');
    });
});
