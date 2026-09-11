import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Field } from '@/components/field';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { useRequireAuth } from '@/hooks/use-require-auth';
import type { Artist } from '@/data/types';
import type { EventWithExtras } from '@/data/mock/api';

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
    return null;
  }
  if (user && !api.helpers.can(user.id, id, 'event.write')) {
    return (
      <Screen>
        <Text>El rol door no edita lineup.</Text>
      </Screen>
    );
  }

  const filtered = artists.filter((a) => a.stageName.toLowerCase().includes(q.toLowerCase()));

  return (
    <Screen>
      <Text variant="heading">Lineup</Text>
      {event?.lineup.length === 0 ? <Text variant="muted">Aún no hay lineup</Text> : null}
      <View className="mt-ds-16 gap-ds-8">
        {event?.lineup.map((artist, index) => (
          <View key={artist.id} className="flex-row items-center justify-between">
            <Text>
              {index + 1}. {artist.stageName}
            </Text>
            <Button variant="ghost" onPress={() => void api.events.removeLineup(id, artist.id).then(setEvent)}>
              <Text>Quitar</Text>
            </Button>
          </View>
        ))}
      </View>
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
      {error ? <Text className="mt-ds-8">{error}</Text> : null}
    </Screen>
  );
}
