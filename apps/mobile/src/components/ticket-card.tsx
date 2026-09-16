import { Children, type ReactNode } from 'react';
import { Platform, View } from 'react-native';

import { FlyerImage } from '@/components/flyer-image';
import { Surface } from '@/components/surface';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/tag';
import { Text } from '@/components/ui/text';
import type { ParcheEvent, Ticket } from '@/data/types';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { formatWhen, statusLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

export const TICKET_CARD_MIN_PX = 280;
export const TICKET_CARD_MAX_PX = 400;

const desktopTicketGridStyle = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(${TICKET_CARD_MIN_PX}px, ${TICKET_CARD_MAX_PX}px))`,
  gap: 24,
  justifyContent: 'start',
} as object;

export function TicketCard({
  ticket,
  event,
  onShow,
}: {
  ticket: Ticket;
  event?: ParcheEvent;
  onShow?: () => void;
}) {
  const compact = useCompactLayout();
  const frame = Platform.OS === 'web' && !compact ? 'w-full max-w-[400px]' : 'w-full';

  return (
    <Surface elevated className={cn('overflow-hidden p-0', frame)}>
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
          <Tag tone={ticket.status === 'valid' ? 'confirm' : ticket.status === 'reserved' ? 'amber' : 'muted'}>
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

/** Full-width stack on phone; 280–400px pass grid on desktop web. */
export function TicketFeed({ children }: { children: ReactNode }) {
  const compact = useCompactLayout();
  if (Platform.OS !== 'web' || compact) {
    return <View className="w-full gap-ds-16">{children}</View>;
  }
  return (
    <View className="w-full" style={desktopTicketGridStyle}>
      {Children.map(children, (child) => {
        if (child == null || typeof child === 'boolean') return child;
        return <View className="min-w-0 w-full max-w-[400px]">{child}</View>;
      })}
    </View>
  );
}
