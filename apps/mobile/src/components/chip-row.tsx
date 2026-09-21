import { type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { PressScale } from '@/components/motion';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

const PITCH_BLACK = '#0B0B12';

export function ChipRow({
  children,
  bleed,
  align = 'center',
}: {
  children: ReactNode;
  bleed?: number;
  align?: 'center' | 'end';
}) {
  const compact = useCompactLayout();
  const edge = bleed ?? (compact ? Spacing.three : 40);

  return (
    <View style={{ marginHorizontal: -edge, flexGrow: 0 }}>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{
          gap: Spacing.two,
          paddingHorizontal: edge,
          alignItems: align === 'end' ? 'flex-end' : 'center',
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
            web: selected ? 'transition-colors duration-150' : 'transition-colors duration-150 hover:border-aurora',
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

/** Desktop Explorar: icon over label, underline when selected. */
export function CategoryChip({
  label,
  selected = false,
  onPress,
  icon: ChipIcon,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon: LucideIcon;
}) {
  const theme = useTheme();
  const color = selected ? theme.text : theme.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      className={cn(
        'w-[5.25rem] shrink-0 items-center gap-ds-8 border-b-2 pb-ds-8',
        selected ? 'border-foreground' : 'border-transparent',
        Platform.select({ web: 'outline-none hover:border-border' })
      )}>
      <ChipIcon size={22} color={color} strokeWidth={selected ? 2.25 : 1.75} />
      <Text
        variant="caption"
        className="font-bold normal-case capitalize tracking-normal"
        style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipWrap({ children }: { children: ReactNode }) {
  return <View className="flex-row flex-wrap gap-ds-8">{children}</View>;
}
