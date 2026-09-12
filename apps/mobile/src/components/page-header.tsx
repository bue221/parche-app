import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export function PageHeader({
  eyebrow,
  title,
  lead,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <View className={cn('gap-ds-8', className)}>
      {eyebrow ? (
        <Text variant="caption" className="uppercase text-muted-foreground">
          {eyebrow}
        </Text>
      ) : null}
      <Text variant="heading">{title}</Text>
      {lead ? <Text variant="muted">{lead}</Text> : null}
      {actions ? <View className="flex-row flex-wrap gap-ds-8">{actions}</View> : null}
    </View>
  );
}
