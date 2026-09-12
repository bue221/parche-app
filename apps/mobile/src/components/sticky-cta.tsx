import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@/lib/utils';

export function StickyCta({ children, className }: { children: ReactNode; className?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={cn('border-t border-border bg-background px-ds-16 pt-ds-12', className)}
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
      {children}
    </View>
  );
}
