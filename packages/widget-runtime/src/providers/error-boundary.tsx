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
      return (
        <div role="alert" style={{ padding: '0.5rem', fontSize: '0.875rem', color: '#7a1a1a' }}>
          This widget encountered an error.
        </div>
      );
    }
    return this.props.children;
  }
}
