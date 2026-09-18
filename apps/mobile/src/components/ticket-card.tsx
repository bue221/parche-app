import { type ReactNode } from 'react';
import { View } from 'react-native';

import { EventFeed } from '@/components/event-card';
import { FlyerImage } from '@/components/flyer-image';
import { Button } from '@/components/ui/button';
import { Tag, type TagTone } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import type { ParcheEvent, Ticket } from '@/data/types';
import { cardShadowStyle } from '@/lib/card-shadow';
import { eventTimeLabel, eventVenueParts, formatListingDate, statusLabel } from '@/lib/format';
import { isArchivedTicket } from '@/lib/ticket-label';
import { cn } from '@/lib/utils';

function ticketTone(status: Ticket['status']): TagTone {
  if (status === 'valid') return 'confirm';
  if (status === 'reserved') return 'amber';
  return 'muted';
}

export function TicketCard({
  ticket,
  event,
  onShow,
}: {
  ticket: Ticket;
  event?: ParcheEvent;
  onShow?: () => void;
}) {
  const archived = isArchivedTicket(ticket.status);
  const { venue } = eventVenueParts(event?.venueName ?? '', event?.addressText);
  const dateLabel = event ? formatListingDate(event.startsAt) : ticket.eventId;
  const timeLabel = event ? eventTimeLabel(event.startsAt, event.endsAt) : '';
  const meta = [venue, dateLabel, timeLabel].filter(Boolean).join(' · ');

  return (
    <View className={cn('w-full gap-ds-8', archived && 'opacity-90')}>
      <View className="relative w-full overflow-hidden rounded-images bg-muted" style={archived ? undefined : cardShadowStyle}>
        {event?.flyerUrl ? (
          <FlyerImage uri={event.flyerUrl} className="aspect-square w-full" aspectRatio={1} muted={archived} />
        ) : (
          <View className="aspect-square w-full items-center justify-center bg-muted">
            <Text variant="headingSm" className="uppercase text-muted-foreground">
              {(event?.name ?? 'P').slice(0, 2)}
            </Text>
          </View>
        )}
      </View>
      <View className="gap-ds-4">
        <Text className={cn('font-bold', archived && 'text-muted-foreground line-through')} numberOfLines={2}>
          {event?.name ?? 'Entrada'}
        </Text>
        <Text variant="muted" numberOfLines={2}>
          {meta}
        </Text>
        <Tag tone={ticketTone(ticket.status)}>{statusLabel(ticket.status)}</Tag>
      </View>
      {ticket.status === 'valid' && onShow ? (
        <Button onPress={onShow}>
          <Text>Mostrar</Text>
        </Button>
      ) : null}
    </View>
  );
}

/** Same compact 2-up catalog grid as event lists. */
export function TicketFeed({ children }: { children: ReactNode }) {
  return <EventFeed>{children}</EventFeed>;
}
