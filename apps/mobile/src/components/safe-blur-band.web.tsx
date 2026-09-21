import { View } from 'react-native';

const FADE = 64;

/**
 * CSS frost that dissolves into the flyer. Native uses expo-blur (`safe-blur-band.tsx`).
 */
export function SafeBlurBand({ height }: { height: number }) {
  const top = Math.max(height, 0);
  const total = top + FADE;
  return (
    <View pointerEvents="none" className="absolute inset-x-0 top-0 z-[5]" style={{ height: total }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: total,
          backgroundColor: 'rgba(7, 7, 12, 0.42)',
          backdropFilter: 'saturate(140%) blur(16px)',
          WebkitBackdropFilter: 'saturate(140%) blur(16px)',
          maskImage: 'linear-gradient(to bottom, #000 0%, #000 35%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 35%, transparent 100%)',
        }}
      />
      <View className="absolute inset-0 bg-gradient-to-b from-pitch-black/70 to-transparent" />
    </View>
  );
}
