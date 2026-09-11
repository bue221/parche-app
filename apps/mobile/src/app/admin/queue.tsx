import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/feedback';
import { MockMap } from '@/components/mock-map';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { useRequireAuth } from '@/hooks/use-require-auth';
import type { ParcheEvent } from '@/data/types';

export default function AdminQueueScreen() {
  const ok = useRequireAuth('/admin/queue');
  const { isAdmin } = useAuthSnapshot();
  const [queue, setQueue] = useState<ParcheEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setQueue(await api.admin.queue());
      setError(null);
    } catch (err) {
      setError(userMessage(err));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (!ok) {
    return null;
  }
  if (!isAdmin) {
    return (
      <Screen>
        <Text>Solo admin de plataforma.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="heading">Aprobación</Text>
      {queue.length === 0 ? <EmptyState title="Nada por revisar" /> : null}
      {error ? <Text>{error}</Text> : null}
      {queue.map((event) => (
        <View key={event.id} className="mt-ds-24 gap-ds-8">
          {event.flyerUrl ? (
            <Image source={{ uri: event.flyerUrl }} className="aspect-[4/5] w-full rounded-images" />
          ) : null}
          <Text variant="subheading">{event.name}</Text>
          {event.lat != null && event.lng != null ? (
            <MockMap pin={{ lat: event.lat, lng: event.lng }} events={[event]} />
          ) : null}
          <Button onPress={() => void api.admin.decide(event.id, 'approve').then(load)}>
            <Text>Aprobar</Text>
          </Button>
          <Button variant="outline" onPress={() => void api.admin.decide(event.id, 'reject', 'No encaja').then(load)}>
            <Text>Rechazar</Text>
          </Button>
        </View>
      ))}
    </Screen>
  );
}
