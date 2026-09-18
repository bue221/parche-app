import { SymbolView } from 'expo-symbols';
import type { TabListProps, TabTriggerSlotProps } from 'expo-router/ui';
import { CircleUser, Heart, List, MapPinned, Search, Ticket, Wrench } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useTheme } from '@/hooks/use-theme';
import { tabBarShadowStyle } from '@/lib/card-shadow';
import { cn } from '@/lib/utils';

export const TAB_GLYPHS = {
  explore: {
    ios: { default: 'magnifyingglass', selected: 'magnifyingglass' },
    md: 'search',
    Fallback: Search,
  },
  map: {
    ios: { default: 'map', selected: 'map.fill' },
    md: 'map',
    Fallback: MapPinned,
  },
  list: {
    ios: { default: 'list.bullet', selected: 'list.bullet' },
    md: 'list',
    Fallback: List,
  },
  favorites: {
    ios: { default: 'heart', selected: 'heart.fill' },
    md: 'favorite',
    Fallback: Heart,
  },
  wallet: {
    ios: { default: 'ticket', selected: 'ticket.fill' },
    md: 'confirmation_number',
    Fallback: Ticket,
  },
  account: {
    ios: { default: 'person.crop.circle', selected: 'person.crop.circle.fill' },
    md: 'account_circle',
    Fallback: CircleUser,
  },
  operate: {
    ios: { default: 'wrench.and.screwdriver', selected: 'wrench.and.screwdriver.fill' },
    md: 'build',
    Fallback: Wrench,
  },
} as const;

export type TabGlyph = (typeof TAB_GLYPHS)[keyof typeof TAB_GLYPHS];

const ICON = 28;
const WELL = 32;
const LABEL = 12;
const GAP = 4;
const STROKE = 2.15;

function TabGlyphIcon({
  glyph,
  focused,
  color,
}: {
  glyph: TabGlyph;
  focused: boolean;
  color: string;
}) {
  const Fallback = glyph.Fallback;
  const lucide = (
    <Fallback
      size={ICON}
      color={color}
      strokeWidth={STROKE}
      absoluteStrokeWidth
      fill={focused ? color : 'transparent'}
      fillOpacity={focused ? 0.22 : 0}
    />
  );

  if (Platform.OS === 'web') {
    return lucide;
  }

  return (
    <SymbolView
      name={{
        ios: focused ? glyph.ios.selected : glyph.ios.default,
        android: glyph.md,
        web: glyph.md,
      }}
      size={ICON}
      scale="medium"
      weight="medium"
      tintColor={color}
      resizeMode="scaleAspectFit"
      style={styles.symbol}
      fallback={lucide}
    />
  );
}

export function TabBar({ children, className, style, ...props }: TabListProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      {...props}
      className={cn('absolute bottom-0 z-50 w-full flex-row border-t border-border bg-surface', className)}
      style={[
        styles.bar,
        tabBarShadowStyle,
        { paddingBottom: Math.max(insets.bottom, 10) },
        style,
      ]}>
      {children}
    </View>
  );
}

export function TabBarItem({
  children,
  glyph,
  isFocused,
  badge = 0,
  className,
  ...props
}: TabTriggerSlotProps & {
  glyph: TabGlyph;
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
        if (!reduce) scale.value = withTiming(0.97, { duration: 90 });
      }}
      onPressOut={(event) => {
        props.onPressOut?.(event);
        if (!reduce) scale.value = withTiming(1, { duration: 120 });
      }}
      className={className}
      style={styles.item}>
      <Animated.View style={[styles.stack, pressStyle]}>
        <View style={styles.well}>
          <TabGlyphIcon glyph={glyph} focused={Boolean(isFocused)} color={color} />
          {badge > 0 ? (
            <View
              accessibilityLabel={`${badge} pendientes`}
              className="absolute right-0 top-0 size-2.5 rounded-full bg-danger"
            />
          ) : null}
        </View>
        <Text
          variant="small"
          numberOfLines={1}
          allowFontScaling={false}
          className={cn('text-center', isFocused ? 'font-bold text-aurora' : 'font-normal text-muted-foreground')}
          style={styles.label}>
          {children as ReactNode}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    overflow: 'visible',
    paddingHorizontal: 4,
    paddingTop: 10,
  },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 2,
    minHeight: 56,
  },
  stack: {
    width: '100%',
    alignItems: 'center',
    gap: GAP,
  },
  well: {
    width: WELL,
    height: WELL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: {
    width: ICON,
    height: ICON,
  },
  label: {
    width: '100%',
    height: 16,
    fontSize: LABEL,
    lineHeight: 16,
    letterSpacing: 0,
  },
});
