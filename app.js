/* =========================================================
   Salvémoslos del Reggaetón 2026
   Musicala + Full 80’s
   App sencilla informativa en Vanilla JS
========================================================= */

const songs = [
  {
    title: "Black or White",
    artist: "Michael Jackson",
    group: "Mixto",
    category: "Tributo MJ",
    note: "Canción potente para trabajar groove, energía escénica y ensamble."
  },
  {
    title: "Billie Jean",
    artist: "Michael Jackson",
    group: "Adultos",
    category: "Tributo MJ",
    note: "Ideal para bajo, pulso estable, precisión rítmica y presencia."
  },
  {
    title: "Human Nature",
    artist: "Michael Jackson",
    group: "Mixto",
    category: "Tributo MJ",
    note: "Momento más suave para trabajar interpretación, atmósfera y musicalidad."
  },
  {
    title: "Bad",
    artist: "Michael Jackson",
    group: "Adolescentes",
    category: "Tributo MJ",
    note: "Buena para actitud escénica, coros, cortes y energía grupal."
  },
  {
    title: "Wanna Be Startin’ Somethin’",
    artist: "Michael Jackson",
    group: "Mixto",
    category: "Tributo MJ",
    note: "Excelente para trabajar percusión corporal, voces y resistencia musical."
  },
  {
    title: "I Just Can’t Stop Loving You",
    artist: "Michael Jackson",
    group: "Adultos",
    category: "Tributo MJ",
    note: "Balada para explorar fraseo, intención y conexión entre intérpretes."
  },
  {
    title: "Smooth Criminal",
    artist: "Michael Jackson",
    group: "Adolescentes",
    category: "Tributo MJ",
    note: "Reto técnico y escénico. Porque aparentemente dormir tranquilos era muy fácil."
  },
  {
    title: "The Way You Make Me Feel",
    artist: "Michael Jackson",
    group: "Mixto",
    category: "Tributo MJ",
    note: "Canción con mucho carácter para trabajar interacción con el público."
  },
  {
    title: "Don’t Stop ’Til You Get Enough",
    artist: "Michael Jackson",
    group: "Adultos",
    category: "Tributo MJ",
    note: "Disco, groove y resistencia. Muy útil para trabajar ensamble compacto."
  },
  {
    title: "Thriller",
    artist: "Michael Jackson",
    group: "Mixto",
    category: "Tributo MJ",
    note: "Momento icónico para integrar música, escena y movimiento."
  },
  {
    title: "Rock With You",
    artist: "Michael Jackson",
    group: "Adultos",
    category: "Tributo MJ",
    note: "Sonido elegante, controlado y perfecto para trabajar balance de banda."
  },
  {
    title: "Heal the World",
    artist: "Michael Jackson",
    group: "Mixto",
    category: "Tributo MJ",
    note: "Canción emotiva para un cierre colectivo o momento reflexivo."
  },
  {
    title: "Beat It",
    artist: "Michael Jackson",
    group: "Adolescentes",
    category: "Tributo MJ",
    note: "Una de las más rockeras del repertorio. Guitarras felices, vecinos no tanto."
  },
  {
    title: "You Are Not Alone",
    artist: "Michael Jackson",
    group: "Adultos",
    category: "Tributo MJ",
    note: "Balada para trabajar control vocal, interpretación y sensibilidad."
  },
  {
    title: "Dirty Diana",
    artist: "Michael Jackson",
    group: "Mixto",
    category: "Tributo MJ",
    note: "Canción con fuerza rockera, ideal para cerrar bloques con intensidad."
  }
];

const guideByProfile = {
  docentes: {
    title: "Guía para docentes",
    intro:
      "El rol docente será acompañar el proceso musical y escénico con claridad, orden y criterio pedagógico. Sí, también incluye evitar que el ensayo se convierta en una selva con amplificadores.",
    items: [
      "Explicar a los estudiantes el sentido del evento: no es solo tocar canciones, es vivir un proceso artístico completo.",
      "Organizar los ensayos por objetivos: estructura, entradas, cortes, finales, sonido, escena y seguridad.",
      "Trabajar el repertorio desde el nivel real de cada grupo, adaptando arreglos cuando sea necesario.",
      "Promover escucha grupal, responsabilidad individual y respeto por el trabajo de los demás.",
      "Preparar indicaciones claras para el día del evento: horarios, vestuario, instrumentos, entradas y salidas."
    ]
  },

  estudiantes: {
    title: "Guía para estudiantes",
    intro:
      "Este evento es una oportunidad para vivir la música como una experiencia real de escenario. No se trata de tocar perfecto, porque tampoco somos robots afinados por fábrica, sino de prepararse con compromiso.",
    items: [
      "Llegar a los ensayos con la canción escuchada y la parte individual estudiada.",
      "Preguntar cuando algo no esté claro, en vez de fingir seguridad y luego mirar al baterista con pánico.",
      "Cuidar el sonido del grupo: volumen, entradas, silencios, cortes y finales.",
      "Trabajar actitud escénica: mirar al frente, estar presente y conectar con la canción.",
      "Entender que el escenario es colectivo: cada persona aporta al resultado final."
    ]
  },

  familias: {
    title: "Guía para familias",
    intro:
      "Las familias cumplen un papel clave acompañando el proceso. Su apoyo ayuda a que los estudiantes vivan el evento con emoción, seguridad y menos drama logístico, que ya bastante tiene la humanidad.",
    items: [
      "Motivar la práctica en casa sin convertirla en persecución musical nivel detective.",
      "Estar pendientes de horarios, vestuario, instrumentos y recomendaciones del equipo docente.",
      "Acompañar el proceso con paciencia: cada estudiante avanza a su ritmo.",
      "Celebrar el esfuerzo, no solo el resultado final del concierto.",
      "Vivir el evento como una experiencia familiar y artística compartida."
    ]
  }
};

const songsGrid = document.querySelector("#songsGrid");
const filterButtons = document.querySelectorAll(".filter-btn");
const tabButtons = document.querySelectorAll(".tab-btn");
const guideContent = document.querySelector("#guideContent");

let currentFilter = "todos";
let currentTab = "docentes";

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getGroupTagClass(group) {
  if (group === "Adolescentes") return "blue";
  if (group === "Adultos") return "yellow";
  return "";
}

function renderSongs() {
  if (!songsGrid) return;

  const filteredSongs =
    currentFilter === "todos"
      ? songs
      : songs.filter((song) => {
          return song.group === currentFilter || song.category === currentFilter;
        });

  if (!filteredSongs.length) {
    songsGrid.innerHTML = `
      <div class="song-card">
        <h3>No hay canciones en este filtro</h3>
        <p>Revisa la categoría seleccionada o ajusta el repertorio en app.js.</p>
      </div>
    `;
    return;
  }

  songsGrid.innerHTML = filteredSongs
    .map((song) => {
      const tagClass = getGroupTagClass(song.group);

      return `
        <article class="song-card">
          <h3>${escapeHTML(song.title)}</h3>
          <p>
            <strong>${escapeHTML(song.artist)}</strong><br>
            ${escapeHTML(song.note)}
          </p>

          <div class="song-meta">
            <span class="tag ${tagClass}">${escapeHTML(song.group)}</span>
            <span class="tag">${escapeHTML(song.category)}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderGuide() {
  if (!guideContent) return;

  const content = guideByProfile[currentTab];

  guideContent.innerHTML = `
    <h3>${escapeHTML(content.title)}</h3>
    <p>${escapeHTML(content.intro)}</p>

    <ul class="guide-list">
      ${content.items.map((item) => `<li>${escapeHTML(item)}</li>`).join("")}
    </ul>
  `;
}

function setupFilters() {
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter || "todos";

      filterButtons.forEach((item) => item.classList.remove("active"));
      button.classList.add("active");

      renderSongs();
    });
  });
}

function setupTabs() {
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentTab = button.dataset.tab || "docentes";

      tabButtons.forEach((item) => item.classList.remove("active"));
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

        links.forEach((link) => {
          const isActive = link.getAttribute("href") === `#${id}`;
          link.classList.toggle("active", isActive);
        });
      });
    },
    {
      rootMargin: "-35% 0px -55% 0px",
      threshold: 0.01
    }
  );

  sections.forEach((section) => observer.observe(section));
}

function initApp() {
  renderSongs();
  renderGuide();
  setupFilters();
  setupTabs();
  setupActiveNav();
}

document.addEventListener("DOMContentLoaded", initApp);