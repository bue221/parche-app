import { Platform, type ViewStyle } from 'react-native';

import { cn } from '@/lib/utils';

export type ControlTone = 'idle' | 'focus' | 'error';

/** Shadow-only slice, so the same style can sit on a View or on a TextInput. */
export type ControlShadowStyle = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

const NATIVE_SHADOW: Record<ControlTone, ControlShadowStyle> = {
  idle: {
    shadowColor: '#0b0b12',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 2,
  },
  focus: {
    shadowColor: '#b8a4ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 4,
  },
  error: {
    shadowColor: '#ff4d3d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 3,
  },
};

export function controlTone(opts: { focused?: boolean; error?: boolean }): ControlTone {
  if (opts.focused) return 'focus';
  if (opts.error) return 'error';
  return 'idle';
}

export function controlShadowStyle(tone: ControlTone): ControlShadowStyle {
  if (Platform.OS === 'web') {
    return {};
  }
  return NATIVE_SHADOW[tone];
}

export function fieldChromeClassName(tone: ControlTone, className?: string) {
  return cn(
    'min-h-11 rounded-cards border bg-surface px-ds-16 py-ds-12 font-favorit text-body tracking-normal text-foreground',
    tone === 'focus' && 'border-aurora shadow-focus',
    tone === 'error' && 'border-danger shadow-error',
    tone === 'idle' && 'border-border shadow-control',
    Platform.select({
      web: 'outline-none transition-[border-color,box-shadow,background-color] duration-150 focus:border-aurora focus:shadow-focus',
    }),
    className
  );
}
