import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';

import { LoadError, PendingAuth, Skeleton } from '@/components/feedback';
import { Screen } from '@/components/screen';
import { TicketPassPager } from '@/components/ticket-pass';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { hasPrintSeen } from '@/data/ticket-cache';
import { ticketScanValue } from '@/lib/code128';
import { eventWalletTickets, walletCountLabel, walletEventCounts } from '@/lib/ticket-label';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { useRequireAuth } from '@/hooks/use-require-auth';

export default function TicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ticketId = Array.isArray(id) ? id[0] : id;
  const compact = useCompactLayout();
  const bleed = Platform.OS !== 'web' || compact ? Spacing.three : 40;
  const ok = useRequireAuth(`/ticket/${ticketId}`);
  const ticketQuery = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => api.tickets.getTicket(ticketId),
    enabled: ok && Boolean(ticketId),
  });
  const walletQuery = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.tickets.mine(),
    enabled: ok,
  });
  const ticket =
    walletQuery.data?.find((item) => item.id === ticketId) ?? ticketQuery.data;
  const eventQuery = useQuery({
    queryKey: ['event', ticket?.eventId],
    queryFn: () => api.events.get(ticket!.eventId),
    enabled: Boolean(ticket?.eventId),
  });
  const siblings = ticket ? eventWalletTickets(walletQuery.data ?? [ticket], ticket.eventId) : [];
  const count = siblings.length;
  const counts = walletEventCounts(siblings);
  const printChecked = useRef(false);

  useEffect(() => {
    if (printChecked.current || !ticket) return;
    printChecked.current = true;
    if (ticket.status === 'valid' && ticket.token && !hasPrintSeen(ticket.id) && ticket.printSeenByUserIds.length === 0) {
      router.replace(`/tickets/print?ticketId=${ticket.id}` as Href);
    }
  }, [ticket]);

  if (!ok) {
    return <PendingAuth />;
  }
  if (!ticket) {
    if (ticketQuery.error) {
      return <LoadError message={userMessage(ticketQuery.error)} onRetry={() => void ticketQuery.refetch()} />;
    }
    return (
      <Screen back>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-ds-16 h-72 w-full" />
      </Screen>
    );
  }

  const live = ticket.status === 'valid' && Boolean(ticketScanValue(ticket));
  const lead =
    count > 1
      ? `${walletCountLabel(counts)}. Sube el brillo y desliza para cambiar de boleta.`
      : 'Sube el brillo y muestra el QR en puerta.';

  return (
    <Screen back title="Tu entrada" lead={lead}>
      <View className="mt-ds-16 w-full gap-ds-16">
        <View style={{ marginHorizontal: -bleed }}>
          <TicketPassPager
            tickets={siblings.length > 0 ? siblings : [ticket]}
            event={eventQuery.data ?? undefined}
            currentId={ticket.id}
            onChange={(nextId) => {
              if (nextId !== ticket.id) router.setParams({ id: nextId });
            }}
          />
        </View>
        {ticket.status === 'used' ? <Text variant="muted">Ya ingresaste</Text> : null}
        {ticket.status === 'transferred' ? <Text variant="muted">Este código ya no está vivo</Text> : null}
        {live ? (
          <Button variant="outline" onPress={() => router.push(`/ticket/${ticket.id}/transfer` as Href)}>
            <Text>Ceder</Text>
          </Button>
        ) : null}
        <Button variant="ghost" onPress={() => router.push(`/tickets/print?ticketId=${ticket.id}` as Href)}>
          <Text>Ver impresión</Text>
        </Button>
      </View>
    </Screen>
  );
}
