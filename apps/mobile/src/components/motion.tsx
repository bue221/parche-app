import type { ReactNode } from 'react';
import { Pressable, Platform, View, type PressableProps } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { cn } from '@/lib/utils';

export function PressScale({
  children,
  onPress,
  className,
  disabled,
  fit = false,
  hitSlop,
  accessibilityRole = 'button',
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: PressableProps['onPress'];
  className?: string;
  disabled?: boolean;
  /** Size to the child instead of stretching to the row. Use on chips. */
  fit?: boolean;
  hitSlop?: PressableProps['hitSlop'];
  accessibilityRole?: PressableProps['accessibilityRole'];
  accessibilityLabel?: string;
}) {
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={hitSlop}
      onPress={onPress}
      onPressIn={() => {
        if (!reduce) scale.value = withTiming(0.98, { duration: 90 });
      }}
      onPressOut={() => {
        if (!reduce) scale.value = withTiming(1, { duration: 120 });
      }}
      className={cn(fit ? 'shrink-0 self-start' : 'w-full', Platform.select({ web: 'cursor-pointer' }), className)}>
      <Animated.View className={fit ? undefined : 'w-full'} style={style}>
        {children}
      </Animated.View>
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
      entering={FadeInDown.duration(360).delay(Math.min(index, 12) * 40)}>
      {children}
    </Animated.View>
  );
}
