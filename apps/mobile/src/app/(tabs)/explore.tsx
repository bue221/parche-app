import { useQuery } from '@tanstack/react-query';
import { router, usePathname, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventCard } from '@/components/event-card';
import { EmptyState, ErrorState } from '@/components/feedback';
import { MapSheet } from '@/components/map-sheet';
import { OsmMap } from '@/components/osm-map';
import { Screen } from '@/components/screen';
import { SearchBar } from '@/components/search-bar';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { WebCompactTop, WebNavHeight } from '@/constants/theme';
import { api } from '@/data/client';
import { useFilters } from '@/data/filters';
import type { ParcheEvent } from '@/data/types';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { cardShadowStyle } from '@/lib/card-shadow';
import { hasActiveFilters } from '@/lib/genres';

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const filters = useFilters((s) => s.filters);
  const { data: events = [], error, refetch, isLoading } = useQuery({
    queryKey: ['events', filters],
    queryFn: () => api.events.list(filters),
  });
  const [selected, setSelected] = useState<ParcheEvent | null>(null);
  const [wide, setWide] = useState(Platform.OS === 'web');
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

  const searchTop = wide
    ? 16
    : Platform.OS === 'web'
      ? (compact ? WebCompactTop : WebNavHeight) + 8
      : insets.top + 8;

  return (
    <Screen scroll={false} padded={false} width="full" flush contentClassName="relative flex-1">
      <View className="relative flex-1" style={wide ? { flexDirection: 'row' } : { flex: 1 }}>
        <View className="relative min-h-0 flex-1">
          <OsmMap
            fill
            events={events}
            selectedId={selected?.id}
            onPressEvent={selectEvent}
            onClear={() => setSelected(null)}
          />
          <View className="absolute inset-x-0 z-20 px-ds-16" style={[{ top: searchTop }, cardShadowStyle]}>
            <SearchBar
              value={filters.q}
              placeholder={filtered ? 'Filtros activos' : 'Buscar en el mapa'}
              onPress={() => router.push('/filters' as Href)}
            />
          </View>
        </View>
        {wide ? (
          <View className="border-l border-border bg-background" style={{ width: 360 }}>
            <View className="flex-row items-center justify-between border-b border-border px-ds-16 py-ds-16">
              <View>
                <Text variant="headingSm">Fechas</Text>
                <Text variant="muted">{events.length} en el mapa</Text>
              </View>
              <Button size="sm" variant="outline" onPress={() => router.push('/filters' as Href)}>
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
        ) : onExplore ? (
          <MapSheet
            events={events}
            selectedId={selected?.id}
            loading={isLoading}
            error={Boolean(error)}
            onRetry={() => void refetch()}
            onOpen={openEvent}
          />
        ) : null}
      </View>
    </Screen>
  );
}
