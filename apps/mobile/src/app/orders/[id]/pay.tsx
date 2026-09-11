import { router, useLocalSearchParams, type Href } from 'expo-router';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function MockPayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ok = useRequireAuth(`/orders/${id}/pay`);

  if (!ok) {
    return null;
  }

  return (
    <Screen>
      <Text variant="heading">Pasarela mock</Text>
      <Text variant="muted" className="mt-ds-8">
        Simula el webhook: paid o failed. La app no confirma el pago en cliente.
      </Text>
      <Button
        className="mt-ds-24"
        onPress={() => {
          void api.tickets.settleOrder(id, 'paid').then(() => router.replace(`/orders/${id}` as Href));
        }}>
        <Text>Pagar</Text>
      </Button>
      <Button
        variant="outline"
        className="mt-ds-8"
        onPress={() => {
          void api.tickets.settleOrder(id, 'failed').then(() => router.replace(`/orders/${id}` as Href));
        }}>
        <Text>Fallar pago</Text>
      </Button>
    </Screen>
  );
}
