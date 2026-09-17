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
const HANDLE_BODY = 58;

export type MapSheetSnap = 'collapsed' | 'peek' | 'expanded';

function tabClearance(compact: boolean, bottomInset: number) {
  if (Platform.OS === 'web') {
    return compact ? WebCompactBottom : 24;
  }
  return Math.max(BottomTabInset, bottomInset + 56);
}

export function mapSheetMetrics(windowH: number, topInset: number, tabClear = BottomTabInset) {
  const column = Math.max(280, windowH - Math.max(topInset, 0));
  const collapsedH = HANDLE_BODY + tabClear;
  const peekH = Math.min(Math.max(Math.round(column * 0.5), 280), column - 24);
  const expandedH = column;
  return { collapsedH, peekH, expandedH };
}

function heightForSnap(snap: MapSheetSnap, collapsedH: number, peekH: number, expandedH: number) {
  if (snap === 'expanded') return expandedH;
  if (snap === 'peek') return peekH;
  return collapsedH;
}

export function MapSheet({
  events,
  selectedId,
  loading = false,
  error = false,
  topInset = 12,
  onRetry,
  onOpen,
  onHeightChange,
}: {
  events: ParcheEvent[];
  selectedId?: string | null;
  loading?: boolean;
  error?: boolean;
  topInset?: number;
  onRetry?: () => void;
  onOpen: (event: ParcheEvent) => void;
  onHeightChange?: (height: number) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const compact = useCompactLayout();
  const reduce = useReduceMotion();
  const { height: windowH } = useWindowDimensions();
  const tabClear = tabClearance(compact, insets.bottom);
  const { collapsedH, peekH, expandedH } = mapSheetMetrics(windowH, topInset, tabClear);
  const height = useSharedValue(collapsedH);
  const dragStart = useSharedValue(collapsedH);
  const collapsedSv = useSharedValue(collapsedH);
  const peekSv = useSharedValue(peekH);
  const expandedSv = useSharedValue(expandedH);
  const reduceSv = useSharedValue(reduce);
  const [snap, setSnap] = useState<MapSheetSnap>('collapsed');
  const snapRef = useRef(snap);
  snapRef.current = snap;
  const listRef = useRef<FlatList<ParcheEvent>>(null);
  const onHeightChangeRef = useRef(onHeightChange);
  onHeightChangeRef.current = onHeightChange;

  function reportHeight(next: number) {
    onHeightChangeRef.current?.(next);
  }

  function applySnap(next: MapSheetSnap) {
    const value = heightForSnap(next, collapsedH, peekH, expandedH);
    height.value = reduce ? value : withSpring(value, SPRING);
    setSnap(next);
    reportHeight(value);
    if (next === 'collapsed') {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }

  useEffect(() => {
    collapsedSv.value = collapsedH;
    peekSv.value = peekH;
    expandedSv.value = expandedH;
    reduceSv.value = reduce;
    const value = heightForSnap(snapRef.current, collapsedH, peekH, expandedH);
    height.value = value;
    reportHeight(value);
  }, [collapsedH, peekH, expandedH, height, collapsedSv, peekSv, expandedSv, reduceSv, reduce]);

  useEffect(() => {
    if (!selectedId) return;
    if (snapRef.current === 'collapsed') applySnap('peek');
    const index = events.findIndex((event) => event.id === selectedId);
    if (index < 0) return;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index, viewPosition: 0, animated: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, events]);

  function cycleSnap() {
    if (snap === 'collapsed') applySnap('peek');
    else if (snap === 'peek') applySnap('expanded');
    else applySnap('collapsed');
  }

  function commitSnap(nextH: number) {
    const collapsed = collapsedH;
    const peek = peekH;
    const expanded = expandedH;
    const next: MapSheetSnap =
      nextH >= expanded - 8 ? 'expanded' : nextH <= collapsed + 8 ? 'collapsed' : 'peek';
    setSnap(next);
    reportHeight(nextH);
    if (next === 'collapsed') {
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
      const min = collapsedSv.value;
      const max = expandedSv.value;
      const next = dragStart.value - event.translationY;
      height.value = Math.min(max, Math.max(min, next));
    })
    .onEnd((event) => {
      const collapsed = collapsedSv.value;
      const peek = peekSv.value;
      const expanded = expandedSv.value;
      const h = height.value;
      const v = event.velocityY;
      let next = peek;
      if (v < -420) {
        next = h < peek - 24 ? peek : expanded;
      } else if (v > 420) {
        next = h > peek + 24 ? peek : collapsed;
      } else {
        const dC = Math.abs(h - collapsed);
        const dP = Math.abs(h - peek);
        const dE = Math.abs(h - expanded);
        next = dC <= dP && dC <= dE ? collapsed : dP <= dE ? peek : expanded;
      }
      height.value = reduceSv.value ? next : withSpring(next, SPRING);
      runOnJS(commitSnap)(next);
    });

  const sheetStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  const countLabel =
    events.length === 0 ? 'Sin fechas en el mapa' : `${events.length} ${events.length === 1 ? 'fecha' : 'fechas'}`;
  const handleLabel =
    snap === 'expanded' ? 'Ver mapa' : snap === 'peek' ? 'Ver lista completa' : 'Ver lista de fechas';

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
            accessibilityLabel={handleLabel}
            onPress={cycleSnap}
            style={{ paddingTop: 10, paddingBottom: 8, paddingHorizontal: 16 }}>
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
            <Text className="text-center font-bold">
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
              <Skeleton key={key} className="aspect-[4/5] w-full rounded-cards" />
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
            scrollEnabled={snap !== 'collapsed'}
            onScrollBeginDrag={() => {
              if (snap !== 'expanded') applySnap('expanded');
            }}
            onScrollToIndexFailed={({ index }) => {
              setTimeout(() => {
                listRef.current?.scrollToIndex({ index, viewPosition: 0, animated: true });
              }, 120);
            }}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: snap === 'expanded' ? 72 : 16,
              gap: 24,
            }}
            renderItem={({ item }) => (
              <EventCard
                layout="listing"
                saveable
                event={item}
                selected={item.id === selectedId}
                onPress={() => onOpen(item)}
              />
            )}
          />
        )}
      </Animated.View>
      {snap === 'expanded' ? (
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
            onPress={() => applySnap('collapsed')}
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
