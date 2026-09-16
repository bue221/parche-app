import { Image as ExpoImage } from 'expo-image';
import { useEffect, useState } from 'react';
import { Platform, Image as RNImage, View, type ImageStyle, type StyleProp } from 'react-native';

import { debugLog } from '@/data/log';
import { cn } from '@/lib/utils';

/**
 * expo-image on web can ResizeObserver-loop when sized only by className.
 * Native Image is enough for posters on web and keeps the tree stable.
 * On native, always pass width/height — className alone leaves expo-image at 0×0.
 */
export function FlyerImage({
  uri,
  className,
  style,
  aspectRatio,
}: {
  uri: string;
  className?: string;
  style?: StyleProp<ImageStyle>;
  aspectRatio?: number;
}) {
  const [failed, setFailed] = useState(false);
  const fill: ImageStyle = { width: '100%', ...(aspectRatio != null ? { aspectRatio } : { height: '100%' }) };

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (failed || !uri) {
    return <View className={cn('bg-muted', className)} style={fill} />;
  }

  if (Platform.OS === 'web') {
    return (
      <RNImage
        source={{ uri }}
        className={cn('bg-muted', className)}
        resizeMode="cover"
        style={[fill, style]}
        onError={() => {
          debugLog('media', 'flyer failed', { uri });
          setFailed(true);
        }}
      />
    );
  }

  return (
    <ExpoImage
      source={{ uri }}
      className={cn('bg-muted', className)}
      style={[fill, style]}
      contentFit="cover"
      cachePolicy="memory-disk"
      recyclingKey={uri}
      transition={200}
      onError={() => {
        debugLog('media', 'flyer failed', { uri });
        setFailed(true);
      }}
    />
  );
}
