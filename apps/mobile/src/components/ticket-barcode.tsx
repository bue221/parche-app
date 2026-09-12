import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { code128Modules } from '@/lib/code128';

export function TicketBarcode({
  value,
  revealed,
  label,
}: {
  value: string;
  revealed: boolean;
  label?: string;
}) {
  const modules = revealed && value ? code128Modules(value) : [];

  if (!revealed) {
    return (
      <View className="h-12 w-full items-center justify-center bg-muted">
        <Text variant="helper">Imprimiendo…</Text>
      </View>
    );
  }

  return (
    <View className="w-full gap-ds-8 bg-paper-white px-ds-4 py-ds-8">
      <View className="h-12 flex-row items-stretch">
        {modules.map((weight, index) => (
          <View
            key={`${index}-${weight}`}
            className={index % 2 === 0 ? 'bg-pitch-black' : 'bg-paper-white'}
            style={{ flex: weight }}
          />
        ))}
      </View>
      <Text className="text-center font-favorit text-caption font-bold uppercase tracking-favorit text-pitch-black">
        {label ?? value.slice(-8)}
      </Text>
    </View>
  );
}
