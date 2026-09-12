import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { BackBar } from '@/components/back-bar';
import { EventCard } from '@/components/event-card';
import { EmptyState, ErrorState, PendingAuth } from '@/components/feedback';
import { PageHeader } from '@/components/page-header';
import { OsmMap } from '@/components/osm-map';
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
    return <PendingAuth />;
  }
  if (!isAdmin) {
    return (
      <Screen>
        <BackBar />
        <Text>Solo admin de plataforma.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackBar />
      <PageHeader title="Aprobación" lead="Revisa foto y pin antes de publicar." />
      {queue.length === 0 && !error ? <EmptyState title="Nada por revisar" lead="La cola está limpia." /> : null}
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {queue.map((event) => (
        <View key={event.id} className="mt-ds-24 gap-ds-12">
          <EventCard layout="listing" event={event} />
          {event.lat != null && event.lng != null ? (
            <OsmMap pin={{ lat: event.lat, lng: event.lng }} events={[event]} />
          ) : null}
          <View className="flex-row gap-ds-8">
            <Button onPress={() => void api.admin.decide(event.id, 'approve').then(load)}>
              <Text>Aprobar</Text>
            </Button>
            <Button variant="outline" onPress={() => void api.admin.decide(event.id, 'reject', 'No encaja').then(load)}>
              <Text>Rechazar</Text>
            </Button>
          </View>
        </View>
      ))}
    </Screen>
  );
}
