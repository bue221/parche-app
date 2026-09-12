import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { BackBar } from '@/components/back-bar';
import { Field } from '@/components/field';
import { FormSection } from '@/components/form-section';
import { MediaPicker } from '@/components/media-picker';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { PendingAuth } from '@/components/feedback';
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
    return <PendingAuth />;
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
      <BackBar />
      <PageHeader title="Tracks" />
      {tracks.map((t) => (
        <Text key={t.id} className="mt-ds-8">
          {t.title}
        </Text>
      ))}
      <FormSection title="Añadir" className="mt-ds-24">
        <Field label="Título" value={title} onChangeText={setTitle} />
        <MediaPicker kind="audio" eventId={id} onUploaded={setUrl} />
        {error ? (
          <Text variant="helper" className="text-foreground">
            {error}
          </Text>
        ) : null}
        <Button
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
      </FormSection>
    </Screen>
  );
}
