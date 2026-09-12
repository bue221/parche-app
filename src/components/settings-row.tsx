import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { PressScale } from '@/components/motion';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

export function SettingsRow({
  label,
  detail,
  onPress,
  trailing,
}: {
  label: string;
  detail?: string;
  onPress?: () => void;
  trailing?: ReactNode;
}) {
  const theme = useTheme();
  const body = (
    <View className="min-h-11 flex-row items-center justify-between gap-ds-12 border-b border-border py-ds-16">
      <View className="min-w-0 flex-1 gap-ds-4">
        <Text>{label}</Text>
        {detail ? (
          <Text variant="muted" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      {trailing ?? (onPress ? <ChevronRight size={18} color={theme.textMuted} /> : null)}
    </View>
  );

  if (!onPress) return body;
  return <PressScale onPress={onPress}>{body}</PressScale>;
}
