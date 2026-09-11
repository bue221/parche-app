import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/feedback';
import { MockMap } from '@/components/mock-map';
import { Screen } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useMockStore } from '@/data/mock/store';
import type { ParcheEvent } from '@/data/types';

export default function ExploreScreen() {
  const revision = useMockStore((s) => s.revision);
  const filters = useMockStore((s) => s.filters);
  const [events, setEvents] = useState<ParcheEvent[]>([]);
  const [selected, setSelected] = useState<ParcheEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setEvents(await api.events.list(filters));
      setError(null);
    } catch (err) {
      setError(userMessage(err));
    }
  }, [filters, revision]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      <Text variant="heading">Explorar</Text>
      <Text variant="muted" className="mt-ds-8">
        Pines publicados. Teselas OSM mock, cero Google.
      </Text>
      <View className="mt-ds-16">
        <MockMap events={events} onPressEvent={setSelected} />
      </View>
      {events.length === 0 ? <EmptyState title="No hay fechas en esta vista" /> : null}
      {error ? <Text className="mt-ds-8">{error}</Text> : null}
      {selected ? (
        <View className="mt-ds-16 gap-ds-8 rounded-cards border border-border p-ds-16">
          <Text variant="subheading">{selected.name}</Text>
          <Text variant="muted">{selected.venueName}</Text>
          <Text
            variant="small"
            className="font-bold uppercase"
            onPress={() => router.push(`/event/${selected.id}` as Href)}>
            Ver fecha
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}
