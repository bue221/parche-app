import type { ReactNode } from 'react';
import { View } from 'react-native';

import { FlyerImage } from '@/components/flyer-image';
import { Surface } from '@/components/surface';
import { Text } from '@/components/ui/text';

export function HubCard({
  title,
  imageUri,
  tags,
  children,
}: {
  title: string;
  imageUri?: string | null;
  tags?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Surface elevated className="gap-ds-12">
      <View className="flex-row items-start gap-ds-12">
        {imageUri ? (
          <View className="size-16 overflow-hidden rounded-images bg-muted">
            <FlyerImage uri={imageUri} className="h-full w-full" aspectRatio={1} />
          </View>
        ) : (
          <View className="size-16 items-center justify-center rounded-images bg-muted">
            <Text variant="caption" className="font-bold uppercase">
              {title.slice(0, 2)}
            </Text>
          </View>
        )}
        <View className="min-w-0 flex-1 gap-ds-8">
          <Text variant="subheading" numberOfLines={2}>
            {title}
          </Text>
          {tags ? <View className="flex-row flex-wrap gap-ds-8">{tags}</View> : null}
        </View>
      </View>
      {children}
    </Surface>
  );
}
