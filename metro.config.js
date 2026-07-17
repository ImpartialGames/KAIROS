const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = withNativewind(config, {
  // inlineVariables casse PlatformColor dans les variables CSS
  inlineVariables: false,
  // Le support de className passe par les wrappers explicites de src/tw
  globalClassNamePolyfill: false,
});
