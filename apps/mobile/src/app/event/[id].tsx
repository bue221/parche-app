import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { ErrorState } from '@/components/feedback';
import { MockMap } from '@/components/mock-map';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { formatMoney, formatWhen, statusLabel } from '@/lib/format';
import { useMockStore } from '@/data/mock/store';
import type { EventWithExtras } from '@/data/mock/api';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const revision = useMockStore((s) => s.revision);
  const { isLoggedIn, user } = useAuthSnapshot();
  const [event, setEvent] = useState<EventWithExtras | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEvent(await api.events.get(id));
      setError(null);
    } catch (err) {
      setError(userMessage(err));
      setEvent(null);
    }
  }, [id, revision]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error && !event) {
    return (
      <Screen>
        <ErrorState message={error || 'Esta fecha ya no está'} onRetry={() => void load()} />
      </Screen>
    );
  }
  if (!event) {
    return (
      <Screen>
        <Text variant="muted">Cargando…</Text>
      </Screen>
    );
  }

  const write = user ? api.helpers.can(user.id, event.id, 'event.write') : false;
  const door = user ? api.helpers.can(user.id, event.id, 'event.door.scan') : false;
  const metrics = user ? api.helpers.can(user.id, event.id, 'event.metrics.read') : false;
  const manageTickets = user ? api.helpers.can(user.id, event.id, 'event.tickets.manage') : false;
  const manageMembers = user ? api.helpers.can(user.id, event.id, 'event.members.manage') : false;
  const onSale = event.ticketTypes.filter((t) => api.helpers.typeOnSale(t));

  return (
    <Screen>
      {event.flyerUrl ? (
        <Image source={{ uri: event.flyerUrl }} className="mb-ds-16 aspect-[4/5] w-full rounded-images" contentFit="cover" />
      ) : null}
      <Text variant="caption" className="uppercase text-muted-foreground">
        {statusLabel(event.status)} · {formatWhen(event.startsAt)}
      </Text>
      <Text variant="heading" className="mt-ds-8">
        {event.name}
      </Text>
      <Text variant="muted" className="mt-ds-8">
        {event.venueName}
        {event.addressText ? ` · ${event.addressText}` : ''}
      </Text>
      <Text className="mt-ds-16">{event.description}</Text>
      {event.lat != null && event.lng != null ? (
        <View className="mt-ds-16">
          <MockMap pin={{ lat: event.lat, lng: event.lng }} events={[event]} />
        </View>
      ) : null}

      {event.lineup.length > 0 ? (
        <View className="mt-ds-24 gap-ds-8">
          <Text variant="headingSm">Lineup</Text>
          {event.lineup.map((artist) => (
            <Pressable key={artist.id} onPress={() => router.push(`/artist/${artist.id}` as Href)}>
              <Text className="uppercase">{artist.stageName}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {event.tracks.length > 0 ? (
        <View className="mt-ds-24 gap-ds-8">
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

      <View className="mt-ds-24 gap-ds-8">
        {onSale.length > 0 ? (
          onSale.map((type) => (
            <Text key={type.id} variant="muted">
              {type.name} · {formatMoney(type.priceCents, type.currency)} · {api.helpers.available(type)} left
            </Text>
          ))
        ) : (
          <Text variant="muted">
            {event.ticketTypes.length === 0 ? 'Aún no hay tiquetes' : 'Pronto'}
          </Text>
        )}
        {onSale.length > 0 ? (
          <Button
            onPress={() => {
              if (!isLoggedIn) {
                router.push(`/checkout/${event.id}` as Href);
                return;
              }
              router.push(`/checkout/${event.id}` as Href);
            }}>
            <Text>Comprar</Text>
          </Button>
        ) : (
          <Button disabled>
            <Text>Pronto</Text>
          </Button>
        )}
      </View>

      {write ? (
        <View className="mt-ds-24 gap-ds-8">
          <Button variant="outline" onPress={() => router.push(`/event/${event.id}/edit` as Href)}>
            <Text>Editar</Text>
          </Button>
          <Button variant="outline" onPress={() => router.push(`/event/${event.id}/lineup` as Href)}>
            <Text>Lineup</Text>
          </Button>
          <Button variant="outline" onPress={() => router.push(`/event/${event.id}/tracks` as Href)}>
            <Text>Tracks</Text>
          </Button>
        </View>
      ) : null}
      {manageTickets ? (
        <Button className="mt-ds-8" variant="outline" onPress={() => router.push(`/event/${event.id}/tickets` as Href)}>
          <Text>Tipos de tiquete</Text>
        </Button>
      ) : null}
      {manageMembers ? (
        <Button className="mt-ds-8" variant="outline" onPress={() => router.push(`/event/${event.id}/members` as Href)}>
          <Text>Equipo</Text>
        </Button>
      ) : null}
      {door ? (
        <Button className="mt-ds-8" variant="outline" onPress={() => router.push(`/event/${event.id}/door` as Href)}>
          <Text>Puerta</Text>
        </Button>
      ) : null}
      {metrics ? (
        <Button className="mt-ds-8" variant="outline" onPress={() => router.push(`/event/${event.id}/metrics` as Href)}>
          <Text>Métricas</Text>
        </Button>
      ) : null}
    </Screen>
  );
}
