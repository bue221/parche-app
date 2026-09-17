import { useEffect, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map } from 'lucide-react-native';

import { EventCard } from '@/components/event-card';
import { ErrorState, Skeleton } from '@/components/feedback';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { BottomTabInset, WebCompactBottom } from '@/constants/theme';
import type { ParcheEvent } from '@/data/types';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useTheme } from '@/hooks/use-theme';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { cardShadowStyle } from '@/lib/card-shadow';

const SPRING = { damping: 22, stiffness: 220, mass: 0.85 };

function tabClearance(compact: boolean, bottomInset: number) {
  if (Platform.OS === 'web') {
    return compact ? WebCompactBottom : 24;
  }
  return Math.max(BottomTabInset, bottomInset + 56);
}

export function mapSheetMetrics(windowH: number, topInset: number) {
  const column = Math.max(280, windowH - Math.max(topInset, 0));
  const expandedH = column;
  const peekH = Math.min(Math.max(Math.round(column * 0.52), 280), expandedH - 24);
  return { peekH, expandedH };
}

export function MapSheet({
  events,
  selectedId,
  loading = false,
  error = false,
  topInset = 12,
  onRetry,
  onOpen,
}: {
  events: ParcheEvent[];
  selectedId?: string | null;
  loading?: boolean;
  error?: boolean;
  topInset?: number;
  onRetry?: () => void;
  onOpen: (event: ParcheEvent) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const compact = useCompactLayout();
  const reduce = useReduceMotion();
  const { height: windowH } = useWindowDimensions();
  const tabClear = tabClearance(compact, insets.bottom);
  const { peekH, expandedH } = mapSheetMetrics(windowH, topInset);
  const height = useSharedValue(peekH);
  const dragStart = useSharedValue(peekH);
  const peekSv = useSharedValue(peekH);
  const expandedSv = useSharedValue(expandedH);
  const reduceSv = useSharedValue(reduce);
  const [expanded, setExpanded] = useState(false);
  const listRef = useRef<FlatList<ParcheEvent>>(null);

  useEffect(() => {
    peekSv.value = peekH;
    expandedSv.value = expandedH;
    reduceSv.value = reduce;
    height.value = expanded ? expandedH : peekH;
  }, [expandedH, peekH, expanded, height, peekSv, expandedSv, reduceSv, reduce]);

  useEffect(() => {
    if (!selectedId) return;
    const index = events.findIndex((event) => event.id === selectedId);
    if (index < 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index, viewPosition: 0, animated: true });
    });
  }, [selectedId, events]);

  function snap(open: boolean) {
    const next = open ? expandedH : peekH;
    height.value = reduce ? next : withSpring(next, SPRING);
    setExpanded(open);
    if (!open) {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }

  const pan = Gesture.Pan()
    .activeOffsetY([-16, 16])
    .failOffsetX([-24, 24])
    .onBegin(() => {
      dragStart.value = height.value;
    })
    .onUpdate((event) => {
      const min = peekSv.value;
      const max = expandedSv.value;
      const next = dragStart.value - event.translationY;
      height.value = Math.min(max, Math.max(min, next));
    })
    .onEnd((event) => {
      const min = peekSv.value;
      const max = expandedSv.value;
      const midpoint = (min + max) / 2;
      const open = event.velocityY < -420 || (event.velocityY <= 420 && height.value > midpoint);
      const next = open ? max : min;
      height.value = reduceSv.value ? next : withSpring(next, SPRING);
      runOnJS(setExpanded)(open);
    });

  const sheetStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  const countLabel =
    events.length === 0 ? 'Sin fechas en el mapa' : `${events.length} ${events.length === 1 ? 'fecha' : 'fechas'}`;

  return (
    <>
      <Animated.View
        style={[
          {
            zIndex: 30,
            elevation: 8,
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            overflow: 'hidden',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            backgroundColor: theme.background,
            paddingBottom: tabClear,
          },
          cardShadowStyle,
          sheetStyle,
        ]}>
        <GestureDetector gesture={pan}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Ver mapa' : 'Ver lista de fechas'}
            onPress={() => snap(!expanded)}
            style={{ paddingTop: 10, paddingBottom: 4, paddingHorizontal: 16 }}>
            <View
              style={{
                width: 48,
                height: 4,
                borderRadius: 99,
                alignSelf: 'center',
                backgroundColor: theme.backgroundElement,
                marginBottom: 12,
              }}
            />
            <Text variant="headingSm" className="text-center">
              {loading ? 'Cargando fechas' : error ? 'No se pudo cargar' : countLabel}
            </Text>
          </Pressable>
        </GestureDetector>

        {error ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <ErrorState message="No pudimos cargar el mapa" onRetry={onRetry} />
          </View>
        ) : loading ? (
          <View style={{ paddingHorizontal: 16, gap: 24, paddingTop: 16 }}>
            {[0, 1].map((key) => (
              <View key={key}>
                <Skeleton className="aspect-[16/10] w-full rounded-images" />
                <Skeleton className="mt-ds-8 h-4 w-2/3" />
                <Skeleton className="mt-ds-4 h-3 w-1/2" />
              </View>
            ))}
          </View>
        ) : events.length === 0 ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <Text variant="muted" className="text-center">
              No hay fechas en esta vista. Cambia filtros o vuelve a Explorar.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={events}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={() => {
              if (!expanded) snap(true);
            }}
            onScrollToIndexFailed={({ index }) => {
              setTimeout(() => {
                listRef.current?.scrollToIndex({ index, viewPosition: 0, animated: true });
              }, 120);
            }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: expanded ? 72 : 16, gap: 24 }}
            renderItem={({ item }) => (
              <EventCard
                layout="listing"
                widePhoto
                saveable
                event={item}
                selected={item.id === selectedId}
                onPress={() => onOpen(item)}
              />
            )}
          />
        )}
      </Animated.View>
      {expanded ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: tabClear + 12,
            zIndex: 45,
            alignItems: 'center',
          }}>
          <Button
            accessibilityLabel="Ver mapa"
            onPress={() => snap(false)}
            className="min-w-[108px] flex-row px-ds-20"
            style={cardShadowStyle}>
            <Icon as={Map} size={16} />
            <Text>Mapa</Text>
          </Button>
        </View>
      ) : null}
    </>
  );
}
