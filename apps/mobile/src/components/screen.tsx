import { usePathname } from 'expo-router';
import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { Platform, ScrollView, View, type LayoutChangeEvent, type ScrollViewProps } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackBar } from '@/components/back-bar';
import { PageHeader } from '@/components/page-header';
import { BottomTabInset, MaxContentWidth, WebCompactBottom, WebCompactTop, WebNavHeight } from '@/constants/theme';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { cn } from '@/lib/utils';

const WEB_TAB_PATHS = new Set(['/', '/favorites', '/wallet', '/explore', '/tickets', '/parche', '/operate']);
const native = Platform.OS !== 'web';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  className?: string;
  contentClassName?: string;
  padded?: boolean;
  width?: 'page' | 'full';
  center?: boolean;
  flush?: boolean;
  back?: boolean;
  title?: string;
  lead?: string;
  eyebrow?: string;
  mark?: ReactNode;
  actions?: ReactNode;
  headerAction?: ReactNode;
  stickyHeader?: ReactNode;
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
  title,
  lead,
  eyebrow,
  mark,
  actions,
  headerAction,
  stickyHeader,
  footer,
  refreshControl,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const web = Platform.OS === 'web';
  const compact = useCompactLayout();
  const path = usePathname();
  const inWebTabs = web && WEB_TAB_PATHS.has(path);
  const [footerHeight, setFooterHeight] = useState(0);
  const topSafe = flush
    ? 0
    : web
      ? inWebTabs
        ? compact
          ? WebCompactTop
          : WebNavHeight
        : 0
      : insets.top;
  const pagePadX = padded ? (web && !compact ? 40 : 16) : 0;
  const pagePadTop = web ? (inWebTabs ? 16 : compact ? 24 : 32) : 16;
  const contentPadding = flush
    ? { flexGrow: 1 }
    : {
        paddingTop: stickyHeader ? 24 : pagePadTop,
        paddingBottom: web
          ? inWebTabs
            ? compact
              ? WebCompactBottom + 16
              : 48
            : 48
          : footer
            ? 24
            : insets.bottom + BottomTabInset + 24,
        paddingHorizontal: pagePadX,
        flexGrow: 1,
        alignItems: center ? ('center' as const) : ('stretch' as const),
        justifyContent: center ? ('center' as const) : ('flex-start' as const),
      };
  const widthStyle =
    width === 'page'
      ? { maxWidth: MaxContentWidth, width: '100%' as const, alignSelf: 'center' as const }
      : { width: '100%' as const, alignSelf: 'stretch' as const, flex: scrollEnabled ? undefined : 1 };
  const inner = (
    <View className={cn('w-full', !scrollEnabled && 'flex-1', contentClassName)} style={widthStyle}>
      {back ? <BackBar /> : null}
      {title ? (
        <PageHeader
          eyebrow={eyebrow}
          mark={mark}
          title={title}
          lead={lead}
          actions={actions}
          headerAction={headerAction}
        />
      ) : null}
      {children}
    </View>
  );
  const stickyChrome = stickyHeader ? (
    <View
      className="z-10 overflow-visible bg-background"
      style={{ paddingTop: pagePadTop, paddingHorizontal: pagePadX, paddingBottom: 8 }}>
      <View className="overflow-visible" style={width === 'page' ? widthStyle : { width: '100%' }}>
        {stickyHeader}
      </View>
    </View>
  ) : null;

  function onFooterLayout(event: LayoutChangeEvent) {
    const next = event.nativeEvent.layout.height;
    setFooterHeight((current) => (current === next ? current : next));
  }

  const stickyFooter = footer ? (
    <KeyboardStickyView enabled={native}>
      <View onLayout={onFooterLayout}>{footer}</View>
    </KeyboardStickyView>
  ) : null;

  const frameStyle = topSafe ? { paddingTop: topSafe } : undefined;

  if (!scrollEnabled) {
    return (
      <View className={cn('flex-1 bg-background', className)} style={frameStyle}>
        {stickyChrome}
        <View className="flex-1" style={contentPadding}>
          {inner}
        </View>
        {stickyFooter}
      </View>
    );
  }

  const scroller = native ? (
    <KeyboardAwareScrollView
      style={{ flex: 1 }}
      contentContainerStyle={contentPadding}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      contentInsetAdjustmentBehavior="never"
      bottomOffset={footer ? footerHeight + 16 : 24}
      extraKeyboardSpace={footer ? footerHeight : 0}
      refreshControl={refreshControl}>
      {inner}
    </KeyboardAwareScrollView>
  ) : (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={contentPadding}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="never"
      refreshControl={refreshControl}>
      {inner}
    </ScrollView>
  );

  return (
    <View className={cn('flex-1 bg-background', className)} style={frameStyle}>
      {stickyChrome}
      {scroller}
      {stickyFooter}
    </View>
  );
}
