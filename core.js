(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WM = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const KEY = "syntaxalade_workshop_v1";
  const uid = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const text = (s, max = 1000) =>
    typeof s === "string" ? s.trim().slice(0, max) : "";
  const clone = (data) => JSON.parse(JSON.stringify(data));
  const shuffle = (items, random = Math.random) => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  function tokenize(sentence, mode = "separate") {
    if (mode === "attached")
      return text(sentence).split(/\s+/u).filter(Boolean);
    // Punctuation is an independent token; contractions and decimals stay intact.
    return (
      text(sentence).match(
        /-?\d+(?:[.,]\d+)+|[\p{L}\p{M}\p{N}]+(?:['’\-‑][\p{L}\p{M}\p{N}]+)*|[^\s]/gu,
      ) || []
    );
  }
  function scramble(tokens, random = Math.random) {
    const result = shuffle(
      tokens.map((value, id) => ({ value, id })),
      random,
    );
    if (tokens.length > 1 && result.every((t, i) => t.value === tokens[i])) {
      const different = result.findIndex((t) => t.value !== result[0].value);
      if (different > -1)
        [result[0], result[different]] = [result[different], result[0]];
    }
    return result;
  }
  function parseEntries(source) {
    const entries = [],
      warnings = [];
    String(source)
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .forEach((line, i) => {
        line = line.trim();
        if (!line || /^```/.test(line)) return;
        const parts = line.split(/\t|\s*\|\s*/);
        const sentence = parts[0]
          .replace(/^\s*(?:\d+[.)]\s+|[-*]\s+)/u, "")
          .trim();
        const translation = (parts[1] || "").trim();
        if (!sentence) return;
        if (sentence.length > 1000)
          throw new Error(
            `Ligne ${i + 1} : limitez la phrase à 1 000 caractères.`,
          );
        if (entries.length >= 500)
          throw new Error("Une liste peut contenir au maximum 500 phrases.");
        if (parts.length > 2)
          warnings.push(
            `Ligne ${i + 1} : séparateurs supplémentaires ignorés.`,
          );
        if (tokenize(sentence).length > 30)
          warnings.push(`Ligne ${i + 1} : phrase longue, affichage compact.`);
        entries.push({ sentence, translation: text(translation) });
      });
    const seen = new Set();
    entries.forEach((e) => {
      if (seen.has(e.sentence))
        warnings.push(`Phrase en double : ${e.sentence.slice(0, 45)}`);
      seen.add(e.sentence);
    });
    return { entries, warnings };
  }
  function makeGroups(students, count) {
    const names = [
      ...new Set(students.map((s) => text(s, 80)).filter(Boolean)),
    ];
    count = Math.max(
      1,
      Math.min(names.length || 1, Math.round(Number(count)) || 1, 30),
    );
    const groups = Array.from({ length: count }, (_, i) => ({
      id: uid(),
      name: `Équipe ${i + 1}`,
      members: [],
      score: 0,
    }));
    shuffle(names).forEach((n, i) => groups[i % count].members.push(n));
    return groups;
  }
  function parseGroups(source, previous = []) {
    const definitions = String(source)
      .split(/\n/)
      .map((line) => {
        const colon = line.indexOf(":");
        const name = text(colon < 0 ? line : line.slice(0, colon), 80);
        const members =
          colon < 0
            ? []
            : [
                ...new Set(
                  line
                    .slice(colon + 1)
                    .split(/[,;]/)
                    .map((s) => text(s, 80))
                    .filter(Boolean),
                ),
              ];
        return { name, members };
      })
      .filter((g) => g.name);
    if (definitions.length > 200) throw new Error("Maximum 200 groupes.");
    const names = new Set(definitions.map((g) => g.name));
    if (names.size !== definitions.length)
      throw new Error("Donnez un nom différent à chaque groupe.");
    const used = new Set();
    return definitions.map((group, index) => {
      let old = previous.find((g) => g.name === group.name && !used.has(g.id));
      const atIndex = previous[index];
      if (!old && atIndex && !names.has(atIndex.name) && !used.has(atIndex.id))
        old = atIndex;
      if (old) used.add(old.id);
      return { id: old?.id || uid(), ...group, score: old?.score || 0 };
    });
  }
  function defaults() {
    return {
      version: 2,
      folders: [],
      lists: [],
      classes: [],
      preferences: {
        listId: "",
        classId: "",
        duration: 45,
        punctuation: "separate",
        order: "random",
        showTranslation: false,
        motion: true,
        fontScale: 1,
        sound: false,
        simple: false,
      },
      session: null,
      history: [],
    };
  }
  function entriesFromRows(rows) {
    if (!Array.isArray(rows) || rows.length > 500)
      throw new Error("Une liste peut contenir au maximum 500 phrases.");
    return rows.flatMap((row, i) => {
      const sentence = String(row.sentence || "").trim(),
        translation = String(row.translation || "").trim();
      if (!sentence && translation)
        throw new Error(
          `Ligne ${i + 1} : ajoutez la phrase correspondant à cette traduction.`,
        );
      if (!sentence) return [];
      if (sentence.length > 1000 || translation.length > 1000)
        throw new Error(`Ligne ${i + 1} : maximum 1 000 caractères par champ.`);
      return [{ sentence, translation }];
    });
  }
  function parseColumns(sentences, translations = "") {
    if (!translations.trim()) return parseEntries(sentences);
    const phrases = String(sentences)
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/),
      aids = String(translations).split(/\r?\n/);
    const rows = Array.from(
      { length: Math.max(phrases.length, aids.length) },
      (_, i) => ({ sentence: phrases[i] || "", translation: aids[i] || "" }),
    );
    return { entries: entriesFromRows(rows), warnings: [] };
  }
  function normalize(raw) {
    if (
      !raw ||
      raw.version !== 2 ||
      !Array.isArray(raw.lists) ||
      !Array.isArray(raw.classes) ||
      !Array.isArray(raw.folders)
    )
      throw new Error("Ce fichier n’est pas une sauvegarde Syntaxalade 2.");
    if (
      raw.lists.length > 1000 ||
      raw.classes.length > 200 ||
      raw.folders.length > 200
    )
      throw new Error("La sauvegarde dépasse les limites de la bibliothèque.");
    const d = defaults(),
      ids = new Set();
    const cleanId = (value) => {
      const id = text(value, 100);
      if (!id || ids.has(id))
        throw new Error(
          "Identifiants absents ou en double dans la sauvegarde.",
        );
      ids.add(id);
      return id;
    };
    d.folders = raw.folders.map((f) => ({
      id: cleanId(f.id),
      name: text(f.name, 100) || "Sans titre",
    }));
    d.lists = raw.lists.map((l) => {
      if (
        !Array.isArray(l.entries) ||
        !l.entries.length ||
        l.entries.length > 500
      )
        throw new Error("Chaque liste doit contenir entre 1 et 500 phrases.");
      return {
        id: cleanId(l.id),
        folderId: d.folders.some((f) => f.id === l.folderId) ? l.folderId : "",
        title: text(l.title, 120) || "Sans titre",
        subject: text(l.subject, 80),
        level: text(l.level, 80),
        favorite: Boolean(l.favorite),
        entries: l.entries
          .map((e) => ({
            sentence: text(e.sentence),
            translation: text(e.translation),
          }))
          .filter((e) => e.sentence),
      };
    });
    if (d.lists.some((l) => !l.entries.length))
      throw new Error("Une liste contient uniquement des phrases vides.");
    d.classes = raw.classes.map((c) => ({
      id: cleanId(c.id),
      name: text(c.name, 100) || "Sans nom",
      students: [
        ...new Set(
          (Array.isArray(c.students) ? c.students : [])
            .map((s) => text(s, 80))
            .filter(Boolean),
        ),
      ].slice(0, 200),
      groups: (Array.isArray(c.groups) ? c.groups : [])
        .slice(0, 200)
        .map((g) => ({
          id: cleanId(g.id),
          name: text(g.name, 80) || "Équipe",
          members: (Array.isArray(g.members) ? g.members : [])
            .map((s) => text(s, 80))
            .filter(Boolean)
            .slice(0, 200),
          score: Number.isFinite(g.score)
            ? Math.max(-9999, Math.min(9999, Math.round(g.score)))
            : 0,
        })),
    }));
    const p = raw.preferences || {};
    d.preferences = {
      listId: d.lists.some((l) => l.id === p.listId)
        ? p.listId
        : d.lists[0]?.id || "",
      classId: d.classes.some((c) => c.id === p.classId) ? p.classId : "",
      duration: Number.isFinite(p.duration)
        ? Math.min(3600, Math.max(0, Math.round(p.duration)))
        : 45,
      punctuation: p.punctuation === "attached" ? "attached" : "separate",
      order: p.order === "sequential" ? "sequential" : "random",
      showTranslation: Boolean(p.showTranslation),
      motion: p.motion !== false,
      fontScale: [0.85, 1, 1.2, 1.4].includes(p.fontScale) ? p.fontScale : 1,
      sound: Boolean(p.sound),
      simple: Boolean(p.simple),
    };
    d.session = null;
    d.history = (Array.isArray(raw.history) ? raw.history : [])
      .slice(-30)
      .map((h) => ({
        date: text(h.date, 50),
        list: text(h.list, 120),
        className: text(h.className, 100),
        rounds: Number.isFinite(h.rounds) ? h.rounds : 0,
        results: (Array.isArray(h.results) ? h.results : [])
          .slice(0, 200)
          .map((r) => ({
            name: text(r.name, 80),
            score: Number.isFinite(r.score) ? r.score : 0,
          })),
      }));
    return d;
  }
  function load(storage) {
    const raw = storage.getItem(KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const d = normalize(parsed);
        d.session = parsed.session || null;
        return { data: d, recovered: false };
      } catch (_) {
        const backup = storage.getItem(`${KEY}_backup`);
        if (backup) {
          try {
            return { data: normalize(JSON.parse(backup)), recovered: true };
          } catch (_) {
            /* keep corrupt source for recovery */
          }
        }
        throw new Error(
          "La sauvegarde locale est illisible. Exportez les données brutes dans Réglages avant de restaurer une sauvegarde.",
        );
      }
    }
    return { data: defaults(), recovered: false };
  }
  function save(storage, data) {
    const serialized = JSON.stringify(data),
      previous = storage.getItem(KEY);
    if (previous && previous !== serialized) {
      try {
        normalize(JSON.parse(previous));
        storage.setItem(`${KEY}_backup`, previous);
      } catch (_) {
        /* never overwrite a good backup with corrupt data */
      }
    }
    storage.setItem(KEY, serialized);
  }
  function prompt(options) {
    return `Tu es un enseignant spécialiste de ${options.subject}. Prépare une liste pour un jeu de remise en ordre de phrases projeté en classe.\n\nThème : ${options.theme}\nLangue des phrases : ${options.language}\nPublic et niveau : ${options.level}\nNombre de phrases : ${options.count}\nLongueur : ${options.length}\nObjectif d’apprentissage : ${options.objective || "vocabulaire du thème et syntaxe correcte"}\n${options.translations ? "Ajoute une traduction française naturelle pour chaque phrase." : "Ne fournis pas de traduction."}\n\nRespecte strictement ces règles :\n- Des phrases naturelles, exactes, adaptées au niveau et vérifiées.\n- Varie les sujets et les structures sans dépasser la longueur demandée.\n- Chaque phrase doit pouvoir être reconstruite sans ambiguïté ; évite les listes et les formulations à plusieurs ordres possibles.\n- Garde la ponctuation et la casse normales.\n- Aucun tableau Markdown, aucun numéro, aucune puce, aucun commentaire.\n- Une phrase par ligne${options.translations ? ", suivie de « | » puis de sa traduction française" : ""}.\n- N’utilise pas « | » à l’intérieur des phrases.\n\nFormat exact attendu :\n${options.translations ? "Phrase dans la langue demandée. | Traduction française." : "Phrase dans la langue demandée."}`;
  }
  return {
    KEY,
    uid,
    clone,
    text,
    shuffle,
    tokenize,
    scramble,
    parseEntries,
    entriesFromRows,
    parseColumns,
    makeGroups,
    parseGroups,
    defaults,
    normalize,
    load,
    save,
    prompt,
  };
});
