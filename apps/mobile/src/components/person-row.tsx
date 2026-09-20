import type { ReactNode } from 'react';
import { Image } from 'expo-image';
import { View } from 'react-native';

import { PressScale } from '@/components/motion';
import { Text } from '@/components/ui/text';
import { personInitials } from '@/lib/check-in';
import { cn } from '@/lib/utils';

export function PersonAvatar({
  name,
  uri,
  size = 48,
}: {
  name: string;
  uri?: string;
  size?: number;
}) {
  const initials = personInitials(name);
  if (uri) {
    return (
      <Image
        source={{ uri }}
        className="rounded-full bg-muted"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <View
      className="items-center justify-center rounded-full bg-aurora-soft"
      style={{ width: size, height: size }}>
      <Text variant="caption" className="font-bold">
        {initials}
      </Text>
    </View>
  );
}

export function PersonRow({
  name,
  detail,
  avatarUrl,
  tags,
  trailing,
  onPress,
  dimmed = false,
  compact = false,
}: {
  name: string;
  detail?: string;
  avatarUrl?: string;
  tags?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  dimmed?: boolean;
  compact?: boolean;
}) {
  const body = (
    <View className={cn('min-h-11 min-w-0 flex-1 flex-row items-center gap-ds-12 py-ds-8', dimmed && 'opacity-50')}>
      <PersonAvatar name={name} uri={avatarUrl} size={compact ? 40 : 48} />
      <View className="min-w-0 flex-1 flex-col justify-center gap-ds-4">
        <Text variant="subheading" numberOfLines={1}>
          {name}
        </Text>
        {detail ? (
          <Text variant="muted" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
        {tags ? <View className="flex-row flex-wrap gap-ds-8">{tags}</View> : null}
      </View>
    </View>
  );

  return (
    <View className="flex-row items-center gap-ds-8">
      {onPress ? (
        <PressScale onPress={onPress} className="min-w-0 flex-1" accessibilityLabel={name}>
          {body}
        </PressScale>
      ) : (
        body
      )}
      {trailing}
    </View>
  );
}
