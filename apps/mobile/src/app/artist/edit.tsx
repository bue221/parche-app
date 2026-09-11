import { router, type Href } from 'expo-router';
import { useState } from 'react';

import { Field } from '@/components/field';
import { MediaPicker } from '@/components/media-picker';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { getSnapshot } from '@/data/mock/store';
import { useAuthSnapshot } from '@/data/session';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function ArtistEditScreen() {
  const ok = useRequireAuth('/artist/edit');
  const { user, isPromoter } = useAuthSnapshot();
  const existing = getSnapshot().artists.find((a) => a.userId === user?.id);
  const [stageName, setStageName] = useState(existing?.stageName ?? user?.displayName ?? '');
  const [bio, setBio] = useState(existing?.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState(existing?.avatarUrl);
  const [guest, setGuest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ok) {
    return null;
  }

  async function save() {
    try {
      const artist = await api.artists.upsert({
        id: guest ? undefined : existing?.id,
        stageName,
        bio,
        avatarUrl,
        guest: guest && isPromoter,
      });
      router.replace(`/artist/${artist.id}` as Href);
    } catch (err) {
      setError(userMessage(err));
    }
  }

  return (
    <Screen>
      <Text variant="heading">Ficha de artista</Text>
      <Field label="Nombre de escena" value={stageName} onChangeText={setStageName} />
      <Field label="Bio" value={bio} onChangeText={setBio} multiline />
      <MediaPicker kind="avatar" onUploaded={setAvatarUrl} />
      {isPromoter ? (
        <Button variant={guest ? 'default' : 'outline'} onPress={() => setGuest((v) => !v)}>
          <Text>{guest ? 'Ficha invitada (sin user)' : 'Crear ficha invitada'}</Text>
        </Button>
      ) : null}
      {error ? <Text>{error}</Text> : null}
      <Button className="mt-ds-16" onPress={() => void save()}>
        <Text>Guardar</Text>
      </Button>
    </Screen>
  );
}
