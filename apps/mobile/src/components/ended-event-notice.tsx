import { router, type Href } from 'expo-router';
import { useEffect } from 'react';

import { Surface } from '@/components/surface';
import { Text } from '@/components/ui/text';
import { toast } from '@/data/toast-store';
import { ENDED_EVENT_COPY, eventHasEnded } from '@/lib/format';

export { ENDED_EVENT_COPY };

export function EndedEventNotice() {
  return (
    <Surface muted className="gap-ds-8">
      <Text variant="subheading">Evento finalizado</Text>
      <Text variant="muted">{ENDED_EVENT_COPY}</Text>
    </Surface>
  );
}

export function useBlockEndedEventWrite(
  event: { startsAt: string; endsAt?: string } | null | undefined,
  eventId: string,
  fallback: Href = `/event/${eventId}/operate` as Href
) {
  useEffect(() => {
    if (!event || !eventHasEnded(event)) return;
    toast(ENDED_EVENT_COPY, 'info');
    router.replace(fallback);
  }, [event, eventId, fallback]);
}
