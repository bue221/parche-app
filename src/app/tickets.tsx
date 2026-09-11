import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { EmptyState, ErrorState } from '@/components/feedback';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import { getSnapshot } from '@/data/mock/store';
import { useAuthSnapshot } from '@/data/session';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { statusLabel } from '@/lib/format';
import type { Ticket } from '@/data/types';

export default function WalletScreen() {
  const ok = useRequireAuth('/tickets');
  const { user } = useAuthSnapshot();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const redirectedPrint = useRef(false);

  const load = useCallback(async () => {
    try {
      const list = await api.tickets.mine();
      setTickets(list);
      setError(null);
      if (user && !redirectedPrint.current) {
        const pending = api.helpers.pendingPrintTickets(user.id);
        if (pending.length > 0) {
          redirectedPrint.current = true;
          router.replace(`/tickets/print?orderId=${pending[0].orderId}` as Href);
        }
      }
    } catch (err) {
      setError(userMessage(err));
    }
  }, [user]);

  useEffect(() => {
    if (ok) {
      void load();
    }
  }, [ok, load]);

  if (!ok) {
    return null;
  }

  const visible = tickets.filter((t) => t.status !== 'cancelled');
  const events = getSnapshot().events;

  return (
    <Screen>
      <Text variant="heading">Tiquetes</Text>
      <Button variant="ghost" className="mt-ds-8" onPress={() => void load()}>
        <Text>Actualizar</Text>
      </Button>
      {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
      {visible.length === 0 && !error ? (
        <EmptyState title="No tienes tiquetes" actionLabel="Agenda" onAction={() => router.push('/' as Href)} />
      ) : null}
      {visible.map((ticket) => {
        const event = events.find((e) => e.id === ticket.eventId);
        return (
          <View key={ticket.id} className="mt-ds-16 rounded-cards border border-border bg-background p-ds-16">
            <Text variant="subheading">{event?.name}</Text>
            <Text variant="muted">{statusLabel(ticket.status)}</Text>
            {ticket.status === 'valid' ? (
              <Button className="mt-ds-8" onPress={() => router.push(`/ticket/${ticket.id}` as Href)}>
                <Text>Mostrar</Text>
              </Button>
            ) : null}
            {ticket.status === 'reserved' ? <Text className="mt-ds-8">Pago pendiente</Text> : null}
            {ticket.status === 'used' ? <Text className="mt-ds-8 line-through">Usado</Text> : null}
            {ticket.status === 'transferred' ? <Text className="mt-ds-8">Cedido</Text> : null}
          </View>
        );
      })}
    </Screen>
  );
}
