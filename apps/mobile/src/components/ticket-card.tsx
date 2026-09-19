import { View } from 'react-native';

import { FlyerImage } from '@/components/flyer-image';
import { PressScale } from '@/components/motion';
import { Text } from '@/components/ui/text';
import type { ParcheEvent, Ticket } from '@/data/types';
import { cardShadowStyle } from '@/lib/card-shadow';
import { eventTimeLabel, eventVenueParts, formatListingDate } from '@/lib/format';
import { walletCountLabel, walletEventCounts } from '@/lib/ticket-label';
import { cn } from '@/lib/utils';

/** Compact event card for the wallet rail. Tap opens that event's boletas. */
export function TicketEventCard({
  tickets,
  event,
  onPress,
}: {
  tickets: Ticket[];
  event?: ParcheEvent;
  onPress?: () => void;
}) {
  const ticket = tickets[0];
  if (!ticket) return null;

  const counts = walletEventCounts(tickets);
  const countLabel = walletCountLabel(counts);
  const archived = counts.available === 0 && counts.pending === 0;
  const { venue } = eventVenueParts(event?.venueName ?? '', event?.addressText);
  const dateLabel = event ? formatListingDate(event.startsAt) : ticket.eventId;
  const timeLabel = event ? eventTimeLabel(event.startsAt, event.endsAt) : '';
  const meta = [venue, dateLabel, timeLabel].filter(Boolean).join(' · ');
  const label = event?.name ?? 'Entrada';

  return (
    <PressScale
      onPress={onPress}
      accessibilityLabel={`${label}, ${countLabel}`}
      className={cn('w-full', archived && 'opacity-90')}>
      <View className="w-full gap-ds-8">
        <View
          className="w-full overflow-hidden rounded-images bg-muted"
          style={archived ? undefined : cardShadowStyle}>
          {event?.flyerUrl ? (
            <FlyerImage uri={event.flyerUrl} className="aspect-square w-full" aspectRatio={1} muted={archived} />
          ) : (
            <View className="aspect-square w-full items-center justify-center bg-muted">
              <Text variant="headingSm" className="uppercase text-muted-foreground">
                {label.slice(0, 2)}
              </Text>
            </View>
          )}
        </View>
        <View className="gap-ds-4">
          <Text className={cn('font-bold', archived && 'text-muted-foreground line-through')} numberOfLines={2}>
            {label}
          </Text>
          <Text variant="muted" numberOfLines={1}>
            {countLabel}
          </Text>
          <Text variant="muted" numberOfLines={2}>
            {meta}
          </Text>
        </View>
      </View>
    </PressScale>
  );
}

export function firstWalletTicket(tickets: Ticket[]) {
  return (
    tickets.find((ticket) => ticket.status === 'valid') ??
    tickets.find((ticket) => ticket.status === 'reserved') ??
    tickets[0]
  );
}
