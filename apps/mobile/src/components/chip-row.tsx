import { type ReactNode } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { PressScale } from '@/components/motion';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

const PITCH_BLACK = '#0B0B12';

export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <View style={{ marginHorizontal: -Spacing.three, flexGrow: 0 }}>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{
          gap: Spacing.two,
          paddingHorizontal: Spacing.three,
          alignItems: 'center',
          flexGrow: 0,
        }}>
        {children}
      </ScrollView>
    </View>
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
    <PressScale fit onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <View
        className={cn(
          'flex-row items-center gap-ds-8 rounded-tags border px-ds-12 py-ds-8',
          selected ? 'border-aurora bg-aurora' : 'border-border bg-muted',
          Platform.select({
            web: 'transition-colors duration-150',
          })
        )}>
        {icon ? (
          <Icon as={icon} size={14} color={selected ? PITCH_BLACK : theme.textSecondary} strokeWidth={2.25} />
        ) : null}
        <Text
          variant="caption"
          className="font-bold uppercase"
          style={{ color: selected ? PITCH_BLACK : theme.text }}>
          {label}
        </Text>
      </View>
    </PressScale>
  );
}

export function ChipWrap({ children }: { children: ReactNode }) {
  return <View className="flex-row flex-wrap gap-ds-8">{children}</View>;
}
