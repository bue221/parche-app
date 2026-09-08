import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'display'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'link'
    | 'linkPrimary'
    | 'code'
    | 'helper';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'], fontFamily: Fonts.sans },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'display' && styles.display,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        type === 'helper' && styles.helper,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 14 * 1.33,
    fontWeight: '400',
    letterSpacing: 0.84,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 14 * 1.33,
    fontWeight: '700',
    letterSpacing: 0.84,
  },
  default: {
    fontSize: 16,
    lineHeight: 16 * 1.4,
    fontWeight: '400',
    letterSpacing: 0.96,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 28 * 1.22,
    letterSpacing: 1.68,
  },
  display: {
    fontFamily: Fonts.display,
    fontSize: 106,
    fontWeight: '400',
    lineHeight: 106 * 0.83,
    letterSpacing: 0,
  },
  subtitle: {
    fontSize: 24,
    lineHeight: 24 * 1.25,
    fontWeight: '700',
    letterSpacing: 1.44,
  },
  link: {
    fontSize: 14,
    lineHeight: 14 * 1.33,
    fontWeight: '700',
    letterSpacing: 0.84,
  },
  linkPrimary: {
    fontSize: 14,
    lineHeight: 14 * 1.33,
    fontWeight: '700',
    letterSpacing: 0.84,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' }) ?? '400',
    fontSize: 12,
    letterSpacing: 0.72,
  },
  helper: {
    fontSize: 12,
    lineHeight: 12 * 1.21,
    fontWeight: '300',
    letterSpacing: 0.72,
  },
});
