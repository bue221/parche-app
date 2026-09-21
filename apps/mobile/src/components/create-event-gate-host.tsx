import { router, type Href } from 'expo-router';

import { MercadoPagoSetupSheet } from '@/components/mercadopago-setup-sheet';
import { useCreateEventGate } from '@/data/create-event-gate';

export function CreateEventGateHost() {
  const visible = useCreateEventGate((s) => s.visible);
  const close = useCreateEventGate((s) => s.close);

  return (
    <MercadoPagoSetupSheet
      visible={visible}
      onClose={close}
      onConnected={() => {
        close();
        router.push('/event/create' as Href);
      }}
    />
  );
}
