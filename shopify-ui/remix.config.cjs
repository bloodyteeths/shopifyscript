/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ['**/.*'],
  serverModuleFormat: 'esm',
  serverBuildPath: 'build/index.js',
  assetsBuildDirectory: 'public/build',
  serverDependenciesToBundle: [
    /^(?!.*node_modules).*$/,
    'react',
    'react-dom',
    'react/jsx-runtime',
    'react/jsx-dev-runtime'
  ],
};


