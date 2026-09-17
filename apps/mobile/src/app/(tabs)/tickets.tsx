import { useQueries, useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { ArtistRow } from '@/components/artist-row';
import { Chip, ChipRow } from '@/components/chip-row';
import { EventCard, EventFeed } from '@/components/event-card';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { Screen } from '@/components/screen';
import { Surface } from '@/components/surface';
import { TicketCard, TicketFeed } from '@/components/ticket-card';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSheet } from '@/data/auth-sheet-store';
import { useInterestStore } from '@/data/interest-store';
import { useAuthSnapshot } from '@/data/session';

type Segment = 'saved' | 'tickets';

export default function WalletScreen() {
  const { isLoggedIn, user, hydrated } = useAuthSnapshot();
  const openAuth = useAuthSheet((s) => s.open);
  const [segment, setSegment] = useState<Segment>('saved');
  const redirectedPrint = useRef(false);
  const artistIds = useInterestStore((s) => s.artistIds);
  const eventIds = useInterestStore((s) => s.eventIds);
  const { data: tickets = [], error, refetch, isLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.tickets.mine(),
    enabled: hydrated && isLoggedIn && segment === 'tickets',
  });
  const savedQuery = useQuery({
    queryKey: ['saved-events'],
    queryFn: () => api.events.saved(),
    enabled: hydrated && isLoggedIn,
  });
  const followingQuery = useQuery({
    queryKey: ['following'],
    queryFn: () => api.artists.following(),
    enabled: hydrated && isLoggedIn,
  });
  const localEvents = useQueries({
    queries: eventIds.map((eventId) => ({
      queryKey: ['event', eventId],
      queryFn: () => api.events.get(eventId),
      enabled: eventIds.length > 0,
    })),
  });
  const localArtists = useQueries({
    queries: artistIds.map((artistId) => ({
      queryKey: ['artist', artistId],
      queryFn: () => api.artists.get(artistId),
      enabled: artistIds.length > 0,
    })),
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

  const savedEvents = [
    ...(savedQuery.data ?? []),
    ...localEvents.map((q) => q.data).filter((e): e is NonNullable<typeof e> => Boolean(e)),
  ].filter((event, index, list) => list.findIndex((row) => row.id === event.id) === index);
  const savedArtists = [
    ...(followingQuery.data ?? []),
    ...localArtists.map((q) => q.data).filter((a): a is NonNullable<typeof a> => Boolean(a)),
  ].filter((artist, index, list) => list.findIndex((row) => row.id === artist.id) === index);

  useEffect(() => {
    if (!isLoggedIn || !user || redirectedPrint.current || isLoading || segment !== 'tickets') {
      return;
    }
    const pending = api.helpers.pendingPrintTickets(user.id);
    if (pending.length > 0) {
      redirectedPrint.current = true;
      router.replace(`/tickets/print?orderId=${pending[0].orderId}` as Href);
    }
  }, [isLoggedIn, user, tickets, isLoading, segment]);

  if (!hydrated) {
    return (
      <Screen title="Guardados" lead="Tus fechas y boletas.">
        <View className="mt-ds-24">
          <Skeleton className="aspect-[16/10] w-full max-w-[400px]" />
        </View>
      </Screen>
    );
  }

  const needsProfile = Boolean(isLoggedIn && user && !user.phone && visible.some((t) => t.status === 'valid'));

  return (
    <Screen title="Guardados" lead={segment === 'saved' ? 'Lo que te interesa.' : 'Muéstralos en puerta.'}>
      <View className="mt-ds-16">
        <ChipRow>
          <Chip label="Guardados" selected={segment === 'saved'} onPress={() => setSegment('saved')} />
          <Chip label="Boletas" selected={segment === 'tickets'} onPress={() => setSegment('tickets')} />
        </ChipRow>
      </View>
      {segment === 'saved' ? (
        <View className="mt-ds-24 gap-ds-24">
          {savedEvents.length === 0 && savedArtists.length === 0 ? (
            <EmptyState title="Nada guardado aún" lead="Sigue un artista o guarda una fecha desde el detalle." />
          ) : null}
          {savedEvents.length > 0 ? (
            <View className="gap-ds-12">
              <Text variant="headingSm">Fechas</Text>
              <EventFeed>
                {savedEvents.map((event) => (
                  <EventCard key={event.id} event={event} onPress={() => router.push(`/event/${event.id}` as Href)} />
                ))}
              </EventFeed>
            </View>
          ) : null}
          {savedArtists.length > 0 ? (
            <View className="gap-ds-12">
              <Text variant="headingSm">Artistas</Text>
              {savedArtists.map((artist) => (
                <ArtistRow key={artist.id} artist={artist} onPress={() => router.push(`/artist/${artist.id}` as Href)} />
              ))}
            </View>
          ) : null}
        </View>
      ) : (
        <View className="mt-ds-24 gap-ds-16">
          {needsProfile ? (
            <Surface
              elevated
              onPress={() => router.push('/parche/completar-perfil' as Href)}>
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
      )}
    </Screen>
  );
}
