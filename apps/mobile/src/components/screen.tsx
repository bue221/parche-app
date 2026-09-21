import { useIsFocused, usePathname } from 'expo-router';
import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { Platform, ScrollView, View, type LayoutChangeEvent, type ScrollViewProps } from 'react-native';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackBar } from '@/components/back-bar';
import { PageHeader } from '@/components/page-header';
import { WebHead } from '@/components/web-head';
import { BottomTabInset, MaxContentWidth, MaxFormWidth, WebCompactBottom, WebCompactTop } from '@/constants/theme';
import { useCompactLayout } from '@/hooks/use-compact-layout';
import { cn } from '@/lib/utils';

const WEB_TAB_PATHS = new Set(['/', '/favorites', '/wallet', '/explore', '/tickets', '/parche', '/operate']);
const PATH_HEAD_TITLES: Record<string, string> = {
  '/': 'Explorar',
};
const native = Platform.OS !== 'web';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  className?: string;
  contentClassName?: string;
  padded?: boolean;
  width?: 'page' | 'form' | 'full';
  center?: boolean;
  flush?: boolean;
  back?: boolean;
  onScroll?: ScrollViewProps['onScroll'];
  title?: string;
  lead?: string;
  /** Browser tab / og:title. Defaults to `title`, then the tab path label. */
  headTitle?: string;
  headDescription?: string;
  headImage?: string;
  /** Set document title even if this screen is not the focused route (404). */
  headAlways?: boolean;
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
  headTitle,
  headDescription,
  headImage,
  headAlways = false,
  eyebrow,
  mark,
  actions,
  headerAction,
  stickyHeader,
  footer,
  refreshControl,
  onScroll,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const web = Platform.OS === 'web';
  const compact = useCompactLayout();
  const path = usePathname();
  const focused = useIsFocused();
  const inWebTabs = web && WEB_TAB_PATHS.has(path);
  const pageHead = focused || headAlways ? (
    <WebHead
      title={headTitle ?? title ?? PATH_HEAD_TITLES[path]}
      description={headDescription ?? lead}
      image={headImage}
    />
  ) : null;
  const [footerHeight, setFooterHeight] = useState(0);
  const topSafe = flush
    ? 0
    : web
      ? inWebTabs && compact
        ? WebCompactTop
        : 0
      : insets.top;
  const pagePadX = padded ? (web && !compact ? 40 : 16) : 0;
  const pagePadTop = web ? (inWebTabs ? (compact ? 16 : 24) : compact ? 24 : 32) : 16;
  const contentPadding = flush
    ? { flexGrow: 1 }
    : {
        paddingTop: stickyHeader ? 24 : pagePadTop,
        paddingBottom: web
          ? (inWebTabs && compact ? WebCompactBottom + 16 : 48) + (footer ? footerHeight : 0)
          : footer
            ? 24
            : insets.bottom + BottomTabInset + 24,
        paddingHorizontal: pagePadX,
        flexGrow: 1,
        alignItems: center ? ('center' as const) : ('stretch' as const),
        justifyContent: center ? ('center' as const) : ('flex-start' as const),
      };
  const widthStyle =
    width === 'full'
      ? { width: '100%' as const, alignSelf: 'stretch' as const, flex: scrollEnabled ? undefined : 1 }
      : {
          maxWidth: width === 'form' ? MaxFormWidth : MaxContentWidth,
          width: '100%' as const,
          alignSelf: 'center' as const,
        };
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
      className="z-40 overflow-visible bg-background"
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
        {pageHead}
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
      scrollEventThrottle={onScroll ? 16 : undefined}
      onScroll={onScroll}
      refreshControl={refreshControl}>
      {inner}
    </KeyboardAwareScrollView>
  ) : (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={contentPadding}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="never"
      scrollEventThrottle={onScroll ? 16 : undefined}
      onScroll={onScroll}
      refreshControl={refreshControl}>
      {inner}
    </ScrollView>
  );

  return (
    <View className={cn('flex-1 bg-background', className)} style={frameStyle}>
      {pageHead}
      {stickyChrome}
      {scroller}
      {stickyFooter}
    </View>
  );
}
