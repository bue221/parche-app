import '@/lib/silence-web-linking';

import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { DeepLinkListener } from '@/components/deep-link-listener';
import { OnboardingOverlay } from '@/components/onboarding-overlay';
import { SessionLifecycle } from '@/components/session-lifecycle';
import { ThemeRoot } from '@/components/theme-root';
import { ToastHost } from '@/components/toast-host';
import { useResolvedColorScheme } from '@/hooks/use-theme';
import { AppQueryProvider } from '@/lib/query';
import { NAV_THEME } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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
    <AppQueryProvider>
      <ThemeProvider value={NAV_THEME[scheme]}>
        <ThemeRoot>
          <AnimatedSplashOverlay />
          <OnboardingOverlay />
          <SessionLifecycle />
          <DeepLinkListener />
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
          <ToastHost />
        </ThemeRoot>
      </ThemeProvider>
    </AppQueryProvider>
  );
}
