import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { setPendingPath } from '@/data/session';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { formatMoney } from '@/lib/format';
import type { EventWithExtras } from '@/data/mock/api';
import type { TicketType } from '@/data/types';

export default function CheckoutScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const ok = useRequireAuth(`/checkout/${eventId}`);
  const [event, setEvent] = useState<EventWithExtras | null>(null);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inflight = useRef(false);

  useEffect(() => {
    void api.events.get(eventId).then((e) => {
      setEvent(e);
      const first = e.ticketTypes.find((t) => api.helpers.typeOnSale(t));
      setTypeId(first?.id ?? null);
    }).catch((err) => {
      setError(userMessage(err));
      setPendingPath(`/checkout/${eventId}`);
    });
  }, [eventId]);

  if (!ok) {
    return null;
  }

  const selected: TicketType | undefined = event?.ticketTypes.find((t) => t.id === typeId);

  return (
    <Screen>
      <Text variant="heading">Checkout</Text>
      <Text variant="muted" className="mt-ds-8">
        {event?.name}. La tarjeta se cobra en la pasarela mock, no aquí.
      </Text>
      <View className="mt-ds-16 gap-ds-8">
        {event?.ticketTypes.map((type) => (
          <Button
            key={type.id}
            variant={type.id === typeId ? 'default' : 'outline'}
            disabled={!api.helpers.typeOnSale(type)}
            onPress={() => setTypeId(type.id)}>
            <Text>
              {type.name} · {formatMoney(type.priceCents, type.currency)}
              {!api.helpers.typeOnSale(type) ? ' · no disponible' : ''}
            </Text>
          </Button>
        ))}
      </View>
      <View className="mt-ds-16 flex-row gap-ds-8">
        <Button variant="outline" onPress={() => setQty((n) => Math.max(1, n - 1))}>
          <Text>-</Text>
        </Button>
        <Text>{qty}</Text>
        <Button variant="outline" onPress={() => setQty((n) => n + 1)}>
          <Text>+</Text>
        </Button>
      </View>
      {selected ? (
        <Text className="mt-ds-16">Total {formatMoney(selected.priceCents * qty, selected.currency)}</Text>
      ) : null}
      {error ? <Text>{error}</Text> : null}
      <Button
        className="mt-ds-16"
        disabled={busy || !selected}
        onPress={() => {
          if (inflight.current || !selected) {
            return;
          }
          inflight.current = true;
          setBusy(true);
          void api.tickets
            .createOrder(eventId, selected.id, qty)
            .then((order) => router.replace(`/orders/${order.id}/pay` as Href))
            .catch((err) => setError(userMessage(err)))
            .finally(() => {
              inflight.current = false;
              setBusy(false);
            });
        }}>
        <Text>{busy ? 'Reservando…' : 'Ir a pagar'}</Text>
      </Button>
    </Screen>
  );
}
