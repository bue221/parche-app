import { router } from 'expo-router';
import { ChevronLeft, Heart, Play, Share2 } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Platform, Pressable, View, type ViewStyle } from 'react-native';

import { FlyerImage } from '@/components/flyer-image';
import { Text } from '@/components/ui/text';
import type { ParcheEvent } from '@/data/types';
import { cn } from '@/lib/utils';

const INK = '#0B0B12';

const chromeShadow: ViewStyle =
  Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.22,
      shadowRadius: 6,
    },
    android: { elevation: 3 },
    web: { boxShadow: '0 2px 8px rgba(0, 0, 0, 0.28)' },
    default: {},
  }) ?? {};

export function EventDetailHero({
  event,
  saved,
  showBack,
  compact,
  height,
  topInset,
  imageCount = 1,
  onSave,
  onShare,
  onPlay,
  onOpenImages,
}: {
  event: ParcheEvent;
  saved: boolean;
  showBack?: boolean;
  compact?: boolean;
  height: number;
  topInset: number;
  imageCount?: number;
  onSave: () => void;
  onShare: () => void;
  onPlay?: () => void;
  onOpenImages?: () => void;
}) {
  const art = event.flyerUrl ? (
    <FlyerImage uri={event.flyerUrl} className="h-full w-full" />
  ) : (
    <View className="h-full w-full items-center justify-center">
      <Text variant="heading" className="text-muted-foreground">
        {event.name.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );

  return (
    <View className={cn('relative w-full overflow-hidden bg-muted', !compact && 'rounded-images')} style={{ height }}>
      {onOpenImages ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={imageCount > 1 ? `Ver fotos, ${imageCount}` : 'Ampliar flyer'}
          onPress={onOpenImages}
          className="h-full w-full">
          {art}
        </Pressable>
      ) : (
        art
      )}
      <View pointerEvents="none" className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-pitch-black/55 to-transparent" />
      <View pointerEvents="none" className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-pitch-black/50 to-transparent" />

      <View
        className="absolute inset-x-0 top-0 z-10 flex-row items-center justify-between px-ds-16"
        style={{ paddingTop: topInset }}>
        {showBack ? (
          <HeroChromeButton
            accessibilityLabel="Volver"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
            <ChevronLeft size={22} color={INK} strokeWidth={2.2} />
          </HeroChromeButton>
        ) : (
          <View className="size-11" />
        )}
        <View className="flex-row items-center gap-ds-8">
          <HeroChromeButton accessibilityLabel="Compartir evento" onPress={onShare}>
            <Share2 size={18} color={INK} strokeWidth={2.2} />
          </HeroChromeButton>
          <HeroChromeButton
            accessibilityLabel={saved ? 'Quitar de guardados' : 'Guardar evento'}
            onPress={onSave}>
            <Heart size={18} color={INK} fill={saved ? INK : 'transparent'} strokeWidth={2.2} />
          </HeroChromeButton>
        </View>
      </View>

      {onPlay ? (
        <View className="absolute inset-x-0 bottom-ds-48 items-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Escuchar preview"
            onPress={onPlay}
            className="min-h-11 flex-row items-center gap-ds-8 rounded-full bg-pitch-black/70 px-ds-16"
            style={chromeShadow}>
            <View className="size-7 items-center justify-center rounded-full bg-paper-white">
              <Play size={14} color={INK} fill={INK} strokeWidth={2} />
            </View>
            <Text variant="bodySm" className="font-bold text-paper-white">
              Escuchar
            </Text>
          </Pressable>
        </View>
      ) : null}

      {imageCount > 1 ? (
        <View pointerEvents="none" className="absolute bottom-ds-48 left-ds-16">
          <View className="min-h-8 justify-center rounded-full bg-pitch-black/70 px-ds-12 py-ds-4">
            <Text variant="caption" className="text-paper-white">
              {imageCount} fotos
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function HeroChromeButton({
  children,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      onPress={onPress}
      className="size-11 items-center justify-center rounded-full bg-paper-white active:opacity-80"
      style={chromeShadow}>
      {children}
    </Pressable>
  );
}
