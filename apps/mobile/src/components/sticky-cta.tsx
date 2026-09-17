import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useKeyboardState } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cn } from '@/lib/utils';

export function StickyCta({ children, className }: { children: ReactNode; className?: string }) {
  const insets = useSafeAreaInsets();
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  return (
    <View
      className={cn('border-t border-border bg-surface px-ds-16 pt-ds-12', className)}
      style={{ paddingBottom: keyboardVisible ? 12 : Math.max(insets.bottom, 12) }}>
      {children}
    </View>
  );
}
