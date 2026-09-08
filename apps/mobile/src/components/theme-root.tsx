import { useEffect, type PropsWithChildren } from 'react';
import { Platform, View } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';

import { useResolvedColorScheme, useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

export function ThemeRoot({ children }: PropsWithChildren) {
  const scheme = useResolvedColorScheme();
  const theme = useTheme();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.background);

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', scheme === 'dark');
      document.documentElement.classList.toggle('light', scheme === 'light');
      document.documentElement.style.backgroundColor = theme.background;
    }
  }, [scheme, theme.background]);

  return (
    <View
      className={cn('flex-1 bg-background', scheme === 'dark' && 'dark')}
      style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </View>
  );
}
