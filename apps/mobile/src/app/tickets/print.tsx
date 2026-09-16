import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorState, PendingAuth } from '@/components/feedback';
import { PrintedTicket } from '@/components/printed-ticket';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { cn } from '@/lib/utils';

export default function TicketPrintScreen() {
  const { orderId, ticketId } = useLocalSearchParams<{ orderId?: string; ticketId?: string }>();
  const ok = useRequireAuth('/tickets/print');
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const [index, setIndex] = useState(0);
  const [printing, setPrinting] = useState(true);
  const [busy, setBusy] = useState(true);
  const [cycle, setCycle] = useState(0);

  const walletQuery = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.tickets.mine(),
    enabled: ok,
  });

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
  }, [ticket?.id, reduce, cycle]);

  async function finish() {
    await api.tickets.markPrintSeen(tickets.map((t) => t.id));
    router.replace('/tickets' as Href);
  }

  function replay() {
    setCycle((current) => current + 1);
  }

  if (!ok) {
    return <PendingAuth />;
  }
  if (walletQuery.error) {
    return (
      <MachineScreen insets={insets}>
        <BackLink />
        <ErrorState message={userMessage(walletQuery.error)} onRetry={() => void walletQuery.refetch()} />
      </MachineScreen>
    );
  }
  if (walletQuery.isLoading) {
    return (
      <MachineScreen insets={insets}>
        <BackLink />
        <Text className="mt-ds-24 text-center text-paper-white">El tiquete está en camino</Text>
      </MachineScreen>
    );
  }
  if (!ticket) {
    return (
      <MachineScreen insets={insets}>
        <BackLink />
        <Text className="mt-ds-24 text-center text-paper-white">El tiquete está en camino</Text>
        <Button className="mt-ds-16 bg-paper-white" onPress={() => router.replace('/tickets' as Href)}>
          <Text className="text-pitch-black">Ir a Tiquetes</Text>
        </Button>
      </MachineScreen>
    );
  }

  const type = eventQuery.data?.ticketTypes.find((item) => item.id === ticket.ticketTypeId);

  return (
    <MachineScreen insets={insets}>
      <StatusBar style="light" />
      <BackLink />
      <View className="flex-1 items-center justify-center">
        <View className="w-full max-w-[20rem]" style={{ width: '100%', maxWidth: 320 }}>
          <View className="z-10 bg-pitch-black px-ds-20 pt-ds-12" style={{ borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View className="flex-row items-center justify-between">
              <Text className="font-favorit text-caption font-bold uppercase tracking-favorit text-paper-white">
                Parche print
              </Text>
              <View className="flex-row items-center gap-ds-8">
                <View className={cn('size-2 rounded-full', busy ? 'bg-stone' : 'bg-confirm')} />
                <Text
                  className={cn(
                    'font-favorit text-caption font-bold uppercase tracking-favorit',
                    busy ? 'text-paper-white' : 'text-confirm'
                  )}>
                  {busy ? 'Live' : 'Listo'}
                  {tickets.length > 1 ? ` · ${index + 1}/${tickets.length}` : ''}
                </Text>
              </View>
            </View>
          </View>
          <View className="z-10 bg-pitch-black px-ds-16 pb-ds-8 pt-ds-12">
            <View className="h-[3px] rounded-full bg-charcoal" />
          </View>
          <View className="z-0 overflow-hidden" style={{ width: '100%' }}>
            <View style={{ marginHorizontal: 8 }}>
              <PrintedTicket
                key={`${ticket.id}-${cycle}`}
                ticket={ticket}
                event={eventQuery.data ?? undefined}
                type={type}
                printing={printing}
                reduceMotion={reduce}
              />
            </View>
          </View>
        </View>
      </View>
      <View className="gap-ds-8 pb-ds-8">
        {busy ? (
          <Button variant="ghost" className="active:bg-white/10" onPress={() => void finish()}>
            <Text className="text-paper-white/70">Saltar</Text>
          </Button>
        ) : (
          <>
            <Button variant="ghost" className="active:bg-white/10" onPress={replay}>
              <Text className="text-paper-white">Imprimir de nuevo</Text>
            </Button>
            {tickets[index + 1] ? (
              <Button className="bg-paper-white" onPress={() => setIndex((i) => i + 1)}>
                <Text className="text-pitch-black">Siguiente</Text>
              </Button>
            ) : (
              <Button className="bg-paper-white" onPress={() => void finish()}>
                <Text className="text-pitch-black">Ir a Tiquetes</Text>
              </Button>
            )}
          </>
        )}
      </View>
    </MachineScreen>
  );
}

function MachineScreen({
  children,
  insets,
}: {
  children: ReactNode;
  insets: { top: number; bottom: number };
}) {
  return (
    <View
      className="flex-1 bg-charcoal px-ds-24"
      style={{ paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }}>
      {children}
    </View>
  );
}

function BackLink() {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/tickets' as Href))}
      className="min-h-11 self-start items-start justify-center py-ds-8 active:opacity-70">
      <Text className="font-favorit text-caption font-bold uppercase tracking-favorit text-paper-white">
        ← Volver
      </Text>
    </Pressable>
  );
}
