import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { PressScale } from '@/components/motion';
import { Icon } from '@/components/ui/icon';
import { Tag } from '@/components/ui/tag';
import { useTheme } from '@/hooks/use-theme';

const PITCH_BLACK = '#0B0B12';

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
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: LucideIcon;
}) {
  const theme = useTheme();
  return (
    <PressScale onPress={onPress} className="w-auto" accessibilityRole="button" accessibilityLabel={label}>
      <Tag
        tone={selected ? 'aurora' : 'muted'}
        icon={
          icon ? (
            <Icon as={icon} size={14} color={selected ? PITCH_BLACK : theme.textMuted} />
          ) : undefined
        }>
        {label}
      </Tag>
    </PressScale>
  );
}

export function ChipWrap({ children }: { children: ReactNode }) {
  return <View className="flex-row flex-wrap gap-ds-8">{children}</View>;
}
