import { View } from 'react-native';

import { ProfileMascot } from '@/components/profile-mascot';
import { Text } from '@/components/ui/text';
import type { ProfileKind } from '@/data/types';
import { useTheme } from '@/hooks/use-theme';
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
  const theme = useTheme();
  const glyph = onDark ? '#000000' : theme.background;
  const knockout = onDark ? '#ffffff' : theme.text;

  return (
    <View
      accessible={accessible}
      accessibilityLabel={accessible ? 'Parche' : undefined}
      className={cn('items-center justify-center rounded-images', onDark ? 'bg-paper-white' : 'bg-foreground')}
      style={{ width: size, height: size }}>
      {mascot ? (
        <ProfileMascot decorative profile={mascot} size={size * 0.72} color={glyph} knockout={knockout} />
      ) : (
        <Text
          className={cn('pt-0 font-foggy font-normal', onDark ? 'text-pitch-black' : 'text-background')}
          style={{ fontSize: size * 0.62, lineHeight: size * 0.7 }}>
          P
        </Text>
      )}
    </View>
  );
}
