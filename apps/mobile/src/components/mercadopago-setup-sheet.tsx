import { useState } from 'react';
import { View } from 'react-native';
import { router, type Href } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

import { BottomSheet } from '@/components/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { toast } from '@/data/toast-store';
import { openMercadoPagoSignup, startMercadoPagoConnect } from '@/lib/mercadopago-checkout';

export function MercadoPagoSetupSheet({
  visible,
  onClose,
  onConnected,
  inline = false,
}: {
  visible: boolean;
  onClose: () => void;
  onConnected?: () => void;
  inline?: boolean;
}) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function connect() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await startMercadoPagoConnect();
      await queryClient.invalidateQueries({ queryKey: ['mercadopago'] });
      if (result === 'connected') {
        onConnected?.();
        onClose();
        return;
      }
      if (result === 'denied') {
        toast('No se autorizó Mercado Pago');
        return;
      }
      const status = await api.payments.status();
      if (status.connected) {
        onConnected?.();
        onClose();
      }
    } catch (err) {
      toast(userMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Cuenta de cobro" inline={inline}>
      <View className="gap-ds-16 pb-ds-8">
        <Text variant="muted">
          Antes de crear un evento conecta Mercado Pago (OAuth de Mercado Pago, no Auth0). El dinero de las boletas llega
          a tu cuenta; Parche se queda el 10% más IVA sobre esa comisión.
        </Text>
        <Button variant="outline" disabled={busy} onPress={() => void openMercadoPagoSignup()}>
          <Text>Crear cuenta en Mercado Pago</Text>
        </Button>
        <Button disabled={busy} onPress={() => void connect()}>
          <Text>{busy ? 'Abriendo…' : 'Conectar Mercado Pago'}</Text>
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onPress={() => {
            onClose();
            router.push('/parche/cobros' as Href);
          }}>
          <Text>Ver cobros</Text>
        </Button>
      </View>
    </BottomSheet>
  );
}
