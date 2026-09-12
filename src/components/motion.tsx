import type { ReactNode } from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';

export function PressScale({
  children,
  onPress,
  className,
  disabled,
  accessibilityRole = 'button',
}: {
  children: ReactNode;
  onPress?: PressableProps['onPress'];
  className?: string;
  disabled?: boolean;
  accessibilityRole?: PressableProps['accessibilityRole'];
}) {
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        if (!reduce) scale.value = withTiming(0.98, { duration: 90 });
      }}
      onPressOut={() => {
        if (!reduce) scale.value = withTiming(1, { duration: 120 });
      }}
      className={className}>
      <Animated.View style={style}>{children}</Animated.View>
    </Pressable>
  );
}

export function FadeSlideIn({
  children,
  index = 0,
  className,
}: {
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  const reduce = useReduceMotion();
  if (reduce) {
    return <View className={className}>{children}</View>;
  }
  return (
    <Animated.View
      className={className}
      entering={FadeInDown.duration(280).delay(Math.min(index, 12) * 40)}>
      {children}
    </Animated.View>
  );
}
