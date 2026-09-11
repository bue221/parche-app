import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { formatWhen } from '@/lib/format';
import type { ParcheEvent } from '@/data/types';

export function EventCard({
  event,
  onPress,
}: {
  event: ParcheEvent;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="gap-ds-8 active:opacity-70">
      {event.flyerUrl ? (
        <Image
          source={{ uri: event.flyerUrl }}
          className="aspect-[4/5] w-full rounded-images bg-muted"
          contentFit="cover"
        />
      ) : (
        <View className="aspect-[4/5] w-full items-center justify-center rounded-images bg-muted">
          <Text variant="headingSm">{event.name.slice(0, 2).toUpperCase()}</Text>
        </View>
      )}
      <Text variant="caption" className="uppercase text-muted-foreground">
        {formatWhen(event.startsAt)}
      </Text>
      <Text variant="subheading">{event.name}</Text>
      <Text variant="muted">{event.venueName}</Text>
    </Pressable>
  );
}
