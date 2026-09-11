import { router, type Href } from 'expo-router';
import { useEffect } from 'react';

import { setPendingPath, useAuthSnapshot } from '@/data/session';

export function useRequireAuth(nextPath: string): boolean {
  const { isLoggedIn } = useAuthSnapshot();

  useEffect(() => {
    if (!isLoggedIn) {
      setPendingPath(nextPath);
      router.replace('/auth/login' as Href);
    }
  }, [isLoggedIn, nextPath]);

  return isLoggedIn;
}
