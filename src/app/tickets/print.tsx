import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, View } from 'react-native';

import { BackBar } from '@/components/back-bar';
import { LoadError, PendingAuth } from '@/components/feedback';
import { PrintedTicket } from '@/components/printed-ticket';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function TicketPrintScreen() {
  const { orderId, ticketId } = useLocalSearchParams<{ orderId?: string; ticketId?: string }>();
  const ok = useRequireAuth('/tickets/print');
  const [index, setIndex] = useState(0);
  const [printing, setPrinting] = useState(true);
  const [busy, setBusy] = useState(true);
  const [reduce, setReduce] = useState(false);

  const walletQuery = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.tickets.mine(),
    enabled: ok,
  });

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
  }, []);

  const all = walletQuery.data ?? [];
  const unseen = all.filter((t) => t.status === 'valid' && t.token && t.printSeenByUserIds.length === 0);
  let tickets = unseen;
  if (ticketId) {
    tickets = all.filter((t) => t.id === ticketId);
  } else if (orderId) {
    const byOrder = all.filter((t) => t.orderId === orderId && t.status === 'valid');
    tickets = byOrder.length > 0 ? byOrder : unseen;
  }

  const ticket = tickets[index];
  const eventQuery = useQuery({
    queryKey: ['event', ticket?.eventId],
    queryFn: () => api.events.get(ticket!.eventId),
    enabled: Boolean(ticket?.eventId),
  });

  useEffect(() => {
    setPrinting(true);
    setBusy(!reduce);
    const timer = setTimeout(() => setBusy(false), reduce ? 0 : 2200);
    return () => clearTimeout(timer);
  }, [ticket?.id, reduce]);

  async function finish() {
    await api.tickets.markPrintSeen(tickets.map((t) => t.id));
    router.replace('/tickets' as Href);
  }

  if (!ok) {
    return <PendingAuth />;
  }
  if (walletQuery.error) {
    return <LoadError message={userMessage(walletQuery.error)} onRetry={() => void walletQuery.refetch()} />;
  }
  if (walletQuery.isLoading) {
    return (
      <View className="flex-1 bg-background px-ds-16 pt-ds-48">
        <BackBar className="mb-ds-16" />
        <Text>El tiquete está en camino</Text>
      </View>
    );
  }
  if (!ticket) {
    return (
      <View className="flex-1 bg-background px-ds-16 pt-ds-48">
        <BackBar />
        <Text>El tiquete está en camino</Text>
        <Button className="mt-ds-16" onPress={() => router.replace('/tickets' as Href)}>
          <Text>Ir a Tiquetes</Text>
        </Button>
      </View>
    );
  }

  const type = eventQuery.data?.ticketTypes.find((item) => item.id === ticket.ticketTypeId);

  return (
    <View className="flex-1 bg-muted">
      <View className="px-ds-16 pt-ds-48">
        <BackBar />
      </View>
      <View className="mx-auto w-full max-w-sm px-ds-24 py-ds-16">
        <View className="rounded-t-cards bg-pitch-black px-ds-16 py-ds-12">
          <View className="flex-row items-center justify-between">
            <Text className="font-favorit text-caption font-bold uppercase text-paper-white">Parche print</Text>
            <Text className="font-favorit text-caption font-bold uppercase text-paper-white">
              {busy ? 'Live' : 'Listo'}
              {tickets.length > 1 ? ` · ${index + 1}/${tickets.length}` : ''}
            </Text>
          </View>
        </View>
        <View className="h-3 bg-pitch-black">
          <View className="absolute inset-x-3 bottom-0 h-1.5 bg-charcoal" />
        </View>
        <PrintedTicket
          ticket={ticket}
          event={eventQuery.data ?? undefined}
          type={type}
          printing={printing}
          reduceMotion={reduce}
        />
      </View>
      <View className="mt-auto gap-ds-8 px-ds-16 pb-ds-32">
        <Button variant="outline" onPress={() => void finish()}>
          <Text>Saltar</Text>
        </Button>
        {!busy ? (
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
