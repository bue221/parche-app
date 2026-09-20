import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { BackBar } from '@/components/back-bar';
import { ErrorState, PendingAuth, Skeleton } from '@/components/feedback';
import { Meter } from '@/components/meter';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { Surface } from '@/components/surface';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import type { EventMetrics } from '@/data/types';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { formatClock, formatMoney, formatPercent } from '@/lib/format';

function stageName(name: string) {
  const key = name.trim().toLowerCase();
  if (key === 'early' || key === 'presale' || key === 'preventa') return 'Preventa';
  if (key === 'door' || key === 'ga' || key === 'taquilla') return 'Taquilla';
  return name;
}

function maxCount(values: number[]) {
  let max = 1;
  for (const value of values) {
    if (value > max) max = value;
  }
  return max;
}

export default function EventMetricsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ok = useRequireAuth(`/event/${id}/metrics`);
  const { user } = useAuthSnapshot();
  const [data, setData] = useState<EventMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await api.door.metrics(id));
      setError(null);
    } catch (err) {
      setError(userMessage(err));
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  if (!ok) {
    return <PendingAuth />;
  }
  if (user && !api.helpers.can(user.id, id, 'event.metrics.read')) {
    return (
      <Screen back>
        <Text>Door no entra a ingresos.</Text>
      </Screen>
    );
  }

  const sold = data?.sold ?? 0;
  const checkIns = data?.checkIns ?? 0;
  const fillMax = Math.max(sold, checkIns, 1);
  const scannerMax = maxCount(data?.scansByScanner.map((row) => row.approved) ?? []);
  const hourlyMax = maxCount(data?.hourly.map((row) => row.approved) ?? []);

  return (
    <Screen
      headTitle="Métricas"
      stickyHeader={
        <View className="w-full max-w-xl gap-ds-12">
          <BackBar className="mb-0" />
          <PageHeader
            title="Métricas"
            lead="Ventas y puerta. Cifras agregadas, sin compradores."
            headerAction={
              data ? (
                <View className="items-end">
                  <Text className="font-favorit text-[28px] font-bold leading-none tracking-tight">
                    {formatMoney(data.grossCents, data.currency)}
                  </Text>
                  <Text variant="helper">ingresos</Text>
                </View>
              ) : undefined
            }
            actions={
              <Button variant="outline" onPress={() => void refresh()}>
                <Text>{refreshing ? 'Actualizando…' : 'Actualizar'}</Text>
              </Button>
            }
          />
        </View>
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} />}>
      {error && !data ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {error && data ? (
        <Text variant="helper" className="text-danger">
          {error} · último número abajo
        </Text>
      ) : null}

      {!data && !error ? (
        <View className="mt-ds-24 max-w-xl gap-ds-12">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </View>
      ) : null}

      {data ? (
        <View className="mt-ds-24 max-w-xl gap-ds-32">
          <View className="gap-ds-12">
            <Text variant="headingSm">Taquilla</Text>
            <View className="flex-row gap-ds-12">
              <StatCard label="No-show" value={String(data.noShow)} hint={data.noShowRate ? formatPercent(data.noShowRate) : undefined} />
              <StatCard label="Por entrar" value={String(data.valid)} />
            </View>
          </View>

          <View className="gap-ds-12">
            <Text variant="headingSm">Aforo</Text>
            <Surface muted className="gap-ds-12">
              <View className="flex-row items-end justify-between gap-ds-12">
                <Text className="font-favorit text-[32px] font-bold leading-none tracking-tight">{checkIns}</Text>
                <Text variant="muted">
                  de {sold} vendidos
                </Text>
              </View>
              <Meter value={checkIns} max={fillMax} />
            </Surface>
          </View>

          <View className="gap-ds-12">
            <Text variant="headingSm">Por etapa</Text>
            {data.byType.length === 0 ? (
              <Text variant="muted">0 vendidos · 0 reservados · 0 libres</Text>
            ) : (
              data.byType.map((row) => (
                <Surface key={row.name} muted className="gap-ds-12">
                  <View className="flex-row items-start justify-between gap-ds-12">
                    <Text variant="subheading">{stageName(row.name)}</Text>
                    <Text variant="muted">{formatMoney(row.revenueCents, data.currency)}</Text>
                  </View>
                  <Meter value={row.sold} max={Math.max(row.capacity, 1)} />
                  <Text variant="helper">
                    {row.sold} vendidos · {row.reserved} reservados · {row.available} libres · cupo {row.capacity}
                  </Text>
                </Surface>
              ))
            )}
          </View>

          <View className="gap-ds-12">
            <Text variant="headingSm">Puerta por persona</Text>
            {data.scansByScanner.length === 0 ? (
              <Text variant="muted">Aún no hay lecturas de puerta.</Text>
            ) : (
              data.scansByScanner.map((row, index) => (
                <View
                  key={row.userId}
                  className={`gap-ds-8 py-ds-12 ${index < data.scansByScanner.length - 1 ? 'border-b border-border' : ''}`}>
                  <View className="flex-row items-baseline justify-between gap-ds-12">
                    <Text className="min-w-0 flex-1" numberOfLines={1}>
                      {row.displayName}
                    </Text>
                    <Text variant="subheading">{row.approved}</Text>
                  </View>
                  <Meter value={row.approved} max={scannerMax} />
                  {row.duplicate ? <Text variant="helper">{row.duplicate} duplicados</Text> : null}
                </View>
              ))
            )}
          </View>

          {data.hourly.length > 0 ? (
            <View className="gap-ds-12">
              <Text variant="headingSm">Pases por hora</Text>
              <Surface muted>
                <ScrollView
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, minHeight: 112, alignItems: 'flex-end' }}>
                  {data.hourly.map((row) => (
                    <View key={row.hour} className="w-10 items-center gap-ds-8">
                      <View
                        className="w-full rounded-sm bg-foreground"
                        style={{ height: Math.max(4, Math.round((row.approved / hourlyMax) * 72)) }}
                      />
                      <Text variant="helper" numberOfLines={1}>
                        {formatClock(row.hour)}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </Surface>
            </View>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Surface muted className="min-w-0 flex-1 gap-ds-4">
      <Text variant="caption">{label}</Text>
      <Text variant="subheading">{value}</Text>
      {hint ? <Text variant="helper">{hint}</Text> : null}
    </Surface>
  );
}
