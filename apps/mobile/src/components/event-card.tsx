import { Children, useState, type ReactNode } from 'react';
import { Calendar, Heart, MapPin } from 'lucide-react-native';
import { Platform, Pressable, View, type ViewStyle } from 'react-native';

import { FlyerImage } from '@/components/flyer-image';
import { PressScale } from '@/components/motion';
import { Text } from '@/components/ui/text';
import { toggleSave } from '@/data/interest-sync';
import { useInterestStore } from '@/data/interest-store';
import { useAuthSnapshot } from '@/data/session';
import type { ParcheEvent } from '@/data/types';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { cardShadowStyle } from '@/lib/card-shadow';
import {
  eventTagline,
  eventTimeLabel,
  eventVenueParts,
  formatCardDate,
  formatCardDayShort,
  formatWhen,
} from '@/lib/format';
import { cn } from '@/lib/utils';

const PAPER_WHITE = '#F5F5F8';
const PAPER_MUTED = 'rgba(245, 245, 248, 0.72)';

export const LISTING_CARD_MIN_PX = 168;
export const LISTING_CARD_MAX_PX = 220;

const desktopListingGridStyle = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(${LISTING_CARD_MIN_PX}px, ${LISTING_CARD_MAX_PX}px))`,
  gap: 24,
  justifyContent: 'start',
} as object;

const overlayTextShadow = {
  textShadowColor: 'rgba(0,0,0,0.55)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 8,
};

const flyerGlass: ViewStyle =
  Platform.OS === 'web'
    ? ({
        backgroundColor: 'rgba(8, 10, 12, 0.4)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.14)',
      } as object)
    : {
        backgroundColor: 'rgba(8, 10, 12, 0.56)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.14)',
      };

const topVignette: ViewStyle =
  Platform.OS === 'web'
    ? ({
        backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.12) 48%, transparent 100%)',
      } as object)
    : { backgroundColor: 'rgba(0,0,0,0.22)' };

export function EventCard({
  event,
  onPress,
  layout = 'listing',
  selected = false,
  saveable = false,
  badge,
  caption,
  widePhoto = false,
}: {
  event: ParcheEvent;
  onPress?: () => void;
  layout?: 'listing' | 'poster' | 'row';
  selected?: boolean;
  saveable?: boolean;
  badge?: string;
  caption?: string;
  widePhoto?: boolean;
}) {
  const { isLoggedIn } = useAuthSnapshot();
  const saved = useInterestStore((s) => s.eventIds.includes(event.id));
  const [frameW, setFrameW] = useState(0);

  if (layout === 'row') {
    return (
      <PressScale onPress={onPress} className="w-full">
        <View
          className={cn(
            'min-h-11 w-full flex-row items-center gap-ds-12 rounded-cards border bg-surface p-ds-12 shadow-card',
            selected ? 'border-aurora' : 'border-border'
          )}
          style={cardShadowStyle}>
          <PosterThumb event={event} className="size-16 rounded-images" />
          <View className="min-w-0 flex-1 gap-ds-4">
            <Text variant="caption" className="uppercase text-muted-foreground">
              {formatWhen(event.startsAt)}
              {event.genre ? ` · ${event.genre}` : ''}
            </Text>
            <Text variant="subheading" className="text-foreground" numberOfLines={1}>
              {event.name}
            </Text>
            <Text variant="muted" numberOfLines={1}>
              {event.venueName}
            </Text>
          </View>
        </View>
      </PressScale>
    );
  }

  const overlayWide = layout === 'listing' && widePhoto;
  const dense = overlayWide || frameW < 240;
  const tagline = dense ? null : eventTagline(event.description, event.genres);
  const { venue, city } = eventVenueParts(event.venueName, event.addressText);
  const timeLabel = eventTimeLabel(event.startsAt, event.endsAt, caption);
  const dateLabel = badge ?? (dense ? formatCardDayShort(event.startsAt) : formatCardDate(event.startsAt));
  const titleSize = dense ? 16 : 28;
  const pad = dense ? 6 : 12;
  const icon = dense ? 12 : 14;
  const glassRadius = dense ? 12 : 16;

  return (
    <View
      className="relative w-full"
      onLayout={(event) => {
        const next = Math.round(event.nativeEvent.layout.width);
        if (next > 0 && next !== frameW) setFrameW(next);
      }}>
      <PressScale onPress={onPress} className="w-full">
        <View
          className={cn(
            'relative w-full overflow-hidden rounded-cards bg-muted shadow-card',
            selected ? 'border border-aurora' : 'border border-transparent'
          )}
          style={cardShadowStyle}>
          <PosterThumb event={event} listing wide={overlayWide} />
          <View
            pointerEvents="none"
            className={cn('absolute inset-x-0 top-0', dense ? 'h-[42%]' : 'h-[38%]')}
            style={topVignette}
          />
          <View pointerEvents="none" className="absolute inset-0" style={{ padding: pad }}>
            <View className={cn('shrink-0 flex-row items-start', saveable ? 'pr-11' : undefined)}>
              <Text variant="caption" style={{ color: PAPER_WHITE, ...overlayTextShadow }} numberOfLines={1}>
                {dateLabel}
              </Text>
            </View>
            <View
              className="shrink-0 overflow-hidden"
              style={[
                flyerGlass,
                {
                  marginTop: dense ? 6 : 12,
                  paddingHorizontal: dense ? 8 : 16,
                  paddingVertical: dense ? 6 : 12,
                  borderRadius: glassRadius,
                },
              ]}>
              {event.genre ? (
                <Text
                  variant="caption"
                  style={{ color: genreOverlayColor(event.genre), ...overlayTextShadow }}
                  numberOfLines={1}>
                  {event.genre}
                </Text>
              ) : null}
              <Text
                variant="headingSm"
                className="mt-ds-4"
                style={{
                  color: PAPER_WHITE,
                  fontSize: titleSize,
                  lineHeight: dense ? 19 : 32,
                  fontWeight: '700',
                }}
                numberOfLines={dense ? 1 : 2}>
                {event.name}
              </Text>
              {tagline ? (
                <Text variant="caption" className="mt-ds-8" style={{ color: PAPER_MUTED }} numberOfLines={2}>
                  {tagline}
                </Text>
              ) : null}
            </View>
            <View className="min-h-0 flex-1" />
            {dense ? (
              <View
                className="shrink-0 flex-row items-center overflow-hidden"
                style={[
                  flyerGlass,
                  {
                    borderRadius: glassRadius,
                    gap: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 6,
                  },
                ]}>
                <MapPin size={icon} color={PAPER_WHITE} strokeWidth={2} />
                <View className="min-w-0 flex-1">
                  <Text variant="caption" style={{ color: PAPER_WHITE }} numberOfLines={1}>
                    {venue}
                  </Text>
                  <Text variant="caption" style={{ color: PAPER_MUTED }} numberOfLines={1}>
                    {timeLabel}
                  </Text>
                </View>
              </View>
            ) : (
              <View
                className="shrink-0 flex-row items-stretch overflow-hidden"
                style={[flyerGlass, { borderRadius: glassRadius }]}>
                <View
                  className="min-w-0 flex-1 flex-row items-center"
                  style={{ gap: 8, paddingHorizontal: 12, paddingVertical: 12 }}>
                  <MapPin size={icon} color={PAPER_WHITE} strokeWidth={2} />
                  <View className="min-w-0 flex-1">
                    <Text variant="caption" style={{ color: PAPER_WHITE }} numberOfLines={1}>
                      {venue}
                    </Text>
                    {venue !== city ? (
                      <Text variant="caption" style={{ color: PAPER_MUTED }} numberOfLines={1}>
                        {city}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View className="my-ds-8 w-px bg-paper-white/20" />
                <View
                  className="min-w-0 flex-1 flex-row items-center"
                  style={{ gap: 8, paddingHorizontal: 12, paddingVertical: 12 }}>
                  <Calendar size={icon} color={PAPER_WHITE} strokeWidth={2} />
                  <View className="min-w-0 flex-1">
                    <Text variant="caption" style={{ color: PAPER_WHITE }} numberOfLines={1}>
                      {formatCardDayShort(event.startsAt)}
                    </Text>
                    <Text variant="caption" style={{ color: PAPER_MUTED }} numberOfLines={1}>
                      {timeLabel}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </PressScale>
      {saveable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Quitar de guardados' : 'Guardar fecha'}
          hitSlop={4}
          onPress={() => void toggleSave(event.id, isLoggedIn)}
          className="absolute right-ds-4 top-ds-4 z-10 size-11 items-center justify-center">
          <Heart size={dense ? 16 : 20} color={PAPER_WHITE} fill={saved ? PAPER_WHITE : 'transparent'} strokeWidth={2} />
        </Pressable>
      ) : null}
    </View>
  );
}

function genreOverlayColor(genre: string) {
  const key = genre.trim().toLowerCase();
  if (key === 'techno') return '#7FFEB1';
  if (key === 'industrial') return '#FF4D3D';
  if (key === 'house') return '#3DDCFF';
  if (key === 'trance') return '#B8A4FF';
  if (key === 'club') return '#FFC44D';
  return PAPER_WHITE;
}

function listingAspect(wide: boolean) {
  return wide ? 'aspect-[16/10] w-full' : 'aspect-[4/5] w-full';
}

function PosterThumb({
  event,
  className,
  listing = false,
  wide = false,
}: {
  event: ParcheEvent;
  className?: string;
  listing?: boolean;
  wide?: boolean;
}) {
  const framed = Boolean(className) || listing;
  const fallback = listing ? listingAspect(wide) : 'aspect-[4/5] w-full';
  if (event.flyerUrl) {
    return (
      <View className={cn('overflow-hidden bg-muted', className ?? fallback)}>
        <FlyerImage uri={event.flyerUrl} className="h-full w-full" aspectRatio={framed ? undefined : 4 / 5} />
      </View>
    );
  }
  return (
    <View className={cn('items-center justify-center bg-muted', className ?? fallback)}>
      <Text variant="headingSm" className="uppercase text-muted-foreground">
        {event.name.slice(0, 2)}
      </Text>
    </View>
  );
}

export function EventGrid({ children }: { children: ReactNode }) {
  const compact = useCompactLayout();
  if (Platform.OS !== 'web' || compact) {
    return <View className="w-full flex-row flex-wrap justify-between gap-y-ds-16">{children}</View>;
  }
  return (
    <View className="w-full" style={desktopListingGridStyle}>
      {children}
    </View>
  );
}

export function EventGridItem({ children }: { children: ReactNode }) {
  const compact = useCompactLayout();
  if (Platform.OS !== 'web' || compact) {
    return <View style={{ width: '48.2%' }}>{children}</View>;
  }
  return <View className="min-w-0 w-full max-w-[220px]">{children}</View>;
}

/** Stacked feed on phone; same listing grid as Explorar on desktop web. */
export function EventFeed({ children }: { children: ReactNode }) {
  const compact = useCompactLayout();
  if (Platform.OS !== 'web' || compact) {
    return <View className="w-full gap-ds-24">{children}</View>;
  }
  return (
    <View className="w-full" style={desktopListingGridStyle}>
      {Children.map(children, (child) => {
        if (child == null || typeof child === 'boolean') return child;
        return <View className="min-w-0 w-full max-w-[220px]">{child}</View>;
      })}
    </View>
  );
}
