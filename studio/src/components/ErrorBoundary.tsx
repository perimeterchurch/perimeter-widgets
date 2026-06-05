import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Top-level recover UI for the studio SPA. A throwing page or MDX doc would
 * otherwise unmount the whole React tree and leave a blank white screen with no
 * way back; this catches the error, shows the message, and offers a reload + a
 * link home so the user can recover without dev-tools.
 *
 * React error boundaries must be class components (no hook equivalent for
 * getDerivedStateFromError/componentDidCatch).
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface in the console for debugging; the fallback handles the user-facing path.
    console.error('Studio render error:', error, info.componentStack);
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        className="flex min-h-full flex-col items-center justify-center gap-4 p-8 text-center"
      >
        <div className="max-w-md space-y-2">
          <h1 className="text-lg font-semibold text-fg">Something broke on this page</h1>
          <p className="text-sm text-muted-fg">
            The studio hit an unexpected error and couldn&apos;t render this view.
          </p>
          {error.message ? (
            <pre className="overflow-x-auto rounded-md border border-border bg-muted p-3 text-left font-mono text-xs text-fg">
              {error.message}
            </pre>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-fg transition-colors hover:opacity-90"
          >
            Reload
          </button>
          <a
            href="/"
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-fg transition-colors hover:border-fg/30"
          >
            Go home
          </a>
        </div>
      </div>
    );
  }
}
