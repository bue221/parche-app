import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, View } from 'react-native';

import { ArtistRow } from '@/components/artist-row';
import { BackBar } from '@/components/back-bar';
import { EventStaffSheet, buildEventStaffActions } from '@/components/event-staff-actions';
import { ErrorState, Skeleton } from '@/components/feedback';
import { FlyerImage } from '@/components/flyer-image';
import { OsmMap } from '@/components/osm-map';
import { Screen } from '@/components/screen';
import { StickyCta } from '@/components/sticky-cta';
import { Surface } from '@/components/surface';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { formatMoney, formatWhen, statusLabel } from '@/lib/format';
import type { EventWithExtras } from '@/data/types';

function BuyRow({
  onSale,
  lowest,
  emptyTickets,
  onBuy,
}: {
  onSale: EventWithExtras['ticketTypes'];
  lowest?: EventWithExtras['ticketTypes'][number];
  emptyTickets: boolean;
  onBuy: () => void;
}) {
  return (
    <View className="flex-row items-center gap-ds-12">
      <View className="min-w-0 flex-1">
        <Text variant="caption" className="uppercase text-muted-foreground">
          {onSale.length > 0 ? 'Desde' : emptyTickets ? 'Boleta' : 'Pronto'}
        </Text>
        <Text variant="subheading" numberOfLines={1}>
          {lowest ? formatMoney(lowest.priceCents, lowest.currency) : 'Sin venta'}
        </Text>
      </View>
      <Button disabled={onSale.length === 0} onPress={onBuy}>
        <Text>{onSale.length > 0 ? 'Comprar' : 'Pronto'}</Text>
      </Button>
    </View>
  );
}

export default function EventDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const compact = useCompactLayout();
  const wide = Platform.OS === 'web' && !compact;
  const { isLoggedIn, user, memberships } = useAuthSnapshot();
  const [playing, setPlaying] = useState<string | null>(null);
  const [staffOpen, setStaffOpen] = useState(false);
  const { data: event, error, refetch, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.events.get(id),
    enabled: Boolean(id),
  });

  const mapEvents = useMemo(() => (event ? [event] : []), [event]);
  const mapPin = useMemo(
    () => (event?.lat != null && event?.lng != null ? { lat: event.lat, lng: event.lng } : undefined),
    [event?.lat, event?.lng]
  );

  if (error && !event) {
    return (
      <Screen>
        <BackBar />
        <ErrorState message={userMessage(error) || 'Esta fecha ya no está'} onRetry={() => void refetch()} />
      </Screen>
    );
  }
  if (!event || isLoading) {
    return (
      <Screen>
        <BackBar />
        <View className={wide ? 'flex-row items-start gap-ds-40' : 'gap-ds-16'}>
          <Skeleton className={wide ? 'aspect-[4/5] w-[42%] max-w-[480px]' : 'aspect-[4/5] w-full'} />
          <View className={wide ? 'flex-1 gap-ds-12' : undefined}>
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="mt-ds-8 h-4 w-1/2" />
            <Skeleton className="mt-ds-16 h-24 w-full" />
          </View>
        </View>
      </Screen>
    );
  }

  const write = user ? api.helpers.can(user.id, event.id, 'event.write') : false;
  const door = user ? api.helpers.can(user.id, event.id, 'event.door.scan') : false;
  const metrics = user ? api.helpers.can(user.id, event.id, 'event.metrics.read') : false;
  const manageTickets = user ? api.helpers.can(user.id, event.id, 'event.tickets.manage') : false;
  const manageMembers = user ? api.helpers.can(user.id, event.id, 'event.members.manage') : false;
  const onSale = event.ticketTypes.filter((t) => api.helpers.typeOnSale(t));
  const staff = write || door || metrics || manageTickets || manageMembers;
  const lowest = onSale[0];
  const membership = memberships.find((m) => m.eventId === event.id && m.status === 'active');
  const staffRole = membership?.role ?? (write ? 'manager' : door ? 'door' : 'metrics');
  const staffActions = user && staff
    ? buildEventStaffActions({ userId: user.id, eventId: event.id, role: staffRole, event })
    : null;

  function goCheckout() {
    if (!isLoggedIn) {
      router.push('/auth/login' as Href);
      return;
    }
    router.push(`/checkout/${event!.id}` as Href);
  }

  const flyer = event.flyerUrl ? (
    <View className="overflow-hidden rounded-images bg-muted">
      <FlyerImage uri={event.flyerUrl} className="w-full" aspectRatio={4 / 5} />
    </View>
  ) : (
    <View className="aspect-[4/5] w-full items-center justify-center rounded-images bg-muted">
      <Text variant="heading">{event.name.slice(0, 2).toUpperCase()}</Text>
    </View>
  );

  const meta = (
    <View className="gap-ds-12">
      <View className="flex-row flex-wrap gap-ds-8">
        <Tag inverted={event.status === 'published'} tone={event.status === 'published' ? 'ink' : 'muted'}>
          {statusLabel(event.status)}
        </Tag>
        {event.genre ? <Tag tone="muted">{event.genre}</Tag> : null}
      </View>
      <Text variant="caption" className="uppercase text-muted-foreground">
        {formatWhen(event.startsAt)}
      </Text>
      <Text variant="heading">{event.name}</Text>
      <Text variant="muted">
        {event.venueName}
        {event.addressText ? ` · ${event.addressText}` : ''}
      </Text>
      {event.description ? <Text>{event.description}</Text> : null}
    </View>
  );

  const tickets = (
    <Surface muted className="gap-ds-12">
      {onSale.length > 0 ? (
        onSale.map((type) => (
          <View key={type.id} className="flex-row items-baseline justify-between gap-ds-8">
            <Text>{type.name}</Text>
            <Text variant="muted">
              {formatMoney(type.priceCents, type.currency)} · {api.helpers.available(type)} left
            </Text>
          </View>
        ))
      ) : (
        <Text variant="muted">{event.ticketTypes.length === 0 ? 'Aún no hay tiquetes' : 'Pronto'}</Text>
      )}
    </Surface>
  );

  return (
    <Screen
      footer={
        compact ? (
          <StickyCta>
            <BuyRow onSale={onSale} lowest={lowest} emptyTickets={event.ticketTypes.length === 0} onBuy={goCheckout} />
          </StickyCta>
        ) : undefined
      }>
      <BackBar />
      <View className={wide ? 'flex-row items-start gap-ds-40' : 'gap-ds-24'}>
        <View className={wide ? 'w-[42%] max-w-[480px] shrink-0' : undefined}>{flyer}</View>
        <View className={wide ? 'min-w-0 flex-1 gap-ds-20' : 'gap-ds-16'}>
          {meta}
          {tickets}
          {wide ? (
            <Surface elevated className="gap-ds-4">
              <BuyRow onSale={onSale} lowest={lowest} emptyTickets={event.ticketTypes.length === 0} onBuy={goCheckout} />
            </Surface>
          ) : null}
          {staff && staffActions ? (
            <View className="flex-row flex-wrap gap-ds-8">
              <Button onPress={() => router.push(staffActions.primary.href)}>
                <Text>{staffActions.primary.label}</Text>
              </Button>
              {staffActions.overflow.length > 0 ? (
                <Button variant="outline" onPress={() => setStaffOpen(true)}>
                  <Text>Más</Text>
                </Button>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>

      {mapPin || event.lineup.length > 0 || event.tracks.length > 0 ? (
        <View className={wide && mapPin ? 'mt-ds-48 flex-row items-start gap-ds-40' : 'mt-ds-32 gap-ds-24'}>
          {mapPin ? (
            <View className={wide ? 'min-w-0 flex-1 gap-ds-12' : 'gap-ds-12'}>
              <Text variant="headingSm">Dónde</Text>
              <OsmMap pin={mapPin} events={mapEvents} className={wide ? 'h-72' : undefined} />
            </View>
          ) : null}
          <View className={wide && mapPin ? 'w-[38%] max-w-[420px] shrink-0 gap-ds-24' : 'gap-ds-24'}>
            {event.lineup.length > 0 ? (
              <View className="gap-ds-12">
                <Text variant="headingSm">Lineup</Text>
                <View className="gap-ds-8">
                  {event.lineup.map((artist) => (
                    <ArtistRow
                      key={artist.id}
                      artist={artist}
                      onPress={() => router.push(`/artist/${artist.id}` as Href)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
            {event.tracks.length > 0 ? (
              <View className="gap-ds-12">
                <Text variant="headingSm">Audio</Text>
                {event.tracks.map((track) => (
                  <Button
                    key={track.id}
                    variant="outline"
                    onPress={() => setPlaying((current) => (current === track.id ? null : track.id))}>
                    <Text>
                      {playing === track.id ? 'Pausa' : 'Play'} · {track.title}
                    </Text>
                  </Button>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      <EventStaffSheet
        visible={staffOpen}
        onClose={() => setStaffOpen(false)}
        actions={staffActions?.overflow ?? []}
        title="Operar esta fecha"
      />
    </Screen>
  );
}
