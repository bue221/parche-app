import { Image } from 'expo-image';
import { View } from 'react-native';

import { Surface } from '@/components/surface';
import { Text } from '@/components/ui/text';

export function ArtistPreview({
  stageName,
  bio,
  avatarUrl,
}: {
  stageName: string;
  bio: string;
  avatarUrl?: string;
}) {
  const initials = (stageName || 'P').slice(0, 2).toUpperCase();
  return (
    <Surface muted className="flex-row items-center gap-ds-16">
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} className="size-20 rounded-full bg-muted" />
      ) : (
        <View className="size-20 items-center justify-center rounded-full bg-background">
          <Text variant="headingSm">{initials}</Text>
        </View>
      )}
      <View className="min-w-0 flex-1 gap-ds-4">
        <Text variant="subheading" numberOfLines={1}>
          {stageName || 'Nombre de escena'}
        </Text>
        <Text variant="muted" numberOfLines={2}>
          {bio || 'La bio sale aquí.'}
        </Text>
      </View>
    </Surface>
  );
}
