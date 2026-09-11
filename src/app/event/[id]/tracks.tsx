import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { Field } from '@/components/field';
import { MediaPicker } from '@/components/media-picker';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { useRequireAuth } from '@/hooks/use-require-auth';
import type { EventTrack } from '@/data/types';

export default function EventTracksScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ok = useRequireAuth(`/event/${id}/tracks`);
  const { user } = useAuthSnapshot();
  const [tracks, setTracks] = useState<EventTrack[]>([]);
  const [title, setTitle] = useState('Preview');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.events.get(id).then((e) => setTracks(e.tracks));
  }, [id]);

  if (!ok) {
    return null;
  }
  if (user && !api.helpers.can(user.id, id, 'event.write')) {
    return (
      <Screen>
        <Text>No puedes editar tracks.</Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text variant="heading">Tracks</Text>
      {tracks.map((t) => (
        <Text key={t.id} className="mt-ds-8">
          {t.title}
        </Text>
      ))}
      <Field label="Título" value={title} onChangeText={setTitle} />
      <MediaPicker kind="audio" eventId={id} onUploaded={setUrl} />
      {error ? <Text>{error}</Text> : null}
      <Button
        className="mt-ds-16"
        onPress={() => {
          if (!url) {
            setError('Sube un audio primero');
            return;
          }
          void api.events
            .putTracks(id, [...tracks.map((t) => ({ title: t.title, url: t.url })), { title, url }])
            .then((e) => {
              setTracks(e.tracks);
              setError(null);
            })
            .catch((err) => setError(userMessage(err)));
        }}>
        <Text>Guardar track</Text>
      </Button>
    </Screen>
  );
}
