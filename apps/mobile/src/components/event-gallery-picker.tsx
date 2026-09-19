import { Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { FlyerImage } from '@/components/flyer-image';
import type { FlyerDraft } from '@/components/flyer-draft-picker';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { ApiError, userMessage } from '@/data/errors';
import { setPendingUpload } from '@/data/http-api';
import { debugLog } from '@/data/log';
import { toast } from '@/data/toast-store';
import type { EventGalleryImage } from '@/data/types';
import { MAX_EVENT_GALLERY } from '@/lib/event-images';
import { assertImageUpload, bytesFromImageAsset } from '@/lib/image-asset';

export function EventGalleryPicker({
  eventId,
  images,
  pending,
  disabled,
  onPendingChange,
  onImagesChange,
}: {
  eventId?: string;
  images: EventGalleryImage[];
  pending: FlyerDraft[];
  disabled?: boolean;
  onPendingChange: (next: FlyerDraft[]) => void;
  onImagesChange: (next: EventGalleryImage[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const used = images.length + pending.length;
  const remaining = Math.max(0, MAX_EVENT_GALLERY - used);
  const blocked = busy || disabled || remaining === 0;

  async function pick() {
    if (blocked) return;
    setError(null);
    setBusy(true);
    try {
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
        allowsMultipleSelection: true,
        selectionLimit: remaining,
      });
      if (result.canceled || result.assets.length === 0) {
        return;
      }
      const drafts: FlyerDraft[] = [];
      for (const [index, asset] of result.assets.slice(0, remaining).entries()) {
        const { mime, bytes, uri } = await bytesFromImageAsset(asset);
        assertImageUpload(mime, bytes.byteLength);
        drafts.push({ uri, mime, bytes, id: `local-${Date.now()}-${index}` });
      }
      if (!eventId) {
        onPendingChange([...pending, ...drafts]);
        toast(drafts.length === 1 ? 'Foto lista para subir' : `${drafts.length} fotos listas para subir`, 'success');
        return;
      }
      const uploaded: EventGalleryImage[] = [];
      const failed: FlyerDraft[] = [];
      for (const draft of drafts) {
        try {
          setPendingUpload({ mime: draft.mime, bytes: draft.bytes });
          const upload = await api.media.upload('gallery', draft.mime, draft.bytes.byteLength, eventId);
          uploaded.push({ id: upload.id, url: upload.url });
        } catch (err) {
          debugLog('events', 'gallery upload failed', { eventId });
          failed.push(draft);
          setError(userMessage(err));
        }
      }
      if (uploaded.length > 0) {
        onImagesChange([...images, ...uploaded]);
        toast(uploaded.length === 1 ? 'Foto sumada' : `${uploaded.length} fotos sumadas`, 'success');
      }
      if (failed.length > 0) {
        onPendingChange([...pending, ...failed]);
        toast(failed.length === 1 ? 'No se subió una foto' : `No se subieron ${failed.length} fotos`);
      }
    } catch (err) {
      const message = userMessage(err);
      setError(message);
      toast(message);
      debugLog('events', 'gallery pick failed', { hasEventId: Boolean(eventId) });
    } finally {
      setBusy(false);
    }
  }

  async function removeConfirmed(id: string) {
    if (busy || disabled) return;
    if (!eventId) {
      onImagesChange(images.filter((image) => image.id !== id));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.media.remove(eventId, id);
      onImagesChange(images.filter((image) => image.id !== id));
    } catch (err) {
      const message = userMessage(err);
      setError(message);
      toast(message);
      debugLog('events', 'gallery remove failed', { eventId, id });
    } finally {
      setBusy(false);
    }
  }

  function removePending(id: string) {
    if (busy || disabled) return;
    onPendingChange(pending.filter((item) => (item.id ?? item.uri) !== id));
  }

  const thumbs = [
    ...images.map((image) => ({ id: image.id, url: image.url, confirmed: true as const })),
    ...pending.map((item) => ({ id: item.id ?? item.uri, url: item.uri, confirmed: false as const })),
  ];

  return (
    <View className="gap-ds-8">
      <Text variant="caption" className="uppercase">
        Más fotos
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {thumbs.map((item) => (
          <View key={item.id} className="relative">
            <View className="h-28 w-24 overflow-hidden rounded-images bg-muted">
              <FlyerImage uri={item.url} className="h-full w-full" />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quitar foto"
              hitSlop={8}
              disabled={busy || disabled}
              onPress={() => (item.confirmed ? void removeConfirmed(item.id) : removePending(item.id))}
              className="absolute right-1 top-1 size-8 items-center justify-center rounded-full bg-paper-white">
              <X size={14} color="#0B0B12" strokeWidth={2.2} />
            </Pressable>
          </View>
        ))}
        {remaining > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Agregar fotos"
            disabled={blocked}
            onPress={() => void pick()}
            className="h-28 w-24 items-center justify-center rounded-images border border-dashed border-foreground bg-muted">
            <Plus size={22} color="#8A8A9B" strokeWidth={2} />
            <Text variant="helper" className="mt-ds-4 text-center">
              {busy ? 'Subiendo…' : 'Agregar'}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
      <Text variant="helper">
        {remaining === 0
          ? `Hasta ${MAX_EVENT_GALLERY} fotos extra.`
          : eventId
            ? `Opcional. El flyer es la portada; estas salen en la ficha. ${used}/${MAX_EVENT_GALLERY}`
            : 'Opcional. Se suben al guardar el pin, como el flyer.'}
      </Text>
      {error ? (
        <Text variant="helper" className="text-foreground">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
