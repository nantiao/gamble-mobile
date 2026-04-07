const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// lucide-react-native の CJS ファイルを Metro が認識できるよう sourceExts に追加
config.resolver.sourceExts = [...config.resolver.sourceExts, "cjs"];

// unstable_enablePackageExports を有効にして package.exports を正しく解決
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
