import { View } from 'react-native';

import { ProfileMascot } from '@/components/profile-mascot';
import { Text } from '@/components/ui/text';
import type { ProfileKind } from '@/data/types';
import { cn } from '@/lib/utils';

export function BrandMark({
  size = 40,
  onDark = false,
  mascot,
  accessible = true,
}: {
  size?: number;
  onDark?: boolean;
  mascot?: ProfileKind;
  accessible?: boolean;
}) {
  const glyph = onDark ? '#07070c' : '#f5f5f8';
  const knockout = onDark ? '#f5f5f8' : '#0b0b12';

  return (
    <View
      accessible={accessible}
      accessibilityLabel={accessible ? 'Parche' : undefined}
      className={cn('items-center justify-center rounded-images', onDark ? 'bg-paper-white' : 'bg-foreground')}
      style={{ width: size, height: size }}>
      {mascot ? (
        <ProfileMascot profile={mascot} size={size * 0.72} color={glyph} knockout={knockout} />
      ) : (
        <Text
          className={cn('pt-0 font-foggy font-normal', onDark ? 'text-pitch-black' : 'text-paper-white')}
          style={{ fontSize: size * 0.62, lineHeight: size * 0.7 }}>
          P
        </Text>
      )}
    </View>
  );
}
