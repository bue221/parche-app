import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';

import { FeeBreakdown } from '@/components/fee-breakdown';
import { PendingAuth, Skeleton } from '@/components/feedback';
import { Screen } from '@/components/screen';
import { Surface } from '@/components/surface';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Colors } from '@/constants/theme';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { formatMoney } from '@/lib/format';
import { hostedCheckout, isFakeCheckout } from '@/lib/hosted-checkout';
import { dismissMercadoPagoCheckout, openMercadoPagoCheckout } from '@/lib/mercadopago-checkout';
import { splitParcheFee } from '@/lib/parche-fee';
import { claimCheckoutAutoOpen, peekCheckout, rememberCheckout } from '@/lib/pending-checkout';
import type { Order } from '@/data/types';

export default function PayScreen() {
  const rawId = useLocalSearchParams<{ id: string }>().id;
  const id = (Array.isArray(rawId) ? rawId[0] : rawId) ?? '';
  const ok = useRequireAuth(`/orders/${id}/pay`);
  const scheme = useColorScheme();
  const palette = Colors[scheme];
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const next = await api.tickets.getOrder(id);
    setOrder(next);
    setLoaded(true);
    if (next.checkoutUrl) {
      rememberCheckout(next.id, next.checkoutUrl);
    }
    if (next.status !== 'pending') {
      router.replace(`/orders/${id}` as Href);
    }
    return next;
  }, [id]);

  useEffect(() => {
    void load().catch((err) => {
      setError(userMessage(err));
      setLoaded(true);
    });
  }, [load]);

  useEffect(() => {
    const sub = Linking.addEventListener('url', (event) => {
      if (event.url.includes('parche://') && Platform.OS === 'ios') {
        dismissMercadoPagoCheckout();
      }
    });
    return () => sub.remove();
  }, []);

  const split = useMemo(() => {
    const amount = order?.totalCents ?? 0;
    const next = splitParcheFee(amount);
    if (order?.chargeCents && order.chargeCents > 0) {
      return { ...next, charge: order.chargeCents };
    }
    return next;
  }, [order]);
  const checkoutUrl = order?.checkoutUrl || peekCheckout(id);
  const chargeLabel = formatMoney(split.charge);

  const openCheckout = useCallback(async () => {
    if (!checkoutUrl || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await openMercadoPagoCheckout(checkoutUrl, {
        toolbar: palette.background,
        controls: palette.aurora,
      });
      await load();
    } catch (err) {
      setError(userMessage(err));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [checkoutUrl, load, palette.aurora, palette.background]);

  useEffect(() => {
    if (!loaded || !hostedCheckout(checkoutUrl) || order?.status !== 'pending') {
      return;
    }
    if (Platform.OS === 'web' || !claimCheckoutAutoOpen(id)) {
      return;
    }
    void openCheckout();
  }, [checkoutUrl, id, loaded, openCheckout, order?.status]);

  if (!ok) {
    return <PendingAuth />;
  }

  async function settle(result: 'paid' | 'failed') {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.tickets.settleOrder(id, result);
      router.replace(`/orders/${id}` as Href);
    } catch (err) {
      setError(userMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <Screen back title="Pagar">
        <Skeleton className="mt-ds-24 h-12 w-full" />
      </Screen>
    );
  }

  const breakdown = (
    <Surface elevated className="mt-ds-24 gap-ds-12">
      <Text variant="subheading">Qué vas a pagar</Text>
      <Text variant="muted">Precio de las boletas más 10% de Parche e IVA 19% sobre esa comisión.</Text>
      <FeeBreakdown split={split} />
    </Surface>
  );

  if (hostedCheckout(checkoutUrl)) {
    return (
      <Screen
        back
        title="Pagar"
        lead="Pagas en Mercado Pago sin salir de Parche. Si cierras el checkout, el botón sigue aquí hasta que el cobro quede aprobado.">
        {breakdown}
        {error ? <Text className="mt-ds-16">{error}</Text> : null}
        <Button className="mt-ds-24" disabled={busy} onPress={() => void openCheckout()}>
          <Text>{busy ? 'Abriendo…' : `Pagar ${chargeLabel} en Mercado Pago`}</Text>
        </Button>
      </Screen>
    );
  }

  if (isFakeCheckout(checkoutUrl)) {
    return (
      <Screen back title="Pagar" lead="Demo: confirma o falla el cobro.">
        {breakdown}
        {error ? <Text className="mt-ds-16">{error}</Text> : null}
        <Button className="mt-ds-24" disabled={busy} onPress={() => void settle('paid')}>
          <Text>{busy ? 'Procesando…' : `Pagar ${chargeLabel}`}</Text>
        </Button>
        <Button variant="outline" className="mt-ds-8" disabled={busy} onPress={() => void settle('failed')}>
          <Text>Fallar pago</Text>
        </Button>
      </Screen>
    );
  }

  return (
    <Screen back title="Pagar" lead="No encontramos el checkout de Mercado Pago para esta orden.">
      {breakdown}
      {error ? <Text className="mt-ds-16">{error}</Text> : null}
      <Button className="mt-ds-24" disabled={busy} onPress={() => void load()}>
        <Text>Reintentar</Text>
      </Button>
    </Screen>
  );
}
