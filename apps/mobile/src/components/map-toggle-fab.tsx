import { SymbolView } from 'expo-symbols';
import { List, MapPinned } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useResolvedColorScheme } from '@/hooks/use-theme';

const SIZE = 56;
const ICON = 24;
const STROKE = 2.15;
const TAB_BAR_HEIGHT = 80;

export type ViewMode = 'list' | 'map';

interface MapToggleFABProps {
  mode: ViewMode;
  onToggle: () => void;
}

export function MapToggleFAB({ mode, onToggle }: MapToggleFABProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useResolvedColorScheme();
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const isMap = mode === 'map';
  const label = isMap ? 'Lista' : 'Mapa';
  const Fallback = isMap ? List : MapPinned;
  // Primary foreground: light text on dark bg in light mode, dark text on light bg in dark mode
  const iconColor = colorScheme === 'light' ? '#f5f5f8' : '#0b0b12';

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  function handlePress() {
    if (!reduce) {
      rotation.value = withSpring(rotation.value + 180, { damping: 15, stiffness: 150 });
    }
    onToggle();
  }

  const bottomOffset = TAB_BAR_HEIGHT + Math.max(insets.bottom, 10) + 16;

  const lucideIcon = (
    <Fallback
      size={ICON}
      color={iconColor}
      strokeWidth={STROKE}
      absoluteStrokeWidth
    />
  );

  const icon =
    Platform.OS === 'web' ? (
      lucideIcon
    ) : (
      <SymbolView
        name={{
          ios: isMap ? 'list.bullet' : 'map.fill',
          android: isMap ? 'list' : 'map',
          web: isMap ? 'list' : 'map',
        }}
        size={ICON}
        scale="medium"
        weight="semibold"
        tintColor={iconColor}
        resizeMode="scaleAspectFit"
        fallback={lucideIcon}
      />
    );

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { bottom: bottomOffset }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Cambiar a ${label}`}
        onPress={handlePress}
        onPressIn={() => {
          if (!reduce) scale.value = withTiming(0.92, { duration: 90 });
        }}
        onPressOut={() => {
          if (!reduce) scale.value = withTiming(1, { duration: 120 });
        }}>
        <Animated.View
          className="flex-row items-center justify-center gap-2 rounded-full bg-primary shadow-button"
          style={[styles.fab, pressStyle]}>
          {icon}
          <Text className="font-bold text-primary-foreground">{label}</Text>
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
