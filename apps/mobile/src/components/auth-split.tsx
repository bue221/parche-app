import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { BackBar } from '@/components/back-bar';
import { Screen } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { cn } from '@/lib/utils';

export function AuthSplit({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: ReactNode;
}) {
  const web = Platform.OS === 'web';
  const compact = useCompactLayout();
  const split = web && !compact;
  return (
    <Screen scroll={!split} width="full" padded={false} flush={split} center={!web || compact}>
      <View className={split ? 'min-h-[100vh] w-full flex-row' : 'gap-ds-24'}>
        <View
          className={cn(
            'justify-center gap-ds-16 bg-pitch-black',
            compact ? 'px-ds-16 py-ds-32' : 'px-ds-40 py-ds-48',
            split && 'min-h-[100vh] w-[46%]'
          )}>
          <BrandMark size={compact ? 40 : 56} onDark />
          <Text variant={compact ? 'heading' : 'display'} className="uppercase text-paper-white">
            {title}
          </Text>
          <Text variant="muted" className="max-w-md text-paper-white/80">
            {lead}
          </Text>
        </View>
        <View className={cn('flex-1 justify-center', compact ? 'px-ds-16 py-ds-32' : 'px-ds-40 py-ds-48', split && 'min-h-[100vh]')}>
          <View className="w-full max-w-lg gap-ds-16 self-center">
            <BackBar />
            {children}
          </View>
        </View>
      </View>
    </Screen>
  );
}
