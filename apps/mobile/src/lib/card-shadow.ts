import { Platform, type ViewStyle } from 'react-native';

export const cardShadowStyle: ViewStyle =
  Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
    },
    android: {
      elevation: 3,
    },
    web: {
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
    },
    default: {},
  }) ?? {};
