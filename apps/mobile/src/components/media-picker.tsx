import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import type { MediaKind } from '@/data/types';

export function MediaPicker({
  kind,
  eventId,
  onUploaded,
}: {
  kind: MediaKind;
  eventId?: string;
  onUploaded: (url: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pick(ok: boolean) {
    setError(null);
    if (!ok) {
      setError(kind === 'audio' ? 'Audio no válido (mpeg/ogg/wav, máx 20 MB)' : 'Imagen no válida (jpeg/png/webp, máx 8 MB)');
      return;
    }
    setBusy(true);
    try {
      const mime = kind === 'audio' ? 'audio/mpeg' : 'image/jpeg';
      const size = kind === 'audio' ? 1_000_000 : 200_000;
      const upload = await api.media.upload(kind, mime, size, eventId);
      onUploaded(upload.url);
    } catch (err) {
      setError(userMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="gap-ds-8">
      <Text variant="caption" className="uppercase">
        {kind === 'audio' ? 'Audio' : 'Imagen'} (presign mock)
      </Text>
      <View className="flex-row flex-wrap gap-ds-8">
        <Button disabled={busy} onPress={() => void pick(true)}>
          <Text>{busy ? 'Subiendo…' : 'Elegir archivo válido'}</Text>
        </Button>
        <Button variant="outline" disabled={busy} onPress={() => void pick(false)}>
          <Text>Probar rechazo</Text>
        </Button>
      </View>
      {error ? <Text>{error}</Text> : null}
    </View>
  );
}
