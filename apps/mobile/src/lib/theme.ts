import { DarkTheme, DefaultTheme } from 'expo-router';
import { vars } from 'nativewind';

export const THEME = {
  light: {
    background: '#ffffff',
    foreground: '#000000',
    card: '#ffffff',
    cardForeground: '#000000',
    popover: '#ffffff',
    popoverForeground: '#000000',
    primary: '#3ddcff',
    primaryForeground: '#000000',
    secondary: '#333333',
    secondaryForeground: '#ffffff',
    muted: '#eeeeee',
    mutedForeground: '#595959',
    accent: '#d6f6ff',
    accentForeground: '#000000',
    destructive: '#ff4d3d',
    destructiveForeground: '#000000',
    border: '#d9d9d9',
    input: '#d9d9d9',
    ring: '#3ddcff',
    confirm: '#7ffeb1',
    neonSoft: '#d6f6ff',
    voltSoft: '#d6ffec',
    amberSoft: '#fff3d0',
    dangerSoft: '#ffe6e3',
  },
  dark: {
    background: '#000000',
    foreground: '#ffffff',
    card: '#000000',
    cardForeground: '#ffffff',
    popover: '#000000',
    popoverForeground: '#ffffff',
    primary: '#3ddcff',
    primaryForeground: '#000000',
    secondary: '#333333',
    secondaryForeground: '#ffffff',
    muted: '#333333',
    mutedForeground: '#808080',
    accent: '#0a2830',
    accentForeground: '#ffffff',
    destructive: '#ff4d3d',
    destructiveForeground: '#000000',
    border: '#333333',
    input: '#333333',
    ring: '#3ddcff',
    confirm: '#7ffeb1',
    neonSoft: '#0a2830',
    voltSoft: '#0e2a1c',
    amberSoft: '#2e2408',
    dangerSoft: '#3a1410',
  },
} as const;

export const NAV_THEME = {
  light: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};

function cssVars(t: (typeof THEME)[keyof typeof THEME]) {
  return vars({
    '--color-background': t.background,
    '--color-foreground': t.foreground,
    '--color-card': t.card,
    '--color-card-foreground': t.cardForeground,
    '--color-popover': t.popover,
    '--color-popover-foreground': t.popoverForeground,
    '--color-primary': t.primary,
    '--color-primary-foreground': t.primaryForeground,
    '--color-secondary': t.secondary,
    '--color-secondary-foreground': t.secondaryForeground,
    '--color-muted': t.muted,
    '--color-muted-foreground': t.mutedForeground,
    '--color-accent': t.accent,
    '--color-accent-foreground': t.accentForeground,
    '--color-destructive': t.destructive,
    '--color-destructive-foreground': t.destructiveForeground,
    '--color-border': t.border,
    '--color-input': t.input,
    '--color-ring': t.ring,
    '--color-confirm': t.confirm,
    '--color-neon-soft': t.neonSoft,
    '--color-volt-soft': t.voltSoft,
    '--color-amber-soft': t.amberSoft,
    '--color-danger-soft': t.dangerSoft,
  });
}

/** Applied as style on ThemeRoot. Avoid className="dark" on that view — css-interop breaks the Stack. */
export const THEME_VARS = {
  light: cssVars(THEME.light),
  dark: cssVars(THEME.dark),
} as const;
