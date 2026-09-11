import { router, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Field } from '@/components/field';
import { MediaPicker } from '@/components/media-picker';
import { MockMap } from '@/components/mock-map';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import type { ParcheEvent } from '@/data/types';

export type EventFormValue = {
  name: string;
  startsAt: string;
  venueName: string;
  addressText: string;
  description: string;
  genre: string;
  lat?: number;
  lng?: number;
  flyerUrl?: string;
};

export function EventForm({
  initial,
  eventId,
  submitLabel,
  onSubmit,
  busy,
  error,
}: {
  initial?: Partial<ParcheEvent>;
  eventId?: string;
  submitLabel: string;
  onSubmit: (value: EventFormValue, publish: boolean) => void;
  busy?: boolean;
  error?: string | null;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [startsAt, setStartsAt] = useState(initial?.startsAt?.slice(0, 16) ?? '');
  const [venueName, setVenueName] = useState(initial?.venueName ?? '');
  const [addressText, setAddressText] = useState(initial?.addressText ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [genre, setGenre] = useState(initial?.genre ?? 'techno');
  const [lat, setLat] = useState(initial?.lat);
  const [lng, setLng] = useState(initial?.lng);
  const [flyerUrl, setFlyerUrl] = useState(initial?.flyerUrl);

  const value: EventFormValue = {
    name,
    startsAt: startsAt ? new Date(startsAt).toISOString() : '',
    venueName,
    addressText,
    description,
    genre,
    lat,
    lng,
    flyerUrl,
  };

  const canPublish = lat != null && lng != null && Boolean(flyerUrl);

  return (
    <View className="gap-ds-16">
      <Field label="Nombre" value={name} onChangeText={setName} />
      <Field
        label="Fecha y hora (ISO local)"
        placeholder="2026-10-01T23:00"
        value={startsAt}
        onChangeText={setStartsAt}
      />
      <Field label="Venue" value={venueName} onChangeText={setVenueName} />
      <Field label="Dirección" value={addressText} onChangeText={setAddressText} />
      <Field label="Descripción" value={description} onChangeText={setDescription} multiline />
      <Field label="Género" value={genre} onChangeText={setGenre} />
      <MediaPicker kind="flyer" eventId={eventId} onUploaded={setFlyerUrl} />
      {flyerUrl ? <Text variant="helper">Flyer listo</Text> : <Text variant="helper">Sin flyer no se publica</Text>}
      <Text variant="caption" className="uppercase">
        Pin
      </Text>
      <MockMap
        pin={lat != null && lng != null ? { lat, lng } : undefined}
        onPressMap={(coord) => {
          setLat(coord.lat);
          setLng(coord.lng);
        }}
      />
        <Button
          variant="outline"
          onPress={() => {
            if (api.device.getPermissions().location !== 'granted') {
              router.push('/permissions/location' as Href);
              return;
            }
            const bogota = api.device.bogota();
            setLat(bogota.lat);
            setLng(bogota.lng);
          }}>
        <Text>Usar mi ubicación</Text>
      </Button>
      {error ? <Text>{error}</Text> : null}
      <Button disabled={busy} onPress={() => onSubmit(value, false)}>
        <Text>{busy ? 'Guardando…' : 'Guardar borrador'}</Text>
      </Button>
      <Button disabled={busy || !canPublish} onPress={() => onSubmit(value, true)}>
        <Text>Enviar a revisión</Text>
      </Button>
      {!canPublish ? (
        <Text variant="helper">Publicar pide pin y flyer.</Text>
      ) : null}
      <Text variant="caption">
        {submitLabel}
      </Text>
    </View>
  );
}
