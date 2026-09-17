import { useQuery } from '@tanstack/react-query';
import { router, usePathname, type Href } from 'expo-router';
import { SlidersHorizontal } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventCard } from '@/components/event-card';
import { ExploreChips } from '@/components/explore-chips';
import { EmptyState, ErrorState } from '@/components/feedback';
import { MapSheet, mapSheetMetrics } from '@/components/map-sheet';
import { PressScale } from '@/components/motion';
import { OsmMap } from '@/components/osm-map';
import { Screen } from '@/components/screen';
import { SearchBar } from '@/components/search-bar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { WebCompactTop, WebNavHeight } from '@/constants/theme';
import { api } from '@/data/client';
import { useFilters } from '@/data/filters';
import type { ParcheEvent } from '@/data/types';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { useTheme } from '@/hooks/use-theme';
import { cardShadowStyle } from '@/lib/card-shadow';
import { hasActiveFilters } from '@/lib/genres';

function SearchCluster({
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
    <View className="gap-ds-8">
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
      <ExploreChips />
    </View>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const filters = useFilters((s) => s.filters);
  const { height: windowH } = useWindowDimensions();
  const { data: events = [], error, refetch, isLoading } = useQuery({
    queryKey: ['events', filters],
    queryFn: () => api.events.list(filters),
  });
  const [selected, setSelected] = useState<ParcheEvent | null>(null);
  const [wide, setWide] = useState(Platform.OS === 'web');
  const [headerH, setHeaderH] = useState(120);
  const [sheetPad, setSheetPad] = useState(140);
  const compact = useCompactLayout();
  const filtered = hasActiveFilters(filters);
  const onExplore = path === '/explore';

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 900px)');
    const apply = () => setWide(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  function selectEvent(event: ParcheEvent) {
    setSelected((current) => (current?.id === event.id ? null : event));
  }

  function openEvent(event: ParcheEvent) {
    setSelected(event);
    router.push(`/event/${event.id}` as Href);
  }

  const headerPad = Platform.OS === 'web' ? (compact ? WebCompactTop : 0) : insets.top;
  const overlayTop = wide
    ? (Platform.OS === 'web' ? (compact ? WebCompactTop : WebNavHeight) : insets.top) + 124
    : headerH;
  const { collapsedH } = mapSheetMetrics(windowH, wide ? 0 : overlayTop);
  const sheetOverlap = 16;
  const mapBottom = Math.max((sheetPad || collapsedH) - sheetOverlap, 24);
  const openFilters = () => router.push('/filters' as Href);

  return (
    <Screen scroll={false} padded={false} width="full" flush contentClassName="relative flex-1">
      <View className="flex-1 bg-background" style={wide ? { flexDirection: 'row' } : undefined}>
        <View className="relative min-h-0 flex-1">
          {wide ? null : (
            <View
              className="gap-ds-8 bg-background px-ds-16 pb-ds-8"
              style={{ paddingTop: headerPad + 8 }}
              onLayout={(event) => {
                const next = event.nativeEvent.layout.height;
                setHeaderH((current) => (Math.abs(current - next) < 1 ? current : next));
              }}>
              <SearchCluster query={filters.q} filtered={filtered} onFilters={openFilters} />
            </View>
          )}
          <View className="relative min-h-0 flex-1 overflow-hidden bg-background">
            <View
              className="overflow-hidden rounded-[24px]"
              style={
                wide
                  ? { flex: 1, marginHorizontal: 16, marginVertical: 16 }
                  : { position: 'absolute', left: 16, right: 16, top: 8, bottom: mapBottom, borderRadius: 24 }
              }>
              <OsmMap
                fill
                events={events}
                selectedId={selected?.id}
                padTop={wide ? overlayTop : 20}
                padBottom={wide ? 48 : 20}
                onPressEvent={selectEvent}
                onClear={() => setSelected(null)}
              />
            </View>
            {wide ? (
              <View
                pointerEvents="box-none"
                className="absolute inset-x-0 z-40 px-ds-16"
                style={{ top: (compact ? WebCompactTop : WebNavHeight) + 8 }}>
                <View pointerEvents="auto" style={cardShadowStyle}>
                  <SearchCluster query={filters.q} filtered={filtered} onFilters={openFilters} />
                </View>
              </View>
            ) : null}
            {wide || !onExplore ? null : (
              <MapSheet
                events={events}
                selectedId={selected?.id}
                loading={isLoading}
                error={Boolean(error)}
                topInset={overlayTop}
                onHeightChange={setSheetPad}
                onRetry={() => void refetch()}
                onOpen={openEvent}
              />
            )}
          </View>
        </View>
        {wide ? (
          <View className="border-l border-border bg-surface" style={{ width: 360 }}>
            <View className="flex-row items-center justify-between border-b border-border px-ds-16 py-ds-16">
              <View>
                <Text variant="headingSm">Fechas</Text>
                <Text variant="muted">{events.length} en el mapa</Text>
              </View>
              <Button size="sm" variant="outline" onPress={openFilters}>
                <Text>{filtered ? 'Filtros · on' : 'Filtros'}</Text>
              </Button>
            </View>
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, gap: 12 }}>
              {error ? <ErrorState message="No pudimos cargar el mapa" onRetry={() => void refetch()} /> : null}
              {events.length === 0 && !error ? (
                <EmptyState title="No hay fechas en esta vista" lead="Cambia filtros o vuelve más tarde." />
              ) : null}
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  layout="row"
                  event={event}
                  selected={selected?.id === event.id}
                  onPress={() => setSelected(event)}
                />
              ))}
            </ScrollView>
            {selected ? (
              <Pressable
                onPress={() => openEvent(selected)}
                className="border-t border-border bg-primary px-ds-16 py-ds-16">
                <Text className="font-bold uppercase text-primary-foreground">Abrir {selected.name}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
