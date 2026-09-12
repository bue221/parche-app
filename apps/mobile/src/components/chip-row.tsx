import type { ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Tag } from '@/components/ui/tag';

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
      {children}
    </ScrollView>
  );
}

export function Chip({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Tag inverted={selected} tone={selected ? 'ink' : 'muted'}>
        {label}
      </Tag>
    </Pressable>
  );
}

export function ChipWrap({ children }: { children: ReactNode }) {
  return <View className="flex-row flex-wrap gap-ds-8">{children}</View>;
}
