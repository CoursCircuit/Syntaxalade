/* Build outside synchronized folders so Finder metadata cannot break signing. */
const path = require("node:path"),
  os = require("node:os"),
  fs = require("node:fs/promises"),
  crypto = require("node:crypto");
const { spawn, execFile } = require("node:child_process"),
  { promisify } = require("node:util");
const root = path.resolve(__dirname, ".."),
  pkg = require("../package.json");
(async () => {
  const staging = await fs.mkdtemp(
    path.join(os.tmpdir(), "syntaxalade-build-"),
  );
  const output = path.join(root, "dist", pkg.version),
    arch = process.env.SYNTAXALADE_ARCH || "universal";
  if (!["universal", "arm64", "x64"].includes(arch))
    throw new Error("Architecture non prise en charge.");
  try {
    const cli = path.join(
      path.dirname(require.resolve("electron-builder/package.json")),
      "cli.js",
    );
    const env = {
      ...process.env,
      CSC_IDENTITY_AUTO_DISCOVERY: "false",
      ELECTRON_BUILDER_CACHE:
        process.env.ELECTRON_BUILDER_CACHE ||
        path.join(os.tmpdir(), "syntaxalade-builder-cache"),
    };
    const child = spawn(
      process.execPath,
      [
        cli,
        "--mac",
        "dmg",
        `--${arch}`,
        `--config.directories.output=${staging}`,
        `--config.electronDownload.cache=${path.join("/private/tmp", "syntaxalade-electron-cache")}`,
      ],
      { cwd: root, env, stdio: "inherit" },
    );
    const code = await new Promise((resolve, reject) => {
      child.on("error", reject);
      child.on("exit", resolve);
    });
    if (code !== 0)
      throw new Error(`electron-builder a échoué (code ${code}).`);
    const appDir =
      arch === "universal"
        ? "mac-universal"
        : arch === "x64"
          ? "mac"
          : "mac-arm64";
    await promisify(execFile)("/usr/bin/codesign", [
      "--verify",
      "--deep",
      "--strict",
      path.join(staging, appDir, "Syntaxalade.app"),
    ]);
    await fs.mkdir(output, { recursive: true });
    const sums = [];
    for (const entry of await fs.readdir(staging, { withFileTypes: true }))
      if (
        entry.isFile() &&
        (entry.name.endsWith(".dmg") ||
          entry.name.endsWith(".blockmap") ||
          entry.name === "latest-mac.yml")
      ) {
        const target = path.join(output, entry.name);
        await fs.copyFile(path.join(staging, entry.name), target);
        if (entry.name.endsWith(".dmg"))
          sums.push(
            crypto
              .createHash("sha256")
              .update(await fs.readFile(target))
              .digest("hex") +
              "  " +
              entry.name,
          );
      }
    await fs.writeFile(
      path.join(output, "SHA256SUMS.txt"),
      sums.join("\n") + "\n",
    );
    await fs.writeFile(
      path.join(output, "INSTALLATION.txt"),
      `Ouvrez Syntaxalade-${pkg.version}-${arch}.dmg, puis glissez Syntaxalade dans Applications.\nLa version universelle fonctionne sur les Mac Intel et Apple Silicon.\nL’application démarre sans phrase ni classe d’exemple et sans reprise des anciennes éditions.\n`,
    );
    console.log(`Disque d’installation vérifié : ${output}`);
  } finally {
    await fs.rm(staging, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
