import * as React from 'react';
import { useAuth } from '../hooks/use-auth';

export interface AuthGateProps {
  widgetName: string;
  mode: 'required' | 'optional' | 'none';
  children: React.ReactNode;
}

export function AuthGate({ mode, children }: AuthGateProps): React.JSX.Element {
  const auth = useAuth();
  const [authed, setAuthed] = React.useState<boolean>(auth.isAuthenticated());

  React.useEffect(() => {
    return auth.onChange(() => setAuthed(auth.isAuthenticated()));
  }, [auth]);

  if (mode !== 'required' || authed) return <>{children}</>;
  return (
    <div role="status" style={{ padding: '1rem', fontSize: '0.875rem' }}>
      Please sign in to use this widget.
    </div>
  );
}
