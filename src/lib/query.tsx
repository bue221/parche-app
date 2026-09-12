import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type PropsWithChildren } from 'react';

import { ApiError, userMessage } from '@/data/errors';
import { toast } from '@/data/toast-store';

export function AppQueryProvider({ children }: PropsWithChildren) {
  const [client] = useState(
    () =>
      new QueryClient({
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
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
