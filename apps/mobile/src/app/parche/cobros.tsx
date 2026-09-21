import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { FeeBreakdown } from '@/components/fee-breakdown';
import { Field } from '@/components/field';
import { PendingAuth, Skeleton } from '@/components/feedback';
import { Screen } from '@/components/screen';
import { Surface } from '@/components/surface';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { useAuthStore } from '@/data/auth-store';
import { toast } from '@/data/toast-store';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { openMercadoPagoSignup, startMercadoPagoConnect } from '@/lib/mercadopago-checkout';
import { splitParcheFee } from '@/lib/parche-fee';

const SAMPLE_AMOUNT = 50_000;

export default function CobrosScreen() {
  const ok = useRequireAuth('/parche/cobros');
  const { mp } = useLocalSearchParams<{ mp?: string }>();
  const { isPromoter, user, memberships } = useAuthSnapshot();
  const storedTenant = useAuthStore((s) => s.me?.tenantName);
  const [busy, setBusy] = useState(false);
  const [tenantName, setTenantName] = useState(user?.displayName ?? '');
  const query = useQuery({
    queryKey: ['mercadopago'],
    queryFn: () => api.payments.status(),
    enabled: ok && isPromoter,
  });
  const refetch = query.refetch;
  const ownedId = memberships.find((m) => m.role === 'owner' || m.role === 'manager')?.eventId;
  const eventQuery = useQuery({
    queryKey: ['event', ownedId],
    queryFn: () => api.events.get(ownedId!),
    enabled: ok && Boolean(ownedId),
  });

  useEffect(() => {
    if (mp === 'connected') {
      toast('Mercado Pago conectado', 'success');
      void refetch();
    } else if (mp === 'denied') {
      toast('No se autorizó Mercado Pago');
    }
  }, [mp, refetch]);

  const sampleType = eventQuery.data?.ticketTypes.find((type) => type.priceCents > 0);
  const sampleAmount = sampleType?.priceCents ?? SAMPLE_AMOUNT;
  const commissionPercent = query.data?.commissionPercent ?? 10;
  const ivaPercent = query.data?.ivaPercent ?? 19;
  const split = useMemo(
    () => splitParcheFee(sampleAmount, commissionPercent, ivaPercent),
    [sampleAmount, commissionPercent, ivaPercent]
  );

  if (!ok) {
    return <PendingAuth />;
  }
  if (isPromoter && query.error && !query.data) {
    return (
      <Screen back title="Organiza">
        <Text className="mt-ds-24">{userMessage(query.error)}</Text>
      </Screen>
    );
  }
  if (isPromoter && !query.data) {
    return (
      <Screen back title="Organiza">
        <Skeleton className="mt-ds-24 h-24 w-full" />
      </Screen>
    );
  }

  const connected = Boolean(query.data?.connected);
  const oauthEnabled = Boolean(query.data?.oauthEnabled);
  const mpUserId = query.data?.mpUserId;

  async function activate() {
    if (busy) return;
    const name = tenantName.trim();
    if (!name) {
      toast('Ponle nombre a tu colectivo');
      return;
    }
    setBusy(true);
    try {
      const me = await api.auth.activateOrganizer(name);
      useAuthStore.getState().setMe(me);
      toast('Ya eres organizador', 'success');
    } catch (err) {
      toast(userMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function connect() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await startMercadoPagoConnect();
      await query.refetch();
      if (result === 'connected') {
        toast('Mercado Pago conectado', 'success');
      } else if (result === 'denied') {
        toast('No se autorizó Mercado Pago');
      }
    } catch (err) {
      toast(userMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (busy) return;
    setBusy(true);
    try {
      await api.payments.disconnect();
      await query.refetch();
      toast('Cuenta desconectada');
    } catch (err) {
      toast(userMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      back
      title="Organiza"
      lead="Activa el colectivo, conecta Mercado Pago y el dinero de las boletas entra a tu cuenta.">
      <View className="mt-ds-24 max-w-xl gap-ds-16">
        <Surface elevated className="gap-ds-12">
          <Text variant="caption">1. Tu colectivo</Text>
          {isPromoter ? (
            <Text variant="muted">
              Listo{storedTenant ? ` como ${storedTenant}` : ''}. Ya puedes conectar cobros y crear eventos.
            </Text>
          ) : (
            <>
              <Text variant="muted">Nombre del colectivo o marca. Después puedes crear eventos.</Text>
              <Field label="Nombre" value={tenantName} onChangeText={setTenantName} />
              <Button disabled={busy} onPress={() => void activate()}>
                <Text>{busy ? 'Activando…' : 'Activar organizador'}</Text>
              </Button>
            </>
          )}
        </Surface>

        <Surface elevated className="gap-ds-12">
          <Text variant="caption">2. Mercado Pago</Text>
          {!isPromoter ? (
            <Text variant="muted">Primero activa el colectivo. Si no tienes Mercado Pago, créala y luego conéctala aquí.</Text>
          ) : connected ? (
            <>
              <Text variant="subheading">Cuenta conectada</Text>
              <Text variant="muted">
                El precio publicado entra a tu Mercado Pago{mpUserId ? ` (${mpUserId})` : ''}. El comprador cubre 10% +
                IVA.
              </Text>
              <Button disabled={busy} onPress={() => void connect()}>
                <Text>{busy ? 'Abriendo…' : 'Reconectar'}</Text>
              </Button>
              <Button variant="outline" disabled={busy} onPress={() => void disconnect()}>
                <Text>Desconectar</Text>
              </Button>
            </>
          ) : (
            <>
              <Text variant="subheading">Conecta tu Mercado Pago</Text>
              <Text variant="muted">
                Entras a Mercado Pago y autorizas a Parche. Eso es OAuth de Mercado Pago, no Auth0. El comprador paga
                boleta + 10% + IVA; a ti te llega el precio que publicaste.
              </Text>
              {query.data?.oauthNeeds === 'client_secret' || !oauthEnabled ? (
                <Text variant="muted">
                  El API todavía no tiene el Client Secret de ParcheTiquetes (Tus integraciones → la app → Editar datos).
                  Sin eso Parche no puede guardar tu autorización.
                </Text>
              ) : null}
              <Button variant="outline" disabled={busy} onPress={() => void openMercadoPagoSignup()}>
                <Text>Crear cuenta en Mercado Pago</Text>
              </Button>
              <Button disabled={busy || !oauthEnabled} onPress={() => void connect()}>
                <Text>{busy ? 'Abriendo…' : oauthEnabled ? 'Conectar Mercado Pago' : 'Conectar (falta Client Secret)'}</Text>
              </Button>
            </>
          )}
        </Surface>

        {isPromoter && (connected || !oauthEnabled) ? (
          <Button
            disabled={busy}
            onPress={() => router.push('/event/create' as Href)}>
            <Text>Crear evento</Text>
          </Button>
        ) : null}

        <Surface elevated className="gap-ds-12">
          <Text variant="caption">Cómo se reparte</Text>
          <Text variant="muted">
            {sampleType
              ? `Con tu etapa ${sampleType.name}. No se edita: el comprador paga 10% + IVA 19% sobre esa comisión.`
              : 'Ejemplo con una boleta de $50.000. No se edita: el comprador paga 10% + IVA 19% sobre esa comisión.'}
          </Text>
          <FeeBreakdown
            split={split}
            currency={sampleType?.currency}
            commissionPercent={commissionPercent}
            ivaPercent={ivaPercent}
            mode="promoter"
          />
        </Surface>
      </View>
    </Screen>
  );
}
