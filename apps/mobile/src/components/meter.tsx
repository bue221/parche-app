import { View } from 'react-native';

import { cn } from '@/lib/utils';

export function Meter({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ now: Math.round(pct), min: 0, max: 100 }}
      className={cn('h-2 overflow-hidden rounded-full bg-muted', className)}>
      <View className="h-full rounded-full bg-foreground" style={{ width: `${pct}%` }} />
    </View>
  );
}
