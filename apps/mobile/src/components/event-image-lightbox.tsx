import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlyerImage } from '@/components/flyer-image';
import { PressScale } from '@/components/motion';
import { Text } from '@/components/ui/text';
import type { EventGalleryImage } from '@/data/types';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { lightboxCanPage, lightboxPageSize } from '@/lib/event-images';
import { cn } from '@/lib/utils';

const PAPER = '#F5F5F8';

export function EventImageLightbox({
  visible,
  images,
  initialIndex,
  title,
  onClose,
}: {
  visible: boolean;
  images: EventGalleryImage[];
  initialIndex: number;
  title?: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const compact = useCompactLayout();
  const reduce = useReduceMotion();
  const listRef = useRef<ScrollView>(null);
  const count = images.length;
  const start = Math.max(0, Math.min(count - 1, initialIndex));
  const [index, setIndex] = useState(start);
  const [page, setPage] = useState({ width: 0, height: 0 });
  const paged = lightboxCanPage(count, page);
  const current = images[index] ?? images[start] ?? images[0];

  useLayoutEffect(() => {
    if (!visible) return;
    setIndex(start);
    if (page.width <= 0 || count <= 1) return;
    listRef.current?.scrollTo({ x: start * page.width, animated: false });
  }, [visible, start, page.width, count]);

  const scrollTo = (next: number) => {
    const clamped = Math.max(0, Math.min(count - 1, next));
    setIndex(clamped);
    if (page.width <= 0) return;
    listRef.current?.scrollTo({ x: clamped * page.width, animated: !reduce });
  };

  const onScrollEnd = (nativeEvent: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (page.width <= 0) return;
    const next = Math.round(nativeEvent.nativeEvent.contentOffset.x / page.width);
    setIndex(Math.max(0, Math.min(count - 1, next)));
  };

  if (count === 0) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        className="flex-1 bg-pitch-black"
        style={{
          flex: 1,
          height: Platform.OS === 'web' ? '100%' : undefined,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }}>
        <View className="z-10 flex-row items-center justify-between px-ds-16 py-ds-8">
          <View className="size-11" />
          <Text variant="bodySm" className="font-bold text-paper-white">
            {count > 1 ? `${index + 1} de ${count}` : title ?? 'Foto'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar fotos"
            hitSlop={4}
            onPress={onClose}
            className="size-11 items-center justify-center rounded-full bg-paper-white">
            <X size={18} color="#0B0B12" strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* Stretch the photo stage. items-center on this row zeroes its height on web. */}
        <View className="min-h-0 flex-1 flex-row">
          {!compact && count > 1 ? (
            <PressScale
              fit
              className="self-center"
              disabled={index === 0}
              onPress={() => scrollTo(index - 1)}
              accessibilityLabel="Foto anterior">
              <View className={cn('size-11 items-center justify-center', index === 0 && 'opacity-30')}>
                <ChevronLeft size={22} color={PAPER} strokeWidth={2.2} />
              </View>
            </PressScale>
          ) : null}

          <View
            className="min-h-0 min-w-0 flex-1 self-stretch"
            onLayout={(event) => {
              const next = lightboxPageSize(event.nativeEvent.layout.width, event.nativeEvent.layout.height);
              if (next.width > 0 && next.height > 0 && (next.width !== page.width || next.height !== page.height)) {
                setPage(next);
              }
            }}>
            {paged ? (
              <ScrollView
                ref={listRef}
                horizontal
                pagingEnabled
                nestedScrollEnabled
                directionalLockEnabled
                disableIntervalMomentum
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onScrollEnd}
                onScrollEndDrag={onScrollEnd}
                style={
                  Platform.OS === 'web'
                    ? ({ width: page.width, height: page.height, scrollSnapType: 'x mandatory' } as object)
                    : { width: page.width, height: page.height }
                }
                accessibilityLabel={
                  title ? `${title}, foto ${index + 1} de ${count}` : `Foto ${index + 1} de ${count}`
                }>
                {images.map((image) => (
                  <View
                    key={image.id}
                    className="items-center justify-center"
                    style={[
                      { width: page.width, height: page.height },
                      Platform.OS === 'web'
                        ? ({ scrollSnapAlign: 'start', scrollSnapStop: 'always' } as object)
                        : undefined,
                    ]}>
                    <LightboxPhoto uri={image.url} width={page.width} height={page.height} />
                  </View>
                ))}
              </ScrollView>
            ) : current ? (
              <LightboxPhoto uri={current.url} width={page.width} height={page.height} />
            ) : null}
          </View>

          {!compact && count > 1 ? (
            <PressScale
              fit
              className="self-center"
              disabled={index === count - 1}
              onPress={() => scrollTo(index + 1)}
              accessibilityLabel="Foto siguiente">
              <View className={cn('size-11 items-center justify-center', index === count - 1 && 'opacity-30')}>
                <ChevronRight size={22} color={PAPER} strokeWidth={2.2} />
              </View>
            </PressScale>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function LightboxPhoto({ uri, width, height }: { uri: string; width: number; height: number }) {
  const sized = width > 0 && height > 0;
  return (
    <FlyerImage
      uri={uri}
      className="h-full w-full bg-pitch-black"
      contentFit="contain"
      style={sized ? { width, height } : { flex: 1, width: '100%', height: '100%' }}
    />
  );
}
