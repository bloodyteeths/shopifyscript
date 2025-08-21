/** @type {import('@remix-run/dev').AppConfig} */
module.exports = {
  ignoredRouteFiles: ["**/.*"],
  serverModuleFormat: "cjs",
  serverBuildPath: "build/index.js",
  assetsBuildDirectory: "public/build",
  serverDependenciesToBundle: "all",
};
