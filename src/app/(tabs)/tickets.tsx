import { useQueries, useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { EmptyState, ErrorState, PendingAuth, Skeleton } from '@/components/feedback';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { TicketCard } from '@/components/ticket-card';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function WalletScreen() {
  const ok = useRequireAuth('/tickets');
  const { user } = useAuthSnapshot();
  const redirectedPrint = useRef(false);
  const { data: tickets = [], error, refetch, isLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.tickets.mine(),
    enabled: ok,
  });

  const visible = tickets.filter((t) => t.status !== 'cancelled');
  const eventIds = [...new Set(visible.map((t) => t.eventId))];
  const eventQueries = useQueries({
    queries: eventIds.map((eventId) => ({
      queryKey: ['event', eventId],
      queryFn: () => api.events.get(eventId),
      enabled: ok && eventIds.length > 0,
    })),
  });

  useEffect(() => {
    if (!ok || !user || redirectedPrint.current || isLoading) {
      return;
    }
    const pending = api.helpers.pendingPrintTickets(user.id);
    if (pending.length > 0) {
      redirectedPrint.current = true;
      router.replace(`/tickets/print?orderId=${pending[0].orderId}` as Href);
    }
  }, [ok, user, tickets, isLoading]);

  if (!ok) {
    return <PendingAuth />;
  }

  return (
    <Screen>
      <PageHeader
        title="Tiquetes"
        lead="Muéstralos en puerta."
        actions={
          <Button variant="ghost" onPress={() => void refetch()}>
            <Text>Actualizar</Text>
          </Button>
        }
      />
      <View className="mt-ds-24 gap-ds-16">
        {error ? <ErrorState message={userMessage(error)} onRetry={() => void refetch()} /> : null}
        {isLoading ? (
          <>
            <Skeleton className="aspect-[16/10] w-full" />
            <Skeleton className="aspect-[16/10] w-full" />
          </>
        ) : null}
        {visible.length === 0 && !error && !isLoading ? (
          <EmptyState
            title="Tu primera fecha"
            lead="Cuando compres, la boleta queda aquí."
            actionLabel="Agenda"
            onAction={() => router.push('/' as Href)}
          />
        ) : null}
        {visible.map((ticket) => {
          const event = eventQueries.find((q) => q.data?.id === ticket.eventId)?.data;
          return (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              event={event}
              onShow={ticket.status === 'valid' ? () => router.push(`/ticket/${ticket.id}` as Href) : undefined}
            />
          );
        })}
      </View>
    </Screen>
  );
}
