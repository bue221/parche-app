import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';

import { EventForm, type EventFormValue } from '@/components/event-form';
import { Screen } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { useRequireAuth } from '@/hooks/use-require-auth';
import type { EventWithExtras } from '@/data/mock/api';

export default function EventEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ok = useRequireAuth(`/event/${id}/edit`);
  const { user } = useAuthSnapshot();
  const [event, setEvent] = useState<EventWithExtras | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.events.get(id).then(setEvent).catch((err) => setError(userMessage(err)));
  }, [id]);

  if (!ok) {
    return null;
  }
  if (user && !api.helpers.can(user.id, id, 'event.write')) {
    return (
      <Screen>
        <Text>No puedes editar esta fecha.</Text>
      </Screen>
    );
  }
  if (!event) {
    return (
      <Screen>
        <Text variant="muted">Cargando…</Text>
      </Screen>
    );
  }

  async function save(value: EventFormValue, publish: boolean) {
    setBusy(true);
    setError(null);
    try {
      await api.events.patch(id, { ...value, publish });
      router.replace(`/event/${id}` as Href);
    } catch (err) {
      setError(userMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text variant="heading">Editar fecha</Text>
      <EventForm
        initial={event}
        eventId={event.id}
        submitLabel="Guardar cambios"
        busy={busy}
        error={error}
        onSubmit={(v, p) => void save(v, p)}
      />
    </Screen>
  );
}
