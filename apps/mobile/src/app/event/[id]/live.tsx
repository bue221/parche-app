import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, View } from 'react-native';

import { BackBar } from '@/components/back-bar';
import { Chip, ChipRow } from '@/components/chip-row';
import { EmptyState, PendingAuth, Skeleton } from '@/components/feedback';
import { Meter } from '@/components/meter';
import { PageHeader } from '@/components/page-header';
import { Screen } from '@/components/screen';
import { SearchBar } from '@/components/search-bar';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSnapshot } from '@/data/session';
import type { CheckInCode, DoorLive, ScanLog } from '@/data/types';
import { useRequireAuth } from '@/hooks/use-require-auth';
import {
  CHECK_IN_LABEL,
  checkInTone,
  isApprovedCheckIn,
  isDuplicateCheckIn,
  isRejectedCheckIn,
  scannerFallback,
} from '@/lib/check-in';
import { formatClock, formatRelativePast } from '@/lib/format';
import { cn } from '@/lib/utils';

type ResultFilter = 'all' | 'approved' | 'duplicate' | 'rejected';

export default function DoorLiveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ok = useRequireAuth(`/event/${id}/live`);
  const { user } = useAuthSnapshot();
  const [live, setLive] = useState<DoorLive | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [scannerFilter, setScannerFilter] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const namesRef = useRef<Record<string, string>>({});
  const [namesTick, setNamesTick] = useState(0);

  useEffect(() => {
    const tick = () => {
      void api.door
        .live(id)
        .then((next) => {
          setLive(next);
          setError(null);
        })
        .catch((err) => setError(userMessage(err)));
    };
    tick();
    const timer = setInterval(tick, 2500);
    return () => clearInterval(timer);
  }, [id]);

  useEffect(() => {
    if (!live) return;
    const missing = [...new Set(live.recent.map((row) => row.scannerUserId).filter(Boolean))].filter(
      (scannerId) => !namesRef.current[scannerId]
    );
    for (const row of live.recent) {
      if (row.scannerUserId && row.scannerDisplayName && !namesRef.current[row.scannerUserId]) {
        namesRef.current[row.scannerUserId] = row.scannerDisplayName;
      }
    }
    if (missing.length === 0) return;
    let cancelled = false;
    void Promise.all(
      missing.map(async (scannerId) => {
        const profile = await api.users.profile(scannerId).catch(() => null);
        return [scannerId, profile?.displayName ?? ''] as const;
      })
    ).then((rows) => {
      if (cancelled) return;
      let changed = false;
      rows.forEach(([scannerId, name]) => {
        if (name && !namesRef.current[scannerId]) {
          namesRef.current[scannerId] = name;
          changed = true;
        }
      });
      if (changed) setNamesTick((n) => n + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [live]);

  const scanners = useMemo(() => {
    if (!live) return [];
    const seen = new Map<string, string>();
    live.recent.forEach((row) => {
      if (!row.scannerUserId || seen.has(row.scannerUserId)) return;
      seen.set(
        row.scannerUserId,
        namesRef.current[row.scannerUserId] || row.scannerDisplayName || scannerFallback(row.scannerUserId)
      );
    });
    return [...seen.entries()].map(([userId, name]) => ({ userId, name }));
  }, [live, namesTick]);

  const counts = useMemo(() => {
    const rows = live?.recent ?? [];
    return {
      all: rows.length,
      approved: rows.filter((row) => isApprovedCheckIn(row.result)).length,
      duplicate: rows.filter((row) => isDuplicateCheckIn(row.result)).length,
      rejected: rows.filter((row) => isRejectedCheckIn(row.result)).length,
    };
  }, [live]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (live?.recent ?? []).filter((row) => {
      if (resultFilter === 'approved' && !isApprovedCheckIn(row.result)) return false;
      if (resultFilter === 'duplicate' && !isDuplicateCheckIn(row.result)) return false;
      if (resultFilter === 'rejected' && !isRejectedCheckIn(row.result)) return false;
      if (scannerFilter && row.scannerUserId !== scannerFilter) return false;
      if (!needle) return true;
      const scanner =
        namesRef.current[row.scannerUserId] || row.scannerDisplayName || scannerFallback(row.scannerUserId);
      return (
        CHECK_IN_LABEL[row.result].toLowerCase().includes(needle) ||
        scanner.toLowerCase().includes(needle) ||
        (row.guestName ?? '').toLowerCase().includes(needle)
      );
    });
  }, [live, namesTick, query, resultFilter, scannerFilter]);

  if (!ok) {
    return <PendingAuth />;
  }
  if (user && !api.helpers.can(user.id, id, 'event.door.live') && !api.helpers.can(user.id, id, 'event.metrics.read')) {
    return (
      <Screen back>
        <Text>Sin permiso de aforo.</Text>
      </Screen>
    );
  }

  const checkIns = live?.checkIns ?? 0;
  const sold = live?.sold ?? 0;
  const capacity = live?.capacity ?? 0;
  const fillMax = Math.max(sold, checkIns, 1);
  const filtering = Boolean(query.trim()) || resultFilter !== 'all' || Boolean(scannerFilter);

  return (
    <Screen
      scroll={false}
      headTitle="Aforo"
      stickyHeader={
        <View className="w-full max-w-xl gap-ds-12">
          <BackBar className="mb-0" />
          <PageHeader
            title="Aforo"
            lead="Conteo de la noche. Sin emails de compradores."
            headerAction={
              live ? (
                <View className="items-end">
                  <Text className="font-favorit text-[32px] font-bold leading-none tracking-tight">{checkIns}</Text>
                  <Text variant="helper">adentro</Text>
                </View>
              ) : undefined
            }
          />
          {live ? (
            <View className="gap-ds-8">
              <Text variant="muted">
                de {sold} vendidos{capacity ? ` · cupo ${capacity}` : ''}
              </Text>
              <Meter value={checkIns} max={fillMax} />
            </View>
          ) : null}
          {error ? (
            <Text variant="helper" className={live ? 'text-danger' : undefined}>
              {error}
              {live ? ' · último número arriba' : ''}
            </Text>
          ) : null}
          <SearchBar compact value={query} onChangeText={setQuery} placeholder="Filtrar por resultado o puerta" />
          <ChipRow>
            <Chip label={`Todos ${counts.all}`} selected={resultFilter === 'all'} onPress={() => setResultFilter('all')} />
            <Chip
              label={`Pasa ${counts.approved}`}
              selected={resultFilter === 'approved'}
              onPress={() => setResultFilter('approved')}
            />
            <Chip
              label={`Ya usado ${counts.duplicate}`}
              selected={resultFilter === 'duplicate'}
              onPress={() => setResultFilter('duplicate')}
            />
            <Chip
              label={`Rechazo ${counts.rejected}`}
              selected={resultFilter === 'rejected'}
              onPress={() => setResultFilter('rejected')}
            />
          </ChipRow>
          {scanners.length > 1 ? (
            <ChipRow>
              <Chip label="Toda la puerta" selected={!scannerFilter} onPress={() => setScannerFilter(null)} />
              {scanners.map((row) => (
                <Chip
                  key={row.userId}
                  label={row.name}
                  selected={scannerFilter === row.userId}
                  onPress={() => setScannerFilter(row.userId)}
                />
              ))}
            </ChipRow>
          ) : null}
        </View>
      }>
      {!live && !error ? (
        <View className="w-full max-w-xl gap-ds-12">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </View>
      ) : (
        <View className="min-h-0 w-full max-w-xl flex-1">
          <FlatList
            style={{ flex: 1, minHeight: 0 }}
            data={filtered}
            keyExtractor={(item) => item.id}
            extraData={namesTick}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            initialNumToRender={20}
            maxToRenderPerBatch={16}
            windowSize={8}
            updateCellsBatchingPeriod={50}
            ListHeaderComponent={
              live ? (
                <View className="pb-ds-8 pt-ds-4">
                  <Text variant="caption">Últimas lecturas · {filtered.length}</Text>
                </View>
              ) : null
            }
            renderItem={({ item, index }) => (
              <ScanRow
                scan={item}
                divided={index < filtered.length - 1}
                scannerName={
                  namesRef.current[item.scannerUserId] || item.scannerDisplayName || scannerFallback(item.scannerUserId)
                }
              />
            )}
            ListEmptyComponent={
              live ? (
                <EmptyState
                  compact
                  title={live.recent.length === 0 ? 'Todavía no hay lecturas' : 'Nada con ese filtro'}
                  lead={
                    live.recent.length === 0
                      ? 'Los pases aparecen aquí al escanear.'
                      : 'Prueba otro resultado o limpia la búsqueda.'
                  }
                  actionLabel={filtering ? 'Limpiar filtros' : undefined}
                  onAction={
                    filtering
                      ? () => {
                          setResultFilter('all');
                          setScannerFilter(null);
                          setQuery('');
                        }
                      : undefined
                  }
                />
              ) : null
            }
          />
        </View>
      )}
    </Screen>
  );
}

function ScanRow({
  scan,
  scannerName,
  divided,
}: {
  scan: ScanLog;
  scannerName: string;
  divided: boolean;
}) {
  const result: CheckInCode = scan.result;
  return (
    <View className={cn('min-h-11 flex-row items-center gap-ds-12 py-ds-12', divided && 'border-b border-border')}>
      <Tag tone={checkInTone(result)}>{CHECK_IN_LABEL[result]}</Tag>
      <View className="min-w-0 flex-1 gap-ds-4">
        <Text numberOfLines={1}>{scannerName}</Text>
        {scan.guestName ? (
          <Text variant="muted" numberOfLines={1}>
            {scan.guestName}
          </Text>
        ) : null}
      </View>
      <View className="items-end gap-ds-4">
        <Text variant="caption">{formatClock(scan.at)}</Text>
        <Text variant="helper">{formatRelativePast(scan.at)}</Text>
      </View>
    </View>
  );
}
