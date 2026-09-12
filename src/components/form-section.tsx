import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export function FormSection({
  title,
  lead,
  children,
  className,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <View className={cn('gap-ds-16', className)}>
      <View className="gap-ds-8">
        <Text variant="headingSm">{title}</Text>
        {lead ? <Text variant="muted">{lead}</Text> : null}
      </View>
      {children}
    </View>
  );
}
