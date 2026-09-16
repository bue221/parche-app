import { View } from 'react-native';

import { TicketBarcode } from '@/components/ticket-barcode';
import { TicketQr } from '@/components/ticket-qr';
import { Text } from '@/components/ui/text';
import { ticketScanValue } from '@/lib/code128';
import { ticketStubCode } from '@/lib/ticket-label';
import type { EventWithExtras, Ticket, TicketType } from '@/data/types';

export function TicketPass({
  ticket,
  event,
  type,
}: {
  ticket: Ticket;
  event?: EventWithExtras;
  type?: TicketType;
}) {
  const code = ticketScanValue(ticket);
  const stub = ticketStubCode(event?.name, ticket.id);
  const live = ticket.status === 'valid' && Boolean(code);

  return (
    <View className="w-full overflow-hidden rounded-cards bg-paper-white px-ds-20 py-ds-24">
      <View className="gap-ds-8">
        <Text className="font-favorit text-caption font-bold uppercase tracking-favorit text-stone">
          {type?.name ?? 'General'}
        </Text>
        <Text
          className="font-foggy text-[40px] uppercase leading-[0.85] text-pitch-black"
          numberOfLines={2}>
          {event?.name ?? 'Entrada'}
        </Text>
      </View>
      <View className={`mt-ds-24 items-center ${live ? '' : 'opacity-40'}`}>
        {live ? (
          <TicketQr token={code} revealed size={220} />
        ) : (
          <View className="h-[220px] w-[220px] items-center justify-center bg-muted">
            <Text variant="helper">Sin código vivo</Text>
          </View>
        )}
      </View>
      <View className="mt-ds-20">
        <TicketBarcode value={live ? code : ''} revealed={live} label={stub} height={96} />
      </View>
    </View>
  );
}
