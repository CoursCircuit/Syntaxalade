const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { _electron } = require("playwright");
const WM = require("../core.js");
const pkg = require("../package.json");
const root = path.resolve(__dirname, "..");
const profile = path.join(os.tmpdir(), "syntaxalade-native-test");
const output = path.join(os.tmpdir(), "syntaxalade-light-qa");
const packaged = process.env.SYNTAXALADE_PACKAGED === "1";
let executablePath = require("electron"),
  mountDir = null,
  mounted = false;
const env = { ...process.env, SYNTAXALADE_USER_DATA: profile };
delete env.ELECTRON_RUN_AS_NODE;
let electron;
(async () => {
  await fs.rm(profile, { recursive: true, force: true });
  await fs.mkdir(profile, { recursive: true });
  await fs.mkdir(output, { recursive: true });
  if (packaged) {
    mountDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "syntaxalade-dmg-test-"),
    );
    await promisify(execFile)("/usr/bin/hdiutil", [
      "attach",
      "-readonly",
      "-nobrowse",
      "-mountpoint",
      mountDir,
      path.join(
        root,
        `dist/${pkg.version}/Syntaxalade-${pkg.version}-universal.dmg`,
      ),
    ]);
    mounted = true;
    await promisify(execFile)("/usr/bin/codesign", [
      "--verify",
      "--deep",
      "--strict",
      path.join(mountDir, "Syntaxalade.app"),
    ]);
    console.log(
      "PASS final DMG mounts read-only and its app passes strict signature verification",
    );
    const architectures = await promisify(execFile)("/usr/bin/lipo", [
      "-archs",
      path.join(mountDir, "Syntaxalade.app/Contents/MacOS/Syntaxalade"),
    ]);
    assert.match(architectures.stdout, /x86_64/);
    assert.match(architectures.stdout, /arm64/);
    const asar=require('@electron/asar'), resources=path.join(mountDir,'Syntaxalade.app/Contents/Resources');
    const archives=(await fs.readdir(resources)).filter(name=>/^app(?:-(?:arm64|x64))?\.asar$/.test(name));
    let checked=0;
    for(const file of archives){
      const archive=path.join(resources,file),entries=asar.listPackage(archive);
      // Universal builds may keep a small app.asar launcher plus an archive per CPU.
      if(!entries.some(name=>/\/index\.html$/.test(name)))continue;
      checked++;
      for(const name of ['index.html','script.js','style.css','core.js','electron/main.js','electron/preload.js','assets/icon.svg','assets/salad.png'])assert.ok(asar.extractFile(archive,name).equals(await fs.readFile(path.join(root,name))),`Delivered ${file}/${name} matches source`);
      assert.ok(!entries.some(name=>/tests|backups|ship\.png|asteroid\.png|space\.jpg/.test(name)));
    }
    assert.ok(checked>=1,'Verified at least one complete application archive');
    console.log(
      "PASS universal Intel/Apple Silicon architectures and exact runtime files, without fixtures or old assets",
    );
    executablePath = path.join(
      mountDir,
      "Syntaxalade.app/Contents/MacOS/Syntaxalade",
    );
  }
  electron = await _electron.launch({
    executablePath,
    args: packaged ? [] : [root],
    env,
    timeout: 30000,
  });
  let page = await electron.firstWindow();
  await page.locator("#welcome").waitFor();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  assert.equal(await page.title(), "Syntaxalade");
  assert.equal(
    await electron.evaluate(({ app }) => app.getPath("userData")),
    profile,
  );
  assert.equal(
    await page.evaluate(() => typeof window.syntaxalade.copyText),
    "function",
  );
  assert.equal(await page.evaluate(() => typeof window.require), "undefined");
  console.log(
    `PASS ${packaged ? "packaged" : "development"} native launch, isolated profile, context isolation and preload bridge`,
  );
  const initial = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    WM.KEY,
  );
  assert.deepEqual(initial.lists, []);
  assert.deepEqual(initial.classes, []);
  assert.deepEqual(initial.folders, []);
  await page.screenshot({
    path: path.join(
      output,
      packaged ? "native-welcome.png" : "native-dev-welcome.png",
    ),
  });
  await page
    .getByRole("button", { name: "Créer ma première liste", exact: true })
    .click();
  await page
    .getByLabel("Nom de la liste", { exact: true })
    .fill("Liste créée pour le test natif");
  await page
    .getByLabel("Phrase 1", { exact: true })
    .fill("Les mots retrouvent leur place.");
  await page
    .getByRole("button", { name: "Enregistrer la liste", exact: true })
    .click();
  const exportPath = path.join(profile, "copie-test.json");
  await electron.evaluate(({ dialog }, target) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: target });
  }, exportPath);
  const exportResult = await page.evaluate(() =>
    window.syntaxalade.saveTextFile(
      "copie-test.json",
      JSON.stringify({ check: "écriture UTF-8" }),
    ),
  );
  assert.equal(exportResult.canceled, false);
  assert.equal(
    JSON.parse(await fs.readFile(exportPath, "utf8")).check,
    "écriture UTF-8",
  );
  await electron.evaluate(({ dialog }) => {
    dialog.showSaveDialog = async () => ({ canceled: true });
  });
  assert.equal(
    (
      await page.evaluate(() =>
        window.syntaxalade.saveTextFile("annule.json", "{}"),
      )
    ).canceled,
    true,
  );
  console.log("PASS native save picker IPC, UTF-8 export and cancellation");
  await page.locator("#launchBtn").click();
  await page.locator(".word-tile").first().waitFor();
  await page.locator("#projectionBtn").click();
  await page.waitForFunction(() =>
    document.body.classList.contains("projection"),
  );
  // Entering native macOS fullscreen is asynchronous; query the actual window.
  for (let i = 0; i < 80; i++) {
    if (
      await electron.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].isFullScreen(),
      )
    )
      break;
    await page.waitForTimeout(100);
  }
  assert.equal(
    await electron.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].isFullScreen(),
    ),
    true,
  );
  await page.screenshot({
    path: path.join(
      output,
      packaged ? "native-packaged-projection.png" : "native-projection.png",
    ),
  });
  await page.locator("#projectionBtn").click();
  await page.waitForTimeout(1000);
  await page.locator('[data-view="library"]').click();
  assert.equal(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)).session.status,
      WM.KEY,
    ),
    "paused",
  );
  console.log("PASS native fullscreen IPC and automatic pause");
  await page.locator('[data-view="play"]').click();
  await page.screenshot({
    path: path.join(output, packaged ? "native-packaged.png" : "native.png"),
  });
  await electron.close();
  electron = null;
  electron = await _electron.launch({
    executablePath,
    args: packaged ? [] : [root],
    env,
    timeout: 30000,
  });
  page = await electron.firstWindow();
  await page.locator("#pauseOverlay").waitFor();
  assert.match(await page.locator("#roundLabel").innerText(), /01 \/ 01/);
  assert.deepEqual(errors, []);
  console.log(
    "PASS native close/reopen restores paused mission without console errors",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await electron?.close();
    if (mountDir && mounted) {
      await promisify(execFile)("/usr/bin/hdiutil", ["detach", mountDir]);
      await fs.rm(mountDir, { recursive: true, force: true });
    }
    await fs.rm(profile, { recursive: true, force: true });
  });
