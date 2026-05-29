import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export function makeWidgetQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
    },
  });
}

export function QueryProvider(props: {
  client: QueryClient;
  children: React.ReactNode;
}): React.JSX.Element {
  return <QueryClientProvider client={props.client}>{props.children}</QueryClientProvider>;
}
