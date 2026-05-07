/* =========================================================
   Salvemoslos del Reggaeton 2026
   Musicala + Full 80's
   App estatica informativa + Firebase
========================================================= */

import { loginWithGoogle, logoutUser, watchAuth } from "./auth.service.js";
import {
  createAssignment,
  createBand,
  createMusician,
  createRequirement,
  createSong,
  deleteAssignment,
  deleteBand,
  deleteMusician,
  deleteRequirement,
  deleteSong,
  updateAssignment,
  updateBand,
  updateMusician,
  updateRequirement,
  updateSong,
  watchBands,
  watchMusicians,
  watchSongAssignments,
  watchSongRequirements,
  watchSongs
} from "./firestore.service.js";

const AGE_LABELS = {
  jovenes: "Jovenes",
  adultos: "Adultos",
  mixta: "Mixta",
  "": "Sin categoria"
};

const ROLE_OPTIONS = ["principal", "apoyo", "coro", "suplente"];
const MUSICIAN_TYPES = ["estudiante", "docente", "invitado"];

const fallbackSongs = [
  ["Take Me Out", "Franz Ferdinand", "Rock alternativo"],
  ["Boys Don't Cry", "The Cure", "New wave"],
  ["Tu carcel", "Los Bukis", "Balada"],
  ["Don't Cry", "Guns N' Roses", "Rock balada"],
  ["Freaks", "Surf Curse", "Indie rock"],
  ["Holiday", "Green Day", "Punk rock"],
  ["Sweet Child O' Mine", "Guns N' Roses", "Rock clasico"]
].map(([title, artist, category], index) => ({
  id: makeSongId(title),
  title,
  artist,
  bandId: "",
  bandName: "Sin banda asignada",
  ageCategory: "mixta",
  group: "Mixto",
  category,
  notes: "Repertorio base visible mientras Firestore no tenga canciones guardadas.",
  order: index + 1,
  active: true,
  source: "fallback"
}));

const guideByProfile = {
  docentes: {
    title: "Guia para docentes",
    intro:
      "El rol docente sera acompanar el proceso musical y escenico con claridad, orden y criterio pedagogico.",
    items: [
      "Organizar ensayos por objetivos: estructura, entradas, cortes, sonido y escena.",
      "Asignar repertorio desde el nivel real de cada grupo y ajustar arreglos cuando sea necesario.",
      "Promover escucha grupal, responsabilidad individual y respeto por el trabajo de los demas.",
      "Mantener la instrumentacion actualizada para que cada estudiante sepa que preparar."
    ]
  },
  estudiantes: {
    title: "Guia para estudiantes",
    intro:
      "Este evento es una oportunidad para vivir la musica como una experiencia real de escenario.",
    items: [
      "Llegar a los ensayos con la cancion escuchada y la parte individual estudiada.",
      "Preguntar cuando algo no este claro y revisar las asignaciones antes de cada ensayo.",
      "Cuidar el sonido del grupo: volumen, entradas, silencios, cortes y finales.",
      "Entender que el escenario es colectivo: cada persona aporta al resultado final."
    ]
  },
  familias: {
    title: "Guia para familias",
    intro:
      "Las familias cumplen un papel clave acompanando el proceso con paciencia, animo y orden logistico.",
    items: [
      "Motivar la practica en casa sin convertirla en persecucion musical.",
      "Estar pendientes de horarios, vestuario, instrumentos y recomendaciones del equipo docente.",
      "Celebrar el esfuerzo y el proceso, no solo el resultado final del concierto.",
      "Vivir el evento como una experiencia familiar y artistica compartida."
    ]
  }
};

const els = {
  songsGrid: document.querySelector("#songsGrid"),
  filterButtons: document.querySelectorAll(".filter-btn"),
  tabButtons: document.querySelectorAll(".tab-btn"),
  guideContent: document.querySelector("#guideContent"),
  authBar: document.querySelector("#authBar"),
  appShell: document.querySelector("#appShell"),
  accessPanel: document.querySelector("#accessPanel"),
  loginBtn: document.querySelector("#loginBtn"),
  accessLoginBtn: document.querySelector("#accessLoginBtn"),
  editorTools: document.querySelector("#editorTools"),
  editorAdmin: document.querySelector("#editorAdmin")
};

const state = {
  user: null,
  role: "visitante",
  canEdit: false,
  songs: fallbackSongs,
  bands: [],
  musicians: [],
  requirementsBySong: new Map(),
  assignmentsBySong: new Map(),
  dataStarted: false,
  dataUnsubs: [],
  requirementUnsubs: new Map(),
  assignmentUnsubs: new Map(),
  currentFilter: "todos",
  currentTab: "docentes"
};

function makeSongId(title) {
  return String(title || "cancion")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function toAgeValue(value) {
  const normalized = normalizeText(value);
  if (["jovenes", "joven", "adolescentes", "adolescente"].includes(normalized)) return "jovenes";
  if (["adultos", "adulto"].includes(normalized)) return "adultos";
  if (["mixta", "mixto"].includes(normalized)) return "mixta";
  return "";
}

function normalizeInstrument(value) {
  return normalizeText(value);
}

function getSongNotes(song) {
  return song.notes ?? song.note ?? "";
}

function getSongAge(song) {
  return toAgeValue(song.ageCategory || song.group);
}

function getBandById(bandId) {
  return state.bands.find((band) => band.id === bandId);
}

function getMusicianById(musicianId) {
  return state.musicians.find((musician) => musician.id === musicianId);
}

function getRequirements(songId) {
  return state.requirementsBySong.get(songId) || [];
}

function getAssignments(songId) {
  return state.assignmentsBySong.get(songId) || [];
}

function getRoleLabel() {
  return state.canEdit ? "Editor" : "Estudiante";
}

function setStatus(message, type = "info") {
  const oldStatus = document.querySelector(".app-status");
  if (oldStatus) oldStatus.remove();
  if (!message || !els.songsGrid) return;

  const status = document.createElement("div");
  status.className = `app-status ${type}`;
  status.textContent = message;
  els.songsGrid.before(status);
  window.setTimeout(() => status.remove(), 5200);
}

function withSongCompatibility(song) {
  const band = getBandById(song.bandId);
  const ageCategory = toAgeValue(song.ageCategory || band?.ageCategory || song.group);
  return {
    ...song,
    bandName: song.bandName || band?.name || "Sin banda asignada",
    ageCategory,
    notes: getSongNotes(song)
  };
}

function calculateInstrumentation(songId) {
  const requirements = getRequirements(songId);
  const assignments = getAssignments(songId);
  const repeatedMusicians = new Set();
  const seenMusicians = new Set();
  const rows = requirements.map((requirement) => {
    const instrumentKey = normalizeInstrument(requirement.instrument);
    const assigned = assignments.filter((assignment) => normalizeInstrument(assignment.instrument) === instrumentKey).length;
    const required = Number(requirement.required || 0);
    const max = Number(requirement.max || required || 0);
    return {
      ...requirement,
      required,
      max,
      assigned,
      missing: Math.max(required - assigned, 0),
      available: Math.max(max - assigned, 0),
      complete: assigned >= required && assigned <= max,
      over: max > 0 && assigned > max
    };
  });

  assignments.forEach((assignment) => {
    const key = assignment.musicianId || normalizeText(assignment.musicianName);
    if (!key) return;
    if (seenMusicians.has(key)) repeatedMusicians.add(key);
    seenMusicians.add(key);
  });

  const hasRequirements = rows.length > 0;
  const hasOver = rows.some((row) => row.over) || repeatedMusicians.size > 0;
  const hasMissing = rows.some((row) => row.missing > 0);
  const unknownAssignments = assignments.filter(
    (assignment) => hasRequirements && !rows.some((row) => normalizeInstrument(row.instrument) === normalizeInstrument(assignment.instrument))
  );

  let status = "sin-configurar";
  let label = "Sin configurar";
  if (hasOver || unknownAssignments.length) {
    status = "revisar";
    label = "Revisar asignaciones";
  } else if (!hasRequirements) {
    status = "sin-configurar";
    label = "Sin configurar";
  } else if (hasMissing) {
    status = "faltan";
    label = "Faltan musicos";
  } else {
    status = "completa";
    label = "Completa";
  }

  return { rows, assignments, repeatedMusicians, unknownAssignments, status, label };
}

function getFilteredSongs() {
  const songs = state.songs.map(withSongCompatibility);
  if (state.currentFilter === "todos") return songs;
  if (["jovenes", "adultos", "mixta"].includes(state.currentFilter)) {
    return songs.filter((song) => getSongAge(song) === state.currentFilter);
  }
  if (state.currentFilter === "sin-configurar") {
    return songs.filter((song) => calculateInstrumentation(song.id).status === "sin-configurar");
  }
  return songs.filter((song) => normalizeText(song.category) === normalizeText(state.currentFilter));
}

function renderAuth() {
  if (!els.authBar) return;

  if (!state.user) {
    els.authBar.innerHTML = `<button class="btn auth-btn primary" type="button" data-action="login">Ingresar con Google</button>`;
    return;
  }

  els.authBar.innerHTML = `
    <div class="auth-user">
      ${state.user.photoURL ? `<img src="${escapeHTML(state.user.photoURL)}" alt="" referrerpolicy="no-referrer" />` : ""}
      <div>
        <strong>${escapeHTML(state.user.displayName || state.user.email)}</strong>
        <span>${escapeHTML(state.user.email)}</span>
      </div>
    </div>
    <span class="role-badge ${state.canEdit ? "editor" : "student"}">${getRoleLabel()}</span>
    <button class="btn auth-btn secondary" type="button" data-action="logout">Salir</button>
  `;
}

function renderShellAccess() {
  const isSignedIn = Boolean(state.user);
  if (els.appShell) els.appShell.hidden = !isSignedIn;
  if (els.accessPanel) els.accessPanel.hidden = isSignedIn;
  if (els.editorTools) els.editorTools.hidden = !state.canEdit;
}

function renderGuide() {
  if (!els.guideContent) return;
  const content = guideByProfile[state.currentTab];
  els.guideContent.innerHTML = `
    <h3>${escapeHTML(content.title)}</h3>
    <p>${escapeHTML(content.intro)}</p>
    <ul class="guide-list">
      ${content.items.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
    </ul>
  `;
}

function renderSongs() {
  if (!els.songsGrid) return;
  const songs = getFilteredSongs();

  if (!songs.length) {
    els.songsGrid.innerHTML = `
      <div class="song-card">
        <h3>No hay canciones en este filtro</h3>
        <p>Revisa la categoria seleccionada o crea nuevas canciones desde el panel editorial.</p>
      </div>
    `;
    return;
  }

  els.songsGrid.innerHTML = songs.map(renderSongCard).join("");
}

function renderSongCard(song) {
  const instrumentation = calculateInstrumentation(song.id);
  const age = getSongAge(song);
  const notes = getSongNotes(song);

  return `
    <article class="song-card" data-song-id="${escapeHTML(song.id)}">
      <div class="song-title-row">
        <div>
          <h3>${escapeHTML(song.title)}</h3>
          <p><strong>${escapeHTML(song.artist || "Artista por definir")}</strong>${notes ? `<br>${escapeHTML(notes)}` : ""}</p>
        </div>
        <span class="status-badge ${instrumentation.status}">${escapeHTML(instrumentation.label)}</span>
      </div>

      <div class="song-meta">
        <span class="tag">${escapeHTML(song.bandName || "Sin banda asignada")}</span>
        <span class="tag ${age === "adultos" ? "yellow" : age === "jovenes" ? "blue" : ""}">${escapeHTML(AGE_LABELS[age] || "Sin categoria")}</span>
        <span class="tag">${escapeHTML(song.category || "Sin categoria musical")}</span>
        ${song.source === "fallback" ? `<span class="tag soft">Fallback visual</span>` : ""}
      </div>

      <section class="instrumentation-panel">
        <div class="assignments-heading">
          <h4>Instrumentacion</h4>
          ${state.canEdit ? `<button class="mini-action add-requirement-btn" type="button" data-song-id="${escapeHTML(song.id)}">Agregar cupo</button>` : ""}
        </div>
        ${renderInstrumentationSummary(instrumentation)}
      </section>

      <section class="assignments-panel">
        <div class="assignments-heading">
          <h4>Musicos asignados</h4>
          <span>${instrumentation.assignments.length} asignacion${instrumentation.assignments.length === 1 ? "" : "es"}</span>
        </div>
        ${renderAssignmentWarnings(song.id, instrumentation)}
        ${renderAssignmentsList(song, instrumentation.assignments)}
        ${state.canEdit ? renderAssignmentForm(song) : ""}
      </section>

      ${
        state.canEdit
          ? `
            <div class="song-editor-actions">
              <button class="edit-song-btn" type="button" data-song-id="${escapeHTML(song.id)}">Editar cancion</button>
              <button class="delete-song-btn" type="button" data-song-id="${escapeHTML(song.id)}">Desactivar cancion</button>
            </div>
          `
          : ""
      }
    </article>
  `;
}

function renderInstrumentationSummary(instrumentation) {
  if (!instrumentation.rows.length) {
    return `<p class="empty-state">Sin configurar. Esta cancion todavia no tiene instrumentos requeridos.</p>`;
  }

  return `
    <div class="instrumentation-list">
      ${instrumentation.rows
        .map((row) => {
          const detail = row.over
            ? `exceso ${row.assigned - row.max}`
            : row.missing > 0
              ? `falta ${row.missing}`
              : row.available > 0
                ? `disponible ${row.available}`
                : "completo";
          return `
            <div class="instrument-row ${row.over ? "is-over" : row.complete ? "is-complete" : "is-missing"}">
              <div>
                <strong>${escapeHTML(row.label || row.instrument)}</strong>
                <span>${row.assigned}/${row.max || row.required} - ${escapeHTML(detail)}</span>
                ${row.notes ? `<small>${escapeHTML(row.notes)}</small>` : ""}
              </div>
              ${
                state.canEdit
                  ? `
                    <div class="assignment-actions">
                      <button class="edit-requirement-btn" type="button" data-song-id="${escapeHTML(row.songId || "")}" data-requirement-id="${escapeHTML(row.id)}">Editar</button>
                      <button class="delete-requirement-btn" type="button" data-song-id="${escapeHTML(row.songId || "")}" data-requirement-id="${escapeHTML(row.id)}">Eliminar</button>
                    </div>
                  `
                  : ""
              }
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderAssignmentsList(song, assignments) {
  if (!assignments.length) return `<p class="empty-state">Aun no hay musicos asignados.</p>`;

  return `
    <div class="assignments-list">
      ${assignments
        .map(
          (assignment) => `
            <div class="assignment-item">
              <div>
                <strong>${escapeHTML(assignment.musicianName)}</strong>
                <span>${escapeHTML(assignment.instrument)} - ${escapeHTML(assignment.role || "principal")}</span>
                ${assignment.notes ? `<small>${escapeHTML(assignment.notes)}</small>` : ""}
              </div>
              ${
                state.canEdit
                  ? `
                    <div class="assignment-actions">
                      <button class="edit-assignment-btn" type="button" data-song-id="${escapeHTML(song.id)}" data-assignment-id="${escapeHTML(assignment.id)}">Editar</button>
                      <button class="delete-assignment-btn" type="button" data-song-id="${escapeHTML(song.id)}" data-assignment-id="${escapeHTML(assignment.id)}">Eliminar</button>
                    </div>
                  `
                  : ""
              }
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderAssignmentForm(song, assignment = null) {
  const requirements = getRequirements(song.id);
  const instruments = requirements.length
    ? requirements.map((requirement) => requirement.instrument)
    : [...new Set(state.musicians.flatMap((musician) => musician.instruments || []))];
  const currentInstrument = assignment?.instrument || instruments[0] || "";
  const musicianOptions = getSuggestedMusicians(currentInstrument)
    .map(
      (musician) =>
        `<option value="${escapeHTML(musician.id)}" ${assignment?.musicianId === musician.id ? "selected" : ""}>${escapeHTML(musician.name)}${musician._match ? "" : " (otro instrumento)"}</option>`
    )
    .join("");

  return `
    <form class="assignment-form" data-song-id="${escapeHTML(song.id)}" ${assignment ? `data-assignment-id="${escapeHTML(assignment.id)}"` : ""}>
      <label>
        Instrumento
        <select name="instrument" required>
          <option value="">Seleccionar</option>
          ${instruments.map((instrument) => `<option value="${escapeHTML(instrument)}" ${currentInstrument === instrument ? "selected" : ""}>${escapeHTML(instrument)}</option>`).join("")}
        </select>
      </label>
      <label>
        Musico
        <select name="musicianId" required>
          <option value="">Seleccionar</option>
          ${musicianOptions}
        </select>
      </label>
      <label>
        Rol
        <select name="role">
          ${ROLE_OPTIONS.map((role) => `<option value="${role}" ${assignment?.role === role ? "selected" : ""}>${role}</option>`).join("")}
        </select>
      </label>
      <label class="form-wide">
        Nota de asignacion
        <input name="notes" type="text" value="${escapeHTML(assignment?.notes || "")}" />
      </label>
      <div class="form-actions">
        <button class="btn primary" type="submit">${assignment ? "Guardar asignacion" : "Asignar musico"}</button>
        ${assignment ? `<button class="btn secondary cancel-edit-btn" type="button">Cancelar</button>` : ""}
      </div>
    </form>
  `;
}

function getSuggestedMusicians(instrument) {
  const key = normalizeInstrument(instrument);
  return state.musicians
    .map((musician) => ({
      ...musician,
      _match: !key || (musician.instruments || []).some((item) => normalizeInstrument(item) === key)
    }))
    .sort((a, b) => Number(b._match) - Number(a._match) || a.name.localeCompare(b.name));
}

function renderAssignmentWarnings(songId, instrumentation) {
  const warnings = [];
  if (instrumentation.repeatedMusicians.size) warnings.push("Hay un musico repetido en esta cancion.");
  instrumentation.rows.forEach((row) => {
    if (row.over) warnings.push(`${row.label || row.instrument}: hay mas musicos que cupos maximos.`);
  });
  instrumentation.unknownAssignments.forEach((assignment) => {
    warnings.push(`${assignment.instrument}: no existe en la configuracion instrumental.`);
  });
  if (!warnings.length) return "";

  return `<div class="assignment-warnings">${[...new Set(warnings)].map((warning) => `<span>${escapeHTML(warning)}</span>`).join("")}</div>`;
}

function renderEditorAdmin() {
  if (!els.editorAdmin || !state.canEdit) return;
  const metrics = getEditorMetrics();
  els.editorAdmin.innerHTML = `
    <div class="editor-tools-heading">
      <div>
        <p class="eyebrow">Modo editor</p>
        <h3>Administracion del repertorio</h3>
      </div>
    </div>

    <div class="editor-summary">
      <div><strong>${metrics.totalSongs}</strong><span>Canciones</span></div>
      <div><strong>${metrics.completeSongs}</strong><span>Completas</span></div>
      <div><strong>${metrics.incompleteSongs}</strong><span>Incompletas</span></div>
      <div><strong>${metrics.unconfiguredSongs}</strong><span>Sin configurar</span></div>
    </div>

    <div class="admin-grid">
      ${renderBandAdmin()}
      ${renderSongAdmin()}
      ${renderMusicianAdmin()}
    </div>

    <div class="load-summary">
      <h4>Faltantes por instrumento</h4>
      ${renderMissingInstrumentRows(metrics.missingByInstrument)}
      <h4>Musicos con mas asignaciones</h4>
      ${renderLoadRows(metrics.loadRows)}
      <h4>Directorio de musicos</h4>
      ${renderMusicianRows()}
      <h4>Bandas activas</h4>
      ${renderBandRows()}
    </div>
  `;
}

function renderBandAdmin() {
  return `
    <section class="admin-panel">
      <h4>Crear banda</h4>
      <form class="admin-form" id="bandForm">
        <label>Nombre<input name="name" type="text" required /></label>
        <label>Categoria
          <select name="ageCategory">
            <option value="jovenes">Jovenes</option>
            <option value="adultos">Adultos</option>
            <option value="mixta">Mixta</option>
          </select>
        </label>
        <label>Orden<input name="order" type="number" value="${state.bands.length + 1}" min="0" /></label>
        <label class="form-wide">Descripcion<input name="description" type="text" /></label>
        <button class="btn primary" type="submit">Crear banda</button>
      </form>
    </section>
  `;
}

function renderSongAdmin() {
  return `
    <section class="admin-panel">
      <h4>Crear cancion</h4>
      <form class="admin-form" id="songForm">
        <label>Titulo<input name="title" type="text" required /></label>
        <label>Artista<input name="artist" type="text" required /></label>
        <label>Banda
          <select name="bandId" required>
            <option value="">Seleccionar</option>
            ${state.bands.map((band) => `<option value="${escapeHTML(band.id)}">${escapeHTML(band.name)}</option>`).join("")}
          </select>
        </label>
        <label>Categoria<input name="category" type="text" placeholder="Rock 80s" /></label>
        <label>Orden<input name="order" type="number" value="${state.songs.length + 1}" min="0" /></label>
        <label class="form-wide">Notas<input name="notes" type="text" /></label>
        <button class="btn primary" type="submit">Crear cancion</button>
      </form>
    </section>
  `;
}

function renderMusicianAdmin() {
  return `
    <section class="admin-panel">
      <h4>Crear musico</h4>
      <form class="admin-form" id="musicianForm">
        <label>Nombre<input name="name" type="text" required /></label>
        <label>Tipo
          <select name="type">
            ${MUSICIAN_TYPES.map((type) => `<option value="${type}">${type}</option>`).join("")}
          </select>
        </label>
        <label>Edad
          <select name="ageCategory">
            <option value="">Opcional</option>
            <option value="jovenes">Jovenes</option>
            <option value="adultos">Adultos</option>
            <option value="mixta">Mixta</option>
          </select>
        </label>
        <label>Instrumentos<input name="instruments" type="text" placeholder="guitarra, voz" /></label>
        <label class="form-wide">Notas<input name="notes" type="text" /></label>
        <button class="btn primary" type="submit">Crear musico</button>
      </form>
    </section>
  `;
}

function renderBandRows() {
  if (!state.bands.length) return `<p class="empty-state">Crea la primera banda para clasificar canciones.</p>`;
  return state.bands
    .map(
      (band) => `
        <div class="musician-row">
          <div>
            <strong>${escapeHTML(band.name)}</strong>
            <span>${escapeHTML(AGE_LABELS[toAgeValue(band.ageCategory)] || "Sin categoria")} ${band.description ? `- ${escapeHTML(band.description)}` : ""}</span>
          </div>
          <div class="assignment-actions">
            <button class="edit-band-btn" type="button" data-band-id="${escapeHTML(band.id)}">Editar</button>
            <button class="delete-band-btn" type="button" data-band-id="${escapeHTML(band.id)}">Desactivar</button>
          </div>
        </div>
      `
    )
    .join("");
}

function renderMusicianRows() {
  if (!state.musicians.length) return `<p class="empty-state">Crea el primer musico para poder asignarlo a canciones.</p>`;
  return state.musicians
    .map(
      (musician) => `
        <div class="musician-row">
          <div>
            <strong>${escapeHTML(musician.name)}</strong>
            <span>${escapeHTML(musician.type || "estudiante")} - ${escapeHTML(AGE_LABELS[toAgeValue(musician.ageCategory)] || "Sin categoria")} - ${escapeHTML((musician.instruments || []).join(", ") || "Sin instrumentos")}</span>
          </div>
          <div class="assignment-actions">
            <button class="edit-musician-btn" type="button" data-musician-id="${escapeHTML(musician.id)}">Editar</button>
            <button class="delete-musician-btn" type="button" data-musician-id="${escapeHTML(musician.id)}">Desactivar</button>
          </div>
        </div>
      `
    )
    .join("");
}

function renderMissingInstrumentRows(missingByInstrument) {
  const rows = [...missingByInstrument.entries()].sort((a, b) => b[1] - a[1]);
  if (!rows.length) return `<p class="empty-state">No hay faltantes acumulados.</p>`;
  return rows
    .map(
      ([instrument, count]) => `
        <div class="load-row">
          <div><strong>${escapeHTML(instrument)}</strong><span>Faltantes acumulados</span></div>
          <strong>${count}</strong>
        </div>
      `
    )
    .join("");
}

function renderLoadRows(rows) {
  if (!rows.length) return `<p class="empty-state">Todavia no hay asignaciones para resumir.</p>`;
  return rows
    .map(
      (row) => `
        <div class="load-row ${row.count >= 4 ? "is-heavy" : ""}">
          <div>
            <strong>${escapeHTML(row.musicianName)}</strong>
            <span>${escapeHTML([...row.instruments].join(", ") || "Sin instrumento")}</span>
          </div>
          <strong>${row.count}</strong>
          ${row.count >= 4 ? `<p>Este musico ya esta asignado en varias canciones.</p>` : ""}
        </div>
      `
    )
    .join("");
}

function getEditorMetrics() {
  const missingByInstrument = new Map();
  const load = new Map();
  let completeSongs = 0;
  let incompleteSongs = 0;
  let unconfiguredSongs = 0;

  state.songs.forEach((song) => {
    const info = calculateInstrumentation(song.id);
    if (info.status === "completa") completeSongs += 1;
    if (info.status === "faltan" || info.status === "revisar") incompleteSongs += 1;
    if (info.status === "sin-configurar") unconfiguredSongs += 1;
    info.rows.forEach((row) => {
      if (row.missing > 0) missingByInstrument.set(row.label || row.instrument, (missingByInstrument.get(row.label || row.instrument) || 0) + row.missing);
    });
    info.assignments.forEach((assignment) => {
      const key = assignment.musicianId || assignment.musicianName;
      const current = load.get(key) || { musicianName: assignment.musicianName, count: 0, instruments: new Set() };
      current.count += 1;
      if (assignment.instrument) current.instruments.add(assignment.instrument);
      load.set(key, current);
    });
  });

  return {
    totalSongs: state.songs.length,
    completeSongs,
    incompleteSongs,
    unconfiguredSongs,
    missingByInstrument,
    loadRows: [...load.values()].sort((a, b) => b.count - a.count || a.musicianName.localeCompare(b.musicianName)).slice(0, 8)
  };
}

function rerenderAll() {
  renderAuth();
  renderShellAccess();
  renderGuide();
  renderSongs();
  renderEditorAdmin();
}

function syncNestedListeners() {
  const activeIds = new Set(state.songs.map((song) => song.id));
  for (const [songId, unsubscribe] of state.requirementUnsubs.entries()) {
    if (!activeIds.has(songId)) {
      unsubscribe();
      state.requirementUnsubs.delete(songId);
      state.requirementsBySong.delete(songId);
    }
  }
  for (const [songId, unsubscribe] of state.assignmentUnsubs.entries()) {
    if (!activeIds.has(songId)) {
      unsubscribe();
      state.assignmentUnsubs.delete(songId);
      state.assignmentsBySong.delete(songId);
    }
  }
  state.songs.forEach((song) => {
    if (!state.requirementUnsubs.has(song.id)) {
      const unsub = watchSongRequirements(song.id, (items) => {
        state.requirementsBySong.set(song.id, items.map((item) => ({ ...item, songId: song.id })));
        renderSongs();
        renderEditorAdmin();
      }, handleFirestoreError("No se pudieron cargar requerimientos."));
      state.requirementUnsubs.set(song.id, unsub);
    }
    if (!state.assignmentUnsubs.has(song.id)) {
      const unsub = watchSongAssignments(song.id, (items) => {
        state.assignmentsBySong.set(song.id, items);
        renderSongs();
        renderEditorAdmin();
      }, handleFirestoreError("No se pudieron cargar asignaciones."));
      state.assignmentUnsubs.set(song.id, unsub);
    }
  });
}

function handleFirestoreError(message) {
  return (error) => {
    console.error(message, error);
    setStatus(message, "warning");
  };
}

function startDataListeners() {
  if (!state.user || state.dataStarted) return;
  state.dataStarted = true;

  const unsubBands = watchBands((bands) => {
    state.bands = bands;
    state.songs = state.songs.map(withSongCompatibility);
    rerenderAll();
  }, handleFirestoreError("No se pudieron cargar bandas."));

  const unsubSongs = watchSongs((songsFromFirestore) => {
    state.songs = songsFromFirestore.length ? songsFromFirestore.map(withSongCompatibility) : fallbackSongs;
    syncNestedListeners();
    rerenderAll();
  }, (error) => {
    console.error("No se pudieron cargar canciones desde Firestore.", error);
    state.songs = fallbackSongs;
    syncNestedListeners();
    rerenderAll();
    setStatus("Firestore no respondio. Se muestra el repertorio base de forma visual.", "warning");
  });

  const unsubMusicians = watchMusicians((musicians) => {
    state.musicians = musicians;
    rerenderAll();
  }, handleFirestoreError("No se pudo cargar la lista de musicos."));

  state.dataUnsubs = [unsubBands, unsubSongs, unsubMusicians];
}

function stopDataListeners() {
  state.dataUnsubs.forEach((unsubscribe) => unsubscribe());
  state.requirementUnsubs.forEach((unsubscribe) => unsubscribe());
  state.assignmentUnsubs.forEach((unsubscribe) => unsubscribe());
  state.dataUnsubs = [];
  state.requirementUnsubs.clear();
  state.assignmentUnsubs.clear();
  state.requirementsBySong.clear();
  state.assignmentsBySong.clear();
  state.dataStarted = false;
  state.songs = fallbackSongs;
  state.bands = [];
  state.musicians = [];
}

function setupFilters() {
  els.filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.currentFilter = button.dataset.filter || "todos";
      els.filterButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderSongs();
    });
  });
}

function setupTabs() {
  els.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.currentTab = button.dataset.tab || "docentes";
      els.tabButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderGuide();
    });
  });
}

function setupActiveNav() {
  const links = document.querySelectorAll(".nav a");
  const sections = [...document.querySelectorAll("main section[id]")];
  if (!links.length || !sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.getAttribute("id");
        links.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${id}`));
      });
    },
    { rootMargin: "-35% 0px -55% 0px", threshold: 0.01 }
  );
  sections.forEach((section) => observer.observe(section));
}

function setupGlobalActions() {
  document.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "login") await handleLogin();
    if (action === "logout") await handleLogout();
  });
  els.loginBtn?.addEventListener("click", handleLogin);
  els.accessLoginBtn?.addEventListener("click", handleLogin);
}

async function handleLogin() {
  try {
    await loginWithGoogle();
  } catch (error) {
    console.error("No se pudo iniciar sesion.", error);
    setStatus("No se pudo iniciar sesion con Google.", "warning");
  }
}

async function handleLogout() {
  try {
    await logoutUser();
  } catch (error) {
    console.error("No se pudo cerrar sesion.", error);
    setStatus("No se pudo cerrar la sesion.", "warning");
  }
}

function setupAdminForms() {
  els.editorTools?.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!state.canEdit || !(form instanceof HTMLFormElement)) return;
    event.preventDefault();

    if (form.id === "bandForm") await submitBand(form);
    if (form.id === "songForm") await submitSong(form);
    if (form.id === "musicianForm") await submitMusician(form);
  });

  els.editorTools?.addEventListener("click", async (event) => {
    if (!state.canEdit) return;
    const button = event.target.closest("button");
    if (!button) return;
    if (button.classList.contains("edit-band-btn")) await editBand(button.dataset.bandId);
    if (button.classList.contains("delete-band-btn")) await archiveBand(button.dataset.bandId);
  });
}

async function submitBand(form) {
  const data = Object.fromEntries(new FormData(form));
  try {
    await createBand({
      name: String(data.name || "").trim(),
      ageCategory: toAgeValue(data.ageCategory),
      description: String(data.description || "").trim(),
      order: Number(data.order || state.bands.length + 1)
    });
    form.reset();
    setStatus("Banda creada.", "success");
  } catch (error) {
    console.error("No se pudo crear la banda.", error);
    setStatus("No se pudo crear la banda.", "warning");
  }
}

async function submitSong(form) {
  const data = Object.fromEntries(new FormData(form));
  const band = getBandById(data.bandId);
  if (!band) {
    setStatus("Selecciona una banda para la cancion.", "warning");
    return;
  }
  try {
    await createSong({
      title: String(data.title || "").trim(),
      artist: String(data.artist || "").trim(),
      bandId: band.id,
      bandName: band.name,
      ageCategory: toAgeValue(band.ageCategory),
      category: String(data.category || "").trim(),
      notes: String(data.notes || "").trim(),
      order: Number(data.order || state.songs.length + 1)
    });
    form.reset();
    setStatus("Cancion creada.", "success");
  } catch (error) {
    console.error("No se pudo crear la cancion.", error);
    setStatus("No se pudo crear la cancion.", "warning");
  }
}

async function submitMusician(form) {
  const data = Object.fromEntries(new FormData(form));
  try {
    await createMusician({
      name: String(data.name || "").trim(),
      type: MUSICIAN_TYPES.includes(data.type) ? data.type : "estudiante",
      ageCategory: toAgeValue(data.ageCategory),
      instruments: splitCsv(data.instruments),
      notes: String(data.notes || "").trim()
    });
    form.reset();
    setStatus("Musico creado.", "success");
  } catch (error) {
    console.error("No se pudo crear el musico.", error);
    setStatus("No se pudo crear el musico.", "warning");
  }
}

function setupSongActions() {
  els.songsGrid?.addEventListener("submit", async (event) => {
    const form = event.target.closest(".assignment-form");
    if (!form || !state.canEdit) return;
    event.preventDefault();
    await submitAssignment(form);
  });

  els.songsGrid?.addEventListener("click", async (event) => {
    if (!state.canEdit) return;
    const button = event.target.closest("button");
    if (!button) return;
    const songId = button.dataset.songId || button.closest("[data-song-id]")?.dataset.songId;
    if (button.classList.contains("cancel-edit-btn")) renderSongs();
    if (button.classList.contains("edit-song-btn")) await editSong(songId);
    if (button.classList.contains("delete-song-btn")) await archiveSong(songId);
    if (button.classList.contains("add-requirement-btn")) await addRequirement(songId);
    if (button.classList.contains("edit-requirement-btn")) await editRequirement(songId, button.dataset.requirementId);
    if (button.classList.contains("delete-requirement-btn")) await removeRequirement(songId, button.dataset.requirementId);
    if (button.classList.contains("edit-assignment-btn")) showAssignmentEditor(songId, button.dataset.assignmentId);
    if (button.classList.contains("delete-assignment-btn")) await removeAssignment(songId, button.dataset.assignmentId);
  });
}

async function submitAssignment(form) {
  const data = Object.fromEntries(new FormData(form));
  const songId = form.dataset.songId;
  const assignmentId = form.dataset.assignmentId || "";
  const musician = getMusicianById(data.musicianId);
  const instrument = String(data.instrument || "").trim();
  if (!songId || !musician || !instrument) {
    setStatus("Selecciona instrumento y musico.", "warning");
    return;
  }

  const validation = validateAssignment(songId, musician.id, instrument, assignmentId);
  if (validation.blocked) {
    setStatus(validation.message, "warning");
    return;
  }

  try {
    const payload = {
      musicianId: musician.id,
      musicianName: musician.name,
      instrument,
      role: ROLE_OPTIONS.includes(data.role) ? data.role : "principal",
      notes: String(data.notes || "").trim()
    };
    if (assignmentId) {
      await updateAssignment(songId, assignmentId, payload);
      setStatus("Asignacion actualizada.", "success");
    } else {
      await createAssignment(songId, payload);
      setStatus("Asignacion creada.", "success");
    }
    form.reset();
  } catch (error) {
    console.error("No se pudo guardar la asignacion.", error);
    setStatus("No se pudo guardar la asignacion.", "warning");
  }
}

function validateAssignment(songId, musicianId, instrument, assignmentId = "") {
  const assignments = getAssignments(songId).filter((assignment) => assignment.id !== assignmentId);
  if (assignments.some((assignment) => assignment.musicianId === musicianId)) {
    return { blocked: true, message: "Ese musico ya esta asignado en esta cancion." };
  }

  const requirement = getRequirements(songId).find((item) => normalizeInstrument(item.instrument) === normalizeInstrument(instrument));
  if (requirement) {
    const max = Number(requirement.max || requirement.required || 0);
    const assigned = assignments.filter((assignment) => normalizeInstrument(assignment.instrument) === normalizeInstrument(instrument)).length;
    if (max > 0 && assigned >= max) {
      return { blocked: true, message: `El cupo de ${requirement.label || instrument} ya esta completo.` };
    }
  }

  return { blocked: false, message: "" };
}

function showAssignmentEditor(songId, assignmentId) {
  const song = state.songs.find((item) => item.id === songId);
  const assignment = getAssignments(songId).find((item) => item.id === assignmentId);
  const card = els.songsGrid?.querySelector(`[data-song-id="${CSS.escape(songId)}"]`);
  const form = card?.querySelector(".assignment-form");
  if (!song || !assignment || !form) return;
  form.outerHTML = renderAssignmentForm(song, assignment);
}

async function editBand(bandId) {
  const band = getBandById(bandId);
  if (!band) return;
  const name = prompt("Nombre de la banda", band.name || "");
  if (name === null || !name.trim()) return;
  const ageCategory = prompt("Categoria: jovenes, adultos o mixta", band.ageCategory || "jovenes");
  if (ageCategory === null) return;
  const description = prompt("Descripcion", band.description || "");
  if (description === null) return;
  await updateBandSafely(bandId, { name: name.trim(), ageCategory: toAgeValue(ageCategory), description: description.trim() });
}

async function archiveBand(bandId) {
  if (!confirm("Desactivar esta banda? Las canciones existentes no se borran.")) return;
  try {
    await deleteBand(bandId);
    setStatus("Banda desactivada.", "success");
  } catch (error) {
    console.error("No se pudo desactivar la banda.", error);
    setStatus("No se pudo desactivar la banda.", "warning");
  }
}

async function updateBandSafely(bandId, payload) {
  try {
    await updateBand(bandId, payload);
    setStatus("Banda actualizada.", "success");
  } catch (error) {
    console.error("No se pudo actualizar la banda.", error);
    setStatus("No se pudo actualizar la banda.", "warning");
  }
}

async function editSong(songId) {
  const song = state.songs.find((item) => item.id === songId);
  if (!song || song.source === "fallback") {
    setStatus("Esta cancion es fallback visual. Creala en Firestore para editarla.", "warning");
    return;
  }
  const title = prompt("Titulo", song.title || "");
  if (title === null || !title.trim()) return;
  const artist = prompt("Artista", song.artist || "");
  if (artist === null) return;
  const bandName = prompt("Banda exacta", song.bandName || "");
  if (bandName === null) return;
  const band = state.bands.find((item) => normalizeText(item.name) === normalizeText(bandName)) || getBandById(song.bandId);
  const category = prompt("Categoria musical", song.category || "");
  if (category === null) return;
  const notes = prompt("Notas especificas", getSongNotes(song));
  if (notes === null) return;
  try {
    await updateSong(songId, {
      title: title.trim(),
      artist: artist.trim(),
      bandId: band?.id || song.bandId || "",
      bandName: band?.name || bandName.trim() || "Sin banda asignada",
      ageCategory: toAgeValue(band?.ageCategory || song.ageCategory),
      category: category.trim(),
      notes: notes.trim()
    });
    setStatus("Cancion actualizada.", "success");
  } catch (error) {
    console.error("No se pudo actualizar la cancion.", error);
    setStatus("No se pudo actualizar la cancion.", "warning");
  }
}

async function archiveSong(songId) {
  const song = state.songs.find((item) => item.id === songId);
  if (!song || song.source === "fallback") {
    setStatus("Esta cancion es fallback visual; no existe en Firestore.", "warning");
    return;
  }
  if (!confirm("Desactivar esta cancion? Sus subcolecciones no se borran.")) return;
  try {
    await deleteSong(songId);
    setStatus("Cancion desactivada.", "success");
  } catch (error) {
    console.error("No se pudo desactivar la cancion.", error);
    setStatus("No se pudo desactivar la cancion.", "warning");
  }
}

async function addRequirement(songId) {
  if (state.songs.find((song) => song.id === songId)?.source === "fallback") {
    setStatus("Crea la cancion en Firestore antes de configurar cupos.", "warning");
    return;
  }
  const instrument = prompt("Instrumento normalizado. Ej: guitarra, bateria, voz");
  if (instrument === null || !instrument.trim()) return;
  const label = prompt("Etiqueta visible", instrument.trim());
  if (label === null) return;
  const required = Number(prompt("Cantidad requerida", "1"));
  if (!Number.isFinite(required) || required < 0) return;
  const max = Number(prompt("Maximo permitido", String(required || 1)));
  if (!Number.isFinite(max) || max < required) {
    setStatus("El maximo debe ser mayor o igual al requerido.", "warning");
    return;
  }
  const notes = prompt("Notas del cupo", "");
  if (notes === null) return;
  try {
    await createRequirement(songId, {
      instrument: normalizeInstrument(instrument),
      label: label.trim() || instrument.trim(),
      required,
      max,
      notes: notes.trim(),
      order: getRequirements(songId).length + 1
    });
    setStatus("Cupo instrumental creado.", "success");
  } catch (error) {
    console.error("No se pudo crear el cupo.", error);
    setStatus("No se pudo crear el cupo.", "warning");
  }
}

async function editRequirement(songId, requirementId) {
  const requirement = getRequirements(songId).find((item) => item.id === requirementId);
  if (!requirement) return;
  const instrument = prompt("Instrumento", requirement.instrument || "");
  if (instrument === null || !instrument.trim()) return;
  const label = prompt("Etiqueta", requirement.label || instrument);
  if (label === null) return;
  const required = Number(prompt("Cantidad requerida", String(requirement.required || 1)));
  const max = Number(prompt("Maximo permitido", String(requirement.max || required)));
  if (!Number.isFinite(required) || !Number.isFinite(max) || max < required) {
    setStatus("Revisa requerido y maximo.", "warning");
    return;
  }
  const notes = prompt("Notas", requirement.notes || "");
  if (notes === null) return;
  try {
    await updateRequirement(songId, requirementId, {
      instrument: normalizeInstrument(instrument),
      label: label.trim() || instrument.trim(),
      required,
      max,
      notes: notes.trim()
    });
    setStatus("Cupo actualizado.", "success");
  } catch (error) {
    console.error("No se pudo actualizar el cupo.", error);
    setStatus("No se pudo actualizar el cupo.", "warning");
  }
}

async function removeRequirement(songId, requirementId) {
  if (!confirm("Eliminar este cupo instrumental?")) return;
  try {
    await deleteRequirement(songId, requirementId);
    setStatus("Cupo eliminado.", "success");
  } catch (error) {
    console.error("No se pudo eliminar el cupo.", error);
    setStatus("No se pudo eliminar el cupo.", "warning");
  }
}

async function removeAssignment(songId, assignmentId) {
  if (!confirm("Eliminar esta asignacion?")) return;
  try {
    await deleteAssignment(songId, assignmentId);
    setStatus("Asignacion eliminada.", "success");
  } catch (error) {
    console.error("No se pudo eliminar la asignacion.", error);
    setStatus("No se pudo eliminar la asignacion.", "warning");
  }
}

function setupMusicianDirectoryActions() {
  els.editorTools?.addEventListener("click", async (event) => {
    if (!state.canEdit) return;
    const button = event.target.closest("button");
    if (!button) return;
    if (button.classList.contains("edit-musician-btn")) await editMusician(button.dataset.musicianId);
    if (button.classList.contains("delete-musician-btn")) await archiveMusician(button.dataset.musicianId);
  });
}

async function editMusician(musicianId) {
  const musician = getMusicianById(musicianId);
  if (!musician) return;
  const name = prompt("Nombre del musico", musician.name || "");
  if (name === null || !name.trim()) return;
  const type = prompt("Tipo: estudiante, docente o invitado", musician.type || "estudiante");
  if (type === null) return;
  const ageCategory = prompt("Categoria opcional: jovenes, adultos, mixta o vacio", musician.ageCategory || "");
  if (ageCategory === null) return;
  const instruments = prompt("Instrumentos separados por coma", (musician.instruments || []).join(", "));
  if (instruments === null) return;
  const notes = prompt("Notas", musician.notes || "");
  if (notes === null) return;
  try {
    await updateMusician(musicianId, {
      name: name.trim(),
      type: MUSICIAN_TYPES.includes(type.trim()) ? type.trim() : "estudiante",
      ageCategory: toAgeValue(ageCategory),
      instruments: splitCsv(instruments),
      notes: notes.trim()
    });
    setStatus("Musico actualizado.", "success");
  } catch (error) {
    console.error("No se pudo actualizar el musico.", error);
    setStatus("No se pudo actualizar el musico.", "warning");
  }
}

async function archiveMusician(musicianId) {
  if (!confirm("Desactivar este musico? Sus asignaciones existentes no se borran.")) return;
  try {
    await deleteMusician(musicianId);
    setStatus("Musico desactivado.", "success");
  } catch (error) {
    console.error("No se pudo desactivar el musico.", error);
    setStatus("No se pudo desactivar el musico.", "warning");
  }
}

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function setupAuthWatcher() {
  watchAuth((session) => {
    if (!session.user) stopDataListeners();
    state.user = session.user;
    state.role = session.role;
    state.canEdit = session.canEdit;
    startDataListeners();
    rerenderAll();
  });
}

function initApp() {
  renderGuide();
  renderSongs();
  renderShellAccess();
  setupGlobalActions();
  setupFilters();
  setupTabs();
  setupActiveNav();
  setupAdminForms();
  setupSongActions();
  setupMusicianDirectoryActions();
  setupAuthWatcher();
}

document.addEventListener("DOMContentLoaded", initApp);
