import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '@/components/bottom-sheet';
import { EventCard } from '@/components/event-card';
import { EmptyState, ErrorState } from '@/components/feedback';
import { OsmMap } from '@/components/osm-map';
import { Screen } from '@/components/screen';
import { SearchBar } from '@/components/search-bar';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { useFilters } from '@/data/filters';
import type { ParcheEvent } from '@/data/types';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { hasActiveFilters } from '@/lib/genres';

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const filters = useFilters((s) => s.filters);
  const { data: events = [], error, refetch, isLoading } = useQuery({
    queryKey: ['events', filters],
    queryFn: () => api.events.list(filters),
  });
  const [selected, setSelected] = useState<ParcheEvent | null>(null);
  const [wide, setWide] = useState(Platform.OS === 'web');
  const [hideEmpty, setHideEmpty] = useState(false);
  const compact = useCompactLayout();
  const filtered = hasActiveFilters(filters);
  const emptyOrError = !wide && !selected && !hideEmpty && !isLoading && (events.length === 0 || Boolean(error));

  useEffect(() => {
    setHideEmpty(false);
  }, [events.length, error, filters]);

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

  return (
    <Screen scroll={false} padded={false} width="full">
      <View className="flex-1" style={wide ? { flexDirection: 'row' } : undefined}>
        <View className="relative flex-1">
          <OsmMap
            fill
            events={events}
            selectedId={selected?.id}
            onPressEvent={selectEvent}
            onClear={() => setSelected(null)}
          />
          <View
            className="absolute inset-x-0 px-ds-16"
            style={{ top: compact ? insets.top + 8 : 16 }}>
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
                onPress={() => router.push(`/event/${selected.id}` as Href)}
                className="border-t border-border bg-primary px-ds-16 py-ds-16">
                <Text className="font-bold uppercase text-primary-foreground">Abrir {selected.name}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
      <BottomSheet visible={!wide && Boolean(selected)} onClose={() => setSelected(null)} title={selected?.name}>
        {selected ? (
          <View className="gap-ds-16 pb-ds-8">
            <EventCard
              layout="listing"
              event={selected}
              onPress={() => router.push(`/event/${selected.id}` as Href)}
            />
            <Button onPress={() => router.push(`/event/${selected.id}` as Href)}>
              <Text>Ver fecha</Text>
            </Button>
          </View>
        ) : null}
      </BottomSheet>
      <BottomSheet visible={emptyOrError} onClose={() => setHideEmpty(true)} title={error ? 'Mapa' : 'Sin fechas'}>
        {error ? (
          <ErrorState message="No pudimos cargar el mapa" onRetry={() => void refetch()} />
        ) : (
          <EmptyState
            title="No hay fechas en esta vista"
            lead="Prueba otro filtro o vuelve a Agenda."
            actionLabel="Filtros"
            onAction={() => router.push('/filters' as Href)}
          />
        )}
      </BottomSheet>
    </Screen>
  );
}
