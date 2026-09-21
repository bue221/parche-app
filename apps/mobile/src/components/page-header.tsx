import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export function PageHeader({
  eyebrow,
  mark,
  title,
  lead,
  actions,
  headerAction,
  className,
}: {
  eyebrow?: string;
  mark?: ReactNode;
  title: string;
  lead?: string;
  actions?: ReactNode;
  headerAction?: ReactNode;
  className?: string;
}) {
  return (
    <View className={cn('gap-ds-8', className)}>
      {eyebrow ? (
        <Text variant="caption" className="uppercase text-muted-foreground">
          {eyebrow}
        </Text>
      ) : null}
      <View className="flex-row items-center gap-ds-12">
        <View className="min-w-0 flex-row items-center gap-ds-12">
          {mark}
          <Text variant="heading" className="shrink">
            {title}
          </Text>
        </View>
        {headerAction}
      </View>
      {lead ? <Text variant="muted">{lead}</Text> : null}
      {actions ? <View className="flex-row flex-wrap gap-ds-8">{actions}</View> : null}
    </View>
  );
}
