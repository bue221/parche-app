import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  inline = false,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Keep the sheet in the screen tree so it cannot cover a pushed stack route. */
  inline?: boolean;
}) {
  const insets = useSafeAreaInsets();

  const body = (
    <View className={inline ? 'absolute inset-0 z-50 justify-end' : 'flex-1 justify-end'}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
        className="absolute inset-0 bg-pitch-black/40"
        onPress={onClose}
      />
      <View
        className="max-h-[72%] rounded-t-[24px] border-t border-border bg-background px-ds-16 pt-ds-12"
        style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
        <View className="mb-ds-12 h-1 w-12 self-center rounded-full bg-muted" />
        {title ? (
          <Text variant="headingSm" className="mb-ds-12">
            {title}
          </Text>
        ) : null}
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </View>
  );

  if (inline) {
    if (!visible) return null;
    return body;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {body}
    </Modal>
  );
}
