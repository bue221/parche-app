import { useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { BackBar } from '@/components/back-bar';
import { DateTimeField } from '@/components/date-field';
import { EventCard } from '@/components/event-card';
import { Field } from '@/components/field';
import { FlyerDraftPicker, type FlyerDraft } from '@/components/flyer-draft-picker';
import { FormSection } from '@/components/form-section';
import { OsmMap } from '@/components/osm-map';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { StickyCta } from '@/components/sticky-cta';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { ApiError, userMessage } from '@/data/errors';
import { setPendingUpload } from '@/data/http-api';
import { debugLog } from '@/data/log';
import { toast } from '@/data/toast-store';
import type { ParcheEvent } from '@/data/types';
import { GENRE_CHIPS } from '@/lib/genres';

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

const STEPS = [
  { title: 'Elige el flyer', lead: 'La foto manda. Sin flyer no se envía a revisión.' },
  { title: 'Nombre y momento', lead: 'Lo mínimo para armar la fecha.' },
  { title: 'Dónde es', lead: 'Toca el mapa para soltar el pin. El API pide pin para guardar el borrador.' },
  { title: 'Así se ve', lead: 'Revisa el listing antes de guardar o enviar.' },
] as const;

export function EventWizard({
  mode,
  initial,
  eventId: initialEventId,
}: {
  mode: 'create' | 'edit';
  initial?: Partial<ParcheEvent>;
  eventId?: string;
}) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [eventId, setEventId] = useState(initialEventId);
  const [name, setName] = useState(initial?.name ?? '');
  const [startsAt, setStartsAt] = useState(toDatetimeLocal(initial?.startsAt));
  const [venueName, setVenueName] = useState(initial?.venueName ?? '');
  const [addressText, setAddressText] = useState(initial?.addressText ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [genre, setGenre] = useState(initial?.genre ?? 'techno');
  const [lat, setLat] = useState(initial?.lat);
  const [lng, setLng] = useState(initial?.lng);
  const [flyerUrl, setFlyerUrl] = useState(initial?.flyerUrl);
  const [localFlyerUri, setLocalFlyerUri] = useState<string | undefined>(initial?.flyerUrl);
  const [pendingFlyer, setPendingFlyer] = useState<FlyerDraft | null>(null);
  const [flyerFailed, setFlyerFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | undefined>();
  const [dateError, setDateError] = useState<string | undefined>();

  const value: EventFormValue = {
    name,
    startsAt: toIso(startsAt),
    venueName,
    addressText,
    description,
    genre,
    lat,
    lng,
    flyerUrl,
  };

  const preview = useMemo(
    () => previewEvent(value, eventId ?? 'preview', localFlyerUri ?? flyerUrl),
    [value, eventId, localFlyerUri, flyerUrl]
  );
  const canSubmit = lat != null && lng != null && Boolean(flyerUrl) && !flyerFailed;
  const current = STEPS[step];

  async function uploadPending(id: string) {
    if (!pendingFlyer) return;
    try {
      setPendingUpload({ mime: pendingFlyer.mime, bytes: pendingFlyer.bytes });
      const upload = await api.media.upload('flyer', pendingFlyer.mime, pendingFlyer.bytes.byteLength, id);
      setFlyerUrl(upload.url);
      setLocalFlyerUri(upload.url);
      setPendingFlyer(null);
      setFlyerFailed(false);
    } catch (err) {
      setFlyerFailed(true);
      debugLog('events', 'flyer upload failed', { eventId: id });
      throw err;
    }
  }

  async function persistDraft() {
    const payload = {
      name: value.name,
      startsAt: value.startsAt,
      venueName: value.venueName,
      addressText: value.addressText,
      description: value.description,
      genre: value.genre,
      lat: value.lat,
      lng: value.lng,
    };
    if (!eventId && (payload.lat == null || payload.lng == null)) {
      throw new ApiError('VALIDATION_ERROR', 'Suelta un pin o usa Bogotá para guardar el borrador.');
    }
    if (!eventId) {
      const created = await api.events.create({ ...payload, publish: false });
      setEventId(created.id);
      await uploadPending(created.id);
      return created.id;
    }
    await api.events.patch(eventId, payload);
    await uploadPending(eventId);
    return eventId;
  }

  function validateDatos() {
    const nextName = name.trim() ? undefined : 'Ponle nombre a la fecha';
    const parsed = startsAt ? new Date(startsAt) : null;
    const nextDate = parsed && !Number.isNaN(parsed.getTime()) ? undefined : 'Fecha y hora son obligatorias';
    setNameError(nextName);
    setDateError(nextDate);
    return !nextName && !nextDate;
  }

  async function goNext() {
    if (busy) return;
    setError(null);
    if (step === 1 && !validateDatos()) return;
    if (step === 2 && (lat == null || lng == null)) {
      setError('Suelta un pin o usa Bogotá para guardar el borrador.');
      return;
    }
    const shouldPersist = (step === 1 && Boolean(eventId)) || step === 2;
    if (shouldPersist) {
      setBusy(true);
      try {
        await persistDraft();
        setStep((currentStep) => currentStep + 1);
      } catch (err) {
        const message = userMessage(err);
        setError(message);
        debugLog('events', 'wizard persist failed', { step, mode });
        if (err instanceof ApiError && err.code === 'FORBIDDEN') {
          router.replace((eventId ? `/event/${eventId}` : '/operate') as Href);
        }
      } finally {
        setBusy(false);
      }
      return;
    }
    setStep((currentStep) => Math.min(currentStep + 1, STEPS.length - 1));
  }

  async function finish(publish: boolean) {
    if (busy || !eventId) return;
    if (publish && !canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await persistDraft();
      await api.events.patch(eventId, { ...value, publish });
      await queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      toast(publish ? 'Enviada a revisión' : 'Borrador guardado', 'success');
      if (publish || mode === 'edit') {
        router.replace(`/event/${eventId}` as Href);
      } else {
        router.replace(`/event/${eventId}/setup` as Href);
      }
    } catch (err) {
      const message = userMessage(err);
      setError(message);
      debugLog('events', 'wizard finish failed', { publish, mode });
      if (err instanceof ApiError && err.code === 'CONFLICT' && eventId) {
        toast('Alguien más editó esta fecha. Recarga e intenta de nuevo.');
        try {
          const fresh = await api.events.get(eventId);
          setName(fresh.name);
          setStartsAt(toDatetimeLocal(fresh.startsAt));
          setVenueName(fresh.venueName);
          setAddressText(fresh.addressText);
          setDescription(fresh.description);
          setGenre(fresh.genre);
          setLat(fresh.lat);
          setLng(fresh.lng);
          setFlyerUrl(fresh.flyerUrl);
          setLocalFlyerUri(fresh.flyerUrl);
        } catch {
          /* keep local values */
        }
      }
      if (err instanceof ApiError && err.code === 'FORBIDDEN') {
        router.replace(`/event/${eventId}` as Href);
      }
    } finally {
      setBusy(false);
    }
  }

  const body =
    step === 0 ? (
      <FlyerDraftPicker
        previewUri={localFlyerUri}
        eventId={eventId}
        onLocalPick={(draft) => {
          setLocalFlyerUri(draft.uri);
          setFlyerFailed(false);
          if (!eventId) {
            setPendingFlyer(draft);
          }
        }}
        onUploaded={(url) => {
          setFlyerUrl(url);
          setLocalFlyerUri(url);
          setPendingFlyer(null);
          setFlyerFailed(false);
        }}
      />
    ) : step === 1 ? (
      <FormSection title="Datos">
        <Field label="Nombre" value={name} onChangeText={setName} error={nameError} />
        <DateTimeField label="Fecha y hora" value={startsAt} onChange={setStartsAt} />
        {dateError ? (
          <Text variant="helper" className="text-foreground">
            {dateError}
          </Text>
        ) : null}
        <Field label="Venue" value={venueName} onChangeText={setVenueName} />
        <Field label="Dirección" value={addressText} onChangeText={setAddressText} />
        <Field label="Descripción" value={description} onChangeText={setDescription} multiline />
        <View className="gap-ds-8">
          <Text variant="caption" className="uppercase">
            Género
          </Text>
          <View className="flex-row flex-wrap gap-ds-8">
            {GENRE_CHIPS.map((item) => (
              <Pressable key={item} onPress={() => setGenre(item)}>
                <Tag inverted={genre === item} tone={genre === item ? 'ink' : 'muted'}>
                  {item}
                </Tag>
              </Pressable>
            ))}
          </View>
        </View>
      </FormSection>
    ) : step === 2 ? (
      <FormSection title="Pin">
        <OsmMap
          pin={lat != null && lng != null ? { lat, lng } : undefined}
          onPressMap={(coord) => {
            setLat(coord.lat);
            setLng(coord.lng);
          }}
        />
        <Button
          variant="outline"
          onPress={() => {
            const bogota = api.device.bogota();
            setLat(bogota.lat);
            setLng(bogota.lng);
          }}>
          <Text>Usar Bogotá</Text>
        </Button>
        {lat != null && lng != null ? (
          <Text variant="helper">
            Pin {lat.toFixed(4)}, {lng.toFixed(4)}
          </Text>
        ) : (
          <Text variant="helper">Sin pin no se envía a revisión.</Text>
        )}
      </FormSection>
    ) : (
      <View className="gap-ds-16">
        <EventCard event={preview} layout="listing" />
        {flyerFailed ? (
          <Text variant="helper" className="text-foreground">
            No se subió el flyer. Vuelve al paso 1 e inténtalo de nuevo.
          </Text>
        ) : null}
        {!canSubmit ? <Text variant="helper">Enviar a revisión pide flyer y pin.</Text> : null}
      </View>
    );

  return (
    <Screen
      footer={
        <StickyCta>
          <View className="gap-ds-12">
            {error ? (
              <Text variant="helper" className="text-foreground">
                {error}
              </Text>
            ) : null}
            {step < 3 ? (
              <View className="flex-row gap-ds-8">
                {step > 0 ? (
                  <Button variant="outline" className="flex-1" disabled={busy} onPress={() => setStep((s) => s - 1)}>
                    <Text>Atrás</Text>
                  </Button>
                ) : null}
                <Button className="flex-1" disabled={busy} onPress={() => void goNext()}>
                  <Text>{busy ? 'Guardando…' : 'Continuar'}</Text>
                </Button>
              </View>
            ) : (
              <View className="gap-ds-8">
                <Button disabled={busy} onPress={() => void finish(false)}>
                  <Text>{busy ? 'Guardando…' : 'Guardar borrador'}</Text>
                </Button>
                <Button disabled={busy || !canSubmit} onPress={() => void finish(true)}>
                  <Text>Enviar a revisión</Text>
                </Button>
                <Button variant="outline" disabled={busy} onPress={() => setStep(2)}>
                  <Text>Atrás</Text>
                </Button>
              </View>
            )}
          </View>
        </StickyCta>
      }>
      <BackBar />
      <PageHeader
        eyebrow={`${step + 1} de 4`}
        title={mode === 'edit' && step === 0 ? 'Editar fecha' : current.title}
        lead={current.lead}
      />
      <View className="mt-ds-24">{body}</View>
    </Screen>
  );
}

function previewEvent(value: EventFormValue, id: string, flyer?: string): ParcheEvent {
  return {
    id,
    tenantId: '',
    ownerUserId: '',
    name: value.name.trim() || 'Sin nombre',
    startsAt: value.startsAt || new Date().toISOString(),
    venueName: value.venueName.trim() || 'Venue',
    addressText: value.addressText,
    description: value.description,
    flyerUrl: flyer,
    lat: value.lat,
    lng: value.lng,
    status: 'draft',
    genre: value.genre,
    updatedAt: new Date().toISOString(),
  };
}

function toIso(local: string) {
  if (!local) return '';
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function toDatetimeLocal(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
