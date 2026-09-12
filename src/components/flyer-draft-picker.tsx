import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { FlyerImage } from '@/components/flyer-image';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { setPendingUpload } from '@/data/http-api';
import { debugLog } from '@/data/log';

export type FlyerDraft = {
  uri: string;
  mime: string;
  bytes: Uint8Array;
};

export function FlyerDraftPicker({
  previewUri,
  eventId,
  onLocalPick,
  onUploaded,
}: {
  previewUri?: string;
  eventId?: string;
  onLocalPick: (draft: FlyerDraft) => void;
  onUploaded: (url: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    setError(null);
    setBusy(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });
      if (result.canceled || !result.assets[0]) {
        return;
      }
      const asset = result.assets[0];
      const mime = asset.mimeType || 'image/jpeg';
      const res = await fetch(asset.uri);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const draft: FlyerDraft = { uri: asset.uri, mime, bytes };
      onLocalPick(draft);
      if (!eventId) {
        return;
      }
      setPendingUpload({ mime, bytes });
      const upload = await api.media.upload('flyer', mime, bytes.byteLength, eventId);
      onUploaded(upload.url);
    } catch (err) {
      const message = userMessage(err);
      setError(message);
      debugLog('events', 'flyer pick failed', { hasEventId: Boolean(eventId) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="gap-ds-12">
      <Pressable accessibilityRole="button" onPress={() => void pick()} disabled={busy}>
        {previewUri ? (
          <View className="overflow-hidden rounded-images bg-muted">
            <FlyerImage uri={previewUri} className="w-full" aspectRatio={4 / 5} />
          </View>
        ) : (
          <View className="aspect-[4/5] w-full items-center justify-center rounded-images border border-dashed border-foreground bg-muted px-ds-24">
            <Text variant="subheading" className="text-center">
              {busy ? 'Subiendo…' : 'Toca para elegir el flyer'}
            </Text>
            <Text variant="muted" className="mt-ds-8 text-center">
              {Platform.OS === 'web' ? 'Archivo jpeg, png o webp.' : 'Desde tu galería. 4:5 se ve mejor.'}
            </Text>
          </View>
        )}
      </Pressable>
      {previewUri ? (
        <Text variant="helper">{busy ? 'Subiendo…' : eventId ? 'Flyer listo. Toca para cambiarlo.' : 'Preview local. Se sube al guardar los datos.'}</Text>
      ) : (
        <Text variant="helper">Sin flyer no se envía a revisión.</Text>
      )}
      {error ? (
        <Text variant="helper" className="text-foreground">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
