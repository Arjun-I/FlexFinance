const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Android-specific optimizations
config.resolver.platforms = ['native', 'android', 'ios', 'web'];

module.exports = config; 