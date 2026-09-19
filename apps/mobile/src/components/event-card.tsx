import { Children, type ReactNode } from 'react';
import { Heart } from 'lucide-react-native';
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
import { eventTimeLabel, eventVenueParts, formatListingDate, formatWhen } from '@/lib/format';
import { cn } from '@/lib/utils';

const PAPER_WHITE = '#F5F5F8';

export const LISTING_CARD_MIN_PX = 168;
export const LISTING_CARD_MAX_PX = 220;

const desktopListingGridStyle = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(${LISTING_CARD_MIN_PX}px, ${LISTING_CARD_MAX_PX}px))`,
  gap: 24,
  justifyContent: 'start',
} as object;

const badgeShadow: ViewStyle =
  Platform.select({
    ios: {
      shadowColor: '#0b0b12',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.16,
      shadowRadius: 4,
    },
    android: { elevation: 2 },
    web: { boxShadow: '0 1px 4px rgba(11, 11, 18, 0.16)' },
    default: {},
  }) ?? {};

const heartShadow: ViewStyle =
  Platform.OS === 'web'
    ? ({ filter: 'drop-shadow(0px 1px 2px rgba(0, 0, 0, 0.55))' } as object)
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.55,
        shadowRadius: 3,
      };

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

  const { venue } = eventVenueParts(event.venueName, event.addressText);
  const timeLabel = eventTimeLabel(event.startsAt, event.endsAt, caption);
  const dateLabel = formatListingDate(event.startsAt);
  const meta = caption?.trim()
    ? `${venue} · ${caption.trim()}`
    : `${venue} · ${dateLabel} · ${timeLabel}`;
  const photoBadge = badge?.trim() || null;
  const photoClass = widePhoto ? 'aspect-[16/10] w-full' : 'aspect-square w-full';

  return (
    <View className="relative w-full">
      <PressScale onPress={onPress} className="w-full">
        <View className="w-full gap-ds-8">
          <View
            className={cn(
              'relative w-full overflow-hidden rounded-images bg-muted',
              selected ? 'border border-aurora' : undefined
            )}
            style={cardShadowStyle}>
            <PosterThumb event={event} className={photoClass} />
            {photoBadge ? (
              <View
                pointerEvents="none"
                className="absolute left-ds-12 top-ds-12 max-w-[78%] rounded-full bg-paper-white px-ds-12 py-ds-4"
                style={badgeShadow}>
                <Text
                  variant="bodySm"
                  className="font-bold tracking-normal text-pitch-black"
                  numberOfLines={1}>
                  {photoBadge}
                </Text>
              </View>
            ) : null}
          </View>
          <View className="gap-ds-4">
            <Text className="font-bold" numberOfLines={2}>
              {event.name}
            </Text>
            <Text variant="muted" numberOfLines={2}>
              {meta}
            </Text>
          </View>
        </View>
      </PressScale>
      {saveable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Quitar de guardados' : 'Guardar evento'}
          hitSlop={4}
          onPress={() => void toggleSave(event.id, isLoggedIn)}
          className="absolute right-ds-4 top-ds-4 z-10 size-11 items-center justify-center">
          <Heart
            size={22}
            color={PAPER_WHITE}
            fill={saved ? PAPER_WHITE : 'transparent'}
            strokeWidth={2}
            style={heartShadow}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

function PosterThumb({
  event,
  className,
}: {
  event: ParcheEvent;
  className?: string;
}) {
  const fallback = className ?? 'aspect-square w-full';
  if (event.flyerUrl) {
    return (
      <View className={cn('overflow-hidden bg-muted', fallback)}>
        <FlyerImage uri={event.flyerUrl} className="h-full w-full" aspectRatio={className ? undefined : 1} />
      </View>
    );
  }
  return (
    <View className={cn('items-center justify-center bg-muted', fallback)}>
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

/** Same 2-up catalog grid as Explorar, on phone and desktop. */
export function EventFeed({ children }: { children: ReactNode }) {
  return (
    <EventGrid>
      {Children.map(children, (child) => {
        if (child == null || typeof child === 'boolean') return child;
        return <EventGridItem>{child}</EventGridItem>;
      })}
    </EventGrid>
  );
}
