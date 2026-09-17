import { useEffect } from 'react';

import { AuthSheet } from '@/components/auth-sheet';
import { useAuthSheet } from '@/data/auth-sheet-store';
import { useOnboarding } from '@/data/onboarding-store';
import { useAuthSnapshot } from '@/data/session';

export function AuthSheetHost() {
  const visible = useAuthSheet((s) => s.visible);
  const onSuccess = useAuthSheet((s) => s.onSuccess);
  const close = useAuthSheet((s) => s.close);
  const open = useAuthSheet((s) => s.open);
  const bootPrompted = useAuthSheet((s) => s.bootPrompted);
  const markBootPrompted = useAuthSheet((s) => s.markBootPrompted);
  const { isLoggedIn, hydrated } = useAuthSnapshot();
  const onboardingSeen = useOnboarding((s) => s.seen);
  const onboardingHydrated = useOnboarding((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated || !onboardingHydrated || !onboardingSeen || bootPrompted) {
      return;
    }
    markBootPrompted();
    if (!isLoggedIn) {
      open();
    }
  }, [hydrated, onboardingHydrated, onboardingSeen, isLoggedIn, bootPrompted, open, markBootPrompted]);

  return (
    <AuthSheet
      visible={visible}
      onClose={close}
      onSuccess={() => {
        onSuccess?.();
      }}
    />
  );
}
