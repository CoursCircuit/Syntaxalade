/* Syntaxalade — local-first teacher workspace and projection game. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const escape = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const iconPaths = {
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2l-1.5 1.5v1M12 17h.01"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    play: '<path d="m8 5 11 7-11 7Z"/>',
    book: '<path d="M12 6c-3-3-7-3-10-1v15c4-2 7-2 10 0 3-2 6-2 10 0V5c-3-2-7-2-10 1Zm0 0v14"/>',
    users:
      '<circle cx="9" cy="7" r="3"/><path d="M2 21v-3a7 7 0 0 1 14 0v3m0-17a3 3 0 0 1 0 6m3 4a6 6 0 0 1 3 5v2"/>',
    sparkles: '<path d="m12 3 3 6 6 3-6 3-3 6-3-6-6-3 6-3Z"/>',
    settings:
      '<path d="m10 2 4 0 1 3 3 2 3 0 2 4-2 2-1 3 1 3-4 2-2-2-4 0-2 2-4-2 1-3-1-3-2-2 2-4 3 0 3-2Z"/><circle cx="12" cy="12" r="3"/>',
    monitor:
      '<rect x="3" y="3" width="18" height="13" rx="2"/><path d="m8 21 4-5 4 5"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    bulb: '<path d="M9 18h6m-5 4h4m-6-8a6 6 0 1 1 8 0l-1 3H9Z"/>',
    reset: '<path d="M3 10a9 9 0 1 1 2 8M3 3v7h7"/>',
    undo: '<path d="m9 5-6 6 6 6m-6-6h11a7 7 0 0 1 7 7v2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    folder: '<path d="M3 7V4h7l3 3h8v13H3Z"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
    star: '<path d="m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z"/>',
    edit: '<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M15 8V3H3v12h5"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M3 16v5h18v-5"/>',
    upload: '<path d="M12 16V3m-5 5 5-5 5 5M3 16v5h18v-5"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    shuffle:
      '<path d="M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 4-3 5-6m3-4c1-1 3-2 4-2h3m-4-4 4 4-4 4"/>',
  };
  const icon = (name) =>
    `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.sparkles}</svg>`;
  const icons = (scope = document) =>
    scope.querySelectorAll("[data-icon]").forEach((node) => {
      node.outerHTML = icon(node.dataset.icon);
    });
  const button = (action, label, symbol, cls = "secondary", attrs = "") =>
    `<button type="button" class="button ${cls}" data-action="${action}" ${attrs}>${symbol ? icon(symbol) : ""}${label}</button>`;
  const smallButton = (action, label, symbol, attrs = "") =>
    button(
      action,
      "",
      symbol,
      "icon-only",
      `aria-label="${escape(label)}" title="${escape(label)}" ${attrs}`,
    );
  let data,
    storageBlocked = false,
    currentView = "play",
    session = null,
    timerId = null,
    deadline = 0,
    lastCheckpoint = 0,
    toastId,
    filterFolder = "",
    favoriteOnly = false,
    searchQuery = "",
    scoreUndo = [],
    draftDirty = false,
    dialogReturnFocus = null;
  let textImporter = null;
  const titles = {
    play: [
      "Vos phrases, à vous de jouer.",
      "Préparez une liste. Le jeu s’occupe du mélange.",
    ],
    library: [
      "Mes listes",
      "Vos phrases, prêtes à être réutilisées en classe.",
    ],
    classes: [
      "Mes classes",
      "Des élèves et des équipes que l’on retrouve à chaque séance.",
    ],
    help: [
      "Comment ça marche ?",
      "L’essentiel pour préparer et animer votre activité.",
    ],
    settings: [
      "Réglages",
      "Adaptez le jeu à votre classe et gardez une copie de votre travail.",
    ],
  };
  function toast(message) {
    $("toast").textContent = message;
    $("toast").hidden = false;
    clearTimeout(toastId);
    toastId = setTimeout(() => {
      $("toast").hidden = true;
    }, 5000);
  }
  function persist() {
    if (storageBlocked) return false;
    data.session = session ? WM.clone(session) : null;
    try {
      WM.save(localStorage, data);
      $("saveStatus").textContent = "Enregistré sur cet ordinateur";
      return true;
    } catch (_) {
      $("saveStatus").textContent =
        "Sauvegarde impossible : exportez vos données";
      document.body.classList.add("save-error");
      toast(
        "Le stockage est indisponible ou plein. Exportez une sauvegarde dans Réglages.",
      );
      return false;
    }
  }
  function applyPreferences() {
    document.body.classList.toggle("no-motion", !data.preferences.motion);
    document.body.classList.toggle("simple-mode", data.preferences.simple);
    document.documentElement.style.setProperty(
      "--word-scale",
      data.preferences.fontScale,
    );
  }
  function updateEmptyState() {
    const ready = Boolean(data.lists.length || session);
    $("welcome").hidden = ready;
    $("launchForm").hidden = !ready;
    $("gameLayout").hidden = !ready;
    $("keyboardHints").hidden = !ready;
    $("projectionBtn").hidden = currentView !== "play" || !ready;
    $("helpBtn").hidden =
      currentView === "help" || (currentView === "play" && ready);
    $("pendingSetup").hidden =
      !session ||
      !data.lists.length ||
      (data.preferences.listId === session.listId &&
        data.preferences.classId === session.classId &&
        data.preferences.duration === session.duration);
  }
  function selections() {
    $("listSelect").innerHTML =
      '<option value="">Choisissez une liste</option>' +
      data.lists
        .map(
          (l) =>
            `<option value="${escape(l.id)}">${escape(l.title)}${l.subject ? " · " + escape(l.subject) : ""}${l.level ? " " + escape(l.level) : ""}</option>`,
        )
        .join("") +
      '<option value="__new">+ Créer une nouvelle liste…</option>';
    $("listSelect").value = data.preferences.listId;
    $("classSelect").innerHTML =
      '<option value="">Tous ensemble · sans équipes</option>' +
      data.classes
        .map(
          (c) => `<option value="${escape(c.id)}">${escape(c.name)}</option>`,
        )
        .join("") +
      '<option value="__new">+ Créer une classe…</option>';
    $("classSelect").value = data.preferences.classId;
    if (
      ![...$("durationSelect").options].some(
        (o) => Number(o.value) === data.preferences.duration,
      )
    )
      $("durationSelect").add(
        new Option(
          `${data.preferences.duration} secondes`,
          data.preferences.duration,
        ),
      );
    $("durationSelect").value = data.preferences.duration;
    $("launchBtn").disabled = !data.lists.length;
    renderScores();
    updateEmptyState();
  }
  function navigate(view) {
    if (!titles[view]) return;
    if (view !== "play" && session?.status === "playing") pause();
    if (document.body.classList.contains("projection") && view !== "play")
      toggleProjection(false);
    currentView = view;
    document.querySelectorAll(".view").forEach((node) => {
      node.hidden = node.id !== `view-${view}`;
    });
    document.querySelectorAll(".nav-item").forEach((node) => {
      node.classList.toggle("active", node.dataset.view === view);
      node.setAttribute(
        "aria-current",
        node.dataset.view === view ? "page" : "false",
      );
    });
    $("pageTitle").textContent = titles[view][0];
    $("pageSubtitle").textContent = titles[view][1];
    updateEmptyState();
    if (view === "library") renderLibrary();
    if (view === "classes") renderClasses();
    if (view === "help") renderHelp();
    if (view === "settings") renderSettings();
  }
  function openDialog(content) {
    if (session?.status === "playing") pause();
    dialogReturnFocus = document.activeElement;
    $("editorDialog").className = "";
    $("dialogContent").innerHTML = content;
    draftDirty = false;
    icons($("editorDialog"));
    $("editorDialog").showModal();
  }
  function closeDialog(force = false) {
    if (
      !force &&
      draftDirty &&
      !window.confirm("Fermer sans enregistrer les modifications ?")
    )
      return;
    $("editorDialog").close();
    textImporter = null;
    draftDirty = false;
    dialogReturnFocus?.focus?.();
  }
  function dialogHeader(title) {
    return `<div class="dialog-header"><h2 id="dialogTitle">${title}</h2>${smallButton("close-dialog", "Fermer", "close")}</div>`;
  }
  function confirmAction(title, message, fn, destructive = true) {
    openDialog(
      `${dialogHeader(title)}<p class="dialog-message">${escape(message)}</p><div class="dialog-actions">${button("close-dialog", "Annuler", "", "secondary")}<button id="confirmAction" class="button ${destructive ? "danger" : "primary"}">${destructive ? "Confirmer" : "Continuer"}</button></div>`,
    );
    $("confirmAction").onclick = () => {
      closeDialog(true);
      fn();
    };
  }
  async function download(name, content, type = "application/json") {
    try {
      if (window.syntaxalade?.saveTextFile)
        return !(await window.syntaxalade.saveTextFile(name, content)).canceled;
      const url = URL.createObjectURL(new Blob([content], { type }));
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    } catch (error) {
      toast(`Impossible d’enregistrer le fichier : ${error.message}`);
      return false;
    }
  }
  async function exportBackup() {
    const saved = await download(
      `Syntaxalade-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify({ ...data, session: null }, null, 2),
    );
    if (saved)
      toast(
        "Copie enregistrée. Vous pourrez la transférer sur un autre ordinateur.",
      );
  }
  const activeClass = () =>
    data.classes.find(
      (c) => c.id === (session?.classId ?? data.preferences.classId),
    );
  function renderScores() {
    const c = activeClass();
    $("classCaption").textContent = c?.name || "Mode coopératif";
    $("scoreList").innerHTML =
      (c?.groups || [])
        .map(
          (g, i) =>
            `<li><span class="team-dot" style="--team-color:${["#8063d0", "#6192b7", "#b6905a", "#c37793", "#5b9a8c"][i % 5]}"></span><span class="team-name" title="${escape(g.members.join(", "))}">${escape(g.name)}</span><div class="score-controls">${smallButton("score-minus", `Retirer un point à ${g.name}`, "minus", `data-id="${escape(g.id)}"`)}<output>${g.score}</output>${smallButton("score-plus", `Ajouter un point à ${g.name}`, "plus", `data-id="${escape(g.id)}"`)}</div></li>`,
        )
        .join("") ||
      `<li class="empty-score"><p>Un jeu collectif, sans compétition.</p>${button("go-classes", "Créer des équipes", "users")}</li>`;
    $("scoreboard").hidden = !c?.groups.length;
    $("gameLayout").classList.toggle("cooperative", !c?.groups.length);
    $("resetScores").disabled = !c?.groups.length;
    $("undoScore").disabled = !scoreUndo.length;
  }
  function changeScore(id, delta) {
    const c = activeClass(),
      group = c?.groups.find((g) => g.id === id);
    if (!group) return;
    scoreUndo.push({ classId: c.id, id, score: group.score });
    scoreUndo = scoreUndo.slice(-100);
    group.score = Math.min(9999, Math.max(-9999, group.score + delta));
    persist();
    renderScores();
  }
  function undoScore() {
    const entry = scoreUndo.pop(),
      group = data.classes
        .find((c) => c.id === entry?.classId)
        ?.groups.find((g) => g.id === entry.id);
    if (group) {
      group.score = entry.score;
      persist();
    }
    renderScores();
  }
  function timeLabel(ms) {
    const secs = Math.ceil(Math.max(0, ms) / 1000);
    return `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  }
  function updateTimer() {
    const duration = session?.duration ?? data.preferences.duration;
    const remaining = session?.remaining ?? duration * 1000;
    $("timer").textContent = duration ? timeLabel(remaining) : "∞";
    const percent = duration
      ? Math.min(100, Math.max(0, remaining / (duration * 10)))
      : 100;
    $("timebarFill").style.width = `${percent}%`;
    $("timebar").setAttribute("aria-valuenow", Math.round(percent));
    $("stage").classList.toggle(
      "time-low",
      duration > 0 && remaining <= 10000 && session?.status === "playing",
    );
  }
  function stopClock() {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
    if (session?.status === "playing" && session.duration && deadline)
      session.remaining = Math.max(0, deadline - performance.now());
    deadline = 0;
  }
  function startClock() {
    stopClock();
    if (!session || session.status !== "playing" || !session.duration) return;
    deadline = performance.now() + session.remaining;
    lastCheckpoint = performance.now();
    timerId = setInterval(() => {
      session.remaining = Math.max(0, deadline - performance.now());
      updateTimer();
      if (session.remaining <= 0) {
        stopClock();
        session.status = "expired";
        session.remaining = 0;
        renderRound();
        persist();
        if (data.preferences.sound) sound();
      } else if (performance.now() - lastCheckpoint > 5000) {
        lastCheckpoint = performance.now();
        persist();
      }
    }, 100);
  }
  function sound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator(),
        gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.055, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
      osc.onended = () => ctx.close();
    } catch (_) {
      /* visual cue remains */
    }
  }
  function launch() {
    const list = data.lists.find((l) => l.id === $("listSelect").value);
    if (!list?.entries.length) {
      toast("Ajoutez au moins une phrase à votre liste.");
      return;
    }
    const run = () => {
      stopClock();
      data.preferences.listId = list.id;
      data.preferences.classId = $("classSelect").value;
      data.preferences.duration = Number($("durationSelect").value);
      session = {
        listId: list.id,
        listTitle: list.title,
        classId: data.preferences.classId,
        entries: WM.clone(list.entries),
        order:
          data.preferences.order === "random"
            ? WM.shuffle(list.entries.map((_, i) => i))
            : list.entries.map((_, i) => i),
        position: 0,
        duration: data.preferences.duration,
        remaining: data.preferences.duration * 1000,
        punctuation: data.preferences.punctuation,
        status: "playing",
        chosen: [],
        tokens: [],
        hints: 0,
        showTranslation: data.preferences.showTranslation,
        completed: false,
      };
      prepareRound();
      $("launchBtn").innerHTML = `${icon("reset")}Nouvelle partie`;
      scoreUndo = [];
      renderScores();
      $("main").focus({ preventScroll: true });
    };
    if (session && !["finished"].includes(session.status))
      confirmAction(
        "Démarrer une nouvelle partie ?",
        "La manche en cours sera remplacée. Les scores des équipes seront conservés.",
        run,
        false,
      );
    else run();
  }
  function currentEntry() {
    return session?.entries[session.order[session.position]];
  }
  function prepareRound() {
    session.status = "playing";
    session.remaining = session.duration * 1000;
    session.chosen = [];
    session.tokens = WM.scramble(
      WM.tokenize(currentEntry().sentence, session.punctuation),
    );
    session.showTranslation = data.preferences.showTranslation;
    renderRound();
    persist();
    startClock();
  }
  function pause() {
    if (session?.status !== "playing") return;
    stopClock();
    session.status = "paused";
    renderRound();
    persist();
  }
  function resume() {
    if (session?.status !== "paused") return;
    session.status = "playing";
    renderRound();
    startClock();
    persist();
  }
  function reveal() {
    if (!session || !["playing", "paused", "expired"].includes(session.status))
      return;
    stopClock();
    session.status = "revealed";
    renderRound();
    persist();
  }
  function nextRound() {
    if (session?.status !== "revealed") return;
    session.position++;
    if (session.position >= session.entries.length) finish();
    else prepareRound();
  }
  function finish() {
    stopClock();
    session.status = "finished";
    if (!session.completed) {
      session.completed = true;
      data.history.push({
        date: new Date().toISOString(),
        list: session.listTitle,
        className: activeClass()?.name || "Mode coopératif",
        rounds: session.entries.length,
        results: (activeClass()?.groups || []).map((g) => ({
          name: g.name,
          score: g.score,
        })),
      });
      data.history = data.history.slice(-30);
    }
    renderRound();
    persist();
  }
  function validSession(raw) {
    if (
      !raw ||
      !Array.isArray(raw.entries) ||
      !raw.entries.length ||
      raw.entries.length > 500 ||
      raw.entries.some(
        (e) =>
          typeof e?.sentence !== "string" ||
          !e.sentence.trim() ||
          e.sentence.length > 1000,
      )
    )
      return null;
    if (
      !Array.isArray(raw.order) ||
      raw.order.length !== raw.entries.length ||
      new Set(raw.order).size !== raw.entries.length ||
      raw.order.some(
        (i) => !Number.isInteger(i) || i < 0 || i >= raw.entries.length,
      )
    )
      return null;
    if (
      !["playing", "paused", "expired", "revealed", "finished"].includes(
        raw.status,
      ) ||
      !Number.isInteger(raw.position) ||
      raw.position < 0 ||
      raw.position > raw.entries.length ||
      !Number.isFinite(raw.remaining) ||
      !Number.isFinite(raw.duration) ||
      raw.duration < 0 ||
      raw.duration > 3600
    )
      return null;
    if (raw.position === raw.entries.length && raw.status !== "finished")
      return null;
    if (raw.status !== "finished") {
      const ordered = WM.tokenize(
        raw.entries[raw.order[raw.position]].sentence,
        raw.punctuation,
      );
      if (
        !Array.isArray(raw.tokens) ||
        raw.tokens.length !== ordered.length ||
        new Set(raw.tokens.map((t) => t.id)).size !== ordered.length ||
        raw.tokens.some(
          (t) => !Number.isInteger(t.id) || ordered[t.id] !== t.value,
        )
      )
        return null;
      if (
        !Array.isArray(raw.chosen) ||
        new Set(raw.chosen).size !== raw.chosen.length ||
        raw.chosen.some((id) => !raw.tokens.some((t) => t.id === id))
      )
        return null;
    }
    const copy = WM.clone(raw);
    copy.remaining = Math.min(
      copy.duration * 1000,
      Math.max(0, copy.remaining),
    );
    if (copy.status === "playing") copy.status = "paused";
    return copy;
  }
  function renderRound() {
    updateEmptyState();
    if (!data.lists.length && !session) {
      $("wordField").replaceChildren();
      return;
    }
    $("previewHelp").hidden = Boolean(session);
    $("startRoundBtn").hidden = Boolean(session);

    const preview = !session;
    const done = session?.status === "finished",
      revealed = session?.status === "revealed";
    const entry = preview
      ? data.lists.find((l) => l.id === data.preferences.listId)?.entries[0]
      : currentEntry();
    const tokens = preview
      ? WM.scramble(WM.tokenize(entry?.sentence || ""))
      : session.tokens;
    $("roundLabel").textContent = preview
      ? "PRÊT À JOUER"
      : done
        ? "PARTIE TERMINÉE"
        : `PHRASE ${String(session.position + 1).padStart(2, "0")} / ${String(session.entries.length).padStart(2, "0")}`;
    $("roundTitle").textContent = done
      ? "Bien joué, tout le monde !"
      : revealed
        ? "La phrase à retrouver"
        : session?.status === "expired"
          ? "Temps écoulé. À vous de répondre !"
          : "Retrouvez la phrase.";
    $("pauseOverlay").hidden = session?.status !== "paused";
    $("pauseBtn").hidden =
      !session || !["playing", "paused"].includes(session.status);
    $("pauseBtn").innerHTML = icon(
      session?.status === "paused" ? "play" : "pause",
    );
    $("pauseBtn").setAttribute(
      "aria-label",
      session?.status === "paused" ? "Reprendre le jeu" : "Mettre en pause",
    );
    $("translation").textContent = entry?.translation || "";
    $("translation").hidden =
      !entry?.translation ||
      !(session?.showTranslation ?? data.preferences.showTranslation) ||
      done;
    $("translationBtn").disabled = !entry?.translation || done;
    $("translationBtn").innerHTML =
      `${icon("eye")}<span>${!entry?.translation ? "Sans traduction" : $("translation").hidden ? "Afficher la traduction" : "Masquer la traduction"}</span>`;
    $("hintBtn").hidden = preview || done || revealed;
    $("revealBtn").hidden = preview || done || revealed;
    $("nextBtn").hidden = !revealed;
    $("nextBtn").innerHTML =
      `${session?.position === session?.entries.length - 1 ? "Terminer la partie" : "Phrase suivante"}${icon("arrow")}`;
    $("wordField").hidden = done || revealed;
    $("wordField").innerHTML =
      done || revealed
        ? ""
        : tokens
            .map(
              (t, i) =>
                `<button class="word-tile ${session?.chosen.includes(t.id) ? "chosen" : ""}" data-action="choose-word" data-id="${t.id}" style="--drift:${i % 3}" ${preview || session?.status === "paused" || session?.chosen.includes(t.id) ? "disabled" : ""} aria-label="Ajouter ${escape(t.value)} à la phrase"><span>${escape(t.value)}</span></button>`,
            )
            .join("");
    $("stage").classList.toggle("revealed", Boolean(revealed));
    $("stage").classList.toggle("finished", Boolean(done));
    $("resultArea").hidden = !revealed && !done;
    if (revealed)
      $("resultArea").innerHTML =
        `<p class="solution">${escape(entry.sentence)}</p><p class="solution-caption">Discutez de la phrase, puis attribuez les points.</p>`;
    if (done) {
      const groups = [...(activeClass()?.groups || [])].sort(
        (a, b) => b.score - a.score,
      );
      $("resultArea").innerHTML =
        `<p class="session-summary">${session.entries.length} phrases explorées ensemble.</p>${groups.length ? `<ol class="final-ranking">${groups.map((g) => `<li>${icon("star")}<strong>${escape(g.name)}</strong><span>${g.score} pt${Math.abs(g.score) > 1 ? "s" : ""}</span></li>`).join("")}</ol>` : '<p class="solution">Vous avez terminé la liste.</p>'}${button("replay", "Rejouer cette liste", "play", "primary")}`;
    }
    renderAnswer();
    updateTimer();
    requestAnimationFrame(fitWords);
  }
  function renderAnswer() {
    const show =
      session &&
      !["revealed", "finished"].includes(session.status) &&
      session.chosen.length > 0;
    $("answerArea").hidden = !show;
    $("answerWords").innerHTML = show
      ? session.chosen
          .map(
            (id) =>
              `<button class="answer-token" data-action="remove-word" data-id="${id}" aria-label="Retirer ${escape(session.tokens.find((t) => t.id === id).value)}">${escape(session.tokens.find((t) => t.id === id).value)}</button>`,
          )
          .join("")
      : "";
    $("answerFeedback").textContent =
      show && session.chosen.length === session.tokens.length
        ? "Un autre ordre est possible ? Modifiez votre proposition ou révélez la correction."
        : "";
    requestAnimationFrame(fitWords);
  }
  function chooseWord(id) {
    if (
      !session ||
      !["playing", "expired"].includes(session.status) ||
      session.chosen.includes(id)
    )
      return;
    session.chosen.push(id);
    const ordered = WM.tokenize(currentEntry().sentence, session.punctuation);
    if (
      session.chosen.length === ordered.length &&
      session.chosen.every(
        (id, i) => session.tokens.find((t) => t.id === id).value === ordered[i],
      )
    ) {
      reveal();
      toast("Bravo ! La phrase est reconstruite.");
      return;
    }
    renderRound();
    persist();
  }
  function hint() {
    if (!session || !["playing", "expired"].includes(session.status)) return;
    const ordered = WM.tokenize(currentEntry().sentence, session.punctuation);
    // Keep the correct prefix, then place one more token. Duplicate words have stable IDs.
    let prefix = 0;
    while (
      prefix < session.chosen.length &&
      session.tokens.find((t) => t.id === session.chosen[prefix])?.value ===
        ordered[prefix]
    )
      prefix++;
    session.chosen = session.chosen.slice(0, prefix);
    const next = session.tokens.find(
      (t) => !session.chosen.includes(t.id) && t.value === ordered[prefix],
    );
    session.hints++;
    if (next) chooseWord(next.id);
  }
  function fitWords() {
    const field = $("wordField");
    if (field.hidden || !field.clientWidth) return;
    const projected = document.body.classList.contains("projection");
    let scale = data.preferences.fontScale * (projected ? 1.25 : 1);
    field.style.setProperty("--fit", scale);
    let guard = 30;
    while (
      guard-- &&
      (field.scrollWidth > field.clientWidth + 2 ||
        $("stage").querySelector(".stage-content").scrollHeight >
          $("stage").querySelector(".stage-content").clientHeight + 2) &&
      scale > 0.7
    ) {
      scale -= 0.04;
      field.style.setProperty("--fit", scale);
    }
    // Dense sentences remain scrollable; words never overlap or get clipped.
  }
  function toggleProjection(force) {
    const enable = force ?? !document.body.classList.contains("projection");
    document.body.classList.toggle("projection", enable);
    $("projectionBtn").innerHTML =
      `${icon("monitor")}<span>${enable ? "Quitter la projection" : "Projeter le jeu"}</span>`;
    if (window.syntaxalade?.setFullscreen)
      window.syntaxalade.setFullscreen(enable).catch(() => {});
    else if (enable && document.documentElement.requestFullscreen)
      document.documentElement.requestFullscreen().catch(() => {});
    else if (!enable && document.fullscreenElement)
      document.exitFullscreen().catch(() => {});
    requestAnimationFrame(fitWords);
  }
  function renderLibrary() {
    const empty = !data.lists.length && !data.folders.length;
    $("view-library").innerHTML =
      `<div class="toolbar"><div class="search-field">${icon("search")}<input id="librarySearch" aria-label="Rechercher une liste" placeholder="Rechercher une liste ou une phrase…" value="${escape(searchQuery)}"></div>${button("new-folder", "Créer un dossier", "folder")}${button("new-list", "Créer une liste", "plus", "primary")}</div><div class="library-layout ${empty ? "no-folders" : ""}"><aside class="folder-rail" aria-label="Dossiers" ${empty ? "hidden" : ""}><button class="folder-item ${!filterFolder && !favoriteOnly ? "selected" : ""}" data-action="filter-folder" data-id="">${icon("book")}Toutes les listes<span>${data.lists.length}</span></button><button class="folder-item ${favoriteOnly ? "selected" : ""}" data-action="filter-favorites">${icon("star")}Favoris</button><div class="section-label">DOSSIERS</div>${data.folders.map((f) => `<div class="folder-row"><button class="folder-item ${filterFolder === f.id ? "selected" : ""}" data-action="filter-folder" data-id="${escape(f.id)}">${icon("folder")}<span>${escape(f.name)}</span><small>${data.lists.filter((l) => l.folderId === f.id).length}</small></button>${smallButton("edit-folder", "Renommer le dossier", "edit", `data-id="${escape(f.id)}"`)}${smallButton("delete-folder", "Supprimer le dossier", "trash", `data-id="${escape(f.id)}"`)}</div>`).join("")}</aside><div><div id="libraryResults" class="list-collection"></div><p class="library-note muted">Vos listes sont enregistrées automatiquement sur cet ordinateur.</p></div></div>`;
    $("librarySearch").oninput = (e) => {
      searchQuery = e.target.value;
      renderLibraryResults();
    };
    renderLibraryResults();
  }
  function renderLibraryResults() {
    const query = searchQuery.toLocaleLowerCase("fr");
    const lists = data.lists.filter(
      (l) =>
        (!filterFolder || l.folderId === filterFolder) &&
        (!favoriteOnly || l.favorite) &&
        `${l.title} ${l.subject} ${l.level} ${l.entries.map((e) => e.sentence).join(" ")}`
          .toLocaleLowerCase("fr")
          .includes(query),
    );
    $("libraryResults").innerHTML =
      lists
        .map(
          (l) =>
            `<article class="list-row"><div class="list-mark">${icon("book")}</div><div class="list-info"><div class="list-meta">${l.entries.length} phrase${l.entries.length > 1 ? "s" : ""}${l.subject ? ` · ${escape(l.subject)}` : ""}${l.level ? ` · ${escape(l.level)}` : ""}${l.folderId ? ` · ${escape(data.folders.find((f) => f.id === l.folderId)?.name || "")}` : ""}</div><h2>${escape(l.title)}</h2><p>${escape(l.entries[0]?.sentence || "")}</p></div><div class="list-actions">${smallButton("favorite-list", l.favorite ? "Retirer des favoris" : "Ajouter aux favoris", "star", `data-id="${escape(l.id)}" aria-pressed="${l.favorite}"`)}${button("edit-list", "Modifier", "edit", "secondary", `data-id="${escape(l.id)}"`)}${button("play-list", "Jouer", "play", "primary", `data-id="${escape(l.id)}"`)}<details class="more-menu"><summary aria-label="Autres actions pour ${escape(l.title)}" title="Autres actions">${icon("more")}</summary><div>${button("duplicate-list", "Dupliquer", "copy", "text-button", `data-id="${escape(l.id)}"`)}${button("export-list", "Exporter les phrases", "download", "text-button", `data-id="${escape(l.id)}"`)}${button("delete-list", "Supprimer la liste", "trash", "text-button danger-text", `data-id="${escape(l.id)}"`)}</div></details></div></article>`,
        )
        .join("") ||
      `<div class="empty-state">${icon("book")}<h2>${data.lists.length ? "Aucune liste ne correspond à votre recherche." : "Aucune liste pour le moment."}</h2><p>${data.lists.length ? "Essayez un autre mot ou choisissez un autre dossier." : "Créez votre première liste pour l’ajouter à votre bibliothèque."}</p>${button("new-list", "Créer une liste", "plus", "primary")}${!data.lists.length ? button("import-text", "Importer un fichier", "upload", "text-button") : ""}</div>`;
  }

  function editFolder(id) {
    const folder = data.folders.find((f) => f.id === id);
    openDialog(
      `<form id="folderForm">${dialogHeader(folder ? "Renommer le dossier" : "Nouveau dossier")}<label>Nom du dossier<input name="name" required maxlength="100" value="${escape(folder?.name || "")}" placeholder="Ex. Allemand · Les voyages" autofocus></label><div class="dialog-actions">${button("close-dialog", "Annuler")}<button class="button primary">Enregistrer</button></div></form>`,
    );
    $("folderForm").onsubmit = (e) => {
      e.preventDefault();
      const name = new FormData(e.target).get("name").trim();
      if (!name) return;
      if (folder) folder.name = name;
      else data.folders.push({ id: WM.uid(), name });
      persist();
      closeDialog(true);
      renderLibrary();
    };
  }
  function editList(id, preset = {}) {
    const original = data.lists.find((l) => l.id === id);
    const returnToPlay = preset.play || currentView === "play";
    const l = original || {
      title: preset.title || "",
      subject: "",
      level: "",
      folderId: filterFolder || "",
      entries: [],
    };
    let rows = preset.source
      ? WM.parseEntries(preset.source).entries
      : WM.clone(l.entries);
    if (!rows.length)
      rows = Array.from({ length: 3 }, () => ({
        sentence: "",
        translation: "",
      }));
    let deletedRow = null,
      activeTab = "write",
      bulkApplied = true;
    openDialog(`<form id="listForm">${dialogHeader(original ? "Modifier la liste" : "Créer une liste")}<label>Nom de la liste<input name="title" required maxlength="120" value="${escape(l.title)}" placeholder="Ex. Les voyages · Allemand A2" autofocus></label><div class="editor-tabs" role="tablist" aria-label="Comment ajouter vos phrases ?"><button type="button" id="tab-write" role="tab" aria-controls="panel-write" aria-selected="true" data-edit-tab="write">${icon("edit")}Saisir les phrases</button><button type="button" id="tab-paste" role="tab" aria-controls="panel-paste" aria-selected="false" data-edit-tab="paste">${icon("copy")}Coller un texte</button><button type="button" id="tab-ai" role="tab" aria-controls="panel-ai" aria-selected="false" data-edit-tab="ai">${icon("sparkles")}Avec une IA</button></div>
      <div id="panel-write" role="tabpanel" aria-labelledby="tab-write"><div class="field-heading"><div><h3>Vos phrases</h3><p class="field-help">Chaque phrase a sa ligne. Les traductions sont facultatives.</p></div></div><div class="phrase-table"><div class="phrase-table-head"><span>#</span><span>Phrase à remettre en ordre</span><span>Traduction <small>(facultative)</small></span><span></span></div><div id="phraseRows"></div></div><div class="phrase-tools"><button type="button" id="addPhrase" class="button secondary">${icon("plus")}Ajouter une phrase</button><button type="button" id="undoDeleteRow" class="text-button" hidden>${icon("undo")}Rétablir la ligne supprimée</button></div></div>
      <div id="panel-paste" role="tabpanel" aria-labelledby="tab-paste" hidden><h3>Collez vos phrases</h3><p class="field-help">Une phrase par ligne. Vous pourrez ensuite vérifier et modifier chaque ligne.</p><textarea id="bulkSentences" rows="7" aria-label="Phrases à coller" placeholder="Collez votre texte ici…"></textarea><details class="optional-block"><summary>J’ai aussi une liste de traductions</summary><label>Traductions, dans le même ordre<textarea id="bulkTranslations" rows="5" placeholder="Une traduction par ligne. Laissez une ligne vide si elle n’a pas de traduction."></textarea></label></details><div class="button-row"><button type="button" id="applyBulk" class="button primary">${icon("check")}Ajouter ces phrases</button>${button("import-text", "Choisir un fichier texte", "upload")}</div><p id="bulkFeedback" class="field-help" role="status"></p></div>
      <div id="panel-ai" role="tabpanel" aria-labelledby="tab-ai" hidden><p class="field-help">L’application prépare une consigne à copier dans l’IA de votre choix. Aucun compte IA n’est connecté à Syntaxalade.</p><div class="form-grid"><label>Matière<input id="aiSubject" placeholder="Ex. Allemand, histoire…" maxlength="80"></label><label>Langue des phrases<input id="aiLanguage" placeholder="Ex. Allemand" maxlength="80"></label><label>Thème<input id="aiTheme" placeholder="Ex. Les voyages" maxlength="200"></label><label>Niveau des élèves<input id="aiLevel" placeholder="Ex. 11e, niveau A2" maxlength="100"></label><label>Nombre de phrases<input id="aiCount" type="number" min="1" max="100" value="10"></label><label>Longueur<select id="aiLength"><option>Courtes : 4 à 7 mots</option><option>Moyennes : 7 à 12 mots</option><option>Longues : 12 à 18 mots</option></select></label></div><label class="checkbox-label"><input id="aiTranslations" type="checkbox">Demander une traduction française</label><button type="button" id="preparePrompt" class="button secondary">${icon("copy")}Préparer et copier la consigne</button><div id="aiCopyArea" hidden><label>Consigne à copier<textarea id="promptOutput" rows="5" readonly></textarea></label><p class="field-help">1. Collez cette consigne dans votre IA.<br>2. Copiez sa réponse et collez-la ci-dessous.<br>3. Cliquez sur « Vérifier les phrases ».</p></div><label class="ai-response-label">Réponse de votre IA<textarea id="aiResult" rows="5" placeholder="Collez ici les phrases proposées…"></textarea></label><button type="button" id="applyAI" class="button primary">${icon("check")}Vérifier les phrases</button></div>
      <details class="optional-block"><summary>Ranger dans un dossier <span>· facultatif</span></summary><div class="form-grid"><label>Dossier<select name="folderId"><option value="">Sans dossier</option>${data.folders.map((f) => `<option value="${escape(f.id)}" ${l.folderId === f.id ? "selected" : ""}>${escape(f.name)}</option>`).join("")}</select></label><label>Ou créer un dossier<input name="newFolder" maxlength="100" placeholder="Nom du nouveau dossier"></label><label>Matière <span class="optional">facultatif</span><input name="subject" maxlength="80" value="${escape(l.subject)}" placeholder="Ex. Allemand"></label><label>Niveau <span class="optional">facultatif</span><input name="level" maxlength="80" value="${escape(l.level)}" placeholder="Ex. A2"></label></div></details><p id="formError" class="form-error" role="alert"></p><div class="dialog-actions"><span id="entryCount" class="entry-count" role="status">0 phrase pour le moment</span>${button("close-dialog", "Annuler")}<button class="button primary" id="saveList">Enregistrer la liste</button></div></form>`);
    $("editorDialog").classList.add("list-editor");
    const count = () => {
      const n = rows.filter((r) => r.sentence.trim()).length;
      $("entryCount").textContent = n
        ? `${n} phrase${n > 1 ? "s" : ""} · ${rows.filter((r) => r.sentence.trim() && r.translation.trim()).length} traduction(s)`
        : "0 phrase pour le moment";
    };
    function renderRows(focusIndex) {
      $("phraseRows").innerHTML = rows
        .map(
          (r, i) =>
            `<div class="phrase-row"><span class="row-number">${i + 1}</span><textarea class="sentence-field" rows="1" maxlength="1000" data-row="${i}" data-field="sentence" aria-label="Phrase ${i + 1}" placeholder="${i === 0 ? "Écrivez votre phrase ici…" : ""}">${escape(r.sentence)}</textarea><textarea rows="1" maxlength="1000" data-row="${i}" data-field="translation" aria-label="Traduction ${i + 1}" placeholder="${i === 0 ? "Ajoutez une aide si nécessaire…" : "Traduction facultative"}">${escape(r.translation)}</textarea><button type="button" class="button icon-only" data-remove-row="${i}" aria-label="Supprimer la phrase ${i + 1}" title="Supprimer cette ligne">${icon("trash")}</button></div>`,
        )
        .join("");
      count();
      if (focusIndex !== undefined)
        $("phraseRows")
          .querySelector(`[data-row="${focusIndex}"][data-field="sentence"]`)
          ?.focus();
    }
    function switchTab(tab) {
      activeTab = tab;
      $("listForm")
        .querySelectorAll("[data-edit-tab]")
        .forEach((b) => {
          const selected = b.dataset.editTab === tab;
          b.setAttribute("aria-selected", selected);
          b.tabIndex = selected ? 0 : -1;
        });
      ["write", "paste", "ai"].forEach((name) => {
        $(`panel-${name}`).hidden = name !== tab;
      });
      $("formError").textContent = "";
    }
    $("listForm")
      .querySelectorAll("[data-edit-tab]")
      .forEach((b) => {
        b.onclick = () => switchTab(b.dataset.editTab);
        b.onkeydown = (e) => {
          if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
          e.preventDefault();
          const tabs = ["write", "paste", "ai"];
          const n =
            (tabs.indexOf(activeTab) + (e.key === "ArrowRight" ? 1 : 2)) % 3;
          switchTab(tabs[n]);
          $(`tab-${tabs[n]}`).focus();
        };
      });
    $("phraseRows").oninput = (e) => {
      const field = e.target.dataset.field;
      if (field) {
        rows[Number(e.target.dataset.row)][field] = e.target.value;
        count();
        $("formError").textContent = "";
      }
    };
    $("phraseRows").onclick = (e) => {
      const b = e.target.closest("[data-remove-row]");
      if (!b) return;
      const i = Number(b.dataset.removeRow);
      deletedRow = { index: i, row: rows[i] };
      rows.splice(i, 1);
      if (!rows.length) rows.push({ sentence: "", translation: "" });
      $("undoDeleteRow").hidden = false;
      draftDirty = true;
      renderRows();
    };
    $("addPhrase").onclick = () => {
      if (rows.length >= 500) {
        $("formError").textContent = "Maximum 500 phrases par liste.";
        return;
      }
      rows.push({ sentence: "", translation: "" });
      draftDirty = true;
      renderRows(rows.length - 1);
    };
    $("undoDeleteRow").onclick = () => {
      if (deletedRow) {
        if (rows.length === 1 && !rows[0].sentence && !rows[0].translation)
          rows = [];
        rows.splice(deletedRow.index, 0, deletedRow.row);
        deletedRow = null;
        $("undoDeleteRow").hidden = true;
        renderRows();
        draftDirty = true;
      }
    };
    function useImported(source, translations = "") {
      try {
        const parsed = WM.parseColumns(source, translations);
        if (!parsed.entries.length)
          throw new Error("Collez au moins une phrase.");
        if (
          rows.some((r) => r.sentence.trim() || r.translation.trim()) &&
          !window.confirm(
            "Remplacer les lignes du formulaire par ces phrases ?",
          )
        )
          return;
        rows = parsed.entries;
        bulkApplied = true;
        draftDirty = true;
        renderRows();
        switchTab("write");
        if (parsed.warnings.length)
          $("formError").textContent = parsed.warnings.join(" ");
      } catch (error) {
        $("formError").textContent = error.message;
      }
    }
    $("bulkSentences").oninput = $("bulkTranslations").oninput = () => {
      bulkApplied = false;
    };
    $("aiResult").oninput = () => {
      bulkApplied = false;
    };
    $("applyBulk").onclick = () =>
      useImported($("bulkSentences").value, $("bulkTranslations").value);
    $("applyAI").onclick = () => {
      useImported($("aiResult").value);
      if (
        !$("listForm").elements.title.value.trim() &&
        $("aiTheme").value.trim()
      )
        $("listForm").elements.title.value = $("aiTheme").value.trim();
      $("listForm").elements.subject.value = $("aiSubject").value.trim();
      $("listForm").elements.level.value = $("aiLevel").value.trim();
    };
    $("preparePrompt").onclick = async () => {
      if (
        !["aiSubject", "aiLanguage", "aiTheme", "aiLevel"].every((id) =>
          $(id).value.trim(),
        )
      ) {
        $("formError").textContent =
          "Indiquez la matière, la langue, le thème et le niveau pour préparer la consigne.";
        return;
      }
      const n = Number($("aiCount").value);
      if (!Number.isInteger(n) || n < 1 || n > 100) {
        $("formError").textContent = "Choisissez entre 1 et 100 phrases.";
        return;
      }
      $("promptOutput").value = WM.prompt({
        subject: $("aiSubject").value.trim(),
        language: $("aiLanguage").value.trim(),
        theme: $("aiTheme").value.trim(),
        level: $("aiLevel").value.trim(),
        count: n,
        length: $("aiLength").value,
        translations: $("aiTranslations").checked,
      });
      $("aiCopyArea").hidden = false;
      $("formError").textContent = "";
      await copyText($("promptOutput").value, $("promptOutput"));
    };
    textImporter = useImported;
    $("listForm").onsubmit = (e) => {
      e.preventDefault();
      try {
        if (!bulkApplied)
          throw new Error(
            activeTab === "ai"
              ? "Cliquez sur « Vérifier les phrases » avant d’enregistrer."
              : "Cliquez sur « Ajouter ces phrases » avant d’enregistrer.",
          );
        const entries = WM.entriesFromRows(rows);
        if (!entries.length)
          throw new Error("Ajoutez au moins une phrase avant d’enregistrer.");
        const f = new FormData(e.target),
          title = f.get("title").trim();
        if (!title) throw new Error("Donnez un nom à votre liste.");
        let folderId = f.get("folderId");
        const folderName = f.get("newFolder").trim();
        if (folderName) {
          let folder = data.folders.find(
            (x) =>
              x.name.toLocaleLowerCase() === folderName.toLocaleLowerCase(),
          );
          if (!folder) {
            folder = { id: WM.uid(), name: folderName };
            data.folders.push(folder);
          }
          folderId = folder.id;
        }
        const saved = {
          id: original?.id || WM.uid(),
          title,
          folderId,
          subject: f.get("subject").trim(),
          level: f.get("level").trim(),
          favorite: original?.favorite || false,
          entries,
        };
        if (original) data.lists[data.lists.indexOf(original)] = saved;
        else data.lists.push(saved);
        filterFolder = saved.folderId || "";
        favoriteOnly = false;
        searchQuery = "";
        if (!original || returnToPlay) data.preferences.listId = saved.id;
        persist();
        closeDialog(true);
        selections();
        renderRound();
        if (returnToPlay) navigate("play");
        else if (currentView === "library") renderLibrary();
        toast(
          returnToPlay
            ? "Liste enregistrée. Cliquez sur Démarrer quand la classe est prête."
            : "Liste enregistrée. Vous pouvez la modifier ou jouer.",
        );
      } catch (error) {
        $("formError").textContent = error.message;
        $("formError").scrollIntoView({ block: "nearest" });
      }
    };
    renderRows();
    switchTab("write");
  }

  function renderClasses() {
    $("view-classes").innerHTML =
      `<div class="toolbar"><p class="muted">Retrouvez vos élèves et vos équipes à chaque séance.</p>${button("new-class", "Créer une classe", "plus", "primary")}</div><div class="class-collection">${data.classes.map((c) => `<article class="class-panel"><div class="class-panel-header"><div><span class="list-meta">${c.students.length} élève${c.students.length > 1 ? "s" : ""} · ${c.groups.length} équipe${c.groups.length > 1 ? "s" : ""}</span><h2>${escape(c.name)}</h2></div><details class="more-menu"><summary aria-label="Autres actions pour ${escape(c.name)}">${icon("more")}</summary><div>${button("delete-class", "Supprimer la classe", "trash", "text-button danger-text", `data-id="${escape(c.id)}"`)}</div></details></div><div class="group-collection">${c.groups.map((g) => `<div class="group-item"><div><strong>${escape(g.name)}</strong><output>${g.score} point${Math.abs(g.score) > 1 ? "s" : ""}</output></div>${g.members.length ? `<p>${escape(g.members.join(", "))}</p>` : ""}</div>`).join("") || '<p class="muted">Cette classe peut jouer tous ensemble, sans équipes.</p>'}</div><footer>${button("use-class", "Choisir pour jouer", "play", "primary", `data-id="${escape(c.id)}"`)}${button("edit-class", "Modifier", "edit", "secondary", `data-id="${escape(c.id)}"`)}${button("random-student", "Tirer un élève au sort", "shuffle", "text-button", `data-id="${escape(c.id)}" ${!c.students.length ? "disabled" : ""}`)}</footer></article>`).join("") || `<div class="empty-state">${icon("users")}<h2>Vos classes, simplement.</h2><p>Ajoutez une classe pour conserver ses élèves et ses équipes.<br>Vous pouvez aussi jouer sans créer de classe.</p>${button("new-class", "Créer ma première classe", "plus", "primary")}${button("go-play", "Jouer sans classe", "play", "text-button")}</div>`}</div>`;
  }

  function editClass(id) {
    const original = data.classes.find((c) => c.id === id);
    let groups = WM.clone(original?.groups || []);
    const fromPlay = currentView === "play";
    openDialog(
      `<form id="classForm">${dialogHeader(original ? "Modifier la classe" : "Créer une classe")}<label>Nom de la classe<input name="name" required maxlength="100" placeholder="Ex. 11VG4" value="${escape(original?.name || "")}" autofocus></label><label>Prénoms des élèves <span class="optional">facultatif</span><textarea id="studentsInput" rows="5" placeholder="Un prénom par ligne, ou séparés par des virgules.">${escape(original?.students.join("\n") || "")}</textarea></label><div class="field-heading"><h3>Équipes <span class="optional">facultatif</span></h3></div><p class="field-help">Jouez tous ensemble sans équipe, ou créez des équipes ci-dessous. Elles seront conservées pour les prochaines séances.</p><div class="group-tools"><label>Nombre d’équipes<input id="groupCount" type="number" min="1" max="30" value="2"></label><button type="button" id="generateGroups" class="button secondary">${icon("shuffle")}Répartir les élèves</button><button type="button" id="individualGroups" class="text-button">Un score par élève</button></div><div id="groupCards" class="group-editor"></div><button type="button" id="addGroup" class="button secondary">${icon("plus")}Ajouter une équipe</button><p id="classError" class="form-error" role="alert"></p><div class="dialog-actions">${button("close-dialog", "Annuler")}<button class="button primary">Enregistrer la classe</button></div></form>`,
    );
    $("editorDialog").classList.add("class-editor");
    const students = () => [
      ...new Set(
        $("studentsInput")
          .value.split(/[\n,;]+/)
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ];
    function draw() {
      $("groupCards").innerHTML = groups
        .map(
          (g, i) =>
            `<div class="group-edit-card"><div><label>Nom de l’équipe ${i + 1}<input data-group="${i}" data-field="name" maxlength="80" value="${escape(g.name)}" required placeholder="Nom de l’équipe"></label><button type="button" class="button icon-only" data-remove-group="${i}" aria-label="Supprimer l’équipe ${i + 1}">${icon("trash")}</button></div><label>Élèves de cette équipe<textarea rows="2" data-group="${i}" data-field="members" placeholder="Prénoms séparés par des virgules">${escape(g.members.join(", "))}</textarea></label></div>`,
        )
        .join("");
    }
    $("groupCards").oninput = (e) => {
      const i = Number(e.target.dataset.group),
        f = e.target.dataset.field;
      if (f) {
        groups[i][f] =
          f === "members"
            ? [
                ...new Set(
                  e.target.value
                    .split(/[\n,;]+/)
                    .map((s) => s.trim())
                    .filter(Boolean),
                ),
              ]
            : e.target.value;
        draftDirty = true;
      }
    };
    $("groupCards").onclick = (e) => {
      const b = e.target.closest("[data-remove-group]");
      if (b) {
        if (
          (groups[Number(b.dataset.removeGroup)].members.length ||
            groups[Number(b.dataset.removeGroup)].score) &&
          !window.confirm("Supprimer cette équipe du formulaire ?")
        )
          return;
        groups.splice(Number(b.dataset.removeGroup), 1);
        draftDirty = true;
        draw();
      }
    };
    const generate = (individual) => {
      const names = students();
      if (!names.length) {
        $("classError").textContent =
          "Ajoutez les prénoms des élèves avant de demander une répartition.";
        return;
      }
      if (
        groups.length &&
        !window.confirm(
          "Remplacer les équipes actuelles ? Les scores des nouvelles équipes repartiront de zéro.",
        )
      )
        return;
      groups = individual
        ? names.map((name) => ({
            id: WM.uid(),
            name,
            members: [name],
            score: 0,
          }))
        : WM.makeGroups(names, $("groupCount").value);
      draftDirty = true;
      draw();
      $("classError").textContent = "";
    };
    $("generateGroups").onclick = () => generate(false);
    $("individualGroups").onclick = () => generate(true);
    $("addGroup").onclick = () => {
      if (groups.length >= 200) return;
      groups.push({ id: WM.uid(), name: "", members: [], score: 0 });
      draftDirty = true;
      draw();
      $("groupCards")
        .querySelector(`[data-group="${groups.length - 1}"][data-field="name"]`)
        .focus();
    };
    $("classForm").onsubmit = (e) => {
      e.preventDefault();
      const name = new FormData(e.target).get("name").trim(),
        names = students();
      if (!name) {
        $("classError").textContent = "Donnez un nom à votre classe.";
        return;
      }
      if (names.length > 200 || groups.length > 200) {
        $("classError").textContent = "Maximum 200 élèves et 200 équipes.";
        return;
      }
      if (
        names.some((n) => n.length > 80) ||
        groups.some((g) => g.members.some((n) => n.length > 80))
      ) {
        $("classError").textContent =
          "Les prénoms doivent contenir au maximum 80 caractères.";
        return;
      }
      const cleaned = groups.map((g) => ({
        ...g,
        name: g.name.trim(),
        members: g.members.map((n) => n.trim()),
      }));
      if (
        cleaned.some((g) => !g.name) ||
        new Set(cleaned.map((g) => g.name)).size !== cleaned.length
      ) {
        $("classError").textContent =
          "Donnez un nom différent à chaque équipe.";
        return;
      }
      const saved = {
        id: original?.id || WM.uid(),
        name,
        students: names,
        groups: cleaned,
      };
      if (original) data.classes[data.classes.indexOf(original)] = saved;
      else data.classes.push(saved);
      data.preferences.classId = saved.id;
      scoreUndo = [];
      persist();
      closeDialog(true);
      selections();
      if (fromPlay) navigate("play");
      else renderClasses();
      toast(
        "Classe enregistrée. Vos équipes seront retrouvées à chaque séance.",
      );
    };
    draw();
  }

  async function copyText(value, field) {
    try {
      if (window.syntaxalade?.copyText)
        await window.syntaxalade.copyText(value);
      else await navigator.clipboard.writeText(value);
      toast("Consigne copiée. Collez-la maintenant dans votre IA.");
    } catch (_) {
      field?.focus();
      field?.select();
      toast(
        "Consigne sélectionnée : utilisez Copier dans le menu Édition, puis collez-la dans votre IA.",
      );
    }
  }
  function renderSettings() {
    const p = data.preferences;
    $("view-settings").innerHTML =
      `<div class="settings-layout"><form id="preferencesForm" class="work-panel"><h2>Le jeu à votre façon</h2><label>Taille des mots<select name="fontScale">${[
        [0.85, "Petite"],
        [1, "Normale"],
        [1.2, "Grande"],
        [1.4, "Très grande"],
      ]
        .map(
          ([v, n]) =>
            `<option value="${v}" ${p.fontScale === v ? "selected" : ""}>${n}</option>`,
        )
        .join(
          "",
        )}</select></label><label>Ordre des phrases<select name="order"><option value="random" ${p.order === "random" ? "selected" : ""}>Mélanger les phrases, sans répétition</option><option value="sequential" ${p.order === "sequential" ? "selected" : ""}>Suivre l’ordre de la liste</option></select></label><label>Ponctuation<select name="punctuation"><option value="separate" ${p.punctuation === "separate" ? "selected" : ""}>Séparer les signes des mots</option><option value="attached" ${p.punctuation === "attached" ? "selected" : ""}>Garder les signes avec leur mot d’origine</option></select></label><label class="checkbox-label"><input name="showTranslation" type="checkbox" ${p.showTranslation ? "checked" : ""}>Montrer la traduction dès le début</label><label class="checkbox-label"><input name="motion" type="checkbox" ${p.motion ? "checked" : ""}>Activer les animations discrètes</label><label class="checkbox-label"><input name="simple" type="checkbox" ${p.simple ? "checked" : ""}>Utiliser un affichage plus sobre</label><label class="checkbox-label"><input name="sound" type="checkbox" ${p.sound ? "checked" : ""}>Émettre un son à la fin du temps</label><button class="button primary">Enregistrer les réglages</button><p class="field-help">L’ordre des phrases et la ponctuation s’appliquent à la prochaine partie.</p></form><div><section class="work-panel"><h2>Garder une copie de mon travail</h2><p>Pour changer d’ordinateur ou conserver une copie de vos listes et classes, enregistrez un fichier de sauvegarde.</p><div class="button-row">${button("export-backup", "Enregistrer une copie", "download", "primary")}${button("import-backup", "Ouvrir une sauvegarde", "upload")}</div><p class="field-help">Ouvrir une sauvegarde remplacera les listes et classes de cet ordinateur, après confirmation.</p></section><section class="work-panel"><div class="field-heading"><h2>Parties terminées</h2>${data.history.length ? button("export-history", "Exporter les résultats", "download", "text-button") : ""}</div>${
        data.history.length
          ? `<ul class="history-list">${[...data.history]
              .reverse()
              .slice(0, 8)
              .map(
                (h) =>
                  `<li><div><strong>${escape(h.list)}</strong><small>${escape(h.className)} · ${h.rounds} phrases</small></div><time>${escape(new Date(h.date).toLocaleDateString("fr-CH"))}</time></li>`,
              )
              .join("")}</ul>`
          : '<p class="muted">Vos parties terminées apparaîtront ici.</p>'
      }</section><details class="work-panel advanced-recovery"><summary>Résoudre un problème de sauvegarde</summary><p class="field-help">Ces outils sont utiles uniquement si vos données ne s’ouvrent plus correctement.</p>${button("restore-previous", "Retrouver la copie précédente", "undo", "secondary")}${button("export-raw", "Exporter les données pour dépannage", "download", "text-button")}</details></div></div>`;
    $("preferencesForm").onsubmit = (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      Object.assign(p, {
        fontScale: Number(f.get("fontScale")),
        order: f.get("order"),
        punctuation: f.get("punctuation"),
        showTranslation: f.has("showTranslation"),
        motion: f.has("motion"),
        simple: f.has("simple"),
        sound: f.has("sound"),
      });
      applyPreferences();
      persist();
      renderRound();
      toast("Réglages enregistrés.");
    };
  }
  function renderHelp() {
    $("view-help").innerHTML =
      `<div class="help-intro"><h2>Votre première partie en trois étapes.</h2><p>Pas de compte à créer, pas de connexion nécessaire. Vous pouvez commencer avec une seule phrase.</p></div><ol class="help-steps"><li><span class="step-number">1</span><div><h3>Créez une liste</h3><p>Donnez-lui un nom, puis écrivez les phrases dans les cases. Si vous le souhaitez, ajoutez une traduction en face. Cliquez sur « Enregistrer la liste ».</p>${button("first-list", "Créer une liste maintenant", "plus", "secondary")}</div></li><li><span class="step-number">2</span><div><h3>Préparez le jeu</h3><p>Dans « Jouer », choisissez votre liste et le temps de réflexion. Laissez « Tous ensemble » pour jouer sans équipes, ou sélectionnez une classe que vous avez créée.</p></div></li><li><span class="step-number">3</span><div><h3>Projetez et démarrez</h3><p>Cliquez sur « Projeter le jeu », puis sur « Démarrer ». Les élèves proposent la phrase. Vous pouvez aussi cliquer sur les mots dans l’ordre. « Voir la réponse » affiche la correction, puis « Phrase suivante » continue le jeu.</p>${button("go-play", "Aller au jeu", "play", "primary")}</div></li></ol><div class="help-faq"><h2>Les questions les plus fréquentes</h2><details><summary>Faut-il créer des équipes ?</summary><p>Non. « Tous ensemble » permet de jouer immédiatement sans classe ni score. Les classes et les équipes sont facultatives.</p></details><details><summary>Comment coller beaucoup de phrases ?</summary><p>Créez une liste et choisissez l’onglet « Coller un texte ». Collez une phrase par ligne, puis cliquez sur « Ajouter ces phrases ». Vous pourrez tout vérifier avant d’enregistrer.</p></details><details><summary>Comment demander des phrases à une IA ?</summary><p>Dans la création d’une liste, choisissez « Avec une IA ». Indiquez la matière, la langue, le thème et le niveau. Copiez la consigne dans votre IA habituelle, puis collez sa réponse dans Syntaxalade et cliquez sur « Vérifier les phrases ».</p></details><details><summary>Comment partager mes listes avec un collègue ?</summary><p>Pour une seule liste, ouvrez « Mes listes », puis les trois points de la liste et « Exporter les phrases ». Votre collègue pourra importer le fichier. Pour tout transférer, utilisez « Enregistrer une copie » dans Réglages, puis « Ouvrir une sauvegarde » sur l’autre ordinateur.</p></details><details><summary>Comment mettre en pause ou quitter la projection ?</summary><p>Utilisez le bouton Pause ou la barre d’espace. La touche Échap quitte la projection. Les raccourcis sont désactivés pendant la saisie.</p></details></div>`;
  }

  function restoreBackup(incoming) {
    confirmAction(
      "Restaurer cette sauvegarde ?",
      `Elle contient ${incoming.lists.length} liste(s) et ${incoming.classes.length} classe(s). Les données actuelles seront remplacées. Exportez-les d’abord si vous souhaitez les conserver.`,
      () => {
        stopClock();
        try {
          localStorage.setItem(
            `${WM.KEY}_before_restore`,
            JSON.stringify(data),
          );
        } catch (_) {
          toast(
            "Impossible de créer la copie de sécurité. Exportez vos données avant de restaurer.",
          );
          return;
        }
        data = incoming;
        session = null;
        storageBlocked = false;
        scoreUndo = [];
        persist();
        applyPreferences();
        selections();
        renderRound();
        navigate("settings");
        toast("Sauvegarde restaurée.");
      },
    );
  }
  const actions = {
    "close-dialog": () => closeDialog(),
    "go-classes": () => navigate("classes"),
    "new-folder": () => editFolder(),
    "edit-folder": (id) => editFolder(id),
    "filter-folder": (id) => {
      filterFolder = id;
      favoriteOnly = false;
      renderLibrary();
    },
    "filter-favorites": () => {
      favoriteOnly = !favoriteOnly;
      filterFolder = "";
      renderLibrary();
    },
    "delete-folder": (id) => {
      const folder = data.folders.find((f) => f.id === id);
      confirmAction(
        "Supprimer le dossier ?",
        `« ${folder.name} » sera supprimé. Ses listes resteront dans « Toutes les listes ».`,
        () => {
          data.folders = data.folders.filter((f) => f.id !== id);
          data.lists.forEach((l) => {
            if (l.folderId === id) l.folderId = "";
          });
          filterFolder = "";
          persist();
          renderLibrary();
        },
      );
    },
    "new-list": () => editList(),
    "first-list": () => editList(null, { play: true }),
    "edit-selected-list": () => editList($("listSelect").value, { play: true }),
    "go-play": () => navigate("play"),
    "start-selected": launch,
    "edit-list": (id) => editList(id),
    "favorite-list": (id) => {
      const l = data.lists.find((l) => l.id === id);
      l.favorite = !l.favorite;
      persist();
      renderLibraryResults();
    },
    "duplicate-list": (id) => {
      const l = WM.clone(data.lists.find((l) => l.id === id));
      l.id = WM.uid();
      l.title = `${l.title.slice(0, 110)} (copie)`;
      data.lists.push(l);
      persist();
      selections();
      renderLibrary();
      toast("Liste dupliquée.");
    },
    "export-list": (id) => {
      const l = data.lists.find((l) => l.id === id);
      download(
        `${l.title.replace(/[^\p{L}\p{N} -]/gu, "") || "phrases"}.txt`,
        l.entries
          .map((e) => e.sentence + (e.translation ? ` | ${e.translation}` : ""))
          .join("\n"),
        "text/plain;charset=utf-8",
      );
    },
    "delete-list": (id) =>
      confirmAction(
        "Supprimer cette liste ?",
        "Cette liste sera supprimée de la bibliothèque. La partie en cours conserve ses phrases.",
        () => {
          data.lists = data.lists.filter((l) => l.id !== id);
          if (data.preferences.listId === id)
            data.preferences.listId = data.lists[0]?.id || "";
          persist();
          selections();
          renderLibrary();
          if (!session) renderRound();
        },
      ),
    "play-list": (id) => {
      data.preferences.listId = id;
      persist();
      selections();
      navigate("play");
      if (!session) renderRound();
      toast("Liste sélectionnée. Lancez la partie quand la classe est prête.");
    },
    "new-class": () => editClass(),
    "edit-class": (id) => editClass(id),
    "delete-class": (id) =>
      confirmAction(
        "Supprimer cette classe ?",
        "Les élèves, les groupes et leurs scores seront supprimés.",
        () => {
          if (session?.classId === id) session.classId = "";
          data.classes = data.classes.filter((c) => c.id !== id);
          if (data.preferences.classId === id) data.preferences.classId = "";
          scoreUndo = [];
          persist();
          selections();
          renderClasses();
        },
      ),
    "use-class": (id) => {
      data.preferences.classId = id;
      persist();
      selections();
      navigate("play");
      toast(
        session && session.classId !== id
          ? "Classe sélectionnée pour la prochaine partie. Lancez une nouvelle partie pour changer d’équipes."
          : "Classe sélectionnée. Vos groupes sont prêts.",
      );
    },
    "random-student": (id) => {
      const c = data.classes.find((c) => c.id === id);
      if (c.students.length) {
        openDialog(
          `${dialogHeader("À toi de jouer !")}<div class="random-student">${escape(WM.shuffle(c.students)[0])}</div><p class="muted center">${escape(c.name)}</p><div class="dialog-actions">${button("close-dialog", "Fermer", "", "primary")}</div>`,
        );
      }
    },

    "import-text": () => $("listFileInput").click(),
    "import-backup": () => $("backupInput").click(),
    "export-backup": exportBackup,
    "export-raw": () => {
      let raw;
      try {
        raw = {
          current: localStorage.getItem(WM.KEY),
          backup: localStorage.getItem(`${WM.KEY}_backup`),
          beforeRestore: localStorage.getItem(`${WM.KEY}_before_restore`),
        };
      } catch (_) {
        raw = data;
      }
      download("Syntaxalade-donnees-brutes.json", JSON.stringify(raw, null, 2));
    },
    "restore-previous": () => {
      try {
        const raw =
          localStorage.getItem(`${WM.KEY}_before_restore`) ||
          localStorage.getItem(`${WM.KEY}_backup`);
        if (!raw) {
          toast("Aucune sauvegarde locale précédente disponible.");
          return;
        }
        restoreBackup(WM.normalize(JSON.parse(raw)));
      } catch (e) {
        toast(`Récupération impossible : ${e.message}`);
      }
    },
    "export-history": () => {
      const csv = (value) =>
        `"${String(value)
          .replace(/"/g, '""')
          .replace(/^[=+@-]/, "'$&")}"`;
      const rows = [["Date", "Liste", "Classe", "Phrases", "Groupe", "Score"]];
      data.history.forEach((h) =>
        (h.results.length ? h.results : [{ name: "", score: "" }]).forEach(
          (r) =>
            rows.push([h.date, h.list, h.className, h.rounds, r.name, r.score]),
        ),
      );
      download(
        "Syntaxalade-parties.csv",
        "\uFEFF" + rows.map((row) => row.map(csv).join(";")).join("\r\n"),
        "text/csv;charset=utf-8",
      );
    },
    "score-plus": (id) => changeScore(id, 1),
    "score-minus": (id) => changeScore(id, -1),
    "choose-word": (id) => chooseWord(Number(id)),
    "remove-word": (id) => {
      if (!session || !["playing", "expired"].includes(session.status)) return;
      session.chosen = session.chosen.filter((n) => n !== Number(id));
      renderRound();
      persist();
    },
    replay: () => {
      if (data.lists.some((l) => l.id === session?.listId)) {
        $("listSelect").value = session.listId;
        launch();
      } else toast("Cette liste a été supprimée. Choisissez une autre liste.");
    },
  };
  document.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]");
    if (action && !action.disabled && actions[action.dataset.action])
      actions[action.dataset.action](action.dataset.id);
    const nav = event.target.closest("[data-view]");
    if (nav) navigate(nav.dataset.view);
    if (event.target.closest(".brand")) {
      event.preventDefault();
      navigate("play");
    }
  });
  $("listSelect").onchange = () => {
    const value = $("listSelect").value;
    if (value === "__new") {
      selections();
      editList(null, { play: true });
      return;
    }
    data.preferences.listId = value;
    persist();
    updateEmptyState();
    if (!session) renderRound();
  };
  $("classSelect").onchange = () => {
    const value = $("classSelect").value;
    if (value === "__new") {
      selections();
      editClass();
      return;
    }
    data.preferences.classId = value;
    persist();
    renderScores();
    updateEmptyState();
  };
  $("durationSelect").onchange = () => {
    data.preferences.duration = Number($("durationSelect").value);
    persist();
    updateEmptyState();
    if (!session) updateTimer();
  };
  $("launchForm").onsubmit = (e) => {
    e.preventDefault();
    launch();
  };
  $("pauseBtn").onclick = () =>
    session?.status === "paused" ? resume() : pause();
  $("resumeBtn").onclick = resume;
  $("revealBtn").onclick = reveal;
  $("nextBtn").onclick = nextRound;
  $("hintBtn").onclick = hint;
  $("translationBtn").onclick = () => {
    if (session) {
      session.showTranslation = !session.showTranslation;
      renderRound();
      persist();
    } else {
      data.preferences.showTranslation = !data.preferences.showTranslation;
      renderRound();
      persist();
    }
  };
  $("clearAnswer").onclick = () => {
    if (session && ["playing", "expired"].includes(session.status)) {
      session.chosen = [];
      renderRound();
      persist();
    }
  };
  $("undoScore").onclick = undoScore;
  $("resetScores").onclick = () =>
    confirmAction(
      "Remettre les scores à zéro ?",
      "Tous les équipes de la classe affichée repartiront à zéro.",
      () => {
        activeClass()?.groups.forEach((g) => {
          g.score = 0;
        });
        scoreUndo = [];
        persist();
        renderScores();
      },
    );
  $("projectionBtn").onclick = () => toggleProjection();
  $("editorDialog").addEventListener("input", () => {
    draftDirty = true;
  });
  $("editorDialog").addEventListener("cancel", (e) => {
    e.preventDefault();
    closeDialog();
  });
  $("backupInput").onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024)
        throw new Error("Le fichier dépasse 10 Mo.");
      restoreBackup(WM.normalize(JSON.parse(await file.text())));
    } catch (error) {
      toast(`Import impossible : ${error.message}`);
    }
  };
  $("listFileInput").onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024)
        throw new Error("Le fichier dépasse 2 Mo.");
      const source = await file.text();
      if (textImporter && $("editorDialog").open) textImporter(source);
      else {
        const parsed = WM.parseEntries(source);
        if (!parsed.entries.length)
          throw new Error("Ce fichier ne contient aucune phrase.");
        editList(null, {
          source,
          title: file.name.replace(/\.[^.]+$/, ""),
          play: currentView === "play",
        });
      }
    } catch (error) {
      toast(`Import impossible : ${error.message}`);
    }
  };
  document.addEventListener("keydown", (e) => {
    if (
      e.repeat ||
      e.metaKey ||
      e.ctrlKey ||
      e.altKey ||
      /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) ||
      e.target.isContentEditable ||
      $("editorDialog").open
    )
      return;
    if (e.code === "Escape" && document.body.classList.contains("projection")) {
      toggleProjection(false);
      return;
    }
    if (currentView !== "play") return;
    const key = e.key.toLowerCase();
    if (e.code === "Space") {
      e.preventDefault();
      session?.status === "paused" ? resume() : pause();
    }
    if (key === "r") {
      e.preventDefault();
      reveal();
    }
    if (key === "n") {
      e.preventDefault();
      nextRound();
    }
    if (key === "f") {
      e.preventDefault();
      toggleProjection();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
  });
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && !window.syntaxalade) {
      document.body.classList.remove("projection");
      $("projectionBtn").innerHTML =
        `${icon("monitor")}<span>Projeter le jeu</span>`;
      requestAnimationFrame(fitWords);
    }
  });
  window.addEventListener("resize", () => requestAnimationFrame(fitWords));
  window.addEventListener("beforeunload", () => {
    if (session?.status === "playing") {
      stopClock();
      session.status = "paused";
    }
    persist();
  });
  try {
    const result = WM.load(localStorage);
    data = result.data;
    session = validSession(data.session);
    if (result.recovered)
      toast("La copie précédente a permis de retrouver vos données.");
    else if (session)
      toast(
        "Votre partie a été retrouvée. Reprenez quand la classe est prête.",
      );
    else if (data.session)
      toast("La partie était illisible. Votre bibliothèque a été conservée.");
  } catch (error) {
    data = WM.defaults();
    storageBlocked = true;
    $("saveStatus").textContent = "Données à récupérer · voir Réglages";
    toast(error.message);
  }
  icons();
  applyPreferences();
  selections();
  renderRound();
  if (!storageBlocked) persist();
  if (session) $("launchBtn").innerHTML = `${icon("reset")}Nouvelle partie`;
  navigate("play");
  window.syntaxalade?.onFullscreenChanged?.((enabled) => {
    document.body.classList.toggle("projection", enabled);
    $("projectionBtn").innerHTML =
      `${icon("monitor")}<span>${enabled ? "Quitter la projection" : "Projeter le jeu"}</span>`;
    requestAnimationFrame(fitWords);
  });
})();
