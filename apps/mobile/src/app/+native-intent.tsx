/**
 * On web, expo-linking maps every window "message" event to window.location.href.
 * Leaflet/HMR/postMessage then look like a new deep link and Expo Router re-navigates
 * the current screen (event detail) in a tight loop.
 */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }) {
  if (initial) {
    return path;
  }
  if (typeof window !== 'undefined' && path === window.location.href) {
    return null;
  }
  return path;
}
