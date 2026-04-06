const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// lucide-react-native v1+ uses package "exports"; Metro web can fail to resolve the root import.
// Point explicitly at the CJS bundle (same layout in 0.468.x and 1.x).
const lucideEntry = path.resolve(
  __dirname,
  'node_modules/lucide-react-native/dist/cjs/lucide-react-native.js'
);

const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'lucide-react-native') {
    return { type: 'sourceFile', filePath: lucideEntry };
  }
  if (upstreamResolveRequest) {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
