import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useRequireAuth } from '@/hooks/use-require-auth';
import type { Order, Ticket } from '@/data/types';

export default function OrderStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ok = useRequireAuth(`/orders/${id}`);
  const [order, setOrder] = useState<(Order & { tickets: Ticket[] }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let n = 0;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const current = await api.tickets.getOrder(id);
        setOrder(current);
        if (current.status === 'pending' && n < 8) {
          n += 1;
          timer = setTimeout(() => void poll(), 400 * n);
        }
      } catch (err) {
        setError(userMessage(err));
      }
    };
    void poll();
    return () => clearTimeout(timer);
  }, [id]);

  useEffect(() => {
    if (order?.status === 'paid') {
      router.replace(`/tickets/print?orderId=${id}` as Href);
    }
  }, [order?.status, id]);

  if (!ok) {
    return null;
  }

  return (
    <Screen>
      <Text variant="heading">Pago</Text>
      {order?.status === 'pending' ? (
        <View className="mt-ds-24 items-center gap-ds-16">
          <ActivityIndicator />
          <Text>Confirmando el pago</Text>
        </View>
      ) : null}
      {order?.status === 'failed' || order?.status === 'expired' ? (
        <View className="mt-ds-16 gap-ds-16">
          <Text>No se completó; el cupo se liberó.</Text>
          <Button onPress={() => router.replace(`/event/${order.eventId}` as Href)}>
            <Text>Volver al evento</Text>
          </Button>
        </View>
      ) : null}
      {order?.status === 'pending' && error ? <Text>Sigue pendiente — revisa Tiquetes</Text> : null}
      {error ? <Text>{error}</Text> : null}
    </Screen>
  );
}
