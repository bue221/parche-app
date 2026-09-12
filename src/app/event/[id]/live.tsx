import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { BackBar } from '@/components/back-bar';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { PendingAuth } from '@/components/feedback';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function DoorLiveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ok = useRequireAuth(`/event/${id}/live`);
  const { user } = useAuthSnapshot();
  const [live, setLive] = useState<Awaited<ReturnType<typeof api.door.live>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      void api.door
        .live(id)
        .then(setLive)
        .catch((err) => setError(userMessage(err)));
    };
    tick();
    const timer = setInterval(tick, 2500);
    return () => clearInterval(timer);
  }, [id]);

  if (!ok) {
    return <PendingAuth />;
  }
  if (user && !api.helpers.can(user.id, id, 'event.door.live') && !api.helpers.can(user.id, id, 'event.metrics.read')) {
    return (
      <Screen>
        <Text>Sin permiso de aforo.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackBar />
      <PageHeader title="Aforo" />
      <Text variant="heading" className="mt-ds-24">
        {live?.checkIns ?? 0}
      </Text>
      <Text variant="muted">check-ins / {live?.sold ?? 0} vendidos</Text>
      {error ? <Text className="mt-ds-8">{error} (último número arriba)</Text> : null}
      {live?.recent.map((scan) => (
        <Text key={scan.id} variant="caption" className="mt-ds-8">
          {scan.result} · {new Date(scan.at).toLocaleTimeString('es-CO')} · scanner {scan.scannerUserId.slice(-4)}
        </Text>
      ))}
    </Screen>
  );
}
