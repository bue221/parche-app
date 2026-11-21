import { useEffect } from 'react';
import { usePathname } from 'expo-router';

import { AuthSheet } from '@/components/auth-sheet';
import { useAuthSheet } from '@/data/auth-sheet-store';
import { useOnboarding } from '@/data/onboarding-store';
import { useAuthSnapshot } from '@/data/session';
import { hasPersistedSession } from '@/data/token-store';
import { isAuthPath } from '@/lib/auth-routes';

export function AuthSheetHost() {
  const visible = useAuthSheet((s) => s.visible);
  const onSuccess = useAuthSheet((s) => s.onSuccess);
  const close = useAuthSheet((s) => s.close);
  const open = useAuthSheet((s) => s.open);
  const bootPrompted = useAuthSheet((s) => s.bootPrompted);
  const markBootPrompted = useAuthSheet((s) => s.markBootPrompted);
  const { isLoggedIn, hydrated, sessionPending } = useAuthSnapshot();
  const onboardingSeen = useOnboarding((s) => s.seen);
  const onboardingHydrated = useOnboarding((s) => s.hydrated);
  const path = usePathname();
  const authRoute = isAuthPath(path);

  useEffect(() => {
    if (authRoute && visible) {
      close();
    }
  }, [authRoute, visible, close]);

  // Session can land after bootPrompted, or a guest CTA may open the sheet
  // just before login resolves — never keep it over an authenticated shell.
  useEffect(() => {
    if ((isLoggedIn || sessionPending) && visible) {
      close();
    }
  }, [isLoggedIn, sessionPending, visible, close]);

  useEffect(() => {
    if (!hydrated || !onboardingHydrated || !onboardingSeen || bootPrompted) {
      return;
    }
    markBootPrompted();
    // Cookie/body refresh may still be applying /me — don't flash the guest sheet.
    if (!isLoggedIn && !authRoute && !hasPersistedSession()) {
      open();
    }
  }, [hydrated, onboardingHydrated, onboardingSeen, isLoggedIn, authRoute, bootPrompted, open, markBootPrompted]);

  if (authRoute) {
    return null;
  }

  return (
    <AuthSheet
      visible={visible && !isLoggedIn}
      onClose={close}
      onSuccess={() => {
        onSuccess?.();
      }}
    />
  );
}
