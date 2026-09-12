import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';

import { BackBar } from '@/components/back-bar';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { PendingAuth } from '@/components/feedback';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function MockPayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ok = useRequireAuth(`/orders/${id}/pay`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ok) {
    return <PendingAuth />;
  }

  async function settle(result: 'paid' | 'failed') {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.tickets.settleOrder(id, result);
      router.replace(`/orders/${id}` as Href);
    } catch (err) {
      setError(userMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <BackBar />
      <PageHeader title="Pagar" lead="Demo: confirma o falla el cobro." />
      {error ? <Text className="mt-ds-16">{error}</Text> : null}
      <Button className="mt-ds-24" disabled={busy} onPress={() => void settle('paid')}>
        <Text>{busy ? 'Procesando…' : 'Pagar'}</Text>
      </Button>
      <Button variant="outline" className="mt-ds-8" disabled={busy} onPress={() => void settle('failed')}>
        <Text>Fallar pago</Text>
      </Button>
    </Screen>
  );
}
