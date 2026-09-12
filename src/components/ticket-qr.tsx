import { useEffect, useState } from 'react';
import { View } from 'react-native';
import QRCode from 'qrcode';
import { SvgXml } from 'react-native-svg';

import { Text } from '@/components/ui/text';

export function TicketQr({ token, revealed, size = 168 }: { token: string; revealed: boolean; size?: number }) {
  const [xml, setXml] = useState<string | null>(null);

  useEffect(() => {
    if (!revealed || !token) {
      setXml(null);
      return;
    }
    let cancelled = false;
    void QRCode.toString(token, {
      type: 'svg',
      margin: 1,
      width: size,
      color: { dark: '#000000', light: '#ffffff' },
    }).then((svg) => {
      if (!cancelled) setXml(svg);
    });
    return () => {
      cancelled = true;
    };
  }, [token, revealed, size]);

  if (!revealed || !token) {
    return (
      <View className="size-40 items-center justify-center bg-muted">
        <Text variant="helper">Imprimiendo…</Text>
      </View>
    );
  }
  if (!xml) {
    return (
      <View className="size-40 items-center justify-center bg-paper-white">
        <Text variant="helper">QR</Text>
      </View>
    );
  }
  return (
    <View className="bg-paper-white p-ds-8">
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
}
