import { View } from 'react-native';

import { ProfileMascot } from '@/components/profile-mascot';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { cardShadowStyle } from '@/lib/card-shadow';
import type { ProfileKind } from '@/data/types';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { cn } from '@/lib/utils';

export function GuestPanel({
  title,
  lead,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  points,
  mascot,
}: {
  title: string;
  lead: string;
  actionLabel: string;
  onAction: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  points?: string[];
  mascot?: ProfileKind;
}) {
  const compact = useCompactLayout();
  const showPoints = Boolean(points?.length) && !compact;

  return (
    <View
      className={cn(
        'w-full overflow-hidden rounded-cards border border-border bg-surface',
        compact ? 'gap-ds-16 p-ds-24' : 'min-h-[280px] flex-row items-center gap-ds-40 p-ds-40'
      )}
      style={cardShadowStyle}>
      <View className="min-w-0 flex-1 gap-ds-16">
        {mascot ? (
          <View className="size-16 items-center justify-center rounded-full bg-muted">
            <ProfileMascot profile={mascot} size={36} />
          </View>
        ) : null}
        <View className="gap-ds-8">
          <Text variant={compact ? 'headingSm' : 'heading'}>{title}</Text>
          <Text variant="muted">{lead}</Text>
        </View>
        <View className="flex-row flex-wrap items-center gap-ds-8">
          <Button onPress={onAction} className="self-start">
            <Text>{actionLabel}</Text>
          </Button>
          {secondaryLabel && onSecondary ? (
            <Button variant="outline" onPress={onSecondary} className="self-start">
              <Text>{secondaryLabel}</Text>
            </Button>
          ) : null}
        </View>
      </View>
      {showPoints ? (
        <View className="w-[280px] shrink-0 gap-ds-16 rounded-cards bg-muted px-ds-24 py-ds-24">
          {points!.map((point) => (
            <View key={point} className="flex-row items-start gap-ds-12">
              <View className="mt-1.5 size-2 rounded-full bg-aurora" />
              <Text className="min-w-0 flex-1">{point}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
