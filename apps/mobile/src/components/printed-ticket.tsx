import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { TicketBarcode } from '@/components/ticket-barcode';
import { Text } from '@/components/ui/text';
import { ticketScanValue } from '@/lib/code128';
import { cityFromAddress, formatTicketDate, formatTicketTime, ticketStubCode } from '@/lib/ticket-label';
import { cn } from '@/lib/utils';
import type { EventWithExtras, Ticket, TicketType } from '@/data/types';

const HOLES = Array.from({ length: 15 }, (_, i) => i);

export function PrintedTicket({
  ticket,
  event,
  type,
  printing,
  reduceMotion,
}: {
  ticket: Ticket;
  event?: EventWithExtras;
  type?: TicketType;
  printing: boolean;
  reduceMotion?: boolean;
}) {
  const feed = useSharedValue(reduceMotion ? 0 : 420);
  const stamp = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      feed.value = 0;
      stamp.value = 1;
      return;
    }
    feed.value = 420;
    stamp.value = 0;
    if (printing) {
      feed.value = withTiming(0, { duration: 1100 });
      stamp.value = withDelay(1550, withSpring(1, { damping: 12, stiffness: 180 }));
    }
  }, [printing, reduceMotion, ticket.id, feed, stamp]);

  const paperStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -feed.value }],
  }));
  const stampStyle = useAnimatedStyle(() => ({
    opacity: stamp.value,
    transform: [{ rotate: '-22deg' }, { scale: 0.85 + stamp.value * 0.15 }],
  }));

  const code = ticketScanValue(ticket);
  const stub = ticketStubCode(event?.name, ticket.id);

  return (
    <View className="min-h-[26rem] overflow-hidden">
      <Animated.View style={paperStyle}>
        <View className="w-full bg-paper-white">
          <View className="flex-row justify-between px-ds-12 pt-ds-8">
            {HOLES.map((hole) => (
              <View key={hole} className="size-2 rounded-full bg-charcoal" />
            ))}
          </View>
          <View className="relative gap-ds-16 px-ds-20 pb-ds-24 pt-ds-8">
            <TicketLine delay={220} active={printing} reduce={reduceMotion} className="flex-row justify-between">
              <Text className="font-favorit text-caption font-bold uppercase tracking-favorit text-pitch-black">
                Parche
              </Text>
              <Text className="font-favorit text-caption font-bold uppercase tracking-favorit text-stone">
                En vivo
              </Text>
            </TicketLine>
            <View className="relative">
              <TicketLine delay={480} active={printing} reduce={reduceMotion}>
                <Text
                  className="pr-16 font-foggy text-[44px] uppercase leading-[0.85] text-pitch-black"
                  numberOfLines={2}>
                  {event?.name ?? 'Entrada'}
                </Text>
              </TicketLine>
              <Animated.View
                pointerEvents="none"
                style={[stampStyle, { position: 'absolute', right: -4, top: 12, zIndex: 2 }]}>
                <View className="rounded-sm border-[3px] border-pitch-black bg-confirm px-ds-8 py-ds-4">
                  <Text className="font-favorit text-caption font-bold uppercase tracking-favorit text-pitch-black">
                    Confirmada
                  </Text>
                </View>
              </Animated.View>
            </View>
            <TicketLine delay={760} active={printing} reduce={reduceMotion} className="flex-row gap-ds-12">
              <Meta label="Lugar" value={event?.venueName ?? '—'} />
              <Meta label="Ciudad" value={cityFromAddress(event?.addressText)} />
            </TicketLine>
            <TicketLine delay={980} active={printing} reduce={reduceMotion} className="flex-row gap-ds-12">
              <Meta label="Fecha" value={event ? formatTicketDate(event.startsAt) : '—'} />
              <Meta label="Hora" value={event ? formatTicketTime(event.startsAt) : '—'} />
            </TicketLine>
            <TicketLine
              delay={1180}
              active={printing}
              reduce={reduceMotion}
              className="flex-row items-center justify-between border-t border-dashed border-pitch-black/25 pt-ds-16">
              <Text className="font-favorit text-body-sm font-bold uppercase tracking-favorit text-pitch-black">
                Puerta
              </Text>
              <Text className="font-favorit text-body-sm font-bold uppercase tracking-favorit text-pitch-black">
                {type?.name ?? 'General'}
              </Text>
            </TicketLine>
            <TicketLine delay={1380} active={printing} reduce={reduceMotion}>
              <TicketBarcode value={code} revealed={printing || Boolean(reduceMotion)} label={stub} height={96} />
            </TicketLine>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-1/2 pr-ds-8">
      <Text className="font-favorit text-caption font-bold uppercase tracking-favorit text-stone">{label}</Text>
      <Text className="font-favorit text-body-sm font-bold uppercase text-pitch-black" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function TicketLine({
  children,
  delay,
  active,
  reduce,
  className,
}: {
  children: ReactNode;
  delay: number;
  active: boolean;
  reduce?: boolean;
  className?: string;
}) {
  const opacity = useSharedValue(reduce ? 1 : 0);
  const y = useSharedValue(reduce ? 0 : -8);

  useEffect(() => {
    if (reduce) {
      opacity.value = 1;
      y.value = 0;
      return;
    }
    opacity.value = 0;
    y.value = -8;
    if (active) {
      opacity.value = withDelay(delay, withTiming(1, { duration: 280 }));
      y.value = withDelay(delay, withTiming(0, { duration: 280 }));
    }
  }, [active, delay, reduce, opacity, y]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View style={style}>
      <View className={cn(className)}>{children}</View>
    </Animated.View>
  );
}
