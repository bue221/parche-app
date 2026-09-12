import type { PropsWithChildren } from 'react';
import { View, type GestureResponderEvent } from 'react-native';

import { PressScale } from '@/components/motion';
import { cardShadowStyle } from '@/lib/card-shadow';
import { cn } from '@/lib/utils';

export function Surface({
  children,
  className,
  muted = false,
  elevated = false,
  onPress,
}: PropsWithChildren<{
  className?: string;
  muted?: boolean;
  elevated?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
}>) {
  const body = (
    <View
      className={cn(
        'rounded-cards border border-border bg-background p-ds-16',
        muted && 'bg-muted',
        elevated && 'shadow-card',
        className
      )}
      style={elevated ? cardShadowStyle : undefined}>
      {children}
    </View>
  );

  if (!onPress) {
    return body;
  }

  return <PressScale onPress={onPress}>{body}</PressScale>;
}
