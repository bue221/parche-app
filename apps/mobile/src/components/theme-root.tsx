import { useEffect, type PropsWithChildren } from 'react';
import { Platform, View } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { colorScheme } from 'nativewind';

import { useResolvedColorScheme, useTheme } from '@/hooks/use-theme';
import { useOnboarding } from '@/data/onboarding-store';
import { debugLog } from '@/data/log';
import { useThemePref } from '@/data/theme-store';
import { THEME_VARS } from '@/lib/theme';

function applyNativeScheme(pref: 'system' | 'light' | 'dark') {
  try {
    // NativeWind maps `system` to Appearance.setColorScheme('unspecified') on RN 0.82+,
    // which is what lets the app live-follow the device theme.
    colorScheme.set(pref === 'system' ? 'system' : pref);
  } catch (err) {
    debugLog('theme', 'nativewind colorScheme.set failed', {
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

export function ThemeRoot({ children }: PropsWithChildren) {
  const scheme = useResolvedColorScheme();
  const pref = useThemePref((s) => s.pref);
  const theme = useTheme();
  const hydrateTheme = useThemePref((s) => s.hydrate);
  const hydrateOnboarding = useOnboarding((s) => s.hydrate);

  useEffect(() => {
    void hydrateTheme();
    void hydrateOnboarding();
  }, [hydrateTheme, hydrateOnboarding]);

  useEffect(() => {
    applyNativeScheme(pref);
    void SystemUI.setBackgroundColorAsync(theme.background);

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', scheme === 'dark');
      document.documentElement.classList.toggle('light', scheme === 'light');
      document.documentElement.style.backgroundColor = theme.background;
    }
  }, [pref, scheme, theme.background]);

  // Plain View + vars(): a NativeWind className here wraps Expo Router's Stack, and
  // css-interop stringifies those children when CSS variables upgrade after hydrate.
  return (
    <View style={[THEME_VARS[scheme], { flex: 1, backgroundColor: theme.background }]}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </View>
  );
}
