import type { ReactNode } from 'react';
import { Image } from 'expo-image';
import { View } from 'react-native';

import { PressScale } from '@/components/motion';
import { Text } from '@/components/ui/text';
import type { Artist } from '@/data/types';

export function ArtistRow({
  artist,
  onPress,
  trailing,
}: {
  artist: Artist;
  onPress?: () => void;
  trailing?: ReactNode;
}) {
  const initials = artist.stageName.slice(0, 2).toUpperCase();
  const body = (
    <View className="min-h-11 flex-row items-center gap-ds-12 py-ds-8">
      {artist.avatarUrl ? (
        <Image source={{ uri: artist.avatarUrl }} className="size-12 rounded-full bg-muted" />
      ) : (
        <View className="size-12 items-center justify-center rounded-full bg-muted">
          <Text variant="caption" className="font-bold">
            {initials}
          </Text>
        </View>
      )}
      <View className="min-w-0 flex-1 gap-ds-4">
        <Text variant="subheading" numberOfLines={1}>
          {artist.stageName}
        </Text>
        {artist.bio ? (
          <Text variant="muted" numberOfLines={1}>
            {artist.bio}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );

  if (!onPress) {
    return body;
  }

  return <PressScale onPress={onPress}>{body}</PressScale>;
}
