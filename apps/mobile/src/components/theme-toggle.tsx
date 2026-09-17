import { Moon, Sun } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { useThemePref } from '@/data/theme-store';
import { useResolvedColorScheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const scheme = useResolvedColorScheme();
  const setPref = useThemePref((s) => s.setPref);
  const next = scheme === 'dark' ? 'light' : 'dark';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={scheme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      hitSlop={8}
      onPress={() => setPref(next)}
      className={cn('size-11 items-center justify-center rounded-full active:opacity-60', className)}>
      <Icon as={scheme === 'dark' ? Sun : Moon} size={18} />
    </Pressable>
  );
}
