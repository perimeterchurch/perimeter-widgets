import * as React from 'react';
import type { AuthProvider } from '@perimeter/auth';
import { AuthProviderContext } from '../providers/auth-provider';

export function useAuth(): AuthProvider {
  const ctx = React.useContext(AuthProviderContext);
  if (!ctx) throw new Error('useAuth() called outside a mounted Perimeter widget');
  return ctx;
}
