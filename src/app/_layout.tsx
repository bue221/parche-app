import { useFonts } from 'expo-font';
import { ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { DeepLinkListener } from '@/components/deep-link-listener';
import { SessionLifecycle } from '@/components/session-lifecycle';
import { ThemeRoot } from '@/components/theme-root';
import { useResolvedColorScheme } from '@/hooks/use-theme';
import { NAV_THEME } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const scheme = useResolvedColorScheme();
  const [fontsLoaded] = useFonts({
    Inter: require('../../assets/fonts/Inter-Regular.ttf'),
    'Inter-Light': require('../../assets/fonts/Inter-Light.ttf'),
    'Inter-Bold': require('../../assets/fonts/Inter-Bold.ttf'),
    Antonio: require('../../assets/fonts/Antonio-Regular.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={NAV_THEME[scheme]}>
      <ThemeRoot>
        <AnimatedSplashOverlay />
        <SessionLifecycle />
        <DeepLinkListener />
        <AppTabs />
      </ThemeRoot>
    </ThemeProvider>
  );
}
