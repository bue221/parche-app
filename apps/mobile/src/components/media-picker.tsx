import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Camera } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { PressScale } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { ApiError, userMessage } from '@/data/errors';
import { setPendingUpload } from '@/data/http-api';
import { debugLog } from '@/data/log';
import { toast } from '@/data/toast-store';
import type { MediaKind } from '@/data/types';
import { assertImageUpload, bytesFromImageAsset } from '@/lib/image-asset';

export function MediaPicker({
  kind,
  eventId,
  previewUri,
  fallbackLabel,
  onUploaded,
}: {
  kind: MediaKind;
  eventId?: string;
  previewUri?: string;
  fallbackLabel?: string;
  onUploaded: (url: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | undefined>();
  const preview = localPreview ?? previewUri;
  const blocked = kind !== 'avatar' && kind !== 'audio' && !eventId;

  async function pick() {
    if (blocked || busy) return;
    setError(null);
    setBusy(true);
    try {
      if (kind === 'audio') {
        const upload = await api.media.upload('audio', 'audio/mpeg', 1000, eventId);
        onUploaded(upload.url);
        return;
      }
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          throw new ApiError('FORBIDDEN', 'Necesitamos acceso a tus fotos.');
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        base64: true,
        allowsEditing: kind === 'avatar',
        aspect: kind === 'avatar' ? [1, 1] : undefined,
      });
      if (result.canceled || !result.assets[0]) {
        return;
      }
      const asset = result.assets[0];
      const { mime, bytes, uri } = await bytesFromImageAsset(asset);
      assertImageUpload(mime, bytes.byteLength);
      setLocalPreview(uri);
      setPendingUpload({ mime, bytes });
      const upload = await api.media.upload(kind, mime, bytes.byteLength, eventId);
      onUploaded(upload.url);
      toast(kind === 'avatar' ? 'Foto actualizada' : 'Imagen subida', 'success');
    } catch (err) {
      const message = userMessage(err);
      setError(message);
      toast(message);
      debugLog('media', 'pick failed', { kind });
    } finally {
      setBusy(false);
    }
  }

  const helper = error ? (
    <Text variant="helper" className="text-foreground">
      {error}
    </Text>
  ) : null;

  if (kind === 'avatar') {
    const letter = (fallbackLabel || 'P').slice(0, 1).toUpperCase();
    return (
      <View className="w-full items-center gap-ds-12">
        <PressScale onPress={() => void pick()} accessibilityLabel="Cambiar foto de perfil">
          <View className="items-center">
            <View className="relative">
              {preview ? (
                <Image source={{ uri: preview }} className="rounded-full bg-muted" style={{ width: 120, height: 120 }} />
              ) : (
                <View className="size-[120px] items-center justify-center rounded-full bg-muted">
                  <Text variant="heading">{letter}</Text>
                </View>
              )}
              <View className="absolute bottom-0 right-1 size-10 items-center justify-center rounded-full bg-primary">
                <Icon as={Camera} size={18} className="text-primary-foreground" />
              </View>
            </View>
          </View>
        </PressScale>
        <Text variant="muted" className="text-center">
          {busy ? 'Subiendo…' : 'Toca la foto para cambiarla'}
        </Text>
        {helper}
      </View>
    );
  }

  return (
    <View className="gap-ds-8">
      <Text variant="caption" className="uppercase">
        {kind === 'audio' ? 'Audio' : 'Imagen'}
      </Text>
      <Button variant="outline" disabled={busy || blocked} onPress={() => void pick()}>
        <Text>{busy ? 'Subiendo…' : Platform.OS === 'web' ? 'Elegir archivo' : 'Elegir de galería'}</Text>
      </Button>
      {blocked ? <Text variant="helper">Guarda el borrador para subir el flyer.</Text> : null}
      {helper}
    </View>
  );
}
