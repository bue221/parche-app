import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * White copy sheet over a pinned flyer. A tracking cap keeps the top radius
 * as the card docks; overflow clips so content cannot leak into the corners.
 */
export function EventDetailSheet({
  dockTop,
  spacer,
  children,
}: {
  dockTop: number;
  spacer: number;
  children: ReactNode;
}) {
  const surface = useTheme().surface;
  const scrollY = useSharedValue(0);
  const spacerSv = useSharedValue(spacer);
  spacerSv.value = spacer;

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const capStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.max(spacerSv.value - scrollY.value, 0) }],
  }));

  const clipStyle = useAnimatedStyle(() => {
    const docked = scrollY.value >= spacerSv.value - 0.5;
    return {
      borderTopLeftRadius: docked ? Radii.navelements : 0,
      borderTopRightRadius: docked ? Radii.navelements : 0,
      overflow: docked ? ('hidden' as const) : ('visible' as const),
    };
  });

  return (
    <Animated.View style={[{ flex: 1, marginTop: dockTop }, clipStyle]}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: spacer, paddingBottom: 24 }}
        style={{ flex: 1 }}
        pointerEvents="box-none">
        <View
          pointerEvents="auto"
          className="bg-surface px-ds-16 pb-ds-32"
          style={{
            borderTopLeftRadius: Radii.navelements,
            borderTopRightRadius: Radii.navelements,
            overflow: 'hidden',
            backgroundColor: surface,
            paddingTop: 56,
          }}>
          {children}
        </View>
      </Animated.ScrollView>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: Radii.navelements,
            borderTopLeftRadius: Radii.navelements,
            borderTopRightRadius: Radii.navelements,
            backgroundColor: surface,
            zIndex: 2,
          },
          capStyle,
        ]}
      />
    </Animated.View>
  );
}
