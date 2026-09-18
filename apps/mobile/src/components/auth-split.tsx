import type { ReactNode } from 'react';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/brand-mark';
import { Screen } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

function dismissAuth() {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/');
}

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
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Screen
      scroll={!split}
      width="full"
      padded={false}
      flush={split}
      center={!web || compact}
      headTitle={title}
      headDescription={lead}>
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              hitSlop={8}
              onPress={dismissAuth}
              style={{ marginTop: compact ? Math.max(0, insets.top - 16) : 0 }}
              className="mb-ds-8 size-11 items-center justify-center self-start rounded-full border border-border active:opacity-70">
              <X size={20} color={theme.text} strokeWidth={2} />
            </Pressable>
            {children}
          </View>
        </View>
      </View>
    </Screen>
  );
}
