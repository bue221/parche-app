import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/screen';
import { TicketQr } from '@/components/ticket-qr';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { getSnapshot } from '@/data/mock/store';
import { useRequireAuth } from '@/hooks/use-require-auth';
import type { Ticket } from '@/data/types';

export default function TicketQrScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ok = useRequireAuth(`/ticket/${id}`);
  const [ticket, setTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    void api.tickets.getTicket(id).then((t) => {
      if (t.status === 'valid' && t.token && !t.printSeenByUserIds.includes(t.userId)) {
        router.replace(`/tickets/print?ticketId=${t.id}` as Href);
        return;
      }
      setTicket(t);
    });
  }, [id]);

  if (!ok || !ticket) {
    return null;
  }

  const event = getSnapshot().events.find((e) => e.id === ticket.eventId);
  const live = ticket.status === 'valid' && Boolean(ticket.token);

  return (
    <Screen>
      <View className="items-center gap-ds-16">
        <Text variant="headingSm">{event?.name}</Text>
        {live ? <TicketQr token={ticket.token} revealed /> : <Text>Ya ingresaste o el código no está vivo.</Text>}
        {ticket.status === 'used' ? <Text variant="muted">Ya ingresaste</Text> : null}
        {live ? (
          <Button variant="outline" onPress={() => router.push(`/ticket/${id}/transfer` as Href)}>
            <Text>Ceder</Text>
          </Button>
        ) : null}
        <Button variant="ghost" onPress={() => router.push(`/tickets/print?ticketId=${id}` as Href)}>
          <Text>Ver impresión</Text>
        </Button>
      </View>
    </Screen>
  );
}
