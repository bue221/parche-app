import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { BackBar } from '@/components/back-bar';
import { ErrorState, PendingAuth } from '@/components/feedback';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { Surface } from '@/components/surface';
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
    return <PendingAuth />;
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
      <BackBar />
      <PageHeader
        title="Métricas"
        actions={
          <Button variant="outline" onPress={() => void load()}>
            <Text>Actualizar</Text>
          </Button>
        }
      />
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      <View className="mt-ds-24 flex-row gap-ds-12">
        <Surface elevated className="flex-1 gap-ds-4">
          <Text variant="heading">{data?.sold ?? 0}</Text>
          <Text variant="muted">vendidos</Text>
        </Surface>
        <Surface elevated className="flex-1 gap-ds-4">
          <Text variant="heading">{data?.checkIns ?? 0}</Text>
          <Text variant="muted">check-ins</Text>
        </Surface>
      </View>
      <Text variant="muted" className="mt-ds-12">
        no-show {data?.noShow ?? 0}
      </Text>
      <View className="mt-ds-24 gap-ds-8">
        {data?.byType.map((row) => (
          <Surface key={row.name} muted>
            <Text>
              {row.name}: {row.sold} vendidos / {row.reserved} reserved / {row.available} free
            </Text>
            <Text variant="muted">{formatMoney(row.revenueCents)}</Text>
          </Surface>
        ))}
      </View>
      <Text variant="headingSm" className="mt-ds-24">
        Scans por persona
      </Text>
      {data?.scansByScanner.map((row) => (
        <Text key={row.userId} className="mt-ds-8">
          {row.displayName}: {row.count}
        </Text>
      ))}
    </Screen>
  );
}
