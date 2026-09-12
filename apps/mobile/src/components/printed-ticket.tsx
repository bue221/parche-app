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
import { formatWhen } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { EventWithExtras, Ticket, TicketType } from '@/data/types';

const HOLES = Array.from({ length: 11 }, (_, i) => i);

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
  const feed = useSharedValue(reduceMotion ? 0 : 320);
  const stamp = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      feed.value = 0;
      stamp.value = 1;
      return;
    }
    feed.value = 320;
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
    transform: [{ rotate: '-12deg' }, { scale: 0.85 + stamp.value * 0.15 }],
  }));

  const code = ticketScanValue(ticket);

  return (
    <View className="min-h-[22rem] overflow-hidden">
      <Animated.View style={paperStyle}>
        <View className="mx-auto w-full max-w-[18rem] bg-paper-white">
          <View className="flex-row justify-between px-ds-8">
            {HOLES.map((hole) => (
              <View key={hole} className="size-2.5 -translate-y-1/2 rounded-full bg-muted" />
            ))}
          </View>
          <View className="gap-ds-16 px-ds-20 pb-ds-20 pt-ds-4">
            <TicketLine delay={220} active={printing} reduce={reduceMotion} className="flex-row justify-between">
              <Text className="font-favorit text-caption font-bold uppercase text-pitch-black">Parche</Text>
              <Text className="font-favorit text-caption font-bold uppercase text-stone">En vivo</Text>
            </TicketLine>
            <TicketLine delay={480} active={printing} reduce={reduceMotion} className="relative">
              <Text className="font-foggy text-[40px] uppercase leading-none text-pitch-black">{event?.name ?? 'Entrada'}</Text>
              <Animated.View
                style={stampStyle}
                className="absolute -right-1 top-3 rounded-sm border-[3px] border-pitch-black bg-confirm px-ds-8 py-ds-4">
                <Text className="font-favorit text-caption font-bold uppercase text-pitch-black">Confirmada</Text>
              </Animated.View>
            </TicketLine>
            <TicketLine delay={760} active={printing} reduce={reduceMotion} className="flex-row flex-wrap gap-ds-12">
              <Meta label="Lugar" value={event?.venueName ?? '—'} />
              <Meta label="Cuando" value={event ? formatWhen(event.startsAt) : '—'} />
            </TicketLine>
            <TicketLine delay={1040} active={printing} reduce={reduceMotion} className="flex-row justify-between border-t border-dashed border-pitch-black/30 pt-ds-16">
              <Text className="font-favorit text-caption font-bold uppercase text-pitch-black">{type?.name ?? 'General'}</Text>
              <Text className="font-favorit text-caption font-bold uppercase text-pitch-black">{code.slice(-8)}</Text>
            </TicketLine>
            <TicketLine delay={1280} active={printing} reduce={reduceMotion}>
              <TicketBarcode value={code} revealed={printing || Boolean(reduceMotion)} label={code.slice(-8)} />
            </TicketLine>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[40%] flex-1">
      <Text className="font-favorit text-caption font-bold uppercase text-stone">{label}</Text>
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
    <Animated.View style={style} className={cn(className)}>
      {children}
    </Animated.View>
  );
}
