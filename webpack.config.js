const { resolve } = require('path');

// Minimal webpack config that only adds an alias for the web build. Expo's
// managed workflow will inject its own webpack config when available. This
// avoids requiring `@expo/webpack-config` which may have peer dependency
// conflicts with older Expo SDK versions.

module.exports = function (env, argv) {
  const isWeb = env && env.platform === 'web';

  if (!isWeb) {
    // For native builds, don't modify anything — return undefined so Expo's
    // default config is used.
    return {};
  }

  return {
    resolve: {
      alias: {
        '@supabase/node-fetch': resolve(__dirname, 'polyfills', 'node-fetch.js'),
      },
    },
  };
};
