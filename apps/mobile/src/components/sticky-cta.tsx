import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useKeyboardState } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, MaxFormWidth } from '@/constants/theme';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { cn } from '@/lib/utils';

export function StickyCta({
  children,
  className,
  width = 'form',
}: {
  children: ReactNode;
  className?: string;
  width?: 'form' | 'page';
}) {
  const insets = useSafeAreaInsets();
  const compact = useCompactLayout();
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  const maxWidth = width === 'page' ? MaxContentWidth : MaxFormWidth;
  return (
    <View
      className={cn('border-t border-border bg-surface px-ds-16 pt-ds-12', !compact && 'px-ds-40', className)}
      style={{ paddingBottom: keyboardVisible ? 12 : Math.max(insets.bottom, 12) }}>
      <View className="w-full self-center" style={compact ? undefined : { maxWidth }}>
        {children}
      </View>
    </View>
  );
}
