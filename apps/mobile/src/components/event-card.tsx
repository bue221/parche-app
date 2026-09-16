import { Children, type ReactNode } from 'react';
import { Platform, View } from 'react-native';

import { FlyerImage } from '@/components/flyer-image';
import { PressScale } from '@/components/motion';
import { Text } from '@/components/ui/text';
import type { ParcheEvent } from '@/data/types';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { cardShadowStyle } from '@/lib/card-shadow';
import { formatDay, formatWhen } from '@/lib/format';
import { cn } from '@/lib/utils';

export const LISTING_CARD_MIN_PX = 220;
export const LISTING_CARD_MAX_PX = 260;

const desktopListingGridStyle = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(${LISTING_CARD_MIN_PX}px, ${LISTING_CARD_MAX_PX}px))`,
  gap: 24,
  justifyContent: 'start',
} as object;

export function EventCard({
  event,
  onPress,
  layout = 'listing',
  selected = false,
}: {
  event: ParcheEvent;
  onPress?: () => void;
  layout?: 'listing' | 'poster' | 'row';
  selected?: boolean;
}) {
  const compact = useCompactLayout();
  const listingFrame = Platform.OS === 'web' && !compact ? 'w-full max-w-[260px]' : 'w-full';

  if (layout === 'row') {
    return (
      <PressScale onPress={onPress} className="w-full">
        <View
          className={cn(
            'min-h-11 w-full flex-row items-center gap-ds-12 rounded-cards border bg-background p-ds-12 shadow-card',
            selected ? 'border-neon' : 'border-border'
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

  if (layout === 'poster') {
    return (
      <PressScale onPress={onPress} className={listingFrame}>
        <View className="relative w-full overflow-hidden rounded-images bg-muted">
          <PosterThumb event={event} />
          <View pointerEvents="none" className="absolute inset-x-0 bottom-0 h-[58%]" style={scrimStyle} />
          <View className="absolute inset-x-0 bottom-0 gap-ds-8 p-ds-16">
            {event.genre ? (
              <Text variant="caption" className="uppercase text-paper-white">
                {event.genre}
              </Text>
            ) : null}
            <Text variant="caption" className="uppercase text-paper-white">
              {formatWhen(event.startsAt)}
            </Text>
            <Text variant="headingSm" className="text-paper-white" numberOfLines={3}>
              {event.name}
            </Text>
            <Text variant="caption" className="uppercase text-paper-white">
              {event.venueName}
            </Text>
          </View>
        </View>
      </PressScale>
    );
  }

  return (
    <PressScale onPress={onPress} className={listingFrame}>
      <View className="w-full">
        <View
          className={cn(
            'relative overflow-hidden rounded-images bg-muted shadow-card',
            selected ? 'border border-neon' : 'border border-transparent'
          )}
          style={cardShadowStyle}>
          <PosterThumb event={event} listing />
          <View className="absolute left-ds-8 top-ds-8 rounded-tags bg-pitch-black/80 px-ds-8 py-ds-4">
            <Text variant="caption" className="uppercase text-paper-white">
              {formatDay(event.startsAt)}
            </Text>
          </View>
        </View>
        <View className="mt-ds-8 gap-ds-4">
          {event.genre ? (
            <Text variant="caption" className="uppercase text-muted-foreground">
              {event.genre}
            </Text>
          ) : null}
          <Text variant="subheading" numberOfLines={2}>
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

const scrimStyle =
  Platform.OS === 'web'
    ? ({
        backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.32) 55%, transparent 100%)',
      } as object)
    : { backgroundColor: 'rgba(0,0,0,0.48)' };

function PosterThumb({
  event,
  className,
  listing = false,
}: {
  event: ParcheEvent;
  className?: string;
  listing?: boolean;
}) {
  const framed = Boolean(className) || listing;
  if (event.flyerUrl) {
    return (
      <View className={cn('overflow-hidden bg-muted', className ?? (listing ? 'aspect-[4/5] w-full' : 'aspect-[3/4] w-full'))}>
        <FlyerImage uri={event.flyerUrl} className="h-full w-full" aspectRatio={framed ? undefined : 3 / 4} />
      </View>
    );
  }
  return (
    <View className={cn('items-center justify-center bg-muted', className ?? (listing ? 'aspect-[4/5] w-full' : 'aspect-[3/4] w-full'))}>
      <Text variant="headingSm" className="uppercase text-muted-foreground">
        {event.name.slice(0, 2)}
      </Text>
    </View>
  );
}

export function EventGrid({ children }: { children: ReactNode }) {
  const compact = useCompactLayout();
  if (Platform.OS !== 'web') {
    return <View className="w-full flex-row flex-wrap justify-between gap-y-ds-24">{children}</View>;
  }
  if (compact) {
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
    return <View style={{ width: '48%' }}>{children}</View>;
  }
  return <View className="min-w-0 w-full max-w-[260px]">{children}</View>;
}

/** Stacked feed on phone; same 220–260px listing grid as Explorar on desktop web. */
export function EventFeed({ children }: { children: ReactNode }) {
  const compact = useCompactLayout();
  if (Platform.OS !== 'web' || compact) {
    return <View className="w-full gap-ds-24">{children}</View>;
  }
  return (
    <View className="w-full" style={desktopListingGridStyle}>
      {Children.map(children, (child) => {
        if (child == null || typeof child === 'boolean') return child;
        return <View className="min-w-0 w-full max-w-[260px]">{child}</View>;
      })}
    </View>
  );
}
