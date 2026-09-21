import { BlurView } from 'expo-blur';
import { View } from 'react-native';

const FADE = 64;

/**
 * Cinematic top frost on a flush flyer. Soft dark blur over the notch,
 * then a pitch-black scrim that dissolves into the photo — not a chrome slab.
 */
export function SafeBlurBand({ height }: { height: number }) {
  const top = Math.max(height, 0);
  const total = top + FADE;
  return (
    <View pointerEvents="none" className="absolute inset-x-0 top-0 z-[5]" style={{ height: total }}>
      <BlurView
        tint="dark"
        intensity={28}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: top + 24, overflow: 'hidden' }}
      />
      <View className="absolute inset-0 bg-gradient-to-b from-pitch-black/70 to-transparent" />
    </View>
  );
}
