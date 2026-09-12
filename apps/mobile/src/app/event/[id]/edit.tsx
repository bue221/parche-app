import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';

import { EventWizard } from '@/components/event-wizard';
import { LoadError, PendingAuth, Skeleton } from '@/components/feedback';
import { Screen } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { ApiError, userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { useRequireAuth } from '@/hooks/use-require-auth';
import type { EventWithExtras } from '@/data/types';

export default function EventEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ok = useRequireAuth(`/event/${id}/edit`);
  const { user } = useAuthSnapshot();
  const [event, setEvent] = useState<EventWithExtras | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.events
      .get(id)
      .then(setEvent)
      .catch((err) => {
        setError(userMessage(err));
        if (err instanceof ApiError && err.code === 'FORBIDDEN') {
          router.replace(`/event/${id}` as Href);
        }
      });
  }, [id]);

  if (!ok) {
    return <PendingAuth />;
  }
  if (user && !api.helpers.can(user.id, id, 'event.write')) {
    return (
      <Screen back>
        <Text>No puedes editar esta fecha.</Text>
      </Screen>
    );
  }
  if (error && !event) {
    return <LoadError message={error} onRetry={() => void api.events.get(id).then(setEvent).catch((err) => setError(userMessage(err)))} />;
  }
  if (!event) {
    return (
      <Screen back>
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-ds-16 h-48 w-full" />
      </Screen>
    );
  }

  return <EventWizard mode="edit" eventId={event.id} initial={event} />;
}
