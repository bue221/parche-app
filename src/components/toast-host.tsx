import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { useToastStore } from '@/data/toast-store';
import { cn } from '@/lib/utils';

export function ToastHost() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);
  const insets = useSafeAreaInsets();

  if (items.length === 0) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 z-[2000] items-center px-ds-16"
      style={{ top: insets.top + 8 }}>
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => dismiss(item.id)}
          className={cn(
            'mb-ds-8 w-full max-w-md rounded-cards border px-ds-16 py-ds-12',
            item.tone === 'success' ? 'border-foreground bg-confirm' : 'border-foreground bg-background'
          )}>
          <Text className={item.tone === 'success' ? 'text-pitch-black' : undefined}>{item.message}</Text>
        </Pressable>
      ))}
    </View>
  );
}
