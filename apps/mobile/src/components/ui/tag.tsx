import type { PropsWithChildren, ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export type TagTone =
  | 'ink'
  | 'muted'
  | 'glass'
  | 'neon'
  | 'aurora'
  | 'heat'
  | 'confirm'
  | 'amber'
  | 'danger';

const TONE: Record<TagTone, string> = {
  ink: 'border-border bg-transparent',
  muted: 'border-border bg-muted',
  glass: 'border-border bg-pitch-black/55',
  neon: 'border-neon bg-neon',
  aurora: 'border-aurora bg-aurora',
  heat: 'border-aurora bg-aurora',
  confirm: 'border-confirm bg-confirm',
  amber: 'border-amber bg-amber',
  danger: 'border-danger bg-danger',
};

const LABEL: Record<TagTone, string> = {
  ink: 'text-muted-foreground',
  muted: 'text-muted-foreground',
  glass: 'text-paper-white',
  neon: 'text-pitch-black',
  aurora: 'text-pitch-black',
  heat: 'text-pitch-black',
  confirm: 'text-pitch-black',
  amber: 'text-pitch-black',
  danger: 'text-pitch-black',
};

const FILLED: ReadonlySet<TagTone> = new Set([
  'glass',
  'neon',
  'aurora',
  'heat',
  'confirm',
  'amber',
  'danger',
]);

export function Tag({
  children,
  icon,
  inverted = false,
  tone = 'ink',
  className,
}: PropsWithChildren<{
  icon?: ReactNode;
  inverted?: boolean;
  tone?: TagTone;
  className?: string;
}>) {
  const filled = FILLED.has(tone);
  return (
    <View
      className={cn(
        'self-start flex-row items-center gap-ds-4 rounded-tags border px-ds-12 py-ds-4',
        filled
          ? TONE[tone]
          : inverted
            ? 'border-foreground bg-foreground'
            : TONE[tone],
        className
      )}>
      {icon}
      <Text
        variant="caption"
        className={cn(
          'font-bold uppercase',
          filled ? LABEL[tone] : inverted ? 'text-background' : LABEL[tone]
        )}>
        {children}
      </Text>
    </View>
  );
}
