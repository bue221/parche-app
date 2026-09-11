import { router, type Href } from 'expo-router';
import { useState } from 'react';

import { EventForm, type EventFormValue } from '@/components/event-form';
import { Screen } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function EventCreateScreen() {
  const ok = useRequireAuth('/event/create');
  const { isPromoter } = useAuthSnapshot();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ok) {
    return null;
  }
  if (!isPromoter) {
    return (
      <Screen>
        <Text>Solo organizadores pueden crear fechas.</Text>
      </Screen>
    );
  }

  async function save(value: EventFormValue, publish: boolean) {
    setBusy(true);
    setError(null);
    try {
      const event = await api.events.create({ ...value, publish });
      router.replace(`/event/${event.id}` as Href);
    } catch (err) {
      setError(userMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text variant="heading">Crear fecha</Text>
      <EventForm submitLabel="Nueva fecha" busy={busy} error={error} onSubmit={(v, p) => void save(v, p)} />
    </Screen>
  );
}
