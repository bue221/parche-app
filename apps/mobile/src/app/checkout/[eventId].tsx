import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { AuthSheet } from '@/components/auth-sheet';
import { LoadError, Skeleton } from '@/components/feedback';
import { FlyerImage } from '@/components/flyer-image';
import { Screen } from '@/components/screen';
import { StickyCta } from '@/components/sticky-cta';
import { Surface } from '@/components/surface';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { toast } from '@/data/toast-store';
import { useAuthSnapshot } from '@/data/session';
import { formatMoney } from '@/lib/format';
import type { EventWithExtras } from '@/data/types';
import type { TicketType } from '@/data/types';

export default function CheckoutScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { isLoggedIn } = useAuthSnapshot();
  const [event, setEvent] = useState<EventWithExtras | null>(null);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const inflight = useRef(false);
  const pendingType = useRef<TicketType | null>(null);

  useEffect(() => {
    void api.events
      .get(eventId)
      .then((e) => {
        setEvent(e);
        const first = e.ticketTypes.find((t) => api.helpers.typeOnSale(t));
        setTypeId(first?.id ?? null);
      })
      .catch((err) => {
        const message = userMessage(err);
        setError(message);
        toast(message);
      });
  }, [eventId]);

  function createOrder(selected: TicketType) {
    if (inflight.current) return;
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
  }

  if (error && !event) {
    return <LoadError message={error} />;
  }
  if (!event) {
    return (
      <Screen back>
        <Skeleton className="aspect-[16/10] w-full" />
        <Skeleton className="mt-ds-16 h-8 w-40" />
        <Skeleton className="mt-ds-16 h-24 w-full" />
      </Screen>
    );
  }

  const selected: TicketType | undefined = event.ticketTypes.find((t) => t.id === typeId);

  return (
    <View className="flex-1">
      <Screen
        back
        title="Boleta"
        lead={event.name}
        footer={
          <StickyCta>
            <View className="gap-ds-8">
              {selected ? (
                <Text variant="muted">Total {formatMoney(selected.priceCents * qty, selected.currency)}</Text>
              ) : null}
              {error ? <Text>{error}</Text> : null}
              <Button
                disabled={busy || !selected}
                onPress={() => {
                  if (!selected) return;
                  if (!isLoggedIn) {
                    pendingType.current = selected;
                    setAuthOpen(true);
                    return;
                  }
                  createOrder(selected);
                }}>
                <Text>{busy ? 'Reservando…' : 'Ir a pagar'}</Text>
              </Button>
            </View>
          </StickyCta>
        }>
        {event.flyerUrl ? (
          <View className="mt-ds-16 overflow-hidden rounded-images">
            <FlyerImage uri={event.flyerUrl} className="w-full" aspectRatio={16 / 10} />
          </View>
        ) : null}
        <View className="mt-ds-16 gap-ds-8">
          {event.ticketTypes.map((type) => (
            <Surface
              key={type.id}
              elevated
              onPress={api.helpers.typeOnSale(type) ? () => setTypeId(type.id) : undefined}
              className={type.id === typeId ? 'border-foreground' : undefined}>
              <Text>
                {type.name} · {formatMoney(type.priceCents, type.currency)}
                {!api.helpers.typeOnSale(type) ? ' · no disponible' : ''}
              </Text>
            </Surface>
          ))}
        </View>
        <View className="mt-ds-16 flex-row items-center gap-ds-8">
          <Button variant="outline" onPress={() => setQty((n) => Math.max(1, n - 1))}>
            <Text>-</Text>
          </Button>
          <Text>{qty}</Text>
          <Button variant="outline" onPress={() => setQty((n) => Math.max(1, n + 1))}>
            <Text>+</Text>
          </Button>
        </View>
      </Screen>
      <AuthSheet
        visible={authOpen}
        inline
        onClose={() => setAuthOpen(false)}
        onSuccess={() => {
          const type = pendingType.current ?? selected;
          if (type) createOrder(type);
        }}
      />
    </View>
  );
}
