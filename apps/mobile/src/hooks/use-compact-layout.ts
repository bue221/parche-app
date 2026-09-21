import { useLayoutEffect, useState } from 'react';
import { Platform } from 'react-native';

const COMPACT_QUERY = '(max-width: 767px)';
const WIDE_QUERY = '(min-width: 900px)';

function readMatch(query: string, fallback: boolean) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return fallback;
  }
  return window.matchMedia(query).matches;
}

function useMatchMedia(query: string, fallback: boolean) {
  const [matches, setMatches] = useState(() => readMatch(query, fallback));

  useLayoutEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }
    const mq = window.matchMedia(query);
    const apply = () => setMatches(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [query]);

  return matches;
}

export function useCompactLayout() {
  return useMatchMedia(COMPACT_QUERY, true);
}

/** List + map split (desktop web ≥900px). Phone and tablet web stay on the FAB toggle. */
export function useWideLayout() {
  const wide = useMatchMedia(WIDE_QUERY, false);
  return Platform.OS === 'web' && wide;
}
