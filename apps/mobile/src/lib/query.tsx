import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';

import { ApiError, userMessage } from '@/data/errors';
import { toast } from '@/data/toast-store';

const SESSION_QUERY_KEYS = [['saved-events'], ['following'], ['wallet'], ['invites'], ['artist', 'mine']] as const;

let queryClient: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!queryClient) {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 20_000,
          retry: (count, error) => error instanceof ApiError && error.code === 'NETWORK' && count < 2,
          refetchOnWindowFocus: false,
        },
        mutations: {
          onError: (error) => toast(userMessage(error), 'error'),
        },
      },
    });
  }
  return queryClient;
}

export function clearSessionQueries(): void {
  const client = getQueryClient();
  for (const queryKey of SESSION_QUERY_KEYS) {
    client.removeQueries({ queryKey: [...queryKey] });
  }
}

export function AppQueryProvider({ children }: PropsWithChildren) {
  const [client] = useState(() => getQueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
