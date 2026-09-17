import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { RefreshControl, View } from 'react-native';

import { EventCard, EventGrid, EventGridItem } from '@/components/event-card';
import { ExploreChips } from '@/components/explore-chips';
import { EmptyState, ErrorState, ListingSkeleton } from '@/components/feedback';
import { FadeSlideIn } from '@/components/motion';
import { Screen } from '@/components/screen';
import { SearchBar } from '@/components/search-bar';
import { SectionRail } from '@/components/section-rail';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { useFilters } from '@/data/filters';
import { useAuthSnapshot } from '@/data/session';
import { activeDateChip, datePreset, genreRails, matchesExploreFilters } from '@/lib/explore-rails';
import { countdownTo, isSameLocalDay } from '@/lib/format';
import { hasActiveFilters } from '@/lib/genres';

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
  const recs = (recsQuery.data ?? []).filter((event) => matchesExploreFilters(event, filters));
  const tonight = events.filter((event) => isSameLocalDay(event.startsAt));
  const railsByGenre = genreRails(events, filters.genre);
  const error = eventsQuery.error ? 'No pudimos cargar las fechas' : null;
  const filtered = hasActiveFilters(filters);
  const selectedDate = activeDateChip(filters.from, filters.to);

  function openEvent(id: string) {
    router.push(`/event/${id}` as Href);
  }

  return (
    <Screen
      scroll
      refreshControl={<RefreshControl refreshing={eventsQuery.isRefetching} onRefresh={() => void eventsQuery.refetch()} />}>
      <View className="gap-ds-12">
        <SearchBar value={filters.q} onPress={() => router.push('/filters' as Href)} />
        {isPromoter ? (
          <Button size="sm" onPress={() => router.push('/event/create' as Href)}>
            <Text>Crear fecha</Text>
          </Button>
        ) : null}
        <ExploreChips />
      </View>
      {tonight.length > 0 ? (
        <View className="mt-ds-32">
          <SectionRail
            title="Esta noche"
            onSeeAll={
              selectedDate === 'hoy'
                ? undefined
                : () => setFilters({ ...filters, ...datePreset('hoy') })
            }>
            {tonight.map((event, index) => {
              const left = countdownTo(event.startsAt);
              return (
                <FadeSlideIn key={`tonight-${event.id}`} index={index}>
                  <EventCard
                    event={event}
                    saveable
                    badge="Esta noche"
                    caption={left ? `Puerta en ${left}` : undefined}
                    onPress={() => openEvent(event.id)}
                  />
                </FadeSlideIn>
              );
            })}
          </SectionRail>
        </View>
      ) : null}
      {recs.length > 0 ? (
        <View className="mt-ds-32">
          <SectionRail title="Para ti">
            {recs.map((event, index) => (
              <FadeSlideIn key={`feat-${event.id}`} index={index}>
                <EventCard event={event} saveable onPress={() => openEvent(event.id)} />
              </FadeSlideIn>
            ))}
          </SectionRail>
        </View>
      ) : null}
      {railsByGenre.map((rail) => (
        <View key={`genre-${rail.genre}`} className="mt-ds-32">
          <SectionRail title={rail.genre} onSeeAll={() => setFilters({ ...filters, genre: rail.genre })}>
            {rail.events.map((event, index) => (
              <FadeSlideIn key={`genre-${rail.genre}-${event.id}`} index={index}>
                <EventCard event={event} saveable onPress={() => openEvent(event.id)} />
              </FadeSlideIn>
            ))}
          </SectionRail>
        </View>
      ))}
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
        {events.length > 0 ? (
          <View className="gap-ds-16">
            <Text variant="headingSm">Todas las fechas</Text>
            <EventGrid>
              {events.map((event, index) => (
                <EventGridItem key={event.id}>
                  <FadeSlideIn index={index}>
                    <EventCard event={event} saveable onPress={() => openEvent(event.id)} />
                  </FadeSlideIn>
                </EventGridItem>
              ))}
            </EventGrid>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
