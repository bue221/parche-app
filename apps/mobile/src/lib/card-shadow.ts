import { Platform, type ViewStyle } from 'react-native';

export const cardShadowStyle: ViewStyle =
  Platform.select({
    ios: {
      shadowColor: '#0b0b12',
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.08,
      shadowRadius: 24,
    },
    android: {
      elevation: 4,
    },
    web: {
      boxShadow: 'var(--shadow-card)',
    },
    default: {},
  }) ?? {};

/** Upward lift so the tab bar sits above scrolling content. */
export const tabBarShadowStyle: ViewStyle =
  Platform.select({
    ios: {
      shadowColor: '#0b0b12',
      shadowOffset: { width: 0, height: -8 },
      shadowOpacity: 0.14,
      shadowRadius: 20,
    },
    android: {
      boxShadow: '0px -10px 28px rgba(11, 11, 18, 0.28)',
    },
    web: {
      boxShadow: 'var(--shadow-tab)',
    },
    default: {},
  }) ?? {};
