import { Image as ExpoImage } from 'expo-image';
import { Platform, Image as RNImage, type ImageStyle, type StyleProp } from 'react-native';

import { cn } from '@/lib/utils';

/**
 * expo-image on web can ResizeObserver-loop when sized only by className.
 * Native Image is enough for posters on web and keeps the tree stable.
 */
export function FlyerImage({
  uri,
  className,
  style,
  aspectRatio = 3 / 4,
}: {
  uri: string;
  className?: string;
  style?: StyleProp<ImageStyle>;
  aspectRatio?: number;
}) {
  if (Platform.OS === 'web') {
    return (
      <RNImage
        source={{ uri }}
        className={cn('bg-muted', className)}
        resizeMode="cover"
        style={[{ width: '100%', aspectRatio }, style]}
      />
    );
  }

  return <ExpoImage source={{ uri }} className={cn('bg-muted', className)} contentFit="cover" />;
}
