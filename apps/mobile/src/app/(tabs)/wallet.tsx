import { useQueries, useQuery } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';

import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { GuestPanel } from '@/components/guest-panel';
import { FadeSlideIn } from '@/components/motion';
import { Screen } from '@/components/screen';
import { SectionRail } from '@/components/section-rail';
import { Surface } from '@/components/surface';
import { firstWalletTicket, TicketEventCard } from '@/components/ticket-card';
import { Text } from '@/components/ui/text';
import { Spacing } from '@/constants/theme';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { useAuthSheet } from '@/data/auth-sheet-store';
import { useAuthSnapshot } from '@/data/session';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { groupWalletEvents, walletCountLabel, walletEventCounts } from '@/lib/ticket-label';

export default function WalletScreen() {
  const { isLoggedIn, user, hydrated } = useAuthSnapshot();
  const openAuth = useAuthSheet((s) => s.open);
  const compact = useCompactLayout();
  const bleed = Platform.OS !== 'web' || compact ? Spacing.three : 40;
  const redirectedPrint = useRef(false);

  const { data, error, refetch, isLoading } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: () => api.tickets.mine(),
    enabled: hydrated && isLoggedIn && Boolean(user?.id),
  });
  const tickets = isLoggedIn ? (data ?? []) : [];

  const visible = tickets.filter((t) => t.status !== 'cancelled');
  const events = groupWalletEvents(visible);
  const summary = walletCountLabel(walletEventCounts(visible));
  const ticketEventIds = [...new Set(visible.map((t) => t.eventId))];
  const eventQueries = useQueries({
    queries: ticketEventIds.map((eventId) => ({
      queryKey: ['event', eventId],
      queryFn: () => api.events.get(eventId),
      enabled: isLoggedIn && ticketEventIds.length > 0,
    })),
  });

  useEffect(() => {
    if (!isLoggedIn || !user || redirectedPrint.current || isLoading) {
      return;
    }
    const pending = api.helpers.pendingPrintTickets(user.id);
    if (pending.length > 0) {
      redirectedPrint.current = true;
      router.replace(`/tickets/print?orderId=${pending[0].orderId}` as Href);
    }
  }, [isLoggedIn, user, tickets, isLoading]);

  if (!hydrated) {
    return (
      <Screen title="Boletas" lead="Muéstralos en puerta.">
        <View className="mt-ds-24">
          <WalletSkeleton />
        </View>
      </Screen>
    );
  }

  const needsProfile = Boolean(isLoggedIn && user && !user.phone && visible.some((t) => t.status === 'valid'));

  return (
    <Screen title="Boletas" lead={isLoggedIn && visible.length > 0 ? summary : 'Muéstralos en puerta.'}>
      <View className="mt-ds-24 gap-ds-24">
        {needsProfile ? (
          <Surface elevated onPress={() => router.push('/parche/completar-perfil' as Href)}>
            <Text variant="subheading">Completa tu perfil</Text>
            <Text variant="muted">Nombre y teléfono, cuando quieras. No bloquea tu QR.</Text>
          </Surface>
        ) : null}
        {!isLoggedIn ? (
          <GuestPanel
            title="Entra para ver tus QRs"
            lead="Puedes explorar y guardar eventos sin cuenta. La boleta aparece aquí después de comprar."
            actionLabel="Entrar"
            onAction={() => openAuth()}
            secondaryLabel="Explorar"
            onSecondary={() => router.push('/' as Href)}
            points={['Un card por evento', 'QR listo para puerta', 'El recuento de disponibles y usadas']}
          />
        ) : (
          <>
            {error ? <ErrorState message={userMessage(error)} onRetry={() => void refetch()} /> : null}
            {visible.length === 0 && !error && !isLoading ? (
              <EmptyState
                title="Tu primer evento"
                lead="Cuando compres, la boleta queda aquí."
                actionLabel="Explorar"
                onAction={() => router.push('/' as Href)}
              />
            ) : null}
            {isLoading ? (
              <WalletSkeleton />
            ) : events.length > 0 ? (
              <SectionRail title="Tus eventos" bleed={bleed}>
                {events.map((stack, index) => {
                  const event = eventQueries.find((q) => q.data?.id === stack.eventId)?.data;
                  const first = firstWalletTicket(stack.tickets);
                  return (
                    <FadeSlideIn key={stack.eventId} index={index} className="w-full">
                      <TicketEventCard
                        tickets={stack.tickets}
                        event={event}
                        onPress={first ? () => router.push(`/ticket/${first.id}` as Href) : undefined}
                      />
                    </FadeSlideIn>
                  );
                })}
              </SectionRail>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

function WalletSkeleton() {
  return (
    <View className="flex-row gap-ds-12">
      <View className="w-[168px] gap-ds-8">
        <Skeleton className="aspect-square w-full rounded-images" />
        <Skeleton className="h-4 w-[82%] rounded-full" />
        <Skeleton className="h-3 w-[64%] rounded-full" />
      </View>
      <View className="w-[168px] gap-ds-8">
        <Skeleton className="aspect-square w-full rounded-images" />
        <Skeleton className="h-4 w-[72%] rounded-full" />
        <Skeleton className="h-3 w-[54%] rounded-full" />
      </View>
    </View>
  );
}
