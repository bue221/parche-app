import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, View } from 'react-native';
import type { PropsWithChildren } from 'react';

import { BottomTabInset } from '@/constants/theme';
import { cn } from '@/lib/utils';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  className?: string;
  padded?: boolean;
}>;

export function Screen({ children, scroll = true, className, padded = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top + 16,
    paddingBottom: insets.bottom + BottomTabInset + 24,
    paddingHorizontal: padded ? 16 : 0,
  };

  if (!scroll) {
    return (
      <View className={cn('flex-1 bg-background', className)} style={padding}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      className={cn('flex-1 bg-background', className)}
      contentContainerStyle={padding}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}
