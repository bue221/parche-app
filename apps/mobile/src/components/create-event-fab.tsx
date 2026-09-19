import { CalendarPlus } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { WebCompactBottom } from '@/constants/theme';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useResolvedColorScheme } from '@/hooks/use-theme';

const SIZE = 56;
const ICON = 22;
const STROKE = 2.15;
const TAB_BAR_HEIGHT = 80;

export function CreateEventFab({ onPress }: { onPress: () => void }) {
  const insets = useSafeAreaInsets();
  const compact = useCompactLayout();
  const colorScheme = useResolvedColorScheme();
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);
  const iconColor = colorScheme === 'light' ? '#f5f5f8' : '#0b0b12';
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const tab = Platform.OS === 'web' ? WebCompactBottom : TAB_BAR_HEIGHT;
  const bottomOffset = compact ? tab + Math.max(insets.bottom, 10) + 16 : 24;

  return (
    <View pointerEvents="box-none" style={[styles.container, { bottom: bottomOffset }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Crear evento"
        onPress={onPress}
        onPressIn={() => {
          if (!reduce) scale.value = withTiming(0.92, { duration: 90 });
        }}
        onPressOut={() => {
          if (!reduce) scale.value = withTiming(1, { duration: 120 });
        }}>
        <Animated.View
          className="flex-row items-center justify-center gap-2 rounded-full bg-primary shadow-button"
          style={[styles.fab, pressStyle]}>
          <CalendarPlus size={ICON} color={iconColor} strokeWidth={STROKE} absoluteStrokeWidth />
          <Text className="font-bold text-primary-foreground">Crear evento</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    zIndex: 100,
  },
  fab: {
    height: SIZE,
    minWidth: SIZE,
    paddingHorizontal: 20,
  },
});
