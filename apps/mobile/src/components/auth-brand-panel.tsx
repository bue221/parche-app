import { View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export function AuthBrandPanel({
  title,
  lead,
  compact = false,
  dense = false,
  className,
}: {
  title: string;
  lead: string;
  compact?: boolean;
  dense?: boolean;
  className?: string;
}) {
  const tight = compact || dense;
  return (
    <View
      className={cn(
        'w-full flex-col justify-center gap-ds-16 bg-pitch-black',
        tight ? 'px-ds-24 py-ds-32' : 'px-ds-40 py-ds-48',
        className
      )}>
      <BrandMark size={compact ? 40 : dense ? 48 : 56} onDark />
      <Text
        className="font-foggy uppercase leading-none text-paper-white"
        style={{ fontSize: tight ? 40 : 64, lineHeight: tight ? 38 : 60 }}>
        {title}
      </Text>
      <Text variant="lead" className="max-w-sm text-paper-white/80">
        {lead}
      </Text>
    </View>
  );
}
