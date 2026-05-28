// Metro config para Mi Platica.
// Necesario con pnpm: por default Metro no sigue symlinks de node_modules/.pnpm.
// Sin esto, el bundler crashea con "path must be string, received Object" al
// resolver Expo Router / Supabase / TanStack en el primer request.

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// pnpm-friendly resolver
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
