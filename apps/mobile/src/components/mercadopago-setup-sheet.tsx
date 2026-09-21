import { useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { MercadoPagoConnectCard } from '@/components/mercadopago-connect';
import { Skeleton } from '@/components/feedback';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { useMercadoPagoConnect } from '@/hooks/use-mercadopago-connect';

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
  const status = useQuery({
    queryKey: ['mercadopago'],
    queryFn: () => api.payments.status(),
    enabled: visible,
  });
  const { busy, connect, signup } = useMercadoPagoConnect(() => {
    onConnected?.();
    if (!inline) {
      onClose();
    }
  });

  const card = status.data ? (
    <MercadoPagoConnectCard
      connected={status.data.connected}
      oauthEnabled={status.data.oauthEnabled}
      oauthNeeds={status.data.oauthNeeds}
      mpUserId={status.data.mpUserId}
      busy={busy}
      compact
      onConnect={() => void connect()}
      onSignup={signup}
      extra={
        inline ? null : (
          <Button
            variant="outline"
            disabled={busy}
            onPress={() => {
              onClose();
              router.push('/parche/cobros' as Href);
            }}>
            <Text>Ver cobros</Text>
          </Button>
        )
      }
    />
  ) : (
    <Skeleton className="h-40 w-full" />
  );

  if (inline) {
    if (!visible) return null;
    return <View className="mt-ds-16">{card}</View>;
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Cuenta de cobro">
      <View className="gap-ds-8 pb-ds-8">{card}</View>
    </BottomSheet>
  );
}
