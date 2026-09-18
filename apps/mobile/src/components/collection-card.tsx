import type { ReactNode } from 'react';
import { X } from 'lucide-react-native';
import { Platform, Pressable, View } from 'react-native';

import { FlyerImage } from '@/components/flyer-image';
import { PressScale } from '@/components/motion';
import { Text } from '@/components/ui/text';
import type { FavoriteCollection } from '@/lib/favorite-collections';
import { cardShadowStyle } from '@/lib/card-shadow';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

const desktopCollectionGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
  gap: 24,
} as object;

function CoverFallback({ title, className }: { title: string; className?: string }) {
  return (
    <View className={cn('items-center justify-center bg-muted', className)}>
      <Text variant="headingSm" className="uppercase text-muted-foreground">
        {title.slice(0, 2)}
      </Text>
    </View>
  );
}

function CoverTile({
  uri,
  title,
  className,
  fallback = false,
}: {
  uri?: string;
  title: string;
  className?: string;
  fallback?: boolean;
}) {
  if (uri) {
    return (
      <View className={cn('overflow-hidden bg-muted', className)}>
        <FlyerImage uri={uri} className="h-full w-full" />
      </View>
    );
  }
  if (fallback) {
    return <CoverFallback title={title} className={className} />;
  }
  return <View className={cn('bg-muted', className)} />;
}

function CollectionCollage({ urls, title }: { urls: string[]; title: string }) {
  const tiles = [0, 1, 2, 3].map((index) => urls[index]);
  return (
    <View className="aspect-square w-full flex-row gap-[2px] overflow-hidden rounded-images bg-surface" style={cardShadowStyle}>
      <View className="min-h-0 min-w-0 flex-1 gap-[2px]">
        <CoverTile uri={tiles[0]} title={title} className="min-h-0 flex-1" fallback />
        <CoverTile uri={tiles[2]} title={title} className="min-h-0 flex-1" />
      </View>
      <View className="min-h-0 min-w-0 flex-1 gap-[2px]">
        <CoverTile uri={tiles[1]} title={title} className="min-h-0 flex-1" />
        <CoverTile uri={tiles[3]} title={title} className="min-h-0 flex-1" />
      </View>
    </View>
  );
}

function CollectionCover({ urls, title, collage }: { urls: string[]; title: string; collage: boolean }) {
  if (collage) {
    return <CollectionCollage urls={urls} title={title} />;
  }
  const uri = urls[0];
  return (
    <View className="aspect-square w-full overflow-hidden rounded-images bg-muted" style={cardShadowStyle}>
      {uri ? <FlyerImage uri={uri} className="h-full w-full" aspectRatio={1} /> : <CoverFallback title={title} className="h-full w-full" />}
    </View>
  );
}

export function CollectionGrid({ children }: { children: ReactNode }) {
  const compact = useCompactLayout();
  if (Platform.OS !== 'web' || compact) {
    return <View className="w-full flex-row flex-wrap justify-between gap-y-ds-24">{children}</View>;
  }
  return (
    <View className="w-full" style={desktopCollectionGridStyle}>
      {children}
    </View>
  );
}

export function CollectionGridItem({ children }: { children: ReactNode }) {
  const compact = useCompactLayout();
  if (Platform.OS !== 'web' || compact) {
    return <View style={{ width: '48.2%' }}>{children}</View>;
  }
  return <View className="min-w-0 w-full">{children}</View>;
}

export function CollectionCard({
  collection,
  editing = false,
  onPress,
  onRemove,
}: {
  collection: FavoriteCollection;
  editing?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
}) {
  const theme = useTheme();

  return (
    <View className="relative w-full">
      <PressScale
        disabled={editing}
        onPress={onPress}
        accessibilityLabel={`${collection.title}. ${collection.subtitle}`}>
        <CollectionCover urls={collection.coverUrls} title={collection.title} collage={collection.collage} />
        <View className="mt-ds-12 gap-ds-4">
          <Text className="font-bold" numberOfLines={1}>
            {collection.title}
          </Text>
          <Text variant="muted" numberOfLines={1}>
            {collection.subtitle}
          </Text>
        </View>
      </PressScale>
      {editing && onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Quitar ${collection.title}`}
          hitSlop={8}
          onPress={onRemove}
          className="absolute right-ds-8 top-ds-8 z-10 size-8 items-center justify-center rounded-full bg-surface shadow-control active:opacity-70">
          <X size={16} color={theme.text} strokeWidth={2.4} />
        </Pressable>
      ) : null}
    </View>
  );
}
