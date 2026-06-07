let digimon = [];
let byId = new Map();
let currentId = null;
let currentMode = "tree";
let game = null;
let currentMapMode = "played";

const SETTINGS_KEY = "digimon-tree-settings-v3";
const sizePresets = {
  small: { hero: 30, thumb: 72, table: 52 },
  medium: { hero: 38, thumb: 96, table: 68 },
  large: { hero: 50, thumb: 132, table: 92 }
};
const defaultSettings = {
  imageSizePreset: "medium",
  viewMode: "cards",
  theme: "dark"
};
let settings = loadSettings();

function loadSettings() {
  try {
    const previous = JSON.parse(localStorage.getItem(SETTINGS_KEY) || localStorage.getItem("digimon-tree-settings-v2") || "{}");
    if (previous.imageSize && !previous.imageSizePreset) {
      previous.imageSizePreset = Number(previous.imageSize) <= 32 ? "small" : Number(previous.imageSize) >= 48 ? "large" : "medium";
    }
    return { ...defaultSettings, ...previous };
  } catch {
    return { ...defaultSettings };
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  applySettings();
}

function applySettings() {
  const preset = sizePresets[settings.imageSizePreset] || sizePresets.medium;
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.style.setProperty("--selected-image-height", `${preset.hero}vh`);
  document.documentElement.style.setProperty("--thumb-size", `${preset.thumb}px`);
  document.documentElement.style.setProperty("--table-thumb-size", `${preset.table}px`);

  const imageSizePreset = document.getElementById("imageSizePreset");
  const viewMode = document.getElementById("viewMode");
  const theme = document.getElementById("theme");

  if (imageSizePreset) imageSizePreset.value = settings.imageSizePreset;
  if (viewMode) viewMode.value = settings.viewMode;
  if (theme) theme.value = settings.theme;
}

function imgUrl(value) {
  if (!value) return "";
  if (value.startsWith("http")) return value;
  if (value.startsWith("//")) return "https:" + value;
  if (value.startsWith("/")) return "https://wikimon.net" + value;
  return value;
}

function bestImage(d) {
  return imgUrl(d?.img_grande || d?.img_media || d?.img_piccola || "");
}

function wikiUrl(d) {
  if (d?.wikimon_url) return d.wikimon_url;
  if (d?.source_url) return d.source_url;
  return "https://wikimon.net/" + encodeURIComponent(String(d?.nome || "").replace(/\s+/g, "_"));
}

function neighborsOf(id) {
  const d = byId.get(String(id));
  if (!d) return [];
  return [...new Set([...(d.previous || []), ...(d.next || [])])].filter(x => byId.has(String(x))).map(String);
}

function distanceToEnd(startId, endId) {
  startId = String(startId);
  endId = String(endId);
  if (startId === endId) return 0;
  const queue = [startId];
  const dist = new Map([[startId, 0]]);
  while (queue.length) {
    const id = queue.shift();
    for (const n of neighborsOf(id)) {
      if (dist.has(n)) continue;
      dist.set(n, dist.get(id) + 1);
      if (n === endId) return dist.get(n);
      queue.push(n);
    }
  }
  return Infinity;
}

function makeCard(d, isCurrent = false) {
  const card = document.createElement("article");
  card.className = isCurrent ? "card current" : "card";

  const image = bestImage(d);
  if (image) {
    const img = document.createElement("img");
    img.className = isCurrent ? "selected-img" : "thumb";
    img.src = image;
    img.alt = d.nome;
    img.title = isCurrent ? d.nome : "Clicca l'immagine per selezionare";
    if (!isCurrent) {
      img.addEventListener("click", e => {
        e.stopPropagation();
        render(d.id, { fromUserMove: true });
      });
    }
    card.appendChild(img);
  }

  const wrap = document.createElement("div");
  wrap.className = "card-body";

  if (isCurrent) {
    const name = document.createElement("h2");
    name.className = "name current-name";
    name.textContent = d.nome;
    wrap.appendChild(name);
  } else {
    const nameLink = document.createElement("a");
    nameLink.className = "name name-link";
    nameLink.href = wikiUrl(d);
    nameLink.target = "_blank";
    nameLink.rel = "noopener";
    nameLink.textContent = d.nome;
    nameLink.title = "Apri Wikimon in una nuova scheda";
    nameLink.addEventListener("click", e => e.stopPropagation());
    wrap.appendChild(nameLink);
  }

  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = `ID ${d.id}`;
  wrap.appendChild(meta);

  if (!isCurrent && !image) {
    const select = document.createElement("button");
    select.className = "select-btn";
    select.type = "button";
    select.textContent = "Seleziona";
    select.addEventListener("click", e => {
      e.stopPropagation();
      render(d.id, { fromUserMove: true });
    });
    wrap.appendChild(select);
  }

  card.appendChild(wrap);
  if (!isCurrent) card.addEventListener("click", () => render(d.id, { fromUserMove: true }));
  return card;
}

function section(title, items) {
  const box = document.createElement("section");
  box.className = "level";

  const h = document.createElement("h2");
  h.textContent = title;
  box.appendChild(h);

  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty-msg";
    empty.textContent = "Nessun collegamento trovato nei dati.";
    box.appendChild(empty);
    return box;
  }

  if (settings.viewMode === "table") {
    const table = document.createElement("table");
    table.className = "evo-table";
    table.innerHTML = "<thead><tr><th>Immagine</th><th>Nome</th><th>ID</th></tr></thead>";
    const tbody = document.createElement("tbody");
    items.forEach(d => {
      const tr = document.createElement("tr");

      const imgTd = document.createElement("td");
      const image = bestImage(d);
      if (image) {
        const img = document.createElement("img");
        img.className = "table-thumb";
        img.src = image;
        img.alt = d.nome;
        img.title = "Clicca l'immagine per selezionare";
        img.addEventListener("click", () => render(d.id, { fromUserMove: true }));
        imgTd.appendChild(img);
      }

      const nameTd = document.createElement("td");
      const a = document.createElement("a");
      a.href = wikiUrl(d);
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = d.nome;
      nameTd.appendChild(a);

      const idTd = document.createElement("td");
      idTd.textContent = d.id;

      tr.append(imgTd, nameTd, idTd);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    box.appendChild(table);
    return box;
  }

  const cards = document.createElement("div");
  cards.className = settings.viewMode === "carousel" ? "cards carousel" : "cards";
  items.forEach(d => cards.appendChild(makeCard(d)));
  box.appendChild(cards);
  return box;
}

function renderGameStrip() {
  if (currentMode !== "game" && !game) return null;

  const strip = document.createElement("div");
  strip.className = "game-strip";

  const min = document.createElement("div");
  min.className = "game-stat game-min";
  min.innerHTML = game
    ? `<small>Minimi calcolati</small><strong>${game.best}</strong>`
    : `<small>Minimi calcolati</small><strong>-</strong>`;

  const counter = document.createElement("div");
  counter.className = "game-stat game-counter";

  if (game) {
    const excess = Math.max(0, game.jumps - game.best);
    const heat = Math.min(1, excess / Math.max(1, game.best));
    const hue = Math.round(120 - 120 * heat);
    counter.style.setProperty("--counter-color", `hsl(${hue}, 82%, 55%)`);
    counter.innerHTML = `<small>Salti fatti</small><strong>${game.jumps}</strong><span>${excess ? `+${excess} oltre il minimo` : "in linea col minimo"}</span>`;
  } else {
    counter.style.setProperty("--counter-color", "#22c55e");
    counter.innerHTML = `<small>Salti fatti</small><strong>0</strong><span>genera un percorso</span>`;
  }

  const target = document.createElement("div");
  target.className = "game-stat game-target";
  const end = game ? byId.get(String(game.endId)) : null;
  target.innerHTML = game
    ? `<small>Obiettivo</small><b>${end?.nome || "-"}</b>`
    : `<small>Obiettivo</small><b>non ancora scelto</b>`;

  const actions = document.createElement("div");
  actions.className = "game-inline-actions";

  const newGame = document.createElement("button");
  newGame.type = "button";
  newGame.className = "primary-btn";
  newGame.textContent = game ? "🎲 Nuovo percorso" : "🎲 Inizia minigame";
  newGame.addEventListener("click", startMiniGame);
  actions.appendChild(newGame);

  const giveUp = document.createElement("button");
  giveUp.type = "button";
  giveUp.className = "secondary-btn giveup-inline";
  giveUp.textContent = game?.finished ? "Riepilogo" : "Mi arrendo";
  giveUp.disabled = !game;
  giveUp.addEventListener("click", () => {
    if (!game) return;
    if (game.finished) showPathMap("played");
    else giveUpGame();
  });
  actions.appendChild(giveUp);

  strip.append(min, counter, target, actions);
  return strip;
}

function renderHero(d) {
  const hero = document.createElement("section");
  hero.className = "selected-hero";

  const strip = renderGameStrip();
  if (strip) hero.appendChild(strip);

  const gameLeft = document.createElement("aside");
  gameLeft.className = "game-side left";
  const gameRight = document.createElement("aside");
  gameRight.className = "game-side right";

  if (game) {
    const start = byId.get(String(game.startId));
    const end = byId.get(String(game.endId));
    if (String(d.id) !== String(game.startId)) gameLeft.appendChild(gameEndpoint("START", start, "start"));
    if (end && String(d.id) !== String(game.endId)) gameRight.appendChild(gameEndpoint("END", end, "end"));
  }

  const center = document.createElement("div");
  center.className = "hero-center";

  const image = bestImage(d);
  if (image) {
    const img = document.createElement("img");
    img.className = "hero-image";
    img.src = image;
    img.alt = d.nome;
    center.appendChild(img);
  }

  const title = document.createElement("div");
  title.className = "hero-title";
  title.innerHTML = `<strong>${d.nome}</strong><span>ID ${d.id}</span>`;
  center.appendChild(title);

  const a = document.createElement("a");
  a.className = "hero-link";
  a.href = wikiUrl(d);
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = "Apri pagina Wikimon";
  center.appendChild(a);

  hero.append(gameLeft, center, gameRight);
  return hero;
}

function gameEndpoint(label, d, role = "") {
  const box = document.createElement("button");
  box.type = "button";
  box.className = "game-endpoint";
  box.title = d ? d.nome : "";
  box.innerHTML = `<span>${label}</span>`;

  const image = bestImage(d);
  if (image) {
    const img = document.createElement("img");
    img.src = image;
    img.alt = d.nome;
    box.appendChild(img);
  }
  const name = document.createElement("strong");
  name.textContent = d?.nome || "-";
  box.appendChild(name);
  if (d) {
    box.addEventListener("click", () => {
      if (role === "end" && game?.active && !game.finished) {
        askGiveUpFromEnd();
        return;
      }
      render(d.id);
    });
  }
  return box;
}

function render(id, opts = {}) {
  const d = byId.get(String(id));
  const viewer = document.getElementById("viewer");
  if (!d) return;

  if (opts.fromUserMove && currentId && String(id) !== String(currentId) && game?.active && !game.finished) {
    game.jumps++;
    game.visited.push(String(id));
  }

  currentId = String(id);
  viewer.className = "viewer";
  viewer.innerHTML = "";

  const previous = (d.previous || []).map(x => byId.get(String(x))).filter(Boolean);
  const next = (d.next || []).map(x => byId.get(String(x))).filter(Boolean);

  viewer.appendChild(section("Stadi precedenti possibili", previous));
  viewer.appendChild(renderHero(d));
  viewer.appendChild(section("Stadi successivi possibili", next));

  const input = document.getElementById("search");
  if (input.value !== d.nome) input.value = d.nome;

  if (game?.active && !game.finished && String(id) === String(game.endId)) finishGame();
}

function showSuggestions(query) {
  const suggestions = document.getElementById("suggestions");
  suggestions.innerHTML = "";

  const q = query.trim().toLowerCase();
  if (!q) return;

  const matches = digimon.filter(d => d.nome.toLowerCase().includes(q)).slice(0, 15);
  matches.forEach(d => {
    const b = document.createElement("button");
    b.className = "suggestion";
    b.type = "button";
    b.textContent = d.nome;
    b.addEventListener("click", () => render(d.id));
    suggestions.appendChild(b);
  });

  if (matches.length === 1) render(matches[0].id);
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function findPath(startId, endId) {
  startId = String(startId);
  endId = String(endId);
  if (startId === endId) return [startId];

  const queue = [startId];
  const prev = new Map([[startId, null]]);

  while (queue.length) {
    const id = queue.shift();
    for (const n of neighborsOf(id)) {
      if (prev.has(n)) continue;
      prev.set(n, id);
      if (n === endId) {
        const path = [endId];
        let cur = id;
        while (cur) {
          path.push(cur);
          cur = prev.get(cur);
        }
        return path.reverse();
      }
      queue.push(n);
    }
  }
  return null;
}

function startMiniGame() {
  const candidates = digimon.filter(d => neighborsOf(d.id).length > 0);
  if (candidates.length < 2) {
    alert("Servono più collegamenti evolutivi per avviare il minigame.");
    return;
  }

  let path = null;
  let start = null;
  let end = null;

  for (let i = 0; i < 900; i++) {
    start = randomItem(candidates);
    end = randomItem(candidates);
    if (String(start.id) === String(end.id)) continue;
    path = findPath(start.id, end.id);
    if (path && path.length >= 2) break;
  }

  if (!path) {
    alert("Non ho trovato un percorso possibile nei dati attuali.");
    return;
  }

  game = {
    active: true,
    finished: false,
    gaveUp: false,
    startId: String(start.id),
    endId: String(end.id),
    path,
    best: path.length - 1,
    jumps: 0,
    visited: [String(start.id)]
  };

  switchMode("game", false);
  render(start.id);
}

function giveUpGame() {
  if (!game) return;
  game.finished = true;
  game.gaveUp = true;
  showPathMap("played");
  if (currentId) render(currentId);
}

function finishGame() {
  if (!game || game.finished) return;
  game.finished = true;
  launchConfetti();
  showPathMap("played");
  if (currentId) render(currentId);
}

function pathNode(id, index, kind, endId, previousId) {
  const d = byId.get(String(id));
  const node = document.createElement("div");
  node.className = "path-node";

  if (kind === "perfect") {
    if (index === 0) node.classList.add("start");
    else if (String(id) === String(endId)) node.classList.add("end");
    else node.classList.add("good");
  } else if (index === 0) {
    node.classList.add("start");
  } else if (game?.gaveUp && index === game.visited.length - 1) {
    node.classList.add("gaveup", "neutral");
  } else if (String(id) === String(endId)) {
    node.classList.add("end", "good");
  } else {
    const before = distanceToEnd(previousId, endId);
    const after = distanceToEnd(id, endId);
    if (after < before) node.classList.add("good");
    else if (after > before) node.classList.add("bad");
    else node.classList.add("neutral");
  }

  const image = bestImage(d);
  if (image) {
    const img = document.createElement("img");
    img.src = image;
    img.alt = d?.nome || "";
    node.appendChild(img);
  }
  const name = document.createElement("strong");
  name.textContent = d?.nome || id;
  node.appendChild(name);
  const small = document.createElement("small");
  small.textContent = game?.gaveUp && kind !== "perfect" && index === game.visited.length - 1
    ? `#${index + 1} · ID ${id} · resa qui`
    : `#${index + 1} · ID ${id}`;
  node.appendChild(small);
  return node;
}

function showPathMap(mode = "played") {
  if (!game) return;
  currentMapMode = mode;
  const modal = document.getElementById("mapModal");
  const title = document.getElementById("mapTitle");
  const legend = document.getElementById("mapLegend");
  const content = document.getElementById("mapContent");
  const perfectBtn = document.getElementById("showPerfectMap");
  const path = mode === "perfect" ? game.path : game.visited;

  title.textContent = mode === "perfect" ? "Mappa perfetta del percorso minimo" : (game.gaveUp ? "Percorso fatto prima della resa" : "Percorso fatto dall’utente");
  legend.innerHTML = mode === "perfect"
    ? `Percorso minimo precalcolato: <b>${game.best}</b> salti.`
    : game.gaveUp
      ? `Verde = avvicinamento reale. Rosso = allontanamento reale. Giallo = distanza invariata. La resa non viene conteggiata come avvicinamento. Percorso minimo: <b>${game.best}</b>. Salti fatti: <b>${game.jumps}</b>.`
      : `Verde = ti sei avvicinato all’obiettivo. Rosso = ti sei allontanato. Giallo = distanza invariata. Percorso minimo: <b>${game.best}</b>. Salti fatti: <b>${game.jumps}</b>.`;
  perfectBtn.textContent = mode === "perfect" ? "Torna al percorso fatto" : "Apri mappa perfetta";
  perfectBtn.onclick = () => showPathMap(mode === "perfect" ? "played" : "perfect");

  content.innerHTML = "";
  path.forEach((id, index) => {
    if (index > 0) {
      const arrow = document.createElement("div");
      arrow.className = "path-arrow";
      arrow.textContent = "→";
      content.appendChild(arrow);
    }
    content.appendChild(pathNode(id, index, mode === "perfect" ? "perfect" : "played", game.endId, path[index - 1]));
  });

  if (typeof modal.showModal === "function") modal.showModal();
  else modal.setAttribute("open", "open");
}

function launchConfetti() {
  const layer = document.createElement("div");
  layer.className = "confetti-layer";
  document.body.appendChild(layer);

  for (let i = 0; i < 140; i++) {
    const piece = document.createElement("i");
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.animationDelay = `${Math.random() * 0.4}s`;
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    piece.style.setProperty("--x", `${(Math.random() - 0.5) * 280}px`);
    piece.style.setProperty("--r", `${Math.random() * 720}deg`);
    layer.appendChild(piece);
  }
  setTimeout(() => layer.remove(), 2600);
}

function switchMode(mode, rerender = true) {
  currentMode = mode;
  document.body.dataset.mode = mode;
  document.getElementById("navTree").classList.toggle("active", mode === "tree");
  document.getElementById("navGame").classList.toggle("active", mode === "game");

  const gameSetup = document.getElementById("gameSetup");
  if (gameSetup) gameSetup.classList.add("hidden");

  if (mode === "tree" && game?.finished) game = null;
  if (rerender && currentId) render(currentId);
}

function askGiveUpFromEnd() {
  const modal = document.getElementById("giveUpConfirmModal");
  if (!modal) {
    if (confirm("Vuoi arrenderti e vedere il riepilogo del percorso fatto?")) giveUpGame();
    return;
  }
  if (typeof modal.showModal === "function") modal.showModal();
  else modal.setAttribute("open", "open");
}

function wireSettings() {
  const settingsModal = document.getElementById("settingsModal");
  document.getElementById("openSettings").addEventListener("click", () => {
    if (typeof settingsModal.showModal === "function") settingsModal.showModal();
    else settingsModal.setAttribute("open", "open");
  });

  document.getElementById("imageSizePreset").addEventListener("change", e => {
    settings.imageSizePreset = e.target.value;
    saveSettings();
    if (currentId) render(currentId);
  });

  document.getElementById("viewMode").addEventListener("change", e => {
    settings.viewMode = e.target.value;
    saveSettings();
    if (currentId) render(currentId);
  });

  document.getElementById("theme").addEventListener("change", e => {
    settings.theme = e.target.value;
    saveSettings();
  });

  const giveUpConfirmModal = document.getElementById("giveUpConfirmModal");
  const confirmGiveUp = document.getElementById("confirmGiveUp");
  const cancelGiveUp = document.getElementById("cancelGiveUp");

  if (confirmGiveUp) confirmGiveUp.addEventListener("click", () => {
    if (giveUpConfirmModal?.open) giveUpConfirmModal.close();
    giveUpGame();
  });

  if (cancelGiveUp) cancelGiveUp.addEventListener("click", () => {
    if (giveUpConfirmModal?.open) giveUpConfirmModal.close();
  });

  document.getElementById("navTree").addEventListener("click", () => switchMode("tree"));
  document.getElementById("navGame").addEventListener("click", () => switchMode("game"));
  document.getElementById("startGame").addEventListener("click", startMiniGame);
  document.getElementById("giveUpGame").addEventListener("click", giveUpGame);
}

async function init() {
  const stats = document.getElementById("stats");
  applySettings();
  wireSettings();
  document.body.dataset.mode = currentMode;

  try {
    const res = await fetch("data/digimon_graph.json", { cache: "no-store" });
    if (!res.ok) throw new Error("digimon_graph.json non trovato");

    digimon = await res.json();
    byId = new Map(digimon.map(d => [String(d.id), d]));

    const withLinks = digimon.filter(d => (d.previous?.length || 0) + (d.next?.length || 0) > 0).length;
    stats.textContent = `${digimon.length} Digimon caricati. ${withLinks} con almeno un collegamento evolutivo.`;

    document.getElementById("search").addEventListener("input", e => showSuggestions(e.target.value));

    const start = digimon.find(d => d.nome.toLowerCase() === "agumon") || digimon[0];
    if (start) render(start.id);
  } catch (err) {
    stats.textContent = "Dati non ancora generati.";
    document.getElementById("viewer").innerHTML = `
      <p>Prima esegui <strong>AVVIA_DIGIMON_TREE.cmd</strong> per generare <code>data/digimon_graph.json</code>.</p>
      <p>Errore: ${err.message}</p>
    `;
  }
}

init();
