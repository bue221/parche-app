import { router, type Href } from 'expo-router';
import { View } from 'react-native';

import { SettingsRow } from '@/components/settings-row';
import { Text } from '@/components/ui/text';
import type { EventWithExtras } from '@/data/types';
import { listingGaps, type ListingGap } from '@/lib/listing-setup';

const GAP_COPY: Record<ListingGap, { label: string; href: (id: string) => Href }> = {
  flyer: { label: 'Flyer', href: (id) => `/event/${id}/edit` as Href },
  pin: { label: 'Pin en el mapa', href: (id) => `/event/${id}/edit` as Href },
  tickets: { label: 'Tipos de tiquete', href: (id) => `/event/${id}/tickets` as Href },
  lineup: { label: 'Lineup', href: (id) => `/event/${id}/lineup` as Href },
};

const ORDER: ListingGap[] = ['flyer', 'pin', 'tickets', 'lineup'];

export function EventSetupChecklist({ event }: { event: EventWithExtras }) {
  const gaps = new Set(listingGaps(event));
  return (
    <View>
      <Text variant="muted" className="mb-ds-8">
        Equipo es opcional y no bloquea publicar.
      </Text>
      {ORDER.map((gap) => {
        const item = GAP_COPY[gap];
        const done = !gaps.has(gap);
        return (
          <SettingsRow
            key={gap}
            label={item.label}
            detail={done ? 'Listo' : 'Falta'}
            onPress={() => router.push(item.href(event.id))}
          />
        );
      })}
    </View>
  );
}
