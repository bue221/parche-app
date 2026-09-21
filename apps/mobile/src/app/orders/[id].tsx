import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { ErrorState, PendingAuth, Skeleton } from '@/components/feedback';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useRequireAuth } from '@/hooks/use-require-auth';
import type { Order, Ticket } from '@/data/types';

const POLL_MS = 2000;
const POLL_MAX = 45;

export default function OrderStatusScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ok = useRequireAuth(`/orders/${id}`);
  const [order, setOrder] = useState<(Order & { tickets: Ticket[] }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let n = 0;
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const poll = async () => {
      try {
        const current = await api.tickets.getOrder(id);
        if (cancelled) return;
        setOrder(current);
        if (current.status === 'pending' && n < POLL_MAX) {
          n += 1;
          timer = setTimeout(() => void poll(), POLL_MS);
        } else if (current.status === 'pending') {
          setTimedOut(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(userMessage(err));
        }
      }
    };
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  useEffect(() => {
    if (order?.status === 'paid') {
      router.replace(`/tickets/print?orderId=${id}` as Href);
    }
  }, [order?.status, id]);

  if (!ok) {
    return <PendingAuth />;
  }
  if (error && !order) {
    return (
      <Screen back>
        <ErrorState message={error} />
      </Screen>
    );
  }

  return (
    <Screen back title="Pago" lead="El cobro lo confirma Mercado Pago. Si cerraste el checkout, vuelve a abrirlo.">
      {!order && !error ? <Skeleton className="mt-ds-24 h-24 w-full" /> : null}
      {order?.status === 'pending' ? (
        <View className="mt-ds-24 items-center gap-ds-16">
          {timedOut ? null : <ActivityIndicator />}
          <Text>
            {timedOut
              ? 'Sigue pendiente. Completa el pago o revisa Tiquetes más tarde.'
              : 'Esperando a Mercado Pago'}
          </Text>
          <Button onPress={() => router.push(`/orders/${id}/pay` as Href)}>
            <Text>Pagar en Mercado Pago</Text>
          </Button>
          {timedOut ? (
            <Button variant="outline" onPress={() => router.replace('/wallet' as Href)}>
              <Text>Ir a Tiquetes</Text>
            </Button>
          ) : null}
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
      {error ? <Text>{error}</Text> : null}
    </Screen>
  );
}
