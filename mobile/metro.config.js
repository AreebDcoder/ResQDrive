const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Append tflite to asset extensions so the Metro bundler can resolve the model file
config.resolver.assetExts.push('tflite');

module.exports = config;
