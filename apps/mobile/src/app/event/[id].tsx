import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Clock, MapPin } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ArtistRow } from '@/components/artist-row';
import { EventCard } from '@/components/event-card';
import { EventDetailHero } from '@/components/event-detail-hero';
import { EventImageLightbox } from '@/components/event-image-lightbox';
import { canOperateEvent, eventOperateHref } from '@/components/event-staff-actions';
import { EventTrackPlayer } from '@/components/event-track-player';
import { ErrorState, Skeleton } from '@/components/feedback';
import { FlyerImage } from '@/components/flyer-image';
import { OsmMap } from '@/components/osm-map';
import { Screen } from '@/components/screen';
import { SectionRail } from '@/components/section-rail';
import { StickyCta } from '@/components/sticky-cta';
import { Surface } from '@/components/surface';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { toggleFollow, toggleSave } from '@/data/interest-sync';
import { useInterestStore } from '@/data/interest-store';
import { debugLog } from '@/data/log';
import { useRecentStore } from '@/data/recent-store';
import { useAuthSnapshot } from '@/data/session';
import { toast } from '@/data/toast-store';
import type { EventTrack, EventWithExtras } from '@/data/types';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import {
  eventCity,
  eventHasEnded,
  eventTimeLabel,
  eventVenueParts,
  formatListingDate,
  formatMoney,
  formatTime,
  formatWhenRange,
  statusLabel,
} from '@/lib/format';
import { shareEvent } from '@/lib/share';
import { eventDetailImages } from '@/lib/event-images';

const ABOUT_PREVIEW = 160;

function BuyRow({
  ended,
  onSale,
  lowest,
  emptyTickets,
  onBuy,
}: {
  ended: boolean;
  onSale: EventWithExtras['ticketTypes'];
  lowest?: EventWithExtras['ticketTypes'][number];
  emptyTickets: boolean;
  onBuy: () => void;
}) {
  return (
    <View className="flex-row items-center gap-ds-12">
      <View className="min-w-0 flex-1">
        <Text variant="caption" className="uppercase text-muted-foreground">
          {ended ? 'Cerrado' : onSale.length > 0 ? 'Desde' : emptyTickets ? 'Boleta' : 'Pronto'}
        </Text>
        <Text variant="subheading" numberOfLines={1}>
          {ended ? 'Finalizado' : lowest ? formatMoney(lowest.priceCents, lowest.currency) : 'Sin venta'}
        </Text>
      </View>
      <Button disabled={ended || onSale.length === 0} onPress={onBuy}>
        <Text>{ended ? 'Finalizado' : onSale.length > 0 ? 'Comprar' : 'Pronto'}</Text>
      </Button>
    </View>
  );
}

function MetaIcon({ icon }: { icon: typeof MapPin }) {
  return (
    <View className="size-8 items-center justify-center rounded-full bg-aurora-soft">
      <Icon as={icon} size={14} className="text-aurora" />
    </View>
  );
}

function SectionRule({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View className="flex-row items-center justify-between gap-ds-8">
      <Text variant="subheading">{title}</Text>
      {action && onAction ? (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onAction} className="min-h-11 justify-center">
          <Text variant="muted" className="text-aurora">
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

async function openEventPin(lat: number, lng: number, label: string) {
  const q = encodeURIComponent(label);
  const url =
    Platform.OS === 'ios'
      ? `https://maps.apple.com/?ll=${lat},${lng}&q=${q}`
      : Platform.OS === 'android'
        ? `geo:${lat},${lng}?q=${lat},${lng}(${q})`
        : `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
  try {
    await Linking.openURL(url);
  } catch (error) {
    debugLog('maps', 'open pin failed', { lat, lng, error: String(error) });
    toast('No se pudo abrir el mapa');
  }
}

export default function EventDetailScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const compact = useCompactLayout();
  const wide = Platform.OS === 'web' && !compact;
  const insets = useSafeAreaInsets();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const { isLoggedIn, user } = useAuthSnapshot();
  const saved = useInterestStore((s) => (id ? s.eventIds.includes(id) : false));
  const followedArtists = useInterestStore((s) => s.artistIds);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [lineupOpen, setLineupOpen] = useState(false);
  const [playNonce, setPlayNonce] = useState(0);
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const { data: event, error, refetch, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => api.events.get(id),
    enabled: Boolean(id),
  });
  const similarQuery = useQuery({
    queryKey: ['event', id, 'similar'],
    queryFn: () => api.events.similar(id),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (event?.id) {
      useRecentStore.getState().record(event.id);
    }
  }, [event?.id]);

  const mapEvents = useMemo(() => (event ? [event] : []), [event]);
  const mapPin = useMemo(
    () => (event?.lat != null && event?.lng != null ? { lat: event.lat, lng: event.lng } : undefined),
    [event?.lat, event?.lng]
  );
  const genres = event?.genres?.length ? event.genres : event?.genre ? [event.genre] : [];
  const similar = similarQuery.data ?? [];
  const heroHeight = compact
    ? Math.round(Math.min(windowWidth * 0.98, windowHeight * 0.42, 420))
    : undefined;

  if (error && !event) {
    return (
      <Screen back headTitle="Este evento ya no está">
        <ErrorState message={userMessage(error) || 'Este evento ya no está'} onRetry={() => void refetch()} />
      </Screen>
    );
  }
  if (!event || isLoading) {
    return (
      <Screen back headTitle="Evento">
        <View className={wide ? 'flex-row items-start gap-ds-40' : 'gap-ds-16'}>
          <Skeleton className={wide ? 'aspect-[4/5] w-[42%] max-w-[480px]' : 'h-80 w-full'} />
          <View className={wide ? 'flex-1 gap-ds-12' : undefined}>
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="mt-ds-8 h-4 w-1/2" />
            <Skeleton className="mt-ds-16 h-24 w-full" />
          </View>
        </View>
      </Screen>
    );
  }

  const ended = eventHasEnded(event);
  const onSale = ended ? [] : event.ticketTypes.filter((t) => api.helpers.typeOnSale(t));
  const staff = user ? canOperateEvent(user.id, event.id) : false;
  const lowest = onSale[0];
  const { venue, city } = eventVenueParts(event.venueName, event.addressText);
  const going = event.ticketTypes.reduce((sum, type) => sum + type.sold, 0);
  const description = event.description?.trim() ?? '';
  const aboutLong = description.length > ABOUT_PREVIEW;
  const aboutText = !aboutOpen && aboutLong ? `${description.slice(0, ABOUT_PREVIEW).trim()}…` : description;
  const timeLabel = `${formatListingDate(event.startsAt)} · ${eventTimeLabel(event.startsAt, event.endsAt)}`;
  const pinLabel = [event.venueName, event.addressText || eventCity(event.addressText)].filter(Boolean).join(', ');

  function goCheckout() {
    if (ended) return;
    router.push(`/checkout/${event!.id}` as Href);
  }

  async function refreshTracks(): Promise<EventTrack[]> {
    const result = await refetch();
    return result.data?.tracks ?? [];
  }

  function onShare() {
    void shareEvent({ id: event!.id, name: event!.name, venueName: event!.venueName });
  }

  function onSave() {
    void toggleSave(event!.id, isLoggedIn);
  }

  const photos = eventDetailImages(event);
  const hero = (
    <EventDetailHero
      event={event}
      saved={saved}
      compact={compact}
      showBack={compact}
      height={heroHeight ?? 420}
      topInset={compact ? Math.max(insets.top, 12) : 12}
      imageCount={photos.length}
      onSave={onSave}
      onShare={onShare}
      onPlay={event.tracks.length > 0 ? () => setPlayNonce((n) => n + 1) : undefined}
      onOpenImages={photos.length > 0 ? () => setPhotoIndex(0) : undefined}
    />
  );

  const gallery =
    event.gallery.length > 0 ? (
      <View className="gap-ds-8">
        <Text variant="subheading">Fotos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {event.gallery.map((image) => (
            <Pressable
              key={image.id}
              accessibilityRole="button"
              accessibilityLabel="Ampliar foto"
              onPress={() => {
                const index = photos.findIndex((item) => item.id === image.id);
                setPhotoIndex(index >= 0 ? index : 0);
              }}
              className="h-28 w-24 overflow-hidden rounded-images bg-muted">
              <FlyerImage uri={image.url} className="h-full w-full" />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    ) : null;

  const identity = (
    <View className="gap-ds-12">
      {event.status !== 'published' ? (
        <Tag tone={event.status === 'rejected' ? 'danger' : 'muted'}>{statusLabel(event.status)}</Tag>
      ) : null}
      {genres[0] ? (
        <Text variant="caption" className="text-aurora">
          {genres.join(' · ')}
        </Text>
      ) : null}
      <Text variant="heading">{event.name}</Text>
      <View className="flex-row flex-wrap items-center gap-x-ds-16 gap-y-ds-8">
        <View className="min-w-0 flex-row items-center gap-ds-8">
          <MetaIcon icon={MapPin} />
          <Text variant="muted" numberOfLines={1} className="min-w-0 shrink">
            {venue}
            {city ? `, ${city}` : ''}
          </Text>
        </View>
        <View className="flex-row items-center gap-ds-8">
          <MetaIcon icon={Clock} />
          <Text variant="muted">{timeLabel}</Text>
        </View>
      </View>
      {event.agePolicy ? <Text variant="helper">{event.agePolicy}</Text> : null}
    </View>
  );

  const lineupPreview =
    event.lineup.length > 0 ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ver artistas"
        onPress={() => setLineupOpen(true)}
        className="min-h-11 flex-row items-center">
        <View className="flex-row items-center">
          {event.lineup.slice(0, 4).map((artist, index) => (
            <View
              key={artist.id}
              className="overflow-hidden rounded-full border-2 border-surface bg-muted"
              style={{ marginLeft: index === 0 ? 0 : -10, zIndex: 8 - index, width: 32, height: 32 }}>
              {artist.avatarUrl ? (
                <Image source={{ uri: artist.avatarUrl }} style={{ width: 32, height: 32 }} />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <Text variant="caption" className="text-[10px]">
                    {artist.stageName.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
        <Text variant="muted" className="ml-ds-12 min-w-0 flex-1" numberOfLines={1}>
          {going > 0
            ? `${going} ${going === 1 ? 'va' : 'van'}`
            : `${event.lineup.length} ${event.lineup.length === 1 ? 'artista' : 'artistas'}`}
        </Text>
        <Text variant="muted" className="text-aurora">
          Ver artistas
        </Text>
      </Pressable>
    ) : going > 0 ? (
      <Text variant="muted">
        {going} {going === 1 ? 'boleta vendida' : 'boletas vendidas'}
      </Text>
    ) : null;

  const about =
    description.length > 0 ? (
      <View className="gap-ds-8">
        <Text variant="subheading">Sobre el evento</Text>
        <Text>{aboutText}</Text>
        {aboutLong ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setAboutOpen((open) => !open)}
            className="min-h-11 justify-center self-start">
            <Text variant="muted" className="text-aurora">
              {aboutOpen ? 'Ver menos' : 'Leer más'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    ) : null;

  const lineupBlock =
    event.lineup.length > 0 && (lineupOpen || !compact || event.lineup.length <= 3) ? (
      <View className="gap-ds-12">
        <Text variant="subheading">Artistas</Text>
        <View className="gap-ds-8">
          {event.lineup.map((artist) => (
            <ArtistRow
              key={artist.id}
              artist={artist}
              onPress={() => router.push(`/artist/${artist.id}` as Href)}
              trailing={
                <View className="flex-row items-center gap-ds-8">
                  {artist.startsAt ? <Text variant="muted">{formatTime(artist.startsAt)}</Text> : null}
                  <Button
                    variant={followedArtists.includes(artist.id) ? 'outline' : 'ghost'}
                    size="sm"
                    onPress={() => void toggleFollow(artist.id, isLoggedIn)}>
                    <Text>{followedArtists.includes(artist.id) ? 'Siguiendo' : 'Seguir'}</Text>
                  </Button>
                </View>
              }
            />
          ))}
        </View>
      </View>
    ) : null;

  const tickets = (
    <View className="gap-ds-12">
      <Text variant="subheading">Etapas</Text>
      <Surface muted className="gap-ds-12">
        {onSale.length > 0 ? (
          onSale.map((type) => (
            <View key={type.id} className="flex-row items-baseline justify-between gap-ds-8">
              <Text>{type.name}</Text>
              <Text variant="muted">
                {formatMoney(type.priceCents, type.currency)} · {api.helpers.available(type)} disponibles
              </Text>
            </View>
          ))
        ) : (
          <Text variant="muted">{event.ticketTypes.length === 0 ? 'Aún no hay boletas a la venta' : 'Pronto'}</Text>
        )}
      </Surface>
    </View>
  );

  const address = (
    <View className="gap-ds-12">
      <SectionRule
        title="Dirección"
        action={mapPin ? 'Ver en mapa' : undefined}
        onAction={mapPin ? () => void openEventPin(mapPin.lat, mapPin.lng, pinLabel) : undefined}
      />
      <Text variant="muted">
        {event.venueName}
        {event.addressText ? `\n${event.addressText}` : ''}
      </Text>
      {mapPin ? <OsmMap pin={mapPin} events={mapEvents} className={wide ? 'h-72' : undefined} /> : null}
    </View>
  );

  const staffRow = staff ? (
    <Button variant="outline" onPress={() => router.push(eventOperateHref(event.id))}>
      <Text>Operar este evento</Text>
    </Button>
  ) : null;

  const audio =
    event.tracks.length > 0 ? (
      <EventTrackPlayer tracks={event.tracks} onRefresh={refreshTracks} playNonce={playNonce} />
    ) : null;

  const similarRail =
    similar.length > 0 ? (
      <SectionRail title="Más como este">
        {similar.map((row) => (
          <EventCard key={row.id} event={row} saveable onPress={() => router.push(`/event/${row.id}` as Href)} />
        ))}
      </SectionRail>
    ) : null;

  const sheet = (
    <View className="gap-ds-24">
      {identity}
      {lineupPreview}
      {compact ? gallery : null}
      {about}
      {lineupBlock}
      {audio}
      {address}
      {tickets}
      {staffRow}
      {wide ? (
        <Surface elevated className="gap-ds-4">
          <BuyRow
            ended={ended}
            onSale={onSale}
            lowest={lowest}
            emptyTickets={event.ticketTypes.length === 0}
            onBuy={goCheckout}
          />
        </Surface>
      ) : null}
      {similarRail}
    </View>
  );

  const lightbox = (
    <EventImageLightbox
      visible={photoIndex != null}
      images={photos}
      initialIndex={photoIndex ?? 0}
      title={event.name}
      onClose={() => setPhotoIndex(null)}
    />
  );

  if (compact) {
    return (
      <>
        <Screen
          flush
          padded={false}
          width="full"
          className="bg-surface"
          headTitle={event.name}
          headDescription={
            event.description?.trim() ||
            [event.venueName, formatWhenRange(event.startsAt, event.endsAt)].filter(Boolean).join(' · ')
          }
          headImage={event.flyerUrl}
          footer={
            <StickyCta>
              <BuyRow
                ended={ended}
                onSale={onSale}
                lowest={lowest}
                emptyTickets={event.ticketTypes.length === 0}
                onBuy={goCheckout}
              />
            </StickyCta>
          }>
          {hero}
          <View className="relative z-10 -mt-ds-32 rounded-t-navelements bg-surface px-ds-16 pb-ds-32 pt-ds-24">
            {sheet}
          </View>
        </Screen>
        {lightbox}
      </>
    );
  }

  return (
    <>
      <Screen
        back
        headTitle={event.name}
        headDescription={
          event.description?.trim() ||
          [event.venueName, formatWhenRange(event.startsAt, event.endsAt)].filter(Boolean).join(' · ')
        }
        headImage={event.flyerUrl}>
        <View className="flex-row items-start gap-ds-40">
          <View className="w-[42%] max-w-[480px] shrink-0 gap-ds-12">
            {hero}
            {gallery}
          </View>
          <View className="min-w-0 flex-1 gap-ds-20">{sheet}</View>
        </View>
      </Screen>
      {lightbox}
    </>
  );
}
