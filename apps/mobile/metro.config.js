   const { getDefaultConfig } = require('expo/metro-config');
   const path = require('path');

   const projectRoot = __dirname;
   const corePath = path.resolve(projectRoot, '../../packages/core');

   const config = getDefaultConfig(projectRoot);
   config.watchFolders = [...(config.watchFolders ?? []), corePath];
   config.resolver.extraNodeModules = { ...(config.resolver.extraNodeModules ?? {}), '@lumo/core': corePath };

   module.exports = config;