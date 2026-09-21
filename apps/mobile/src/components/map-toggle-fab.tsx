import { List, Map as MapIcon, MapPinned } from 'lucide-react-native';
import { SymbolView } from 'expo-symbols';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { WebCompactBottom } from '@/constants/theme';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useResolvedColorScheme } from '@/hooks/use-theme';

const SIZE = 56;
const ICON = 24;
const STROKE = 2.15;
const TAB_BAR_HEIGHT = 80;
const INK = '#0B0B12';
const PAPER = '#F5F5F8';

export type ViewMode = 'list' | 'map';

interface MapToggleFABProps {
  mode: ViewMode;
  onToggle: () => void;
}

export function MapToggleFAB({ mode, onToggle }: MapToggleFABProps) {
  if (Platform.OS === 'web') {
    return <WebMapToggle mode={mode} onToggle={onToggle} />;
  }
  return <NativeMapToggle mode={mode} onToggle={onToggle} />;
}

/** Catalog control from the marketing explorar: sentence-case pill, not the 56px app FAB. */
function WebMapToggle({ mode, onToggle }: MapToggleFABProps) {
  const compact = useCompactLayout();
  const colorScheme = useResolvedColorScheme();
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);
  const isMap = mode === 'map';
  const label = isMap ? 'Mostrar lista' : 'Mostrar mapa';
  const Icon = isMap ? List : MapIcon;
  const fill = colorScheme === 'light' ? INK : PAPER;
  const onFill = colorScheme === 'light' ? PAPER : INK;
  const bottom = compact ? WebCompactBottom + 16 : 24;
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View pointerEvents="box-none" style={[styles.webHost, { bottom }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onToggle}
        onPressIn={() => {
          if (!reduce) scale.value = withTiming(1.02, { duration: 90 });
        }}
        onPressOut={() => {
          if (!reduce) scale.value = withTiming(1, { duration: 120 });
        }}
        style={[styles.webPill, { backgroundColor: fill }]}>
        <Animated.View style={[styles.webInner, pressStyle]}>
          <Icon size={16} color={onFill} strokeWidth={2} />
          <Text variant="bodySm" style={[styles.webLabel, { color: onFill }]}>
            {label}
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

function NativeMapToggle({ mode, onToggle }: MapToggleFABProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useResolvedColorScheme();
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const isMap = mode === 'map';
  const label = isMap ? 'Lista' : 'Mapa';
  const Fallback = isMap ? List : MapPinned;
  const fill = colorScheme === 'light' ? INK : PAPER;
  const onFill = colorScheme === 'light' ? PAPER : INK;
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  function handlePress() {
    if (!reduce) {
      rotation.value = withSpring(rotation.value + 180, { damping: 15, stiffness: 150 });
    }
    onToggle();
  }

  const lucideIcon = (
    <Fallback size={ICON} color={onFill} strokeWidth={STROKE} absoluteStrokeWidth />
  );

  return (
    <View
      pointerEvents="box-none"
      style={[styles.nativeHost, { bottom: TAB_BAR_HEIGHT + Math.max(insets.bottom, 10) + 16 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Cambiar a ${label}`}
        onPress={handlePress}
        onPressIn={() => {
          if (!reduce) scale.value = withTiming(0.92, { duration: 90 });
        }}
        onPressOut={() => {
          if (!reduce) scale.value = withTiming(1, { duration: 120 });
        }}
        style={[styles.nativePill, { backgroundColor: fill }]}>
        <Animated.View style={[styles.nativeInner, pressStyle]}>
          <SymbolView
            name={{
              ios: isMap ? 'list.bullet' : 'map.fill',
              android: isMap ? 'list' : 'map',
              web: isMap ? 'list' : 'map',
            }}
            size={ICON}
            scale="medium"
            weight="semibold"
            tintColor={onFill}
            resizeMode="scaleAspectFit"
            fallback={lucideIcon}
          />
          <Text style={[styles.nativeLabel, { color: onFill }]}>{label}</Text>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  webHost: {
    position: 'fixed',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 300,
  },
  webPill: {
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 48,
    boxShadow: '0 8px 28px rgb(0 0 0 / 0.28)',
  },
  webInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  webLabel: {
    fontWeight: '700',
  },
  nativeHost: {
    position: 'absolute',
    right: 16,
    zIndex: 100,
  },
  nativePill: {
    height: SIZE,
    minWidth: SIZE,
    paddingHorizontal: 20,
    borderRadius: 999,
    shadowColor: '#0b0b12',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  nativeInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nativeLabel: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 16,
  },
});
