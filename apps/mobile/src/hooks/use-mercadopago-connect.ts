import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { toast } from '@/data/toast-store';
import { openMercadoPagoSignup, startMercadoPagoConnect } from '@/lib/mercadopago-checkout';

export function useMercadoPagoConnect(onConnected?: () => void) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function refreshStatus() {
    await queryClient.invalidateQueries({ queryKey: ['mercadopago'] });
  }

  async function connect() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await startMercadoPagoConnect();
      await refreshStatus();
      if (result === 'connected') {
        toast('Mercado Pago conectado', 'success');
        onConnected?.();
        return result;
      }
      if (result === 'denied') {
        toast('No se autorizó Mercado Pago');
      }
      return result;
    } catch (err) {
      toast(userMessage(err));
      return 'error' as const;
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (busy) return;
    setBusy(true);
    try {
      await api.payments.disconnect();
      await refreshStatus();
      toast('Cuenta desconectada');
    } catch (err) {
      toast(userMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function signup() {
    void openMercadoPagoSignup();
  }

  return { busy, connect, disconnect, signup };
}
