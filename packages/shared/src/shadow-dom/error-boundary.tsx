import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    retryKey: number;
}

export class WidgetErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, retryKey: 0 };

    static getDerivedStateFromError(): Partial<State> {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[perimeter-widgets] Render error:', error, info);
    }

    handleRetry = () => {
        this.setState((prev) => ({
            hasError: false,
            retryKey: prev.retryKey + 1,
        }));
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className='flex flex-col items-center justify-center gap-4 p-8 text-center'>
                    <p className='text-sm text-muted-foreground'>
                        Something went wrong loading this content.
                    </p>
                    <button
                        type='button'
                        onClick={this.handleRetry}
                        className='rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90'
                    >
                        Try again
                    </button>
                </div>
            );
        }

        return <div key={this.state.retryKey}>{this.props.children}</div>;
    }
}
