import { useLayoutEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { PressScale } from '@/components/motion';
import { TicketBarcode } from '@/components/ticket-barcode';
import { TicketQr } from '@/components/ticket-qr';
import { Text } from '@/components/ui/text';
import type { EventWithExtras, Ticket, TicketType } from '@/data/types';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useTheme } from '@/hooks/use-theme';
import { ticketScanValue } from '@/lib/code128';
import { boletaCountLabel, ticketStubCode } from '@/lib/ticket-label';
import { cn } from '@/lib/utils';

export function TicketPass({
  ticket,
  event,
  type,
}: {
  ticket: Ticket;
  event?: EventWithExtras;
  type?: TicketType;
}) {
  const code = ticketScanValue(ticket);
  const stub = ticketStubCode(event?.name, ticket.id);
  const live = ticket.status === 'valid' && Boolean(code);

  return (
    <View className="w-full overflow-hidden rounded-cards bg-paper-white px-ds-20 py-ds-24">
      <View className="gap-ds-8">
        <Text className="font-favorit text-caption font-bold uppercase tracking-favorit text-stone">
          {type?.name ?? 'General'}
        </Text>
        <Text
          className="font-foggy text-[40px] uppercase leading-[0.85] text-pitch-black"
          numberOfLines={2}>
          {event?.name ?? 'Entrada'}
        </Text>
      </View>
      <View className={`mt-ds-24 items-center ${live ? '' : 'opacity-40'}`}>
        {live ? (
          <TicketQr token={code} revealed size={220} />
        ) : (
          <View className="h-[220px] w-[220px] items-center justify-center bg-muted">
            <Text variant="helper">Sin código vivo</Text>
          </View>
        )}
      </View>
      <View className="mt-ds-20">
        <TicketBarcode value={live ? code : ''} revealed={live} label={stub} height={96} />
      </View>
    </View>
  );
}

function typeFor(event: EventWithExtras | undefined, ticketTypeId: string) {
  return event?.ticketTypes.find((item) => item.id === ticketTypeId);
}

/** Full-width snap of passes for one event. One boleta visible at a time. */
export function TicketPassPager({
  tickets,
  event,
  currentId,
  onChange,
}: {
  tickets: Ticket[];
  event?: EventWithExtras;
  currentId: string;
  onChange?: (ticketId: string) => void;
}) {
  const theme = useTheme();
  const compact = useCompactLayout();
  const reduce = useReduceMotion();
  const listRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const count = tickets.length;
  const currentIndex = Math.max(
    0,
    tickets.findIndex((ticket) => ticket.id === currentId)
  );
  const [index, setIndex] = useState(currentIndex);
  const paged = count > 1 && width > 0;

  useLayoutEffect(() => {
    setIndex(currentIndex);
    if (width <= 0 || count <= 1) return;
    listRef.current?.scrollTo({ x: currentIndex * width, animated: false });
  }, [currentIndex, width, count]);

  const scrollTo = (next: number) => {
    const clamped = Math.max(0, Math.min(count - 1, next));
    setIndex(clamped);
    const ticket = tickets[clamped];
    if (ticket && ticket.id !== currentId) onChange?.(ticket.id);
    if (width <= 0) return;
    listRef.current?.scrollTo({ x: clamped * width, animated: !reduce });
  };

  const onScrollEnd = (nativeEvent: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    const next = Math.round(nativeEvent.nativeEvent.contentOffset.x / width);
    const clamped = Math.max(0, Math.min(count - 1, next));
    setIndex(clamped);
    const ticket = tickets[clamped];
    if (ticket && ticket.id !== currentId) onChange?.(ticket.id);
  };

  if (count === 0) return null;

  const eventName = event?.name ?? 'Entrada';
  const pass = (ticket: Ticket) => (
    <View className="w-full rounded-cards bg-charcoal p-ds-8">
      <TicketPass ticket={ticket} event={event} type={typeFor(event, ticket.ticketTypeId)} />
    </View>
  );

  return (
    <View
      className="w-full gap-ds-12"
      onLayout={(layoutEvent) => {
        const next = Math.round(layoutEvent.nativeEvent.layout.width);
        if (next > 0 && next !== width) setWidth(next);
      }}>
      {paged ? (
        <ScrollView
          ref={listRef}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          directionalLockEnabled
          disableIntervalMomentum
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          onScrollEndDrag={onScrollEnd}
          style={
            Platform.OS === 'web'
              ? ({ width, scrollSnapType: 'x mandatory' } as object)
              : { width }
          }
          accessibilityLabel={`${eventName}, ${boletaCountLabel(count)}. Boleta ${index + 1} de ${count}. Desliza a los lados para cambiar.`}>
          {tickets.map((ticket) => (
            <View
              key={ticket.id}
              style={[
                { width, paddingHorizontal: 16 },
                Platform.OS === 'web' ? ({ scrollSnapAlign: 'start', scrollSnapStop: 'always' } as object) : undefined,
              ]}>
              {pass(ticket)}
            </View>
          ))}
        </ScrollView>
      ) : (
        <View className="px-ds-16">{pass(tickets[currentIndex] ?? tickets[0])}</View>
      )}
      {count > 1 ? (
        <View className="flex-row items-center gap-ds-8 px-ds-16">
          {!compact ? (
            <PressScale
              fit
              disabled={index === 0}
              onPress={() => scrollTo(index - 1)}
              accessibilityLabel="Boleta anterior">
              <View className={cn('size-11 items-center justify-center', index === 0 && 'opacity-30')}>
                <ChevronLeft size={22} color={theme.text} strokeWidth={2} />
              </View>
            </PressScale>
          ) : null}
          <View className="min-w-0 flex-1 flex-row items-center justify-center gap-ds-4">
            {tickets.map((ticket, ticketIndex) => (
              <Pressable
                key={ticket.id}
                accessibilityRole="button"
                accessibilityLabel={`Boleta ${ticketIndex + 1} de ${count}`}
                hitSlop={12}
                onPress={() => scrollTo(ticketIndex)}
                className="size-11 items-center justify-center">
                <View className={cn('size-2 rounded-full', ticketIndex === index ? 'bg-aurora' : 'bg-muted')} />
              </Pressable>
            ))}
          </View>
          <Text variant="helper" className="shrink-0">
            {index + 1} de {count}
          </Text>
          {!compact ? (
            <PressScale
              fit
              disabled={index === count - 1}
              onPress={() => scrollTo(index + 1)}
              accessibilityLabel="Boleta siguiente">
              <View className={cn('size-11 items-center justify-center', index === count - 1 && 'opacity-30')}>
                <ChevronRight size={22} color={theme.text} strokeWidth={2} />
              </View>
            </PressScale>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
