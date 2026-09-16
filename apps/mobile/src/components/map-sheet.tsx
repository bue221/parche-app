import { useEffect, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventCard } from '@/components/event-card';
import { ErrorState, Skeleton } from '@/components/feedback';
import { Text } from '@/components/ui/text';
import { BottomTabInset, WebCompactBottom } from '@/constants/theme';
import type { ParcheEvent } from '@/data/types';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useTheme } from '@/hooks/use-theme';
import { useCompactLayout } from '@/hooks/use-compact-layout';

const CARD_WIDTH = 148;
const CARD_GAP = 12;
const PEEK_BODY = 340;
const SPRING = { damping: 22, stiffness: 220, mass: 0.85 };

function tabClearance(compact: boolean, bottomInset: number) {
  if (Platform.OS === 'web') {
    return compact ? WebCompactBottom : 24;
  }
  return Math.max(BottomTabInset, bottomInset + 56);
}

export function MapSheet({
  events,
  selectedId,
  loading = false,
  error = false,
  onRetry,
  onOpen,
}: {
  events: ParcheEvent[];
  selectedId?: string | null;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  onOpen: (event: ParcheEvent) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const compact = useCompactLayout();
  const reduce = useReduceMotion();
  const { height: windowH } = useWindowDimensions();
  const tabClear = tabClearance(compact, insets.bottom);
  const peekH = PEEK_BODY + tabClear;
  const expandedH = Math.max(peekH + 120, windowH - Math.max(insets.top, 12));
  const height = useSharedValue(peekH);
  const dragStart = useSharedValue(peekH);
  const peekSv = useSharedValue(peekH);
  const expandedSv = useSharedValue(expandedH);
  const reduceSv = useSharedValue(reduce);
  const [expanded, setExpanded] = useState(false);
  const carouselRef = useRef<ScrollView>(null);

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
    carouselRef.current?.scrollTo({ x: index * (CARD_WIDTH + CARD_GAP), animated: true });
  }, [selectedId, events]);

  function snap(open: boolean) {
    const next = open ? expandedH : peekH;
    height.value = reduce ? next : withSpring(next, SPRING);
    setExpanded(open);
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

  const countLabel = `${events.length} ${events.length === 1 ? 'fecha' : 'fechas'}`;

  return (
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
          borderTopWidth: 1,
          borderColor: theme.border,
          paddingBottom: tabClear,
        },
        sheetStyle,
      ]}>
      <GestureDetector gesture={pan}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Ver mapa' : 'Ver lista de fechas'}
          onPress={() => snap(!expanded)}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text variant="headingSm">{loading ? 'Cargando' : error ? 'Mapa' : countLabel}</Text>
              <Text variant="muted">{expanded ? 'Desliza abajo para el mapa' : 'Desliza arriba para la lista'}</Text>
            </View>
            <Text variant="caption" className="font-bold uppercase">
              {expanded ? 'Ver mapa' : 'Ver lista'}
            </Text>
          </View>
        </Pressable>
      </GestureDetector>

      {error ? (
        <View style={{ paddingHorizontal: 16 }}>
          <ErrorState message="No pudimos cargar el mapa" onRetry={onRetry} />
        </View>
      ) : loading ? (
        <ScrollView
          horizontal
          scrollEnabled={!expanded}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: CARD_GAP }}>
          {[0, 1, 2].map((key) => (
            <View key={key} style={{ width: CARD_WIDTH }}>
              <Skeleton className="aspect-[4/5] w-full" />
              <Skeleton className="mt-ds-8 h-4 w-2/3" />
            </View>
          ))}
        </ScrollView>
      ) : events.length === 0 ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Text variant="muted">No hay fechas en esta vista. Cambia filtros o vuelve a Explorar.</Text>
        </View>
      ) : expanded ? (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}
          renderItem={({ item }) => (
            <EventCard
              layout="row"
              event={item}
              selected={item.id === selectedId}
              onPress={() => onOpen(item)}
            />
          )}
        />
      ) : (
        <ScrollView
          ref={carouselRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: CARD_GAP, paddingBottom: 8 }}>
          {events.map((event) => (
            <View key={event.id} style={{ width: CARD_WIDTH }}>
              <EventCard
                layout="listing"
                event={event}
                selected={event.id === selectedId}
                onPress={() => onOpen(event)}
              />
            </View>
          ))}
        </ScrollView>
      )}
    </Animated.View>
  );
}
