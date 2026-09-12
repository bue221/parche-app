import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { ArtistPreview } from '@/components/artist-preview';
import { BackBar } from '@/components/back-bar';
import { EmptyState, PendingAuth } from '@/components/feedback';
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
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function ArtistEditScreen() {
  const ok = useRequireAuth('/artist/edit');
  const { isPromoter, user } = useAuthSnapshot();
  const isArtist = Boolean(user?.profiles.includes('artist'));
  const [stageName, setStageName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [guest, setGuest] = useState(false);
  const [existingId, setExistingId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void api.artists
      .mine()
      .then((mine) => {
        if (!mine) return;
        setExistingId(mine.id);
        setStageName(mine.stageName);
        setBio(mine.bio);
        setAvatarUrl(mine.avatarUrl);
      })
      .catch(() => undefined);
  }, [user?.id]);

  if (!ok) {
    return <PendingAuth />;
  }

  if (!isArtist && !isPromoter) {
    return (
      <Screen>
        <BackBar />
        <EmptyState
          title="Activa tu ficha desde Parche"
          lead="El perfil de artista no abre caja ni puerta."
          actionLabel="Ir a Parche"
          onAction={() => router.replace('/parche' as Href)}
        />
      </Screen>
    );
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const artist = await api.artists.upsert({
        id: guest ? undefined : existingId,
        stageName,
        bio,
        avatarUrl,
        guest: guest && isPromoter,
      });
      router.replace(`/artist/${artist.id}` as Href);
    } catch (err) {
      setError(userMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <BackBar />
      <PageHeader title="Perfil de artista" lead="Así te ven en lineup y en el perfil público." />
      <View className="mt-ds-24 gap-ds-32">
        <FormSection title="Vista previa">
          <ArtistPreview stageName={stageName} bio={bio} avatarUrl={avatarUrl} />
        </FormSection>

        <FormSection title="Datos">
          <Field label="Nombre de escena" value={stageName} onChangeText={setStageName} />
          <Field label="Bio" value={bio} onChangeText={setBio} multiline />
          <MediaPicker kind="avatar" onUploaded={setAvatarUrl} />
          {isPromoter ? (
            <Button variant={guest ? 'default' : 'outline'} onPress={() => setGuest((v) => !v)}>
              <Text>{guest ? 'Ficha invitada (sin user)' : 'Crear ficha invitada'}</Text>
            </Button>
          ) : null}
          {error ? (
            <Text variant="helper" className="text-foreground">
              {error}
            </Text>
          ) : null}
          <Button disabled={saving} onPress={() => void save()}>
            <Text>{saving ? 'Guardando…' : 'Guardar'}</Text>
          </Button>
        </FormSection>
      </View>
    </Screen>
  );
}
