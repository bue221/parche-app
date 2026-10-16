import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { SlidersHorizontal } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventCard, EventGrid, EventGridItem } from '@/components/event-card';
import { ExploreChips } from '@/components/explore-chips';
import { ExploreDesktopHero } from '@/components/explore-hero';
import { EmptyState, ErrorState, ListingSkeleton } from '@/components/feedback';
import { FlyerImage } from '@/components/flyer-image';
import { MapSheet, mapSheetMetrics } from '@/components/map-sheet';
import { MapToggleFAB, type ViewMode } from '@/components/map-toggle-fab';
import { FadeSlideIn, PressScale } from '@/components/motion';
import { OsmMap } from '@/components/osm-map';
import { Screen } from '@/components/screen';
import { SearchBar } from '@/components/search-bar';
import { SectionRail } from '@/components/section-rail';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { WebCompactTop, WebNavHeight } from '@/constants/theme';
import { api } from '@/data/client';
import { useFilters } from '@/data/filters';
import { useAuthSnapshot } from '@/data/session';
import type { ParcheEvent } from '@/data/types';
import { useCompactLayout, useWideLayout } from '@/hooks/use-compact-layout';
import { useRequestCreateEvent } from '@/hooks/use-request-create-event';
import { useTheme } from '@/hooks/use-theme';
import { cardShadowStyle } from '@/lib/card-shadow';
import {
  activeDateChip,
  datePreset,
  exploreShowsForYouRail,
  exploreShowsGenreRails,
  exploreShowsTonightRail,
  genreRails,
  matchesExploreFilters,
} from '@/lib/explore-rails';
import { countdownTo, eventVenueParts, formatListingDate, isSameLocalDay } from '@/lib/format';
import { hasActiveFilters } from '@/lib/genres';
import { afterAuthHydration } from '@/lib/session-query';

const TONIGHT_EMPTY = {
  title: 'Nada esta noche',
  lead: 'Hoy no hay eventos anunciados.',
};

const FOR_YOU_EMPTY = {
  title: 'Sigue artistas para ver sugerencias',
  lead: 'Cuando sigas a alguien, sus eventos aparecen aquí.',
};

function ExploreHero({
  query,
  isPromoter,
  onFilters,
  onCreateEvent,
}: {
  query?: string;
  isPromoter: boolean;
  onFilters: () => void;
  onCreateEvent: () => void;
}) {
  return (
    <View className="gap-ds-12 overflow-visible">
      <SearchBar value={query} onPress={onFilters} />
      {isPromoter ? (
        <Button size="sm" onPress={onCreateEvent}>
          <Text>Crear evento</Text>
        </Button>
      ) : null}
      <ExploreChips scope="agenda" />
    </View>
  );
}

function MapSearchHeader({
  query,
  filtered,
  onFilters,
}: {
  query?: string;
  filtered: boolean;
  onFilters: () => void;
}) {
  const theme = useTheme();
  return (
    <View className="gap-ds-8 overflow-visible">
      <View className="flex-row items-center gap-ds-8">
        <View className="min-w-0 flex-1">
          <SearchBar
            value={query}
            placeholder={filtered ? 'Filtros activos' : 'Buscar en el mapa'}
            onPress={onFilters}
          />
        </View>
        <PressScale onPress={onFilters} className="w-auto" accessibilityLabel="Filtros">
          <View
            className="size-11 items-center justify-center rounded-full border border-border bg-surface"
            style={cardShadowStyle}>
            <Icon as={SlidersHorizontal} size={18} color={theme.text} />
          </View>
        </PressScale>
      </View>
      <ExploreChips scope="agenda" />
    </View>
  );
}

function MapEventPreview({ event, onOpen }: { event: ParcheEvent; onOpen: () => void }) {
  const { venue } = eventVenueParts(event.venueName, event.addressText);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver boletas de ${event.name}`}
      onPress={onOpen}
      className="absolute bottom-4 left-4 right-4"
      style={cardShadowStyle}>
      <View className="flex-row overflow-hidden rounded-cards border border-border bg-surface">
        <View className="size-24 overflow-hidden bg-muted">
          {event.flyerUrl ? (
            <FlyerImage uri={event.flyerUrl} className="h-full w-full" aspectRatio={1} />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Text variant="caption">{event.name.slice(0, 2)}</Text>
            </View>
          )}
        </View>
        <View className="min-w-0 flex-1 justify-center gap-ds-4 px-ds-12 py-ds-8">
          <Text className="font-bold" numberOfLines={1}>
            {event.name}
          </Text>
          <Text variant="muted" numberOfLines={1}>
            {venue} · {formatListingDate(event.startsAt)}
          </Text>
          <Text className="font-bold text-aurora">Ver boletas</Text>
        </View>
      </View>
    </Pressable>
  );
}

function RailSkeletons() {
  return (
    <>
      <ListingSkeleton />
      <ListingSkeleton />
    </>
  );
}

function ExploreFeed({
  tonight,
  recs,
  railsByGenre,
  events,
  error,
  loading,
  recsLoading,
  filtered,
  isLoggedIn,
  wide,
  selectedDate,
  selectedId,
  onTonightSeeAll,
  onGenreSeeAll,
  onEventPress,
  onRetry,
  onClearFilters,
}: {
  tonight: ParcheEvent[];
  recs: ParcheEvent[];
  railsByGenre: { genre: string; events: ParcheEvent[] }[];
  events: ParcheEvent[];
  error: string | null;
  loading: boolean;
  recsLoading: boolean;
  filtered: boolean;
  isLoggedIn: boolean;
  wide: boolean;
  selectedDate?: string;
  selectedId?: string;
  onTonightSeeAll: () => void;
  onGenreSeeAll: (genre: string) => void;
  onEventPress: (event: ParcheEvent) => void;
  onRetry: () => void;
  onClearFilters: () => void;
}) {
  const showTonight = exploreShowsTonightRail({ count: tonight.length, loading, wide });
  const showForYou = exploreShowsForYouRail(wide) && isLoggedIn && (recsLoading || recs.length > 0);
  const genreRailsVisible = exploreShowsGenreRails(wide) && !loading && railsByGenre.length > 0;

  return (
    <View className="gap-ds-32">
      {showTonight ? (
        <SectionRail
          title="Esta noche"
          empty={loading ? undefined : TONIGHT_EMPTY}
          onSeeAll={tonight.length > 0 && selectedDate !== 'hoy' ? onTonightSeeAll : undefined}>
          {loading ? (
            <RailSkeletons />
          ) : (
            tonight.map((event, index) => {
              const left = countdownTo(event.startsAt);
              return (
                <FadeSlideIn key={`tonight-${event.id}`} index={index}>
                  <EventCard
                    event={event}
                    saveable
                    badge="Esta noche"
                    caption={left ?? undefined}
                    selected={selectedId === event.id}
                    onPress={() => onEventPress(event)}
                  />
                </FadeSlideIn>
              );
            })
          )}
        </SectionRail>
      ) : null}
      {showForYou ? (
        <SectionRail title="Para ti" empty={recsLoading ? undefined : FOR_YOU_EMPTY}>
          {recsLoading ? (
            <RailSkeletons />
          ) : (
            recs.map((event, index) => (
              <FadeSlideIn key={`feat-${event.id}`} index={index}>
                <EventCard
                  event={event}
                  saveable
                  selected={selectedId === event.id}
                  onPress={() => onEventPress(event)}
                />
              </FadeSlideIn>
            ))
          )}
        </SectionRail>
      ) : null}
      {genreRailsVisible
        ? railsByGenre.map((rail) => (
            <SectionRail
              key={`genre-${rail.genre}`}
              title={rail.genre}
              empty={{ title: `Nada de ${rail.genre}`, lead: 'Prueba otro día o limpia los filtros.' }}
              onSeeAll={rail.events.length > 0 ? () => onGenreSeeAll(rail.genre) : undefined}>
              {rail.events.map((event, index) => (
                <FadeSlideIn key={`genre-${rail.genre}-${event.id}`} index={index}>
                  <EventCard
                    event={event}
                    saveable
                    selected={selectedId === event.id}
                    onPress={() => onEventPress(event)}
                  />
                </FadeSlideIn>
              ))}
            </SectionRail>
          ))
        : null}
      <View className="gap-ds-16">
        {wide ? null : (
          <View className="flex-row items-end justify-between gap-ds-12">
            <Text variant="headingSm">Todos los eventos</Text>
          </View>
        )}
        {error ? <ErrorState message={error} onRetry={onRetry} /> : null}
        {events.length === 0 && !error && !loading ? (
          <EmptyState
            title={filtered ? 'Nada en esos filtros' : 'Aún no hay eventos'}
            lead={filtered ? 'Prueba otro día o género.' : 'Vuelve más tarde o limpia la búsqueda.'}
            actionLabel={filtered ? 'Limpiar filtros' : undefined}
            onAction={filtered ? onClearFilters : undefined}
          />
        ) : null}
        {loading ? (
          <EventGrid>
            {[0, 1, 2, 3, 4, 5].map((key) => (
              <EventGridItem key={`sk-${key}`}>
                <ListingSkeleton />
              </EventGridItem>
            ))}
          </EventGrid>
        ) : null}
        {events.length > 0 ? (
          <EventGrid>
            {events.map((event, index) => (
              <EventGridItem key={event.id}>
                <FadeSlideIn index={index}>
                  <EventCard
                    event={event}
                    saveable
                    selected={selectedId === event.id}
                    onPress={() => onEventPress(event)}
                  />
                </FadeSlideIn>
              </EventGridItem>
            ))}
          </EventGrid>
        ) : null}
      </View>
    </View>
  );
}

export default function ExplorarScreen() {
  const insets = useSafeAreaInsets();
  const { isLoggedIn, isPromoter, hydrated } = useAuthSnapshot();
  const requestCreate = useRequestCreateEvent();
  const { filters, setFilters } = useFilters('agenda');
  const { height: windowH } = useWindowDimensions();
  const compact = useCompactLayout();
  const wide = useWideLayout();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selected, setSelected] = useState<ParcheEvent | null>(null);
  const [headerH, setHeaderH] = useState(120);
  const [sheetPad, setSheetPad] = useState(140);

  const eventsQuery = useQuery({
    queryKey: ['events', 'agenda', filters],
    queryFn: () => api.events.list(filters),
    enabled: afterAuthHydration(hydrated),
  });
  const recsQuery = useQuery({
    queryKey: ['recs'],
    queryFn: () => api.feed.recommendations(),
    enabled: afterAuthHydration(hydrated, isLoggedIn),
  });

  const events = Array.isArray(eventsQuery.data) ? eventsQuery.data : [];
  const recs = (Array.isArray(recsQuery.data) ? recsQuery.data : []).filter((event) =>
    matchesExploreFilters(event, filters),
  );
  const tonight = events.filter((event) => isSameLocalDay(event.startsAt));
  const railsByGenre = genreRails(events, filters.genre);
  const error = eventsQuery.error ? 'No pudimos cargar los eventos' : null;
  const filtered = hasActiveFilters(filters);
  const selectedDate = activeDateChip(filters.from, filters.to);
  const openFilters = () => router.push('/filters?scope=agenda' as Href);
  const hero = wide ? (
    <ExploreDesktopHero
      resultCount={events.length}
      filtered={filtered}
      isPromoter={isPromoter}
      onCreateEvent={() => void requestCreate()}
    />
  ) : (
    <ExploreHero query={filters.q} isPromoter={isPromoter} onFilters={openFilters} onCreateEvent={() => void requestCreate()} />
  );
  const feed = (
    <ExploreFeed
      tonight={tonight}
      recs={recs}
      railsByGenre={railsByGenre}
      events={events}
      error={error}
      loading={!hydrated || eventsQuery.isLoading}
      recsLoading={recsQuery.isLoading}
      filtered={filtered}
      isLoggedIn={isLoggedIn}
      wide={wide}
      selectedDate={selectedDate}
      selectedId={selected?.id}
      onTonightSeeAll={() => setFilters({ ...filters, ...datePreset('hoy') })}
      onGenreSeeAll={(genre) => setFilters({ ...filters, genre })}
      onEventPress={openEventFromList}
      onRetry={() => void eventsQuery.refetch()}
      onClearFilters={() => setFilters({})}
    />
  );

  function openEvent(id: string) {
    router.push(`/event/${id}` as Href);
  }

  function openEventFromList(event: ParcheEvent) {
    openEvent(event.id);
  }

  function openEventFromMap(event: ParcheEvent) {
    setSelected(event);
    router.push(`/event/${event.id}` as Href);
  }

  function selectEvent(event: ParcheEvent) {
    setSelected((current) => (current?.id === event.id ? null : event));
  }

  const headerPad = Platform.OS === 'web' ? (compact ? WebCompactTop : 0) : insets.top;
  const overlayTop = headerH;
  const { collapsedH } = mapSheetMetrics(windowH, overlayTop);
  const sheetOverlap = 16;
  const mapBottom = Math.max((sheetPad || collapsedH) - sheetOverlap, 24);

  if (wide && viewMode === 'map') {
    const shellH = Math.max(windowH - WebNavHeight, 480);
    return (
      <View className="flex-1">
        <Screen scroll={false} padded={false} width="full" flush contentClassName="relative flex-1">
          <View className="bg-background" style={{ height: shellH, minHeight: 0 }}>
            <View
              className="shrink-0 overflow-visible border-b border-border bg-background px-ds-40 pb-ds-12 pt-ds-16"
              onLayout={(event) => {
                const next = event.nativeEvent.layout.height;
                setHeaderH((current) => (Math.abs(current - next) < 1 ? current : next));
              }}>
              {hero}
            </View>
            <View className="min-h-0 flex-1 flex-row" style={{ minHeight: 0, flex: 1 }}>
              <ScrollView
                className="min-w-0 flex-1"
                style={{ flex: 1, minHeight: 0 }}
                contentContainerStyle={{ paddingHorizontal: 40, paddingTop: 20, paddingBottom: 48 }}
                refreshControl={
                  <RefreshControl refreshing={eventsQuery.isRefetching} onRefresh={() => void eventsQuery.refetch()} />
                }>
                {feed}
              </ScrollView>
              <View
                className="relative min-h-0 overflow-hidden border-l border-border bg-muted"
                style={{ width: '40%', minWidth: 448, maxWidth: 640, minHeight: 0 }}>
                <View className="flex-1 overflow-hidden">
                  <OsmMap
                    fill
                    events={events}
                    selectedId={selected?.id}
                    padTop={24}
                    padBottom={selected ? 128 : 24}
                    onPressEvent={selectEvent}
                    onClear={() => setSelected(null)}
                  />
                </View>
                {selected ? <MapEventPreview event={selected} onOpen={() => openEventFromMap(selected)} /> : null}
              </View>
            </View>
          </View>
        </Screen>
        <MapToggleFAB mode="map" onToggle={() => setViewMode('list')} />
      </View>
    );
  }

  if (wide) {
    return (
      <View className="flex-1">
        <Screen
          scroll
          stickyHeader={hero}
          refreshControl={
            <RefreshControl refreshing={eventsQuery.isRefetching} onRefresh={() => void eventsQuery.refetch()} />
          }>
          {feed}
          <View style={{ height: 72 }} />
        </Screen>
        <MapToggleFAB mode="list" onToggle={() => setViewMode('map')} />
      </View>
    );
  }

  if (viewMode === 'map') {
    return (
      <Screen scroll={false} padded={false} width="full" flush contentClassName="relative flex-1">
        <View className="flex-1 bg-background">
          <View className="relative min-h-0 flex-1">
            <View
              className="gap-ds-8 overflow-visible bg-background px-ds-16 pb-ds-8"
              style={{ paddingTop: headerPad + 8 }}
              onLayout={(event) => {
                const next = event.nativeEvent.layout.height;
                setHeaderH((current) => (Math.abs(current - next) < 1 ? current : next));
              }}>
              <MapSearchHeader query={filters.q} filtered={filtered} onFilters={openFilters} />
            </View>
            <View className="relative min-h-0 flex-1 overflow-hidden bg-background">
              <View
                className="overflow-hidden rounded-[24px]"
                style={{ position: 'absolute', left: 0, right: 0, top: 8, bottom: mapBottom, borderRadius: 24 }}>
                <OsmMap
                  fill
                  events={events}
                  selectedId={selected?.id}
                  padTop={20}
                  padBottom={20}
                  onPressEvent={selectEvent}
                  onClear={() => setSelected(null)}
                />
              </View>
              <MapSheet
                events={events}
                selectedId={selected?.id}
                loading={!hydrated || eventsQuery.isLoading}
                error={Boolean(eventsQuery.error)}
                topInset={overlayTop}
                onHeightChange={setSheetPad}
                onRetry={() => void eventsQuery.refetch()}
                onOpen={openEventFromMap}
              />
            </View>
          </View>
        </View>
        <MapToggleFAB mode={viewMode} onToggle={() => setViewMode('list')} />
      </Screen>
    );
  }

  return (
    <View className="flex-1">
      <Screen
        scroll
        stickyHeader={hero}
        refreshControl={<RefreshControl refreshing={eventsQuery.isRefetching} onRefresh={() => void eventsQuery.refetch()} />}>
        {feed}
        <View style={{ height: 64 }} />
      </Screen>
      <MapToggleFAB mode={viewMode} onToggle={() => setViewMode('map')} />
    </View>
  );
}
