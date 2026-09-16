import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { PressScale } from '@/components/motion';
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
    <PressScale onPress={onPress} className="w-auto" accessibilityRole="button">
      <Tag tone={selected ? 'aurora' : 'muted'}>
        {label}
      </Tag>
    </PressScale>
  );
}

export function ChipWrap({ children }: { children: ReactNode }) {
  return <View className="flex-row flex-wrap gap-ds-8">{children}</View>;
}
