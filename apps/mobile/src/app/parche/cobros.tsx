import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Building2, Check } from 'lucide-react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { FeeBreakdown } from '@/components/fee-breakdown';
import { Field } from '@/components/field';
import { PendingAuth, Skeleton } from '@/components/feedback';
import { FadeSlideIn } from '@/components/motion';
import { MercadoPagoConnectCard } from '@/components/mercadopago-connect';
import { Screen } from '@/components/screen';
import { Surface } from '@/components/surface';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import { useAuthStore } from '@/data/auth-store';
import { toast } from '@/data/toast-store';
import { useMercadoPagoConnect } from '@/hooks/use-mercadopago-connect';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { splitParcheFee } from '@/lib/parche-fee';
import { cn } from '@/lib/utils';

const SAMPLE_AMOUNT = 50_000;

export default function CobrosScreen() {
  const ok = useRequireAuth('/parche/cobros');
  const { mp } = useLocalSearchParams<{ mp?: string }>();
  const { isPromoter, user, memberships } = useAuthSnapshot();
  const storedTenant = useAuthStore((s) => s.me?.tenantName);
  const [tenantName, setTenantName] = useState(user?.displayName ?? '');
  const { busy: payoutBusy, connect, disconnect, signup } = useMercadoPagoConnect();
  const [activating, setActivating] = useState(false);
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
  const busy = payoutBusy || activating;

  async function activate() {
    if (busy) return;
    const name = tenantName.trim();
    if (!name) {
      toast('Ponle nombre a tu colectivo');
      return;
    }
    setActivating(true);
    try {
      const me = await api.auth.activateOrganizer(name);
      useAuthStore.getState().setMe(me);
      toast('Ya eres organizador', 'success');
    } catch (err) {
      toast(userMessage(err));
    } finally {
      setActivating(false);
    }
  }

  return (
    <Screen
      back
      width="form"
      title="Organiza"
      lead="Activa el colectivo, conecta Mercado Pago y el dinero de las boletas entra a tu cuenta.">
      <View className="mt-ds-24 max-w-xl gap-ds-16">
        <FadeSlideIn index={0}>
          <SetupStep index={1} title="Tu colectivo" done={isPromoter}>
            <Surface elevated className="gap-ds-12">
              {isPromoter ? (
                <View className="flex-row items-center gap-ds-12">
                  <View className="size-10 items-center justify-center rounded-full bg-volt-soft">
                    <Icon as={Building2} size={18} className="text-foreground" />
                  </View>
                  <View className="min-w-0 flex-1 gap-ds-4">
                    <Text variant="subheading">Colectivo activo</Text>
                    <Text variant="muted">
                      Listo{storedTenant ? ` como ${storedTenant}` : ''}. Ya puedes conectar cobros y crear
                      eventos.
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  <View className="flex-row items-center gap-ds-12">
                    <View className="size-10 items-center justify-center rounded-full bg-muted">
                      <Icon as={Building2} size={18} className="text-foreground" />
                    </View>
                    <Text variant="muted" className="min-w-0 flex-1">
                      Nombre del colectivo o marca. Después puedes crear eventos.
                    </Text>
                  </View>
                  <Field label="Nombre" value={tenantName} onChangeText={setTenantName} />
                  <Button disabled={busy} onPress={() => void activate()}>
                    <Text>{activating ? 'Activando…' : 'Activar organizador'}</Text>
                  </Button>
                </>
              )}
            </Surface>
          </SetupStep>
        </FadeSlideIn>

        <FadeSlideIn index={1}>
          <SetupStep index={2} title="Cuenta de cobro" done={connected}>
            <MercadoPagoConnectCard
              connected={connected}
              oauthEnabled={oauthEnabled}
              oauthNeeds={query.data?.oauthNeeds}
              mpUserId={mpUserId}
              busy={busy}
              locked={!isPromoter}
              onConnect={() => void connect()}
              onSignup={signup}
              onDisconnect={() => void disconnect()}
            />
          </SetupStep>
        </FadeSlideIn>

        {isPromoter && (connected || !oauthEnabled) ? (
          <FadeSlideIn index={2}>
            <Button disabled={busy} onPress={() => router.push('/event/create' as Href)}>
              <Text>Crear evento</Text>
            </Button>
          </FadeSlideIn>
        ) : null}

        <FadeSlideIn index={3}>
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
        </FadeSlideIn>
      </View>
    </Screen>
  );
}

function SetupStep({
  index,
  title,
  done,
  children,
}: {
  index: number;
  title: string;
  done?: boolean;
  children: ReactNode;
}) {
  return (
    <View className="gap-ds-12">
      <View className="flex-row items-center gap-ds-12">
        <View
          className={cn(
            'size-8 items-center justify-center rounded-full',
            done ? 'bg-volt-soft' : 'bg-muted'
          )}>
          {done ? (
            <Icon as={Check} size={16} className="text-foreground" />
          ) : (
            <Text variant="caption">{String(index)}</Text>
          )}
        </View>
        <Text variant="caption">{title}</Text>
      </View>
      {children}
    </View>
  );
}
