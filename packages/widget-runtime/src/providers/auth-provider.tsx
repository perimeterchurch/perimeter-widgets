import * as React from 'react';
import type { AuthProvider as AuthProviderImpl } from '@perimeter/auth';

export const AuthProviderContext = React.createContext<AuthProviderImpl | null>(null);

export function AuthProviderProvider(props: {
  value: AuthProviderImpl;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <AuthProviderContext.Provider value={props.value}>
      {props.children}
    </AuthProviderContext.Provider>
  );
}
