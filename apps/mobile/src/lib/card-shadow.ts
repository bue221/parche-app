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
