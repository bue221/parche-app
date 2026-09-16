import { useEffect, useState } from 'react';
import { View } from 'react-native';
import QRCode from 'qrcode';
import { SvgXml } from 'react-native-svg';

import { Text } from '@/components/ui/text';

export function TicketQr({ token, revealed, size = 220 }: { token: string; revealed: boolean; size?: number }) {
  const [xml, setXml] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!revealed || !token) {
      setXml(null);
      setFailed(false);
      return;
    }
    let cancelled = false;
    setFailed(false);
    void QRCode.toString(token, {
      type: 'svg',
      margin: 2,
      width: size,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((svg) => {
        if (!cancelled) setXml(svg);
      })
      .catch(() => {
        if (!cancelled) {
          setXml(null);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, revealed, size]);

  if (!revealed || !token) {
    return (
      <View className="items-center justify-center bg-muted" style={{ width: size, height: size }}>
        <Text variant="helper">Imprimiendo…</Text>
      </View>
    );
  }
  if (failed) {
    return (
      <View className="items-center justify-center bg-paper-white" style={{ width: size, height: size }}>
        <Text variant="helper">No pudimos dibujar el código</Text>
      </View>
    );
  }
  if (!xml) {
    return (
      <View className="items-center justify-center bg-paper-white" style={{ width: size, height: size }}>
        <Text variant="helper">QR</Text>
      </View>
    );
  }
  return (
    <View accessibilityLabel="Código QR del tiquete" className="bg-paper-white p-ds-8">
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
}
