import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { RefreshControl, ScrollView, View } from 'react-native';

import { Chip, ChipRow } from '@/components/chip-row';
import { EventCard, EventGrid, EventGridItem } from '@/components/event-card';
import { EmptyState, ErrorState, ListingSkeleton } from '@/components/feedback';
import { FadeSlideIn } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { SearchBar } from '@/components/search-bar';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { useFilters } from '@/data/filters';
import { endOfDayISO, monthRange, startOfDayISO, toDateInput, weekendRange, countdownTo, isSameLocalDay } from '@/lib/format';
import { GENRE_CHIPS, hasActiveFilters } from '@/lib/genres';
import { useAuthSnapshot } from '@/data/session';

const DATE_CHIPS = [
  { id: 'hoy', label: 'Hoy' },
  { id: 'finde', label: 'Fin de semana' },
  { id: 'mes', label: 'Este mes' },
] as const;

function datePreset(id: (typeof DATE_CHIPS)[number]['id']) {
  if (id === 'hoy') return { from: startOfDayISO(), to: endOfDayISO() };
  if (id === 'finde') return weekendRange();
  return monthRange();
}

function activeDateChip(from?: string, to?: string) {
  return DATE_CHIPS.find((chip) => {
    const range = datePreset(chip.id);
    return toDateInput(from) === toDateInput(range.from) && toDateInput(to) === toDateInput(range.to);
  })?.id;
}

export default function ExplorarScreen() {
  const { isLoggedIn, isPromoter } = useAuthSnapshot();
  const filters = useFilters((s) => s.filters);
  const setFilters = useFilters((s) => s.setFilters);
  const eventsQuery = useQuery({
    queryKey: ['events', filters],
    queryFn: () => api.events.list(filters),
  });
  const recsQuery = useQuery({
    queryKey: ['recs'],
    queryFn: () => api.feed.recommendations(),
    enabled: isLoggedIn,
  });

  const events = eventsQuery.data ?? [];
  const recs = recsQuery.data ?? [];
  const tonight = events.filter((event) => isSameLocalDay(event.startsAt));
  const featured = recs.length > 0 ? recs : events.slice(0, 8);
  const railTitle = recs.length > 0 ? 'Para ti' : null;
  const error = eventsQuery.error ? 'No pudimos cargar las fechas' : null;
  const filtered = hasActiveFilters(filters);
  const selectedDate = activeDateChip(filters.from, filters.to);

  return (
    <Screen
      scroll
      refreshControl={<RefreshControl refreshing={eventsQuery.isRefetching} onRefresh={() => void eventsQuery.refetch()} />}>
      <PageHeader
        title="Explorar"
        lead="Fechas cerca."
        actions={
          isPromoter ? (
            <Button onPress={() => router.push('/event/create' as Href)}>
              <Text>Crear fecha</Text>
            </Button>
          ) : null
        }
      />
      <View className="mt-ds-16 gap-ds-12">
        <SearchBar value={filters.q} onPress={() => router.push('/filters' as Href)} />
        <ChipRow>
          {DATE_CHIPS.map((chip, index) => (
            <FadeSlideIn key={chip.id} index={index}>
              <Chip
                label={chip.label}
                selected={selectedDate === chip.id}
                onPress={() => {
                  if (selectedDate === chip.id) {
                    setFilters({ ...filters, from: undefined, to: undefined });
                    return;
                  }
                  setFilters({ ...filters, ...datePreset(chip.id) });
                }}
              />
            </FadeSlideIn>
          ))}
          {GENRE_CHIPS.map((genre) => (
            <Chip
              key={genre}
              label={genre}
              selected={filters.genre === genre}
              onPress={() => setFilters({ ...filters, genre: filters.genre === genre ? undefined : genre })}
            />
          ))}
        </ChipRow>
      </View>
      {tonight.length > 0 ? (
        <View className="mt-ds-32 gap-ds-16">
          <Text variant="headingSm">Esta noche en Bogotá</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {tonight.map((event, index) => {
              const left = countdownTo(event.startsAt);
              return (
                <View key={`tonight-${event.id}`} style={{ width: 168 }}>
                  <FadeSlideIn index={index}>
                    <EventCard
                      event={event}
                      layout="poster"
                      onPress={() => router.push(`/event/${event.id}` as Href)}
                    />
                    {left ? (
                      <Text variant="caption" className="mt-ds-8 uppercase text-aurora">
                        Puerta en {left}
                      </Text>
                    ) : null}
                  </FadeSlideIn>
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
      {featured.length > 0 && railTitle ? (
        <View className="mt-ds-32 gap-ds-16">
          <Text variant="headingSm">{railTitle}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {featured.map((event, index) => (
              <View key={`feat-${event.id}`} style={{ width: 168 }}>
                <FadeSlideIn index={index}>
                  <EventCard
                    event={event}
                    layout="poster"
                    onPress={() => router.push(`/event/${event.id}` as Href)}
                  />
                </FadeSlideIn>
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}
      <View className="mt-ds-32 gap-ds-24">
        {error ? <ErrorState message={error} onRetry={() => void eventsQuery.refetch()} /> : null}
        {events.length === 0 && !error && !eventsQuery.isLoading ? (
          <EmptyState
            title={filtered ? 'Nada en esos filtros' : 'Aún no hay fechas'}
            lead={filtered ? 'Prueba otro día o género.' : 'Vuelve más tarde o limpia la búsqueda.'}
            actionLabel={filtered ? 'Limpiar filtros' : undefined}
            onAction={filtered ? () => setFilters({}) : undefined}
          />
        ) : null}
        {eventsQuery.isLoading ? (
          <EventGrid>
            {[0, 1, 2, 3].map((key) => (
              <EventGridItem key={`sk-${key}`}>
                <ListingSkeleton />
              </EventGridItem>
            ))}
          </EventGrid>
        ) : null}
        <EventGrid>
          {events.map((event, index) => (
            <EventGridItem key={event.id}>
              <FadeSlideIn index={index}>
                <EventCard event={event} onPress={() => router.push(`/event/${event.id}` as Href)} />
              </FadeSlideIn>
            </EventGridItem>
          ))}
        </EventGrid>
      </View>
    </Screen>
  );
}
