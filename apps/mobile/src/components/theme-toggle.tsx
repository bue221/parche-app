import { Moon, Smartphone, Sun } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { nextThemePref, THEME_PREF_LABEL, useThemePref, type ThemePref } from '@/data/theme-store';
import { cn } from '@/lib/utils';

const THEME_ICONS = {
  system: Smartphone,
  light: Sun,
  dark: Moon,
} as const;

const THEME_NEXT_HINT: Record<ThemePref, string> = {
  system: 'Cambiar a tema claro',
  light: 'Cambiar a tema oscuro',
  dark: 'Seguir el tema del teléfono',
};

export function ThemeToggle({ className }: { className?: string }) {
  const pref = useThemePref((s) => s.pref);
  const setPref = useThemePref((s) => s.setPref);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Apariencia: ${THEME_PREF_LABEL[pref]}`}
      accessibilityHint={THEME_NEXT_HINT[pref]}
      hitSlop={8}
      onPress={() => setPref(nextThemePref(pref))}
      className={cn('size-11 items-center justify-center rounded-full active:opacity-60', className)}>
      <Icon as={THEME_ICONS[pref]} size={18} />
    </Pressable>
  );
}
