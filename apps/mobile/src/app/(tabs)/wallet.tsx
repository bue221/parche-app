import { useQueries, useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { Screen } from '@/components/screen';
import { Surface } from '@/components/surface';
import { TicketCard, TicketFeed } from '@/components/ticket-card';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSheet } from '@/data/auth-sheet-store';
import { useAuthSnapshot } from '@/data/session';

export default function WalletScreen() {
  const { isLoggedIn, user, hydrated } = useAuthSnapshot();
  const openAuth = useAuthSheet((s) => s.open);
  const redirectedPrint = useRef(false);

  const { data: tickets = [], error, refetch, isLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.tickets.mine(),
    enabled: hydrated && isLoggedIn,
  });

  const visible = tickets.filter((t) => t.status !== 'cancelled');
  const ticketEventIds = [...new Set(visible.map((t) => t.eventId))];
  const eventQueries = useQueries({
    queries: ticketEventIds.map((eventId) => ({
      queryKey: ['event', eventId],
      queryFn: () => api.events.get(eventId),
      enabled: isLoggedIn && ticketEventIds.length > 0,
    })),
  });

  useEffect(() => {
    if (!isLoggedIn || !user || redirectedPrint.current || isLoading) {
      return;
    }
    const pending = api.helpers.pendingPrintTickets(user.id);
    if (pending.length > 0) {
      redirectedPrint.current = true;
      router.replace(`/tickets/print?orderId=${pending[0].orderId}` as Href);
    }
  }, [isLoggedIn, user, tickets, isLoading]);

  if (!hydrated) {
    return (
      <Screen title="Boletas" lead="Muéstralos en puerta.">
        <View className="mt-ds-24">
          <Skeleton className="aspect-[16/10] w-full max-w-[400px]" />
        </View>
      </Screen>
    );
  }

  const needsProfile = Boolean(isLoggedIn && user && !user.phone && visible.some((t) => t.status === 'valid'));

  return (
    <Screen title="Boletas" lead="Muéstralos en puerta.">
      <View className="mt-ds-24 gap-ds-16">
        {needsProfile ? (
          <Surface elevated onPress={() => router.push('/parche/completar-perfil' as Href)}>
            <Text variant="subheading">Completa tu perfil</Text>
            <Text variant="muted">Nombre y teléfono, cuando quieras. No bloquea tu QR.</Text>
          </Surface>
        ) : null}
        {!isLoggedIn ? (
          <Surface elevated className="gap-ds-12">
            <Text variant="subheading">Entra para ver tus QRs</Text>
            <Text variant="muted">Puedes explorar y guardar fechas sin cuenta.</Text>
            <Button variant="outline" onPress={() => openAuth()}>
              <Text>Entrar</Text>
            </Button>
          </Surface>
        ) : (
          <>
            {error ? <ErrorState message={userMessage(error)} onRetry={() => void refetch()} /> : null}
            {visible.length === 0 && !error && !isLoading ? (
              <EmptyState
                title="Tu primera fecha"
                lead="Cuando compres, la boleta queda aquí."
                actionLabel="Explorar"
                onAction={() => router.push('/' as Href)}
              />
            ) : null}
            {isLoading || visible.length > 0 ? (
              <TicketFeed>
                {isLoading ? (
                  <>
                    <Skeleton className="aspect-[16/10] w-full max-w-[400px]" />
                    <Skeleton className="aspect-[16/10] w-full max-w-[400px]" />
                  </>
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
              </TicketFeed>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}
