import { View } from 'react-native';

import { FlyerImage } from '@/components/flyer-image';
import { Surface } from '@/components/surface';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import type { ParcheEvent, Ticket } from '@/data/types';
import { formatWhen, statusLabel } from '@/lib/format';

export function TicketCard({
  ticket,
  event,
  onShow,
}: {
  ticket: Ticket;
  event?: ParcheEvent;
  onShow?: () => void;
}) {
  return (
    <Surface elevated className="overflow-hidden p-0">
      {event?.flyerUrl ? (
        <FlyerImage uri={event.flyerUrl} className="w-full" aspectRatio={16 / 10} />
      ) : (
        <View className="aspect-[16/10] w-full items-center justify-center bg-muted">
          <Text variant="headingSm" className="uppercase text-muted-foreground">
            {(event?.name ?? 'P').slice(0, 2)}
          </Text>
        </View>
      )}
      <View className="gap-ds-12 p-ds-16">
        <View className="flex-row items-start justify-between gap-ds-12">
          <View className="min-w-0 flex-1 gap-ds-4">
            <Text variant="subheading" numberOfLines={2}>
              {event?.name ?? 'Entrada'}
            </Text>
            <Text variant="muted" numberOfLines={1}>
              {event ? formatWhen(event.startsAt) : ticket.eventId}
            </Text>
            <Text variant="caption" className="uppercase text-muted-foreground" numberOfLines={1}>
              {event?.venueName ?? ''}
            </Text>
          </View>
          <Tag inverted={ticket.status === 'valid'} tone={ticket.status === 'valid' ? 'ink' : 'muted'}>
            {statusLabel(ticket.status)}
          </Tag>
        </View>
        {ticket.status === 'valid' && onShow ? (
          <Button onPress={onShow}>
            <Text>Mostrar</Text>
          </Button>
        ) : null}
        {ticket.status === 'reserved' ? <Text variant="helper">Pago pendiente</Text> : null}
        {ticket.status === 'used' ? <Text variant="muted">Usado</Text> : null}
        {ticket.status === 'transferred' ? <Text variant="muted">Cedido</Text> : null}
      </View>
    </Surface>
  );
}
