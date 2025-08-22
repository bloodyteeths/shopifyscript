/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ["**/.*"],
  serverModuleFormat: "esm",
  serverBuildPath: "build/index.js",
  assetsBuildDirectory: "public/build",
  serverDependenciesToBundle: [
    "react",
    "react-dom", 
    "react/jsx-runtime",
    /^(?!.*node_modules).*$/
  ],
};
