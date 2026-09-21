import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';

import { EventWizard } from '@/components/event-wizard';
import { PendingAuth, Skeleton } from '@/components/feedback';
import { MercadoPagoSetupSheet } from '@/components/mercadopago-setup-sheet';
import { Screen } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { useAuthSnapshot } from '@/data/session';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { needsPayoutSetup } from '@/lib/payout-setup';

export default function EventCreateScreen() {
  const ok = useRequireAuth('/event/create');
  const { isPromoter } = useAuthSnapshot();
  const payout = useQuery({
    queryKey: ['mercadopago'],
    queryFn: () => api.payments.status(),
    enabled: ok && isPromoter,
  });

  if (!ok) {
    return <PendingAuth />;
  }
  if (!isPromoter) {
    return (
      <Screen back>
        <Text>Solo organizadores pueden crear eventos.</Text>
      </Screen>
    );
  }
  if (payout.isLoading) {
    return (
      <Screen back title="Nuevo evento">
        <Skeleton className="mt-ds-24 h-24 w-full" />
      </Screen>
    );
  }
  if (payout.data && needsPayoutSetup(payout.data)) {
    return (
      <Screen back title="Nuevo evento">
        <Text className="mt-ds-24" variant="muted">
          Conecta Mercado Pago para que el dinero de las boletas llegue a tu cuenta.
        </Text>
        <MercadoPagoSetupSheet visible inline onClose={() => router.back()} onConnected={() => void payout.refetch()} />
      </Screen>
    );
  }

  return <EventWizard mode="create" />;
}
