import { router, type Href } from 'expo-router';
import { useEffect } from 'react';

import { setPendingPath, useAuthSnapshot } from '@/data/session';

export function useRequireAuth(nextPath: string): boolean {
  const { isLoggedIn, hydrated } = useAuthSnapshot();

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!isLoggedIn) {
      setPendingPath(nextPath);
      router.replace('/auth/login' as Href);
    }
  }, [hydrated, isLoggedIn, nextPath]);

  return hydrated && isLoggedIn;
}
