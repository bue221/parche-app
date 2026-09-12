import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { setPendingUpload } from '@/data/http-api';
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

  async function pick() {
    setError(null);
    setBusy(true);
    try {
      if (kind === 'audio') {
        const upload = await api.media.upload('audio', 'audio/mpeg', 1000, eventId);
        onUploaded(upload.url);
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        base64: true,
      });
      if (result.canceled || !result.assets[0]) {
        return;
      }
      const asset = result.assets[0];
      const mime = asset.mimeType || 'image/jpeg';
      const res = await fetch(asset.uri);
      const bytes = new Uint8Array(await res.arrayBuffer());
      setPendingUpload({ mime, bytes });
      const upload = await api.media.upload(kind, mime, bytes.byteLength, eventId);
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
        {kind === 'audio' ? 'Audio' : 'Imagen'}
      </Text>
      <Button variant="outline" disabled={busy || (kind !== 'avatar' && kind !== 'audio' && !eventId)} onPress={() => void pick()}>
        <Text>{busy ? 'Subiendo…' : Platform.OS === 'web' ? 'Elegir archivo' : 'Elegir de galería'}</Text>
      </Button>
      {kind !== 'avatar' && kind !== 'audio' && !eventId ? (
        <Text variant="helper">Guarda el borrador para subir el flyer.</Text>
      ) : null}
      {error ? <Text>{error}</Text> : null}
    </View>
  );
}
