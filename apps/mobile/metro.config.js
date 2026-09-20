const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
const expoTypes = require.resolve('expo/types');
const previousResolveRequest = config.resolver.resolveRequest;

// Expo's winter runtime does `import '../../types'`. Metro's file map (and NativeWind's
// virtual FS) can miss `expo/types` on a stale or first boot, so pin that stub.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === '../../types' &&
    /[/\\]expo[/\\]src[/\\]winter[/\\]/.test(context.originModulePath)
  ) {
    return { type: 'sourceFile', filePath: expoTypes };
  }
  if (typeof previousResolveRequest === 'function') {
    return previousResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './src/global.css', inlineRem: 16 });
