/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WidgetErrorBoundary } from '../error-boundary';

function GoodChild() {
    return <div>Widget content</div>;
}

function ThrowingChild(): never {
    throw new Error('Render explosion');
}

describe('WidgetErrorBoundary', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('renders children when no error is thrown', () => {
        render(
            <WidgetErrorBoundary>
                <GoodChild />
            </WidgetErrorBoundary>,
        );

        expect(screen.getByText('Widget content')).toBeInTheDocument();
    });

    it('shows fallback UI when child throws during render', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <WidgetErrorBoundary>
                <ThrowingChild />
            </WidgetErrorBoundary>,
        );

        expect(
            screen.getByText('Something went wrong loading this content.'),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('logs error via console.error', () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(
            <WidgetErrorBoundary>
                <ThrowingChild />
            </WidgetErrorBoundary>,
        );

        expect(errorSpy).toHaveBeenCalledWith(
            '[perimeter-widgets] Render error:',
            expect.any(Error),
            expect.objectContaining({ componentStack: expect.any(String) }),
        );
    });

    it('recovers when retry button is clicked', async () => {
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        let shouldThrow = true;

        function ConditionalChild() {
            if (shouldThrow) throw new Error('Render explosion');
            return <div>Recovered content</div>;
        }

        render(
            <WidgetErrorBoundary>
                <ConditionalChild />
            </WidgetErrorBoundary>,
        );

        expect(
            screen.getByText('Something went wrong loading this content.'),
        ).toBeInTheDocument();

        shouldThrow = false;
        await userEvent.click(screen.getByRole('button', { name: /try again/i }));

        expect(screen.getByText('Recovered content')).toBeInTheDocument();

        errorSpy.mockRestore();
    });
});
