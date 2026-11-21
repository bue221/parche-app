// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // Reanimated SharedValue mutations (`sv.value = ...`) trigger false positives
      'react-hooks/immutability': 'off',
    },
  },
]);
