import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { EventCard } from '@/components/event-card';
import { EmptyState, ErrorState } from '@/components/feedback';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { useMockStore } from '@/data/mock/store';
import type { EventFilters, ParcheEvent } from '@/data/types';

export default function AgendaScreen() {
  const revision = useMockStore((s) => s.revision);
  const { isLoggedIn, isPromoter } = useAuthSnapshot();
  const [events, setEvents] = useState<ParcheEvent[]>([]);
  const [recs, setRecs] = useState<ParcheEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const filters = useMockStore((s) => s.filters);

  const load = useCallback(async () => {
    setError(null);
    try {
      const list = await api.events.list(filters);
      setEvents(list);
      if (isLoggedIn) {
        try {
          setRecs(await api.feed.recommendations());
        } catch {
          setRecs([]);
        }
      } else {
        setRecs([]);
      }
    } catch (err) {
      setError(userMessage(err));
    }
  }, [filters, isLoggedIn, revision]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen
      scroll
      className="">
      <View>
        <Text variant="heading">Agenda</Text>
        <Text variant="lead" className="mt-ds-8">
          Fechas próximas. Tinta negra, papel blanco.
        </Text>
        {isPromoter ? (
          <Button className="mt-ds-16" onPress={() => router.push('/event/create' as Href)}>
            <Text>Crear fecha</Text>
          </Button>
        ) : null}
        <Button variant="outline" className="mt-ds-8" onPress={() => router.push('/filters' as Href)}>
          <Text>Filtros</Text>
        </Button>
        <Button variant="ghost" className="mt-ds-8" onPress={() => router.push('/posts' as Href)}>
          <Text>Notas</Text>
        </Button>
      </View>
      {isLoggedIn ? (
        <View className="mt-ds-32 gap-ds-16">
          <Text variant="headingSm">Para ti</Text>
          {recs.length === 0 ? (
            <Text variant="muted">Sigue artistas para ver sugerencias</Text>
          ) : (
            recs.map((event) => (
              <EventCard key={`rec-${event.id}`} event={event} onPress={() => router.push(`/event/${event.id}` as Href)} />
            ))
          )}
        </View>
      ) : null}
      <View className="mt-ds-32 gap-ds-24">
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
        {events.length === 0 && !error ? <EmptyState title="Aún no hay fechas" /> : null}
        {events.map((event) => (
          <EventCard key={event.id} event={event} onPress={() => router.push(`/event/${event.id}` as Href)} />
        ))}
      </View>
    </Screen>
  );
}
