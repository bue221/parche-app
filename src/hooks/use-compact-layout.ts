import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const QUERY = '(max-width: 767px)';

function readCompact() {
  if (Platform.OS !== 'web') {
    return true;
  }
  if (typeof window === 'undefined') {
    return true;
  }
  return window.matchMedia(QUERY).matches;
}

export function useCompactLayout() {
  const [compact, setCompact] = useState(readCompact);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }
    const mq = window.matchMedia(QUERY);
    const apply = () => setCompact(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return compact;
}
