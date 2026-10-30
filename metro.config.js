const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web worker does `import wasmModule from './wa-sqlite/wa-sqlite.wasm'`,
// and Metro only serves a file it recognises as an asset, so without this the web
// bundle fails to build and the database never opens. Native targets are unaffected.
config.resolver.assetExts.push('wasm');

module.exports = config;
