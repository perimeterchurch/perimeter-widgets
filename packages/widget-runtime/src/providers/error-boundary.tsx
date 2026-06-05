import * as React from 'react';

interface Props {
  widgetName: string;
  children: React.ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error): void {
    // Surfaced in dev tools; in production this becomes a telemetry hook.
    console.error(`[perimeter-widget:${this.props.widgetName}]`, error);
  }

  override render(): React.ReactNode {
    if (this.state.error) {
      // A crashed React subtree may have lost its Tailwind classes, so the
      // fallback is driven by inline styles referencing the `--color-destructive`
      // theme token (with a hardcoded fallback), which lives on the shadow host
      // and stays valid regardless of class purging — and stays legible in dark.
      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem',
            fontSize: '0.875rem',
            color: 'var(--color-destructive, #b91c1c)',
          }}
        >
          <span>This widget encountered an error.</span>
          <button
            type="button"
            onClick={() => {
              this.setState({ error: null });
            }}
            style={{
              cursor: 'pointer',
              borderRadius: '0.375rem',
              border: '1px solid var(--color-destructive, #b91c1c)',
              background: 'transparent',
              color: 'inherit',
              padding: '0.25rem 0.625rem',
              font: 'inherit',
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
