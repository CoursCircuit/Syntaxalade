/* Real browser regression suite; its fixtures and profiles are never shipped. */
const assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  os = require("node:os");
const { chromium } = require("playwright"),
  { spawn } = require("node:child_process");
const WM = require("../core.js"),
  fixture = require("./fixtures.cjs");
const root = path.resolve(__dirname, ".."),
  output = path.join(os.tmpdir(), "syntaxalade-light-qa"),
  url = process.env.SYNTAXALADE_TEST_URL || "http://127.0.0.1:4317";
let browser, server;
(async () => {
  await fs.mkdir(output, { recursive: true });
  try {
    await fetch(url);
  } catch (_) {
    server = spawn(
      "python3",
      ["-m", "http.server", "4317", "--bind", "127.0.0.1"],
      { cwd: root, stdio: "ignore" },
    );
    for (let i = 0; i < 40; i++) {
      try {
        await fetch(url);
        break;
      } catch (_) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }
  browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROME_EXECUTABLE ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1536, height: 1024 },
    reducedMotion: "reduce",
    acceptDownloads: true,
  });
  await context.addInitScript(() => {
    localStorage.setItem(
      "wm_data",
      JSON.stringify({
        phrases: ["Ancien contenu privé."],
        names: ["Ancienne équipe"],
      }),
    );
    localStorage.setItem(
      "syntaxalade_v2",
      JSON.stringify({ version: 2, lists: [{ title: "Ancienne liste" }] }),
    );
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors = [],
    checks = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("dialog", (d) => d.accept());
  const check = async (name, fn) => {
    await fn();
    checks.push(name);
    console.log("PASS " + name);
  };
  const nav = (view) => page.locator(`[data-view="${view}"]`).click();
  const saved = () =>
    page.evaluate((key) => JSON.parse(localStorage.getItem(key)), WM.KEY);
  await page.goto(url);
  await check(
    "empty first launch, light theme and old contents ignored",
    async () => {
      assert.equal(await page.title(), "Syntaxalade");
      assert.equal(await page.locator("#welcome").isVisible(), true);
      assert.equal(await page.locator("#gameLayout").isVisible(), false);
      const d = await saved();
      assert.deepEqual(d.lists, []);
      assert.deepEqual(d.classes, []);
      assert.deepEqual(d.folders, []);
      assert.equal(d.session, null);
      assert.equal(
        await page.evaluate(
          () =>
            matchMedia("(prefers-color-scheme: dark)").matches &&
            getComputedStyle(document.documentElement).colorScheme === "dark",
        ),
        false,
      );
      assert.equal(
        await page
          .locator(".welcome-art")
          .evaluate((img) => img.complete && img.naturalWidth > 0),
        true,
      );
      assert.doesNotMatch(
        await page.locator("body").innerText(),
        /Ancien contenu|Ancienne équipe|équipage|astéroïde|vaisseau|mission/i,
      );
      await page.screenshot({ path: path.join(output, "welcome.png") });
    },
  );
  await check(
    "help explains setup and works without creating data",
    async () => {
      await page.locator("#helpBtn").click();
      assert.match(
        await page.locator("#view-help").innerText(),
        /trois étapes/,
      );
      await nav("play");
      assert.deepEqual((await saved()).lists, []);
    },
  );
  await check(
    "structured editor opens with empty rows and rejects empty content",
    async () => {
      await page
        .getByRole("button", { name: "Créer ma première liste", exact: true })
        .click();
      assert.equal(await page.locator(".phrase-row").count(), 3);
      assert.equal(
        await page.getByLabel("Phrase 1", { exact: true }).inputValue(),
        "",
      );
      await page.screenshot({ path: path.join(output, "editor.png") });
      await page
        .getByLabel("Nom de la liste", { exact: true })
        .fill("Au quotidien");
      await page.locator("#saveList").click();
      assert.match(
        await page.locator("#formError").innerText(),
        /au moins une phrase/,
      );
      assert.equal((await saved()).lists.length, 0);
    },
  );
  await check(
    "separate phrase and translation fields preserve missing translations",
    async () => {
      await page
        .getByLabel("Phrase 1", { exact: true })
        .fill("Ich lerne Deutsch.");
      await page
        .getByLabel("Traduction 1", { exact: true })
        .fill("J’apprends l’allemand.");
      await page
        .getByLabel("Phrase 2", { exact: true })
        .fill("Wir spielen heute.");
      await page
        .getByLabel("Traduction 3", { exact: true })
        .fill("Il lit un livre.");
      await page.locator("#saveList").click();
      assert.match(await page.locator("#formError").innerText(), /Ligne 3/);
      await page
        .getByLabel("Phrase 3", { exact: true })
        .fill("Er liest ein Buch.");
      await page.locator("#addPhrase").click();
      assert.equal(await page.locator(".phrase-row").count(), 4);
      await page.getByLabel("Phrase 4", { exact: true }).fill("Temporaire.");
      await page
        .getByRole("button", { name: "Supprimer la phrase 4", exact: true })
        .click();
      await page.locator("#undoDeleteRow").click();
      assert.equal(
        await page.getByLabel("Phrase 4", { exact: true }).inputValue(),
        "Temporaire.",
      );
      await page
        .getByRole("button", { name: "Supprimer la phrase 4", exact: true })
        .click();
      await page.getByText("Ranger dans un dossier", { exact: false }).click();
      await page.locator('[name="newFolder"]').fill("Allemand");
      await page.locator('[name="subject"]').fill("Allemand");
      await page.locator('[name="level"]').fill("A2");
      await page.locator("#saveList").click();
      const d = await saved();
      assert.equal(d.lists.length, 1);
      assert.equal(d.lists[0].entries[1].translation, "");
      assert.equal(d.lists[0].entries[2].translation, "Il lit un livre.");
      assert.equal(d.folders[0].name, "Allemand");
      assert.equal(await page.locator("#welcome").isVisible(), false);
      assert.equal(d.session, null);
      await page.waitForTimeout(1100);
      assert.equal(await page.locator("#timer").innerText(), "00:45");
    },
  );
  await check(
    "bulk paste supports parallel columns without separator syntax",
    async () => {
      await nav("library");
      await page
        .getByRole("button", { name: "Créer une liste", exact: true })
        .first()
        .click();
      await page
        .getByLabel("Nom de la liste", { exact: true })
        .fill("Le français");
      await page
        .getByRole("tab", { name: "Coller un texte", exact: true })
        .click();
      await page
        .locator("#bulkSentences")
        .fill("Une phrase.\nDeux phrases.\nTrois phrases.");
      await page
        .getByText("J’ai aussi une liste de traductions", { exact: true })
        .click();
      await page
        .locator("#bulkTranslations")
        .fill("One sentence.\n\nThree sentences.");
      await page.locator("#applyBulk").click();
      assert.equal(await page.locator(".phrase-row").count(), 3);
      assert.equal(
        await page.getByLabel("Traduction 2", { exact: true }).inputValue(),
        "",
      );
      assert.equal(
        await page.getByLabel("Traduction 3", { exact: true }).inputValue(),
        "Three sentences.",
      );
      await page.locator("#saveList").click();
    },
  );
  await check(
    "AI helper is integrated and starts without saved themes or subjects",
    async () => {
      await page
        .getByRole("button", { name: "Créer une liste", exact: true })
        .first()
        .click();
      await page.getByRole("tab", { name: "Avec une IA", exact: true }).click();
      for (const id of ["aiSubject", "aiLanguage", "aiTheme", "aiLevel"])
        assert.equal(await page.locator("#" + id).inputValue(), "");
      await page.locator("#preparePrompt").click();
      assert.match(await page.locator("#formError").innerText(), /Indiquez/);
      await page.locator("#aiSubject").fill("Histoire");
      await page.locator("#aiLanguage").fill("Français");
      await page.locator("#aiTheme").fill("La Rome antique");
      await page.locator("#aiLevel").fill("11e");
      await page.locator("#preparePrompt").click();
      assert.match(
        await page.locator("#promptOutput").inputValue(),
        /La Rome antique/,
      );
      await page
        .locator("#aiResult")
        .fill(
          "Rome se trouve en Italie.\nLes citoyens se réunissent au forum.",
        );
      await page.locator("#applyAI").click();
      assert.equal(
        await page.getByLabel("Nom de la liste", { exact: true }).inputValue(),
        "La Rome antique",
      );
      assert.equal(await page.locator(".phrase-row").count(), 2);
      await page.locator("#saveList").click();
      assert.equal((await saved()).lists.length, 3);
    },
  );
  await check("library search and explicit edit and play actions", async () => {
    await page.locator("#librarySearch").fill("Au quotidien");
    assert.equal(await page.locator(".list-row").count(), 1);
    assert.equal(
      await page.getByRole("button", { name: "Modifier", exact: true }).count(),
      1,
    );
    await page.screenshot({ path: path.join(output, "library.png") });
  });
  await check(
    "classes start empty and offer explicit group editing",
    async () => {
      await nav("classes");
      assert.equal((await saved()).classes.length, 0);
      await page
        .getByRole("button", { name: "Créer ma première classe", exact: true })
        .click();
      assert.equal(
        await page.getByLabel("Nom de la classe", { exact: true }).inputValue(),
        "",
      );
      assert.equal(await page.locator("#studentsInput").inputValue(), "");
      assert.equal(await page.locator(".group-edit-card").count(), 0);
      await page.getByLabel("Nom de la classe", { exact: true }).fill("11VG4");
      await page
        .locator("#studentsInput")
        .fill("Alice\nNoé\nSami\nJade\nHugo\nLéa\nEmma");
      await page.locator("#groupCount").fill("3");
      await page.locator("#generateGroups").click();
      assert.equal(await page.locator(".group-edit-card").count(), 3);
      await page
        .getByLabel("Nom de l’équipe 1", { exact: true })
        .fill("Les curieux");
      await page
        .getByRole("button", { name: "Enregistrer la classe", exact: true })
        .click();
      const c = (await saved()).classes[0];
      assert.equal(c.groups[0].name, "Les curieux");
      assert.equal(new Set(c.groups.flatMap((g) => g.members)).size, 7);
      assert.equal(c.groups.length, 3);
      await page.screenshot({ path: path.join(output, "classes.png") });
      await page.reload();
      assert.deepEqual((await saved()).classes[0].groups, c.groups);
    },
  );
  await check(
    "game settings and round preparation remain explicit",
    async () => {
      await nav("settings");
      await page.locator('[name="order"]').selectOption("sequential");
      await page.locator('[name="motion"]').uncheck();
      await page
        .getByRole("button", { name: "Enregistrer les réglages", exact: true })
        .click();
      await nav("play");
      const d = await saved();
      await page
        .locator("#listSelect")
        .selectOption(d.lists.find((l) => l.title === "Au quotidien").id);
      await page.locator("#classSelect").selectOption(d.classes[0].id);
      await page.locator("#durationSelect").selectOption("15");
      assert.equal((await saved()).session, null);
      await page.locator("#launchBtn").click();
      assert.match(await page.locator("#roundLabel").innerText(), /01 \/ 03/);
      assert.equal((await saved()).session.status, "playing");
      assert.equal(await page.locator("#scoreboard").isVisible(), true);
      const words = await page.locator(".word-tile").allTextContents();
      assert.ok(words.includes("."));
      assert.ok(!words.some((w) => w !== "." && w.endsWith(".")));
      await page.screenshot({ path: path.join(output, "game.png") });
    },
  );
  await check(
    "score undo and pause work after interacting with buttons",
    async () => {
      await page.locator('[data-action="score-plus"]').first().click();
      assert.equal(
        await page.locator("#scoreList output").first().innerText(),
        "1",
      );
      await page.locator("#undoScore").click();
      assert.equal(
        await page.locator("#scoreList output").first().innerText(),
        "0",
      );
      await page.keyboard.press("Space");
      assert.equal(await page.locator("#pauseOverlay").isVisible(), true);
      const remaining = await page.locator("#timer").innerText();
      await page.waitForTimeout(1100);
      assert.equal(await page.locator("#timer").innerText(), remaining);
      await page.locator("#resumeBtn").click();
    },
  );
  await check(
    "translation and immediate answer preserve the exact sentence",
    async () => {
      await page.locator("#translationBtn").click();
      assert.equal(
        await page.locator("#translation").innerText(),
        "J’apprends l’allemand.",
      );
      await page.locator("#revealBtn").click();
      assert.equal(
        await page.locator(".solution").innerText(),
        "Ich lerne Deutsch.",
      );
      await page.locator("#nextBtn").click();
      assert.match(await page.locator("#roundLabel").innerText(), /02 \/ 03/);
    },
  );
  await check(
    "interactive tiles validate the phrase, with undo and hints",
    async () => {
      for (const w of ["Wir", "spielen", "heute", "."])
        await page
          .getByRole("button", {
            name: `Ajouter ${w} à la phrase`,
            exact: true,
          })
          .click();
      assert.equal(
        await page.locator(".solution").innerText(),
        "Wir spielen heute.",
      );
      await page.locator("#nextBtn").click();
      await page.locator(".word-tile").first().click();
      await page.locator("#clearAnswer").click();
      assert.equal(await page.locator("#answerArea").isVisible(), false);
      await page.locator("#hintBtn").click();
      assert.equal(await page.locator(".answer-token").innerText(), "Er");
    },
  );
  await check(
    "navigation pauses and reopening preserves the user-created session",
    async () => {
      await nav("library");
      assert.equal((await saved()).session.status, "paused");
      await nav("play");
      await page.reload();
      assert.equal(await page.locator("#pauseOverlay").isVisible(), true);
      assert.equal(await page.locator(".answer-token").innerText(), "Er");
      await page.locator("#resumeBtn").click();
      await page.locator("#revealBtn").click();
      await page.locator("#nextBtn").click();
      assert.match(await page.locator("#roundTitle").innerText(), /Bien joué/);
      assert.equal((await saved()).history.length, 1);
    },
  );
  await check(
    "backup export, invalid import rejection and explicit restore",
    async () => {
      await nav("settings");
      let dp = page.waitForEvent("download");
      await page.locator('[data-action="export-backup"]').click();
      const dl = await dp;
      const file = await dl.path();
      const json = JSON.parse(await fs.readFile(file, "utf8"));
      assert.equal(json.lists.length, 3);
      assert.equal(json.classes.length, 1);
      const target = path.join(output, "backup.json");
      await fs.writeFile(target, JSON.stringify(json));
      await page.locator("#backupInput").setInputFiles({
        name: "bad.json",
        mimeType: "application/json",
        buffer: Buffer.from('{"version":0}'),
      });
      await page.waitForFunction(() =>
        document
          .getElementById("toast")
          .textContent.includes("Import impossible"),
      );
      assert.equal((await saved()).lists.length, 3);
      await page.locator("#backupInput").setInputFiles(target);
      await page.locator("#confirmAction").click();
      assert.equal((await saved()).session, null);
    },
  );
  await check(
    "projecting before starting has a visible start button and cooperative layout",
    async () => {
      await nav("play");
      await page.locator("#classSelect").selectOption("");
      await page.locator("#durationSelect").selectOption("0");
      await page.locator("#projectionBtn").click();
      assert.equal(await page.locator("#startRoundBtn").isVisible(), true);
      await page.locator("#startRoundBtn").click();
      assert.equal((await saved()).session.status, "playing");
      assert.equal(await page.locator("#timer").innerText(), "∞");
      assert.equal(await page.locator("#scoreboard").isVisible(), false);
      await page.screenshot({ path: path.join(output, "projection.png") });
      await page.keyboard.press("Escape");
      if (
        await page
          .locator("body")
          .evaluate((b) => b.classList.contains("projection"))
      )
        await page.locator("#projectionBtn").click();
    },
  );
  await check(
    "game and editor fit projector, laptop and narrow viewports",
    async () => {
      for (const [width, height] of [
        [1920, 1080],
        [1280, 800],
        [1024, 768],
        [390, 844],
      ]) {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(100);
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `no page overflow at ${width}`,
        );
        assert.ok(
          await page
            .locator(".word-tile")
            .evaluateAll((ns) =>
              ns.every((n) => n.scrollWidth <= n.clientWidth + 2),
            ),
          `tiles fit at ${width}`,
        );
        if (width >= 1024)
          assert.ok(
            await page
              .locator("#keyboardHints")
              .evaluate(
                (el) => el.getBoundingClientRect().bottom <= innerHeight + 1,
              ),
            `complete controls fit at ${width}`,
          );
        await page.screenshot({
          path: path.join(output, `game-${width}.png`),
          fullPage: true,
        });
      }
      await nav("library");
      await page
        .getByRole("button", { name: "Créer une liste", exact: true })
        .first()
        .click();
      assert.ok(
        await page
          .locator("#editorDialog")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      );
      await page.screenshot({ path: path.join(output, "editor-390.png") });
      await page
        .locator('#editorDialog [data-action="close-dialog"]')
        .first()
        .click();
      await page.setViewportSize({ width: 1536, height: 1024 });
    },
  );
  await check(
    "shared TXT imports into editable rows without changing saved lists",
    async () => {
      await nav("library");
      await page
        .getByRole("button", { name: "Créer une liste", exact: true })
        .first()
        .click();
      await page.locator("#listFileInput").setInputFiles({
        name: "Partage collègue.txt",
        mimeType: "text/plain",
        buffer: Buffer.from(
          "Une phrase partagée. | Une aide.\nUne autre phrase.",
        ),
      });
      await page.waitForFunction(
        () => document.querySelectorAll(".phrase-row").length === 2,
      );
      assert.equal(await page.locator(".phrase-row").count(), 2);
      assert.equal(
        await page.getByLabel("Phrase 1", { exact: true }).inputValue(),
        "Une phrase partagée.",
      );
      await page
        .locator('#editorDialog [data-action="close-dialog"]')
        .first()
        .click();
      assert.equal((await saved()).lists.length, 3);
    },
  );
  await check(
    "long compounds and HTML-looking content remain readable safe text",
    async () => {
      const c = await browser.newContext({
          viewport: { width: 1280, height: 800 },
          reducedMotion: "reduce",
        }),
        d = fixture();
      d.lists[0].entries = [
        {
          sentence:
            "Donaudampfschifffahrtsgesellschaftskapitän <img src=x onerror=alert(1)> bleibt.",
          translation: "",
        },
      ];
      d.preferences.duration = 0;
      await c.addInitScript(
        ({ d, key }) => localStorage.setItem(key, JSON.stringify(d)),
        { d, key: WM.KEY },
      );
      const p = await c.newPage();
      p.on("pageerror", (e) => errors.push(e.message));
      await p.goto(url);
      await p.locator("#launchBtn").click();
      assert.equal(await p.locator("#wordField img").count(), 0);
      assert.ok(
        await p
          .locator(".word-tile")
          .evaluateAll((ns) =>
            ns.every((n) => n.scrollWidth <= n.clientWidth + 2),
          ),
      );
      await p.locator("#revealBtn").click();
      assert.match(await p.locator(".solution").innerText(), /<img src=x/);
      await c.close();
    },
  );
  await check(
    "timer ends without revealing or advancing and corrupt data is preserved",
    async () => {
      let c = await browser.newContext(),
        d = fixture();
      d.preferences.duration = 1;
      await c.addInitScript(
        ({ d, key }) => localStorage.setItem(key, JSON.stringify(d)),
        { d, key: WM.KEY },
      );
      let p = await c.newPage();
      await p.goto(url);
      await p.waitForTimeout(1100);
      assert.equal(await p.locator("#timer").innerText(), "00:01");
      await p.locator("#launchBtn").click();
      await p.waitForFunction(() =>
        document
          .getElementById("roundTitle")
          .textContent.includes("Temps écoulé"),
      );
      assert.equal(await p.locator("#resultArea").isVisible(), false);
      await c.close();
      c = await browser.newContext();
      await c.addInitScript(
        (key) => localStorage.setItem(key, "{broken"),
        WM.KEY,
      );
      p = await c.newPage();
      await p.goto(url);
      assert.match(await p.locator("#saveStatus").innerText(), /récupérer/);
      assert.equal(
        await p.evaluate((key) => localStorage.getItem(key), WM.KEY),
        "{broken",
      );
      await c.close();
    },
  );
  await check(
    "a newly created list stays visible after a search or folder change",
    async () => {
      const c = await browser.newContext(),
        d = fixture();
      await c.addInitScript(
        ({ d, key }) => localStorage.setItem(key, JSON.stringify(d)),
        { d, key: WM.KEY },
      );
      const p = await c.newPage();
      await p.goto(url);
      await p.locator('[data-view="library"]').click();
      await p.locator("#librarySearch").fill("Aucun résultat");
      await p
        .getByRole("button", { name: "Créer une liste", exact: true })
        .first()
        .click();
      await p
        .getByLabel("Nom de la liste", { exact: true })
        .fill("Ma nouvelle liste");
      await p
        .getByLabel("Phrase 1", { exact: true })
        .fill("Une phrase visible.");
      await p.getByText("Ranger dans un dossier", { exact: false }).click();
      await p.locator('[name="newFolder"]').fill("Nouveau dossier");
      await p.locator("#saveList").click();
      assert.equal(await p.locator("#librarySearch").inputValue(), "");
      assert.equal(
        await p.locator(".list-info h2").innerText(),
        "Ma nouvelle liste",
      );
      await c.close();
    },
  );
  assert.deepEqual(errors, [], "No browser console or JavaScript errors");
  await fs.writeFile(
    path.join(output, "results.json"),
    JSON.stringify({ status: "passed", checks, errors }, null, 2),
  );
  console.log(
    `PASS ${checks.length} checks; no console errors. Screenshots: ${output}`,
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await browser?.close();
    server?.kill();
  });
