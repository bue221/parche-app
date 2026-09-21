import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { AuthSheet } from '@/components/auth-sheet';
import { EndedEventNotice } from '@/components/ended-event-notice';
import { FeeBreakdown } from '@/components/fee-breakdown';
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
import { formatListingDate, formatMoney, eventHasEnded, eventTimeLabel, eventVenueParts } from '@/lib/format';
import { mergeOrderItems, orderItemsLabel, orderItemsTotalCents } from '@/lib/order-items';
import { splitParcheFee } from '@/lib/parche-fee';
import type { EventWithExtras, OrderItem, TicketType } from '@/data/types';

function StageQty({
  qty,
  max,
  disabled,
  onChange,
}: {
  qty: number;
  max: number;
  disabled?: boolean;
  onChange: (next: number) => void;
}) {
  return (
    <View className="flex-row items-center gap-ds-8">
      <Button
        variant="outline"
        size="icon"
        disabled={disabled || qty <= 0}
        accessibilityLabel="Quitar boleta"
        onPress={() => onChange(qty - 1)}>
        <Text>-</Text>
      </Button>
      <Text className="min-w-6 text-center">{qty}</Text>
      <Button
        variant="outline"
        size="icon"
        disabled={disabled || qty >= max}
        accessibilityLabel="Añadir boleta"
        onPress={() => onChange(qty + 1)}>
        <Text>+</Text>
      </Button>
    </View>
  );
}

export default function CheckoutScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { isLoggedIn } = useAuthSnapshot();
  const [event, setEvent] = useState<EventWithExtras | null>(null);
  const [qtyByType, setQtyByType] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const inflight = useRef(false);
  const pendingItems = useRef<OrderItem[]>([]);

  useEffect(() => {
    void api.events
      .get(eventId)
      .then((next) => {
        setEvent(next);
        const first = next.ticketTypes.find((type) => api.helpers.typeOnSale(type));
        setQtyByType(
          Object.fromEntries(next.ticketTypes.map((type) => [type.id, type.id === first?.id ? 1 : 0]))
        );
      })
      .catch((err) => {
        const message = userMessage(err);
        setError(message);
        toast(message);
      });
  }, [eventId]);

  const items = useMemo(
    () =>
      mergeOrderItems(
        Object.entries(qtyByType).map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }))
      ),
    [qtyByType]
  );
  const totalCents = event ? orderItemsTotalCents(items, event.ticketTypes) : 0;
  const split = splitParcheFee(totalCents);
  const summary = event ? orderItemsLabel(items, event.ticketTypes) : '';
  const currency = event?.ticketTypes.find((type) => type.id === items[0]?.ticketTypeId)?.currency ?? event?.ticketTypes[0]?.currency;

  function createOrder(selected: OrderItem[]) {
    if (inflight.current || selected.length === 0) return;
    inflight.current = true;
    setBusy(true);
    setError(null);
    void api.tickets
      .createOrder(eventId, selected)
      .then((order) => router.replace(`/orders/${order.id}/pay` as Href))
      .catch((err) => setError(userMessage(err)))
      .finally(() => {
        inflight.current = false;
        setBusy(false);
      });
  }

  function setQty(type: TicketType, next: number) {
    const max = api.helpers.available(type);
    setQtyByType((current) => ({ ...current, [type.id]: Math.max(0, Math.min(max, next)) }));
  }

  if (error && !event) {
    return <LoadError message={error} />;
  }
  if (!event) {
    return (
      <Screen back>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="mt-ds-16 h-8 w-40" />
        <Skeleton className="mt-ds-16 h-24 w-full" />
      </Screen>
    );
  }

  const ended = eventHasEnded(event);
  const canPay = !ended && !busy && items.length > 0;
  const { venue } = eventVenueParts(event.venueName, event.addressText);
  const when = `${formatListingDate(event.startsAt)} · ${eventTimeLabel(event.startsAt, event.endsAt)}`;

  return (
    <View className="flex-1">
      <Screen
        back
        title="Tu boleta"
        lead="El total incluye comisión Parche (10%) e IVA (19%) sobre esa comisión."
        footer={
          <StickyCta>
            <View className="gap-ds-8">
              {ended || items.length === 0 ? null : (
                <View className="flex-row items-end justify-between gap-ds-12">
                  <View className="min-w-0 flex-1">
                    {summary ? (
                      <Text variant="muted" numberOfLines={1}>
                        {summary}
                      </Text>
                    ) : null}
                    <Text variant="caption" className="uppercase text-muted-foreground">
                      Total a pagar
                    </Text>
                  </View>
                  <Text variant="headingSm">{formatMoney(split.charge, currency)}</Text>
                </View>
              )}
              {error ? <Text>{error}</Text> : null}
              <Button
                disabled={!canPay}
                onPress={() => {
                  if (!canPay) return;
                  if (!isLoggedIn) {
                    pendingItems.current = items;
                    setAuthOpen(true);
                    return;
                  }
                  createOrder(items);
                }}>
                <Text>
                  {ended
                    ? 'Finalizado'
                    : busy
                      ? 'Reservando…'
                      : items.length === 0
                        ? 'Elige boletas'
                        : `Pagar ${formatMoney(split.charge, currency)}`}
                </Text>
              </Button>
            </View>
          </StickyCta>
        }>
        {ended ? (
          <View className="mt-ds-16">
            <EndedEventNotice />
          </View>
        ) : null}
        <Surface elevated className="mt-ds-16">
          <View className="flex-row items-center gap-ds-12">
            {event.flyerUrl ? (
              <View className="overflow-hidden rounded-images">
                <FlyerImage uri={event.flyerUrl} className="size-16" aspectRatio={1} />
              </View>
            ) : null}
            <View className="min-w-0 flex-1 gap-ds-4">
              <Text className="font-bold" numberOfLines={2}>
                {event.name}
              </Text>
              <Text variant="muted" numberOfLines={1}>
                {venue} · {when}
              </Text>
            </View>
          </View>
        </Surface>
        <View className="mt-ds-24 gap-ds-12">
          <Text variant="subheading">Elige etapa</Text>
          <Text variant="muted">Cuántas boletas de cada una. Se pagan juntas.</Text>
          {event.ticketTypes.map((type) => {
            const onSale = !ended && api.helpers.typeOnSale(type);
            const left = api.helpers.available(type);
            const qty = qtyByType[type.id] ?? 0;
            const selected = qty > 0 && onSale;
            return (
              <Surface
                key={type.id}
                elevated
                muted={!onSale}
                className={selected ? 'border-aurora' : undefined}>
                <View className="flex-row items-center gap-ds-12">
                  <View className="min-w-0 flex-1 gap-ds-4">
                    <Text className="font-bold">{type.name}</Text>
                    <Text variant="muted">
                      {ended || (!onSale && left > 0)
                        ? 'No disponible'
                        : left === 0
                          ? 'Agotada'
                          : `${left} disponibles`}
                    </Text>
                  </View>
                  <Text variant="subheading">{formatMoney(type.priceCents, type.currency)}</Text>
                  {ended ? null : (
                    <StageQty qty={qty} max={left} disabled={!onSale} onChange={(next) => setQty(type, next)} />
                  )}
                </View>
              </Surface>
            );
          })}
        </View>
        {ended || items.length === 0 ? null : (
          <Surface elevated className="mt-ds-24 gap-ds-12">
            <Text variant="subheading">Qué vas a pagar</Text>
            <Text variant="muted">Precio de las boletas más 10% de Parche e IVA 19% sobre esa comisión.</Text>
            <FeeBreakdown split={split} currency={currency} />
          </Surface>
        )}
      </Screen>
      <AuthSheet
        visible={authOpen}
        inline
        onClose={() => setAuthOpen(false)}
        onSuccess={() => {
          createOrder(pendingItems.current.length > 0 ? pendingItems.current : items);
        }}
      />
    </View>
  );
}
