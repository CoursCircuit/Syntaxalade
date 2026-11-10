const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const path = require("node:path");
// Finder metadata can be inherited when Electron is copied on macOS. Remove it
// from this generated bundle before codesign inspects the nested helpers.
module.exports = async (context) => {
  if (context.electronPlatformName !== "darwin") return;
  const bundle = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
  );
  await promisify(execFile)("/usr/bin/xattr", ["-cr", bundle]);
};
