import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AccessibilityInfo } from 'react-native';

import { Screen } from '@/components/screen';
import { TicketQr } from '@/components/ticket-qr';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { getSnapshot } from '@/data/mock/store';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { formatWhen } from '@/lib/format';
import { shortId as idTail } from '@/data/ids';
import type { Ticket } from '@/data/types';

export default function TicketPrintScreen() {
  const { orderId, ticketId } = useLocalSearchParams<{ orderId?: string; ticketId?: string }>();
  const ok = useRequireAuth('/tickets/print');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState(0);
  const [reduce, setReduce] = useState(false);
  const height = useSharedValue(0);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
  }, []);

  useEffect(() => {
    void api.tickets.mine().then((all) => {
      const mine = all.filter((t) => {
        if (ticketId) {
          return t.id === ticketId;
        }
        if (orderId) {
          return t.orderId === orderId && t.status === 'valid';
        }
        return t.status === 'valid' && t.token && t.printSeenByUserIds.length === 0;
      });
      setTickets(mine);
    });
  }, [orderId, ticketId]);

  const ticket = tickets[index];
  const event = ticket ? getSnapshot().events.find((e) => e.id === ticket.eventId) : undefined;
  const type = ticket ? getSnapshot().ticketTypes.find((t) => t.id === ticket.ticketTypeId) : undefined;

  useEffect(() => {
    if (!ticket) {
      return;
    }
    if (reduce) {
      setPhase(7);
      height.value = 280;
      return;
    }
    setPhase(0);
    height.value = 0;
    const steps = [300, 1100, 1600, 2100, 2600, 2900, 3300];
    const timers = steps.map((ms, i) =>
      setTimeout(() => {
        setPhase(i + 1);
        if (i === 0) {
          height.value = withTiming(280, { duration: 1000 });
        }
      }, ms)
    );
    return () => timers.forEach(clearTimeout);
  }, [ticket?.id, reduce, height]);

  const paperStyle = useAnimatedStyle(() => ({ height: height.value, overflow: 'hidden' }));
  const qrReady = phase >= 5;
  const confirm = phase >= 7;

  async function finish() {
    await api.tickets.markPrintSeen(tickets.map((t) => t.id));
    router.replace('/tickets' as Href);
  }

  if (!ok) {
    return null;
  }

  if (!ticket) {
    return (
      <Screen>
        <Text>El tiquete está en camino</Text>
        <Button className="mt-ds-16" onPress={() => router.replace('/tickets' as Href)}>
          <Text>Ir a Tiquetes</Text>
        </Button>
      </Screen>
    );
  }

  return (
    <View className="flex-1 bg-pitch-black">
      <View className="items-center pt-ds-48">
        <Text variant="caption" className="text-paper-white">
          {tickets.length > 1 ? `${index + 1} / ${tickets.length}` : 'IMPRESORA'}
        </Text>
        <View className="mt-ds-16 h-2 w-24 bg-paper-white" />
        <Animated.View style={paperStyle} className="mt-ds-8 w-72 bg-paper-white">
          <View className="p-ds-16">
            {phase >= 2 ? (
              <Text className="text-pitch-black" variant="headingSm">
                {event?.name}
              </Text>
            ) : null}
            {phase >= 3 ? (
              <>
                <Text className="text-pitch-black" variant="caption">
                  {event ? formatWhen(event.startsAt) : ''} · {event?.venueName}
                </Text>
                <Text className="text-pitch-black">{type?.name}</Text>
                <Text className="text-pitch-black" variant="helper">
                  ORDEN · {idTail(ticket.orderId)}
                </Text>
              </>
            ) : null}
            <View className="mt-ds-12">
              <TicketQr token={ticket.token} revealed={qrReady} />
            </View>
          </View>
        </Animated.View>
      </View>
      {confirm ? (
        <View className="mt-ds-16 items-center bg-confirm px-ds-16 py-ds-8">
          <Text className="text-pitch-black">Tiquete impreso</Text>
        </View>
      ) : null}
      <View className="mt-auto gap-ds-8 px-ds-16 pb-ds-32">
        <Button variant="outline" onPress={() => void finish()}>
          <Text>Saltar</Text>
        </Button>
        {confirm ? (
          tickets[index + 1] ? (
            <Button onPress={() => setIndex((i) => i + 1)}>
              <Text>Siguiente</Text>
            </Button>
          ) : (
            <Button onPress={() => void finish()}>
              <Text>Ir a Tiquetes</Text>
            </Button>
          )
        ) : null}
      </View>
    </View>
  );
}
