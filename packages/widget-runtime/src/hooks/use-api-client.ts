import * as React from 'react';
import type { ApiClient } from '@perimeter/api-client';

export const ApiClientContext = React.createContext<ApiClient | null>(null);

export function useApiClient(): ApiClient {
  const ctx = React.useContext(ApiClientContext);
  if (!ctx) throw new Error('useApiClient() called outside a mounted Perimeter widget');
  return ctx;
}
