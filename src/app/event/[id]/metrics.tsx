import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { formatMoney } from '@/lib/format';

export default function EventMetricsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ok = useRequireAuth(`/event/${id}/metrics`);
  const { user } = useAuthSnapshot();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.door.metrics>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setData(await api.door.metrics(id));
      setError(null);
    } catch (err) {
      setError(userMessage(err));
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  if (!ok) {
    return null;
  }
  if (user && !api.helpers.can(user.id, id, 'event.metrics.read')) {
    return (
      <Screen>
        <Text>Door no entra a ingresos.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="heading">Métricas</Text>
      <Button variant="outline" className="mt-ds-16" onPress={() => void load()}>
        <Text>Actualizar</Text>
      </Button>
      {error ? <Text>{error}</Text> : null}
      <Text className="mt-ds-16">
        Vendidos {data?.sold ?? 0} · check-ins {data?.checkIns ?? 0} · no-show {data?.noShow ?? 0}
      </Text>
      {data?.byType.map((row) => (
        <Text key={row.name} className="mt-ds-8">
          {row.name}: {row.sold} vendidos / {row.reserved} reserved / {row.available} free · {formatMoney(row.revenueCents)}
        </Text>
      ))}
      <Text variant="headingSm" className="mt-ds-24">
        Scans por persona
      </Text>
      {data?.scansByScanner.map((row) => (
        <Text key={row.userId}>
          {row.displayName}: {row.count}
        </Text>
      ))}
    </Screen>
  );
}
