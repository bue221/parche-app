import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

/**
 * expo-linking on web registers window "message" as a URL event and always
 * reports window.location.href. Iframes (OSM) and HMR then look like deep links
 * and Expo Router re-renders the current screen in a loop.
 */
function isRealWebLink(event: { nativeEvent?: MessageEvent }) {
  const data = event.nativeEvent?.data;
  if (typeof data !== 'string') {
    return false;
  }
  const value = data.trim();
  return /^(https?:|exp[a-z+]*:|parche:)/i.test(value);
}

if (Platform.OS === 'web') {
  const original = Linking.addEventListener.bind(Linking);
  Object.defineProperty(Linking, 'addEventListener', {
    configurable: true,
    value: (type: 'url', handler: (event: { url: string; nativeEvent?: MessageEvent }) => void) =>
      original(type, (event) => {
        if (!isRealWebLink(event as { nativeEvent?: MessageEvent })) {
          return;
        }
        handler(event);
      }),
  });
}
