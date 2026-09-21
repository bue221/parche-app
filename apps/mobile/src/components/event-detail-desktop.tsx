import { Calendar, Heart, MapPin, Share2, Users } from 'lucide-react-native';
import { Pressable, ScrollView, View, type ViewStyle } from 'react-native';
import { router, type Href } from 'expo-router';

import { ArtistRow } from '@/components/artist-row';
import { EventCard, EventFeed } from '@/components/event-card';
import { eventOperateHref } from '@/components/event-staff-actions';
import { EventTrackPlayer } from '@/components/event-track-player';
import { FlyerImage } from '@/components/flyer-image';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Tag, type TagTone } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { toggleFollow } from '@/data/interest-sync';
import type { EventGalleryImage, EventTrack, EventWithExtras, ParcheEvent } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
import { cardShadowStyle } from '@/lib/card-shadow';
import {
  agePolicyLabel,
  eventSaleBadge,
  ticketPanelCaption,
  ticketRowStatus,
} from '@/lib/event-detail-copy';
import {
  eventHasEnded,
  eventVenueParts,
  formatEventLongDate,
  formatEventTime,
  formatEventTimeRange,
  formatMoney,
} from '@/lib/format';
import { buyCtaLabel, lowestPriced, ticketRemaining } from '@/lib/ticket-offer';

const desktopColumns: ViewStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 26rem) minmax(0, 1fr)',
  columnGap: 48,
  alignItems: 'start',
};
const factGrid: ViewStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 12,
};

export function EventDetailDesktop({
  event,
  saved,
  similar,
  followedArtists,
  isLoggedIn,
  staff,
  photos,
  playNonce,
  onSave,
  onShare,
  onBuy,
  onOpenPhoto,
  onOpenMaps,
  onRefreshTracks,
}: {
  event: EventWithExtras;
  saved: boolean;
  similar: ParcheEvent[];
  followedArtists: string[];
  isLoggedIn: boolean;
  staff: boolean;
  photos: EventGalleryImage[];
  playNonce: number;
  onSave: () => void;
  onShare: () => void;
  onBuy: () => void;
  onOpenPhoto: (index: number) => void;
  onOpenMaps?: () => void;
  onRefreshTracks: () => Promise<EventTrack[]>;
}) {
  const ended = eventHasEnded(event);
  const onSale = ended ? [] : event.ticketTypes.filter((type) => api.helpers.typeOnSale(type));
  const lowest = lowestPriced(onSale);
  const badge = eventSaleBadge({ status: event.status, ended, onSaleCount: onSale.length });
  const genres = event.genres?.length ? event.genres : event.genre ? [event.genre] : [];
  const { venue } = eventVenueParts(event.venueName, event.addressText);
  const address = event.addressText?.trim() || undefined;
  const canBuy = !ended && onSale.length > 0;
  const theme = useTheme();

  return (
    <View className="gap-ds-48">
      <View style={desktopColumns}>
        <View className="gap-ds-16">
          <DesktopPoster
            event={event}
            genre={genres[0]}
            imageCount={photos.length}
            onOpen={() => onOpenPhoto(0)}
          />
          {event.gallery.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {event.gallery.map((image) => {
                const index = photos.findIndex((item) => item.id === image.id);
                return (
                  <Pressable
                    key={image.id}
                    accessibilityRole="button"
                    accessibilityLabel="Ampliar foto"
                    onPress={() => onOpenPhoto(index >= 0 ? index : 0)}
                    className="h-24 w-20 overflow-hidden rounded-images bg-muted">
                    <FlyerImage uri={image.url} className="h-full w-full" />
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
        </View>

        <View className="gap-ds-24">
          <View className="gap-ds-12">
            <View className="flex-row items-start justify-between gap-ds-12">
              <View className="min-w-0 flex-1 flex-row flex-wrap gap-ds-8">
                <Tag tone={badge.tone as TagTone}>{badge.label}</Tag>
                {genres.slice(event.status === 'published' && !ended ? 1 : 0).map((genre) => (
                  <Tag key={genre} tone="muted">
                    {genre}
                  </Tag>
                ))}
              </View>
              <View className="flex-row items-center gap-ds-4">
                <Button variant="ghost" size="icon" accessibilityLabel="Compartir evento" onPress={onShare}>
                  <Share2 size={18} color={theme.text} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  accessibilityLabel={saved ? 'Quitar de guardados' : 'Guardar evento'}
                  onPress={onSave}>
                  <Heart size={18} color={theme.text} fill={saved ? theme.text : 'transparent'} />
                </Button>
              </View>
            </View>
            <Text variant="heading" className="max-w-xl text-[clamp(1.75rem,4vw,2.5rem)]">
              {event.name}
            </Text>
            {event.lineup.length > 0 ? (
              <Text variant="muted" className="max-w-xl">
                {event.lineup.map((artist) => artist.stageName).join(' · ')}
              </Text>
            ) : null}
          </View>

          <View style={factGrid}>
            <Fact
              icon={Calendar}
              label="Cuándo"
              value={formatEventLongDate(event.startsAt)}
              hint={formatEventTimeRange(event.startsAt, event.endsAt)}
            />
            <Fact icon={MapPin} label="Dónde" value={venue || 'Por confirmar'} hint={address} />
            <Fact icon={Users} label="Edad" value={agePolicyLabel(event.agePolicy)} />
          </View>

          {onOpenMaps ? (
            <Button variant="outline" size="sm" onPress={onOpenMaps} className="self-start">
              <Text>Cómo llegar</Text>
            </Button>
          ) : null}

          <View className="gap-ds-16 rounded-cards border border-border bg-surface p-ds-20" style={cardShadowStyle}>
            <View className="flex-row flex-wrap items-end justify-between gap-ds-12">
              <View className="min-w-0 flex-1 gap-ds-4">
                <Text variant="subheading">Boletas</Text>
                <Text variant="muted">
                  {ticketPanelCaption({
                    ended,
                    empty: event.ticketTypes.length === 0,
                    fromPrice: lowest ? formatMoney(lowest.priceCents, lowest.currency) : undefined,
                  })}
                </Text>
              </View>
              <Button disabled={!canBuy} size="sm" onPress={onBuy}>
                <Text>{buyCtaLabel(ended, onSale.length)}</Text>
              </Button>
            </View>
            {event.ticketTypes.length > 0 ? (
              <View className="gap-ds-8">
                {event.ticketTypes.map((type) => {
                  const remaining = ticketRemaining(type);
                  const live = !ended && api.helpers.typeOnSale(type);
                  return (
                    <Pressable
                      key={type.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Comprar ${type.name}`}
                      disabled={!canBuy}
                      onPress={onBuy}
                      className="flex-row items-center justify-between gap-ds-12 rounded-cards border border-border bg-muted/70 px-ds-16 py-ds-12">
                      <View className="min-w-0 flex-1 gap-ds-4">
                        <Text className="font-bold">{type.name}</Text>
                        <Text variant="muted">
                          {ticketRowStatus({ ended, onSale: live, remaining })}
                        </Text>
                      </View>
                      <Text variant="subheading" className="shrink-0">{formatMoney(type.priceCents, type.currency)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text variant="muted">
                {ticketPanelCaption({
                  ended,
                  empty: true,
                })}
              </Text>
            )}
          </View>

          {event.description?.trim() ? (
            <View className="max-w-xl gap-ds-8">
              <Text variant="subheading">Sobre el evento</Text>
              <Text>{event.description.trim()}</Text>
            </View>
          ) : null}

          {event.lineup.length > 0 ? (
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
                        {artist.startsAt ? (
                          <Text variant="muted">{formatEventTime(artist.startsAt)}</Text>
                        ) : null}
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
          ) : null}

          {event.tracks.length > 0 ? (
            <EventTrackPlayer tracks={event.tracks} onRefresh={onRefreshTracks} playNonce={playNonce} />
          ) : null}

          {staff ? (
            <Button variant="outline" onPress={() => router.push(eventOperateHref(event.id))}>
              <Text>Operar este evento</Text>
            </Button>
          ) : null}
        </View>
      </View>

      {similar.length > 0 ? (
        <View className="gap-ds-12">
          <Text variant="subheading">Sigue el parche</Text>
          <EventFeed>
            {similar.slice(0, 4).map((row) => (
              <EventCard
                key={row.id}
                event={row}
                saveable
                onPress={() => router.push(`/event/${row.id}` as Href)}
              />
            ))}
          </EventFeed>
        </View>
      ) : null}
    </View>
  );
}

function DesktopPoster({
  event,
  genre,
  imageCount,
  onOpen,
}: {
  event: EventWithExtras;
  genre?: string;
  imageCount: number;
  onOpen: () => void;
}) {
  const art = event.flyerUrl ? (
    <FlyerImage uri={event.flyerUrl} aspectRatio={4 / 5} className="w-full" />
  ) : (
    <View className="w-full items-center justify-center bg-muted" style={{ aspectRatio: 4 / 5 }}>
      <Text variant="heading" className="uppercase text-muted-foreground">
        {event.name.slice(0, 2)}
      </Text>
    </View>
  );

  return (
    <View className="relative overflow-hidden rounded-images bg-muted" style={cardShadowStyle}>
      {imageCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={imageCount > 1 ? `Ver fotos, ${imageCount}` : 'Ampliar flyer'}
          onPress={onOpen}>
          {art}
        </Pressable>
      ) : (
        art
      )}
      {genre ? (
        <View pointerEvents="none" className="absolute left-ds-12 top-ds-12 z-10">
          <Tag tone="glass">{genre}</Tag>
        </View>
      ) : null}
    </View>
  );
}

function Fact({
  icon,
  label,
  value,
  hint,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <View className="min-w-0 gap-ds-8 rounded-cards border border-border bg-surface p-ds-16" style={cardShadowStyle}>
      <View className="size-8 items-center justify-center rounded-full bg-aurora-soft">
        <Icon as={icon} size={14} className="text-aurora" />
      </View>
      <View className="gap-ds-4">
        <Text variant="caption" className="uppercase text-muted-foreground">
          {label}
        </Text>
        <Text variant="subheading">{value}</Text>
        {hint ? <Text variant="muted">{hint}</Text> : null}
      </View>
    </View>
  );
}
