import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export function BrandMark({ size = 40, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <View
      accessibilityLabel="Parche"
      className={cn('items-center justify-center rounded-images', onDark ? 'bg-paper-white' : 'bg-foreground')}
      style={{ width: size, height: size }}>
      <Text
        className={cn('pt-0 font-foggy font-normal', onDark ? 'text-pitch-black' : 'text-background')}
        style={{ fontSize: size * 0.62, lineHeight: size * 0.7 }}>
        P
      </Text>
    </View>
  );
}
