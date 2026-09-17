import type { TabListProps, TabTriggerSlotProps } from 'expo-router/ui';
import type { ComponentType, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useTheme } from '@/hooks/use-theme';
import { tabBarShadowStyle } from '@/lib/card-shadow';
import { cn } from '@/lib/utils';

type TabIcon = ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}>;

export function TabBar({ children, className, style, ...props }: TabListProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      {...props}
      className={cn('absolute bottom-0 z-50 w-full flex-row items-stretch overflow-visible border-t border-border bg-surface px-ds-4 pt-ds-8', className)}
      style={[tabBarShadowStyle, { paddingBottom: Math.max(insets.bottom, 10) }, style]}>
      {children}
    </View>
  );
}

export function TabBarItem({
  children,
  icon: Icon,
  isFocused,
  badge = 0,
  className,
  ...props
}: TabTriggerSlotProps & {
  icon: TabIcon;
  badge?: number;
}) {
  const theme = useTheme();
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const color = isFocused ? theme.aurora : theme.textSecondary;

  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: Boolean(isFocused) }}
      onPressIn={(event) => {
        props.onPressIn?.(event);
        if (!reduce) scale.value = withTiming(0.96, { duration: 90 });
      }}
      onPressOut={(event) => {
        props.onPressOut?.(event);
        if (!reduce) scale.value = withTiming(1, { duration: 120 });
      }}
      className={cn('min-h-11 flex-1 items-center justify-center px-ds-4 py-ds-4', className)}>
      <Animated.View className="items-center gap-ds-4" style={pressStyle}>
        <View className="relative items-center justify-center">
          <Icon
            size={24}
            color={color}
            strokeWidth={isFocused ? 2.5 : 1.85}
            fill={isFocused ? color : 'transparent'}
          />
          {badge > 0 ? (
            <View
              accessibilityLabel={`${badge} pendientes`}
              className="absolute -right-1 -top-1 size-2.5 rounded-full bg-danger"
            />
          ) : null}
        </View>
        <Text
          variant="caption"
          numberOfLines={1}
          className={cn(
            'text-center text-[11px] normal-case tracking-normal',
            isFocused ? 'font-bold text-aurora' : 'font-normal text-muted-foreground'
          )}>
          {children as ReactNode}
        </Text>
      </Animated.View>
    </Pressable>
  );
}
