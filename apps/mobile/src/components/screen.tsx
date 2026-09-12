import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, ScrollView, View, type ScrollViewProps } from 'react-native';
import type { PropsWithChildren, ReactNode } from 'react';

import { BackBar } from '@/components/back-bar';
import { BottomTabInset, MaxContentWidth, WebCompactBottom, WebCompactTop, WebNavHeight } from '@/constants/theme';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { cn } from '@/lib/utils';

const WEB_TAB_PATHS = new Set(['/', '/explore', '/tickets', '/parche', '/operate']);

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  className?: string;
  contentClassName?: string;
  padded?: boolean;
  width?: 'page' | 'full';
  center?: boolean;
  flush?: boolean;
  back?: boolean;
  footer?: ReactNode;
  refreshControl?: ScrollViewProps['refreshControl'];
}>;

export function Screen({
  children,
  scroll: scrollEnabled = true,
  className,
  contentClassName,
  padded = true,
  width = 'page',
  center = false,
  flush = false,
  back = false,
  footer,
  refreshControl,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const web = Platform.OS === 'web';
  const compact = useCompactLayout();
  const path = usePathname();
  const inWebTabs = web && WEB_TAB_PATHS.has(path);
  const padding = flush
    ? { flexGrow: 1 }
    : {
        paddingTop: web
          ? inWebTabs
            ? (compact ? WebCompactTop : WebNavHeight) + 16
            : compact
              ? 24
              : 32
          : insets.top + 16,
        paddingBottom: web
          ? inWebTabs
            ? compact
              ? WebCompactBottom + 16
              : 48
            : 48
          : footer
            ? 24
            : insets.bottom + BottomTabInset + 24,
        paddingHorizontal: padded ? (web && !compact ? 40 : 16) : 0,
        flexGrow: 1,
        alignItems: center ? ('center' as const) : ('stretch' as const),
        justifyContent: center ? ('center' as const) : ('flex-start' as const),
      };
  const inner = (
    <View
      className={cn('w-full', !scrollEnabled && 'flex-1', contentClassName)}
      style={
        width === 'page'
          ? { maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }
          : { width: '100%', alignSelf: 'stretch', flex: scrollEnabled ? undefined : 1 }
      }>
      {back ? <BackBar /> : null}
      {children}
    </View>
  );

  if (!scrollEnabled) {
    const body = (
      <View className={cn('flex-1 bg-background', className)} style={padding}>
        {inner}
      </View>
    );
    if (!footer) return body;
    return (
      <View className="flex-1 bg-background">
        {body}
        {footer}
      </View>
    );
  }

  const scroller = (
    <ScrollView
      className={cn('flex-1 bg-background', className)}
      contentContainerStyle={padding}
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}>
      {inner}
    </ScrollView>
  );

  if (!footer) return scroller;
  return (
    <View className="flex-1 bg-background">
      {scroller}
      {footer}
    </View>
  );
}
