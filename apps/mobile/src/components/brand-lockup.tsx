import { View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { Text } from '@/components/ui/text';
import type { ProfileKind } from '@/data/types';
import { profileMascot, profileLabel } from '@/lib/profiles';
import { cn } from '@/lib/utils';

export function BrandLockup({
  size = 32,
  profile,
  showMascotName = false,
  onDark = false,
}: {
  size?: number;
  profile?: ProfileKind;
  showMascotName?: boolean;
  onDark?: boolean;
}) {
  const mascot = profile ? profileMascot(profile) : null;
  const label = profile && mascot ? `Parche ${mascot.name}, ${profileLabel(profile)}` : 'Parche';

  return (
    <View accessible accessibilityLabel={label} className="flex-row items-center gap-ds-8">
      <BrandMark size={size} onDark={onDark} mascot={profile} accessible={false} />
      <View className={cn(showMascotName && 'gap-ds-2')}>
        <Text variant="caption" className={cn('font-bold uppercase', onDark && 'text-paper-white')}>
          Parche
        </Text>
        {showMascotName && mascot ? (
          <Text variant="helper" className={onDark ? 'text-paper-white/70' : undefined}>
            {mascot.name}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
