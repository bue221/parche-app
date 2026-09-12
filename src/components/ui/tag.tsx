import type { PropsWithChildren } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export function Tag({
  children,
  inverted = false,
  tone = 'ink',
  className,
}: PropsWithChildren<{ inverted?: boolean; tone?: 'ink' | 'muted' | 'confirm'; className?: string }>) {
  const confirm = tone === 'confirm';
  const muted = tone === 'muted';
  return (
    <View
      className={cn(
        'self-start rounded-tags border px-ds-12 py-ds-4',
        confirm
          ? 'border-confirm bg-confirm'
          : muted
            ? 'border-border bg-muted'
            : inverted
              ? 'border-foreground bg-foreground'
              : 'border-border bg-transparent',
        className
      )}>
      <Text
        variant="caption"
        className={cn(
          'font-bold uppercase',
          confirm ? 'text-pitch-black' : inverted ? 'text-background' : 'text-muted-foreground'
        )}>
        {children}
      </Text>
    </View>
  );
}
