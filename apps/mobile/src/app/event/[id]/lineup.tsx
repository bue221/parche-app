import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { ArtistRow } from '@/components/artist-row';
import { EndedEventNotice } from '@/components/ended-event-notice';
import { Field } from '@/components/field';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { PendingAuth, Skeleton } from '@/components/feedback';
import { useRequireAuth } from '@/hooks/use-require-auth';
import type { Artist, EventWithExtras } from '@/data/types';
import { eventHasEnded } from '@/lib/format';

export default function EventLineupEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ok = useRequireAuth(`/event/${id}/lineup`);
  const { user } = useAuthSnapshot();
  const [event, setEvent] = useState<EventWithExtras | null>(null);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.events.get(id).then(setEvent);
    void api.artists.list().then(setArtists);
  }, [id]);

  if (!ok) {
    return <PendingAuth />;
  }
  if (user && !api.helpers.can(user.id, id, 'event.write')) {
    return (
      <Screen back>
        <Text>El rol door no edita artistas.</Text>
      </Screen>
    );
  }
  if (!event) {
    return (
      <Screen back title="Artistas">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-ds-16 h-24 w-full" />
      </Screen>
    );
  }

  const ended = eventHasEnded(event);
  const filtered = artists.filter((a) => a.stageName.toLowerCase().includes(q.toLowerCase()));

  return (
    <Screen back title="Artistas" lead={ended ? 'Consulta. El cartel ya no se cambia.' : undefined}>
      {ended ? <EndedEventNotice /> : null}
      {event.lineup.length === 0 ? <Text variant="muted">Aún no hay artistas</Text> : null}
      <View className="mt-ds-16 gap-ds-8">
        {event.lineup.map((artist) => (
          <View key={artist.id} className="flex-row items-center justify-between">
            <ArtistRow artist={artist} />
            {ended ? null : (
              <Button variant="ghost" onPress={() => void api.events.removeLineup(id, artist.id).then(setEvent)}>
                <Text>Quitar</Text>
              </Button>
            )}
          </View>
        ))}
      </View>
      {ended ? null : (
        <>
          <Field label="Buscar artista" value={q} onChangeText={setQ} />
          {filtered.map((artist) => (
            <Button
              key={artist.id}
              variant="outline"
              className="mt-ds-8"
              onPress={() => {
                void api.events
                  .addLineup(id, artist.id)
                  .then(setEvent)
                  .catch((err) => setError(userMessage(err)));
              }}>
              <Text>Añadir {artist.stageName}</Text>
            </Button>
          ))}
        </>
      )}
      {error ? <Text className="mt-ds-8">{error}</Text> : null}
    </Screen>
  );
}
