const { test } = require("node:test");
const assert = require("node:assert/strict");
const WM = require("../core.js");
const fixture = require("./fixtures.cjs");
function memory(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
  };
}

test("punctuation is independent and contractions, decimals and hyphens are preserved", () => {
  assert.deepEqual(WM.tokenize("Aujourd’hui, est-ce bien 3,14 ?!"), [
    "Aujourd’hui",
    ",",
    "est-ce",
    "bien",
    "3,14",
    "?",
    "!",
  ]);
  assert.deepEqual(WM.tokenize("Er sagt: „Guten Tag!“"), [
    "Er",
    "sagt",
    ":",
    "„",
    "Guten",
    "Tag",
    "!",
    "“",
  ]);
  assert.deepEqual(WM.tokenize("Bonjour tout le monde."), [
    "Bonjour",
    "tout",
    "le",
    "monde",
    ".",
  ]);
  assert.deepEqual(WM.tokenize("Bonjour tout le monde.", "attached"), [
    "Bonjour",
    "tout",
    "le",
    "monde.",
  ]);
});
test("scramble conserves tokens including repeated words and does not return original when avoidable", () => {
  const ordered = WM.tokenize("Der Hund sieht den Hund.");
  for (let i = 0; i < 100; i++) {
    const mixed = WM.scramble(ordered);
    assert.deepEqual(mixed.map((t) => t.value).sort(), [...ordered].sort());
    assert.equal(new Set(mixed.map((t) => t.id)).size, ordered.length);
    assert.notDeepEqual(
      mixed.map((t) => t.value),
      ordered,
    );
  }
  assert.deepEqual(
    WM.scramble(["a", "b"], () => 0.99).map((t) => t.value),
    ["b", "a"],
  );
  assert.equal(WM.scramble(["a", "a"]).length, 2);
  assert.deepEqual(WM.scramble([]), []);
});
test("blank translations never shift subsequent pairs", () => {
  assert.deepEqual(WM.parseEntries("A. | Un.\n\nB.\nC. | Trois.").entries, [
    { sentence: "A.", translation: "Un." },
    { sentence: "B.", translation: "" },
    { sentence: "C.", translation: "Trois." },
  ]);
});
test("paste parser tolerates AI fences and numbering and detects suspicious content", () => {
  const parsed = WM.parseEntries(
    "```text\n1. Eins. | Un.\n2) Zwei.\n- Drei.\n```",
  );
  assert.deepEqual(
    parsed.entries.map((e) => e.sentence),
    ["Eins.", "Zwei.", "Drei."],
  );
  assert.equal(WM.parseEntries("A.\nA.").warnings.length, 1);
  assert.throws(() => WM.parseEntries("x".repeat(1001)), /1 000/);
  assert.throws(
    () => WM.parseEntries(Array(501).fill("Phrase.").join("\n")),
    /500/,
  );
});
test("balanced random groups include each distinct student exactly once", () => {
  const students = Array.from({ length: 23 }, (_, i) => `Élève ${i}`);
  const groups = WM.makeGroups([...students, students[0], ""], 5);
  assert.equal(groups.length, 5);
  assert.deepEqual(
    groups.flatMap((g) => g.members).sort(),
    [...students].sort(),
  );
  assert.ok(
    Math.max(...groups.map((g) => g.members.length)) -
      Math.min(...groups.map((g) => g.members.length)) <=
      1,
  );
  assert.equal(WM.makeGroups(students, 99).length, 23);
});
test("first launch is empty and ignores all previous edition data", () => {
  const previous = JSON.stringify({
    phrases: ["Ancien contenu."],
    names: ["Ancienne équipe"],
  });
  const storage = memory({
    wm_data: previous,
    syntaxalade_v2: JSON.stringify(fixture()),
  });
  const result = WM.load(storage);
  assert.deepEqual(result.data.lists, []);
  assert.deepEqual(result.data.classes, []);
  assert.deepEqual(result.data.folders, []);
  assert.deepEqual(result.data.history, []);
  assert.equal(result.data.session, null);
  assert.equal(storage.getItem("wm_data"), previous);
  assert.equal(result.migrated, undefined);
});
test("save round trip and previous-copy recovery preserve the new workspace", () => {
  const storage = memory();
  const initial = fixture();
  initial.preferences.duration = 20;
  WM.save(storage, initial);
  initial.preferences.duration = 60;
  WM.save(storage, initial);
  assert.equal(WM.load(storage).data.preferences.duration, 60);
  storage.setItem(WM.KEY, "broken");
  const recovered = WM.load(storage);
  assert.equal(recovered.recovered, true);
  assert.equal(recovered.data.preferences.duration, 20);
});
test("corrupt data with no usable backup throws without writing over the source", () => {
  const storage = memory({ [WM.KEY]: "{broken" });
  assert.throws(() => WM.load(storage), /illisible/);
  assert.equal(storage.getItem(WM.KEY), "{broken");
});
test("backup validation rejects malformed structures and duplicate IDs and normalizes preferences", () => {
  assert.throws(() => WM.normalize({}), /sauvegarde/);
  const bad = fixture();
  bad.lists[0].entries = [];
  assert.throws(() => WM.normalize(bad), /500/);
  const duplicate = fixture();
  duplicate.lists[0].id = duplicate.folders[0].id;
  assert.throws(() => WM.normalize(duplicate), /double/);
  const data = WM.defaults();
  data.preferences.duration = -30;
  data.preferences.fontScale = 999;
  data.session = { arbitrary: "untrusted" };
  const valid = WM.normalize(data);
  assert.equal(valid.preferences.duration, 0);
  assert.equal(valid.preferences.fontScale, 1);
  assert.equal(valid.session, null);
});
test("AI prompt contains classroom constraints and the exact import format", () => {
  const prompt = WM.prompt({
    subject: "Histoire",
    theme: "Rome",
    language: "Français",
    level: "11e",
    count: 8,
    length: "4 à 7 mots",
    translations: false,
  });
  assert.match(prompt, /Rome/);
  assert.match(prompt, /Nombre de phrases : 8/);
  assert.match(prompt, /Ne fournis pas de traduction/);
  assert.match(prompt, /Aucun tableau Markdown/);
});

test("editing or reordering group labels preserves scores without duplicating IDs", () => {
  const previous = [
    { id: "a", name: "Orion", score: 7, members: ["Alice"] },
    { id: "b", name: "Nova", score: 4, members: ["Noé"] },
  ];
  const renamed = WM.parseGroups("Apollo : Alice\nNova : Noé", previous);
  assert.equal(renamed[0].id, "a");
  assert.equal(renamed[0].score, 7);
  const reordered = WM.parseGroups("Nova : Noé\nOrion : Alice", previous);
  assert.deepEqual(
    reordered.map((g) => g.id),
    ["b", "a"],
  );
  const inserted = WM.parseGroups(
    "Nouveau : Jade\nOrion : Alice\nNova : Noé",
    previous,
  );
  assert.equal(new Set(inserted.map((g) => g.id)).size, 3);
  assert.equal(inserted[0].score, 0);
  assert.throws(() => WM.parseGroups("Orion\nOrion", previous), /différent/);
});

test("structured editor validates orphan translations and preserves empty translations", () => {
  assert.deepEqual(
    WM.entriesFromRows([
      { sentence: " A. ", translation: " Un. " },
      { sentence: "", translation: "" },
      { sentence: "B.", translation: "" },
    ]),
    [
      { sentence: "A.", translation: "Un." },
      { sentence: "B.", translation: "" },
    ],
  );
  assert.throws(
    () => WM.entriesFromRows([{ sentence: "", translation: "Sans phrase" }]),
    /Ligne 1/,
  );
  assert.throws(
    () => WM.entriesFromRows([{ sentence: "x".repeat(1001), translation: "" }]),
    /1 000/,
  );
});
test("bulk columns preserve line alignment, including missing translations", () => {
  assert.deepEqual(WM.parseColumns("A.\nB.\nC.", "Un.\n\nTrois.").entries, [
    { sentence: "A.", translation: "Un." },
    { sentence: "B.", translation: "" },
    { sentence: "C.", translation: "Trois." },
  ]);
  assert.throws(
    () => WM.parseColumns("A.", "Un.\nTraduction supplémentaire"),
    /Ligne 2/,
  );
  assert.equal(WM.parseColumns("A. | Un.").entries[0].translation, "Un.");
});
