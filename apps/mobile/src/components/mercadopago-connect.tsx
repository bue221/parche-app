import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ExternalLink, Percent, ShieldCheck, Wallet } from 'lucide-react-native';

import { MercadoPagoMark } from '@/components/mercadopago-mark';
import { Surface } from '@/components/surface';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import { mercadoPagoConnectState } from '@/lib/mercadopago-connect';
import { cn } from '@/lib/utils';

const BENEFITS = [
  { icon: Wallet, text: 'El precio que publicas entra a tu Mercado Pago.' },
  { icon: Percent, text: 'El comprador cubre el 10% de Parche más IVA.' },
  { icon: ShieldCheck, text: 'Autorizas en Mercado Pago. Parche no ve tu clave.' },
] as const;

const STATUS_COPY = {
  locked: { label: 'Siguiente', tone: 'muted' as const },
  needs_secret: { label: 'Pendiente', tone: 'amber' as const },
  ready: { label: 'Por conectar', tone: 'amber' as const },
  connected: { label: 'Conectada', tone: 'confirm' as const },
};

export function MercadoPagoConnectCard({
  connected,
  oauthEnabled,
  oauthNeeds,
  mpUserId,
  busy,
  locked = false,
  compact = false,
  onConnect,
  onSignup,
  onDisconnect,
  extra,
}: {
  connected: boolean;
  oauthEnabled: boolean;
  oauthNeeds?: string;
  mpUserId?: string;
  busy: boolean;
  locked?: boolean;
  compact?: boolean;
  onConnect: () => void;
  onSignup: () => void;
  onDisconnect?: () => void;
  extra?: ReactNode;
}) {
  const state = mercadoPagoConnectState({ locked, connected, oauthEnabled });
  const status = STATUS_COPY[state];
  const secretMissing = state === 'needs_secret' || oauthNeeds === 'client_secret';
  const markSize = compact ? 44 : 52;

  return (
    <Surface
      elevated
      className={cn(
        'gap-ds-16 overflow-hidden p-ds-20',
        locked && 'opacity-60',
        state === 'connected' && 'border-confirm'
      )}
      accessibilityLabel="Conexión de Mercado Pago">
      <View className="flex-row items-start gap-ds-16">
        <MercadoPagoMark size={markSize} accessible />
        <View className="min-w-0 flex-1 gap-ds-8">
          <View className="flex-row flex-wrap items-center gap-ds-8">
            <Text variant="subheading" className="min-w-0 flex-1">
              Mercado Pago
            </Text>
            <Tag tone={status.tone}>{status.label}</Tag>
          </View>
          <Text variant="muted">
            {state === 'connected'
              ? `El precio publicado entra a tu cuenta${mpUserId ? ` (${mpUserId})` : ''}.`
              : locked
                ? 'Cuando el colectivo esté activo, autorizas cobros aquí.'
                : 'Conecta tu cuenta para cobrar boletas. El dinero no pasa por Parche.'}
          </Text>
        </View>
      </View>

      {state === 'ready' || state === 'needs_secret' ? (
        <View className="gap-ds-12 rounded-cards bg-neon-soft px-ds-16 py-ds-16">
          {BENEFITS.map((item) => (
            <View key={item.text} className="flex-row items-start gap-ds-12">
              <View className="mt-0.5 size-8 items-center justify-center rounded-full bg-surface">
                <Icon as={item.icon} size={16} className="text-foreground" />
              </View>
              <Text variant="muted" className="min-w-0 flex-1 pt-ds-4">
                {item.text}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {secretMissing && !locked ? (
        <View className="gap-ds-4 rounded-cards bg-amber-soft px-ds-16 py-ds-12">
          <Text variant="caption">Falta el Client Secret</Text>
          <Text variant="muted">
            En Mercado Pago: Tus integraciones → la app ParcheTiquetes → Editar datos. Sin eso Parche no
            puede guardar tu autorización.
          </Text>
        </View>
      ) : null}

      {locked ? null : state === 'connected' ? (
        <View className="gap-ds-8">
          <Button variant="outline" disabled={busy} onPress={onConnect}>
            <MercadoPagoMark size={18} />
            <Text>{busy ? 'Abriendo…' : 'Reconectar'}</Text>
          </Button>
          {onDisconnect ? (
            <Button variant="outline" disabled={busy} onPress={onDisconnect}>
              <Text>Desconectar</Text>
            </Button>
          ) : null}
        </View>
      ) : (
        <View className="gap-ds-8">
          <Button disabled={busy || !oauthEnabled} onPress={onConnect}>
            <MercadoPagoMark size={18} />
            <Text>{busy ? 'Abriendo…' : oauthEnabled ? 'Conectar Mercado Pago' : 'Conectar (falta secret)'}</Text>
          </Button>
          <Button variant="outline" disabled={busy} onPress={onSignup}>
            <Icon as={ExternalLink} size={16} />
            <Text>Crear cuenta en Mercado Pago</Text>
          </Button>
        </View>
      )}

      {extra}
    </Surface>
  );
}
