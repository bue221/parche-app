import { useCallback } from 'react';
import { router, type Href } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { api } from '@/data/client';
import { useCreateEventGate } from '@/data/create-event-gate';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { toast } from '@/data/toast-store';
import { needsPayoutSetup } from '@/lib/payout-setup';

export function useRequestCreateEvent() {
  const queryClient = useQueryClient();
  const { isPromoter } = useAuthSnapshot();
  const openSheet = useCreateEventGate((s) => s.open);

  return useCallback(async () => {
    if (!isPromoter) {
      return;
    }
    try {
      const status = await queryClient.fetchQuery({
        queryKey: ['mercadopago'],
        queryFn: () => api.payments.status(),
      });
      if (needsPayoutSetup(status)) {
        openSheet();
        return;
      }
    } catch (err) {
      toast(userMessage(err));
      return;
    }
    router.push('/event/create' as Href);
  }, [isPromoter, openSheet, queryClient]);
}
