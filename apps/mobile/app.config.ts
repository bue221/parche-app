import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic layer on top of app.json. Everything here depends on the build environment:
 * store identifiers, universal links, and the cleartext escape hatches that must never
 * reach a store build.
 */

const BUNDLE_ID = 'app.parche.mobile';

/** Routes that a web link may hand over to the app. Mirrors docs/features/feat-035-deep-links.md. */
const LINKED_PATHS = ['/event', '/artist', '/invites', '/orders', '/reset'] as const;

function isProductionBuild(): boolean {
  return (process.env.APP_ENV ?? process.env.EAS_BUILD_PROFILE) === 'production';
}

/**
 * Host behind EXPO_PUBLIC_WEB_URL. Universal links stay off until it is set, because a
 * half-configured domain makes Android fall back to the browser with no visible error.
 */
function webLinkHost(): string | null {
  const raw = process.env.EXPO_PUBLIC_WEB_URL?.trim();
  if (!raw) {
    return null;
  }
  try {
    const { protocol, hostname } = new URL(raw);
    if (protocol !== 'https:') {
      throw new Error(`expected https, got ${protocol}`);
    }
    return hostname;
  } catch (error) {
    throw new Error(
      `EXPO_PUBLIC_WEB_URL must be an https origin such as https://parche.co — received "${raw}" (${String(error)})`
    );
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const production = isProductionBuild();
  const host = webLinkHost();

  return {
    ...config,
    name: config.name ?? 'Parche',
    slug: config.slug ?? 'parche',
    ios: {
      ...config.ios,
      bundleIdentifier: BUNDLE_ID,
      // Apple rejects arbitrary cleartext; local networking only exists to reach a LAN dev API.
      ...(production
        ? {}
        : { infoPlist: { ...config.ios?.infoPlist, NSAppTransportSecurity: { NSAllowsLocalNetworking: true } } }),
      ...(host ? { associatedDomains: [`applinks:${host}`] } : {}),
    },
    android: {
      ...config.android,
      package: BUNDLE_ID,
      ...(production ? {} : { usesCleartextTraffic: true }),
      ...(host
        ? {
            intentFilters: [
              {
                action: 'VIEW',
                autoVerify: true,
                category: ['BROWSABLE', 'DEFAULT'],
                data: LINKED_PATHS.map((pathPrefix) => ({ scheme: 'https', host, pathPrefix })),
              },
            ],
          }
        : {}),
    },
  };
};
