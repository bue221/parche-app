import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { code128Svg } from '@/lib/code128';

export function TicketBarcode({
  value,
  revealed,
  label,
  height = 88,
}: {
  value: string;
  revealed: boolean;
  label?: string;
  height?: number;
}) {
  if (!revealed || !value) {
    return <View className="w-full bg-ash-gray" style={{ height }} />;
  }

  return (
    <View
      accessibilityLabel={label ? `Código ${label}` : 'Código de barras'}
      className="w-full gap-ds-12 bg-paper-white pt-ds-4">
      <View className="w-full overflow-hidden bg-paper-white" style={{ height }}>
        <SvgXml xml={code128Svg(value, height)} width="100%" height={height} />
      </View>
      <Text className="text-center font-favorit text-caption font-bold uppercase tracking-favorit text-pitch-black">
        {label ?? value.slice(-8)}
      </Text>
    </View>
  );
}
