const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web build loads a wa-sqlite .wasm asset.
config.resolver.assetExts.push('wasm');

module.exports = config;
