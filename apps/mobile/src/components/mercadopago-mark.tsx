import { Handshake } from 'lucide-react-native';
import { View } from 'react-native';

/** Official Mercado Pago cyan. Partner pigment, not a Parche canvas token. */
export const MERCADO_PAGO_BLUE = '#009EE3';

export function MercadoPagoMark({
  size = 40,
  accessible = false,
}: {
  size?: number;
  accessible?: boolean;
}) {
  const glyph = Math.max(12, Math.round(size * 0.54));
  return (
    <View
      accessible={accessible}
      accessibilityLabel={accessible ? 'Mercado Pago' : undefined}
      accessibilityRole={accessible ? 'image' : undefined}
      className="items-center justify-center"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        backgroundColor: MERCADO_PAGO_BLUE,
      }}>
      <Handshake color="#FFFFFF" size={glyph} strokeWidth={2.25} />
    </View>
  );
}
