import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { BackBar } from '@/components/back-bar';
import { LoadError, PendingAuth, Skeleton } from '@/components/feedback';
import { PrintedTicket } from '@/components/printed-ticket';
import { Screen } from '@/components/screen';
import { Surface } from '@/components/surface';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { ticketScanValue } from '@/lib/code128';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ok = useRequireAuth(`/ticket/${id}`);
  const ticketQuery = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api.tickets.getTicket(id),
    enabled: ok && Boolean(id),
  });
  const ticket = ticketQuery.data;
  const eventQuery = useQuery({
    queryKey: ['event', ticket?.eventId],
    queryFn: () => api.events.get(ticket!.eventId),
    enabled: Boolean(ticket?.eventId),
  });

  useEffect(() => {
    if (ticket?.status === 'valid' && ticket.token && ticket.printSeenByUserIds.length === 0) {
      router.replace(`/tickets/print?ticketId=${ticket.id}` as Href);
    }
  }, [ticket]);

  if (!ok) {
    return <PendingAuth />;
  }
  if (ticketQuery.error) {
    return <LoadError message={userMessage(ticketQuery.error)} onRetry={() => void ticketQuery.refetch()} />;
  }
  if (!ticket || ticketQuery.isLoading) {
    return (
      <Screen back>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-ds-16 h-72 w-full" />
      </Screen>
    );
  }

  const live = ticket.status === 'valid' && Boolean(ticketScanValue(ticket));
  const type = eventQuery.data?.ticketTypes.find((item) => item.id === ticket.ticketTypeId);

  return (
    <Screen>
      <BackBar />
      <View className="items-center gap-ds-16">
        <Text variant="heading">Tu entrada</Text>
        <Surface muted className="w-full overflow-hidden bg-muted p-ds-16">
          {live ? (
            <PrintedTicket ticket={ticket} event={eventQuery.data ?? undefined} type={type} printing reduceMotion />
          ) : (
            <Text>Ya ingresaste o el código no está vivo.</Text>
          )}
        </Surface>
        {ticket.status === 'used' ? <Text variant="muted">Ya ingresaste</Text> : null}
        {live ? (
          <Button variant="outline" onPress={() => router.push(`/ticket/${id}/transfer` as Href)}>
            <Text>Ceder</Text>
          </Button>
        ) : null}
        <Button variant="ghost" onPress={() => router.push(`/tickets/print?ticketId=${id}` as Href)}>
          <Text>Ver impresión</Text>
        </Button>
      </View>
    </Screen>
  );
}
