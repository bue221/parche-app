import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { PressScale } from '@/components/motion';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

export function SettingsRow({
  label,
  detail,
  onPress,
  trailing,
  icon,
  tone = 'default',
  divided = true,
}: {
  label: string;
  detail?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  icon?: ReactNode;
  tone?: 'default' | 'danger';
  divided?: boolean;
}) {
  const theme = useTheme();
  const danger = tone === 'danger';
  const body = (
    <View
      className={cn(
        'min-h-11 flex-row items-center justify-between gap-ds-12 py-ds-16',
        divided && 'border-b border-border'
      )}>
      <View className="min-w-0 flex-1 flex-row items-center gap-ds-16">
        {icon}
        <View className="min-w-0 flex-1 gap-ds-4">
          <Text className={danger ? 'text-danger' : undefined}>{label}</Text>
          {detail ? (
            <Text variant="muted" numberOfLines={1}>
              {detail}
            </Text>
          ) : null}
        </View>
      </View>
      {trailing ?? (onPress ? <ChevronRight size={18} color={danger ? theme.danger : theme.textMuted} /> : null)}
    </View>
  );

  if (!onPress) return body;
  return <PressScale onPress={onPress}>{body}</PressScale>;
}
