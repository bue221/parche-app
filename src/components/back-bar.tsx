import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export function BackBar({ label = 'Volver', className }: { label?: string; className?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      className={cn(
        'mb-ds-16 min-h-11 min-w-11 self-start items-start justify-center rounded-buttons px-ds-4 py-ds-8 active:opacity-70',
        className
      )}>
      <Text variant="caption" className="font-bold uppercase">
        ← {label}
      </Text>
    </Pressable>
  );
}
