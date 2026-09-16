import '@/lib/silence-web-linking';
import '@/lib/nativewind-interop';

import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthSheetHost } from '@/components/auth-sheet-host';
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppQueryProvider>
        <ThemeProvider value={NAV_THEME[scheme]}>
          <ThemeRoot>
            <AnimatedSplashOverlay />
            <OnboardingOverlay />
            <SessionLifecycle />
            <DeepLinkListener />
            <AuthSheetHost />
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'fade',
                contentStyle: { backgroundColor: NAV_THEME[scheme].colors.background },
              }}>
              <Stack.Screen name="auth" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
            </Stack>
            <ToastHost />
          </ThemeRoot>
        </ThemeProvider>
      </AppQueryProvider>
    </GestureHandlerRootView>
  );
}
