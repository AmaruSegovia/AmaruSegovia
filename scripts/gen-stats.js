// Genera stats.svg y contrib.svg desde datos publicos de GitHub, con el mismo
// sistema de pixel art que el banner: misma paleta, misma fuente bitmap, misma grilla.
//
// Uso: node scripts/gen-stats.js <dir-salida> [--contrib]

const { PAL, text, textWidth, rect } = require("./lib/pixel");

const USER = "AmaruSegovia";
const OUT = process.argv[2] || "dist";
const TOKEN = process.env.GITHUB_TOKEN || "";
const SCALE = 5, W = 240;

// Los colores oficiales de cada lenguaje se irian de la paleta, asi que asigno por
// posicion. El nombre va escrito al lado: el color no necesita identificarlo solo.
const LANG_RAMP = [PAL.ochre, PAL.terra, PAL.sand, PAL.olive, PAL.teal, PAL.wine];

const api = async (p) => {
  const r = await fetch("https://api.github.com" + p, {
    headers: {
      "User-Agent": "profile-stats",
      Accept: "application/vnd.github+json",
      ...(TOKEN ? { Authorization: "Bearer " + TOKEN } : {}),
    },
  });
  if (!r.ok) throw new Error(p + " -> " + r.status);
  return r.json();
};

// --- contribuciones: pagina publica, no hace falta token ---
async function contributions() {
  const r = await fetch("https://github.com/users/" + USER + "/contributions", {
    headers: { "User-Agent": "Mozilla/5.0 profile-stats" },
  });
  if (!r.ok) throw new Error("contributions -> " + r.status);
  const html = await r.text();

  // el conteo real por dia sale del tooltip accesible, no del atributo data-level
  const counts = {};
  const reTip = /<tool-tip[^>]*for="(contribution-day-component-[\d-]+)"[^>]*>([^<]*)<\/tool-tip>/g;
  for (const m of html.matchAll(reTip)) {
    const n = /^No contributions/i.test(m[2]) ? 0 : parseInt(m[2], 10);
    counts[m[1]] = Number.isNaN(n) ? 0 : n;
  }

  const days = [];
  for (const m of html.matchAll(/<td[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*>/g)) {
    const tag = m[0];
    const lvl = /data-level="(\d)"/.exec(tag);
    const id = /id="(contribution-day-component-[\d-]+)"/.exec(tag);
    if (!lvl) continue;
    days.push({ date: m[1], level: +lvl[1], count: id && counts[id[1]] != null ? counts[id[1]] : 0 });
  }
  if (days.length < 300) throw new Error("solo " + days.length + " dias: cambio el HTML de GitHub?");
  days.sort((a, b) => a.date.localeCompare(b.date));
  return { days, total: days.reduce((a, d) => a + d.count, 0) };
}

// marco tipo ventana de menu
function frame(w, h) {
  return rect(0, 0, w, h, PAL.ink)
    + rect(0, 0, w, 1, PAL.cream) + rect(0, h - 1, w, 1, PAL.cream)
    + rect(0, 0, 1, h, PAL.cream) + rect(w - 1, 0, 1, h, PAL.cream)
    + rect(2, 2, w - 4, 1, PAL.plum) + rect(2, h - 3, w - 4, 1, PAL.plum);
}

const svgWrap = (w, h, body, label) =>
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + " " + h + '" width="' + w * SCALE +
  '" height="' + h * SCALE + '" shape-rendering="crispEdges" role="img" aria-label="' + label + '">' +
  body + "</svg>";

// ETIQUETA ......... VALOR, como un menu de RPG.
// Una fila de cuatro cajas con numeros grandes seria justo el patron de "stat banner"
// que delata a las paginas generadas, asi que va como lista.
function dotLine(label, value, x, y, w) {
  const lw = textWidth(label), vw = textWidth(value);
  const dots = Math.max(0, Math.floor((w - lw - vw - 8) / 6));
  let out = text(label, x, y, PAL.sand);
  for (let i = 0; i < dots; i++) out += rect(x + lw + 5 + i * 6, y + 5, 2, 1, PAL.plum);
  return out + text(value, x + w - vw, y, PAL.cream);
}

function statsSvg(user, contrib, repoCount, langs) {
  const H = 76;
  const today = new Date().toISOString().slice(0, 10);
  const years = ((Date.now() - new Date(user.created_at)) / 31557600000).toFixed(1);

  let s = frame(W, H);
  s += text("PARTIDA GUARDADA", 8, 7, PAL.cream);
  s += text(today, W - 8 - textWidth(today), 7, PAL.plum);
  s += rect(8, 17, W - 16, 1, PAL.plum);

  const colW = 100;
  s += dotLine("REPOS", String(repoCount), 8, 23, colW);
  s += dotLine("SEGUIDORES", String(user.followers), 132, 23, colW);
  s += dotLine("COMMITS", String(contrib.total), 8, 33, colW);
  s += dotLine("ANTIGUEDAD", years + "A", 132, 33, colW);

  s += text("LENGUAJES", 8, 47, PAL.olive);

  const barX = 8, barW = W - 16, barY = 56;
  let acc = 0;
  for (const l of langs) {
    const w = Math.round((l.pct / 100) * barW);
    if (w > 0) s += rect(barX + acc, barY, w, 5, l.color);
    acc += w;
  }
  if (acc < barW) s += rect(barX + acc, barY, barW - acc, 5, PAL.plum);

  langs.slice(0, 3).forEach((l, i) => {
    const x = 8 + i * 78, y = 65;
    s += rect(x, y + 1, 4, 4, l.color);
    s += text(l.name.toUpperCase().slice(0, 9) + " " + Math.round(l.pct) + "%", x + 7, y, PAL.sand);
  });

  return svgWrap(W, H, s, "Estadisticas de GitHub de " + USER);
}

function contribSvg(contrib) {
  const days = contrib.days;
  const CELL = 3, STEP = 4;
  const LV = [PAL.plum, PAL.wine, PAL.terra, PAL.ochre, PAL.sand];
  const first = new Date(days[0].date + "T00:00:00Z");
  const weekStart = new Date(first);
  weekStart.setUTCDate(first.getUTCDate() - first.getUTCDay());

  const X0 = 8, Y0 = 24;
  let cells = "";
  for (const d of days) {
    const dt = new Date(d.date + "T00:00:00Z");
    const col = Math.floor((dt - weekStart) / 604800000);
    cells += rect(X0 + col * STEP, Y0 + dt.getUTCDay() * STEP, CELL, CELL, LV[d.level]);
  }
  const H = Y0 + 7 * STEP + 14;

  let s = frame(W, H);
  s += text("365 DIAS", 8, 7, PAL.cream);
  const rango = days[0].date.slice(0, 7) + " / " + days[days.length - 1].date.slice(0, 7);
  s += text(rango, W - 8 - textWidth(rango), 7, PAL.plum);
  s += rect(8, 17, W - 16, 1, PAL.plum);
  s += cells;

  s += text(contrib.total + " CONTRIBUCIONES", 8, H - 11, PAL.sand);
  const lx = W - 8 - LV.length * 5;
  LV.forEach((c, i) => { s += rect(lx + i * 5, H - 10, 4, 4, c); });
  s += text("+", lx - 8, H - 11, PAL.plum);

  return svgWrap(W, H, s, contrib.total + " contribuciones de " + USER + " en el ultimo anio");
}

(async () => {
  const fs = require("fs");
  fs.mkdirSync(OUT, { recursive: true });

  if (process.argv.includes("--contrib")) {
    const c = await contributions();
    fs.writeFileSync(OUT + "/contrib.svg", contribSvg(c));
    return console.log("ok -> contrib.svg  (" + c.total + " contribuciones, " + c.days.length + " dias)");
  }

  const [user, contrib] = await Promise.all([api("/users/" + USER), contributions()]);

  let repos = [], page = 1;
  for (;;) {
    const b = await api("/users/" + USER + "/repos?per_page=100&page=" + page);
    repos = repos.concat(b);
    if (b.length < 100) break;
    page++;
  }
  const own = repos.filter((r) => !r.fork);

  const bytes = {};
  for (const r of own) {
    let l;
    try {
      l = await api("/repos/" + USER + "/" + r.name + "/languages");
    } catch {
      // un reintento; si vuelve a fallar corta, mejor eso que publicar porcentajes falsos
      await new Promise((res) => setTimeout(res, 1500));
      l = await api("/repos/" + USER + "/" + r.name + "/languages");
    }
    for (const k of Object.keys(l)) bytes[k] = (bytes[k] || 0) + l[k];
  }
  const total = Object.values(bytes).reduce((a, b) => a + b, 0) || 1;
  const langs = Object.entries(bytes).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([name, v], i) => ({ name, pct: (v / total) * 100, color: LANG_RAMP[i % LANG_RAMP.length] }));

  fs.writeFileSync(OUT + "/stats.svg", statsSvg(user, contrib, own.length, langs));
  fs.writeFileSync(OUT + "/contrib.svg", contribSvg(contrib));
  console.log("ok -> stats.svg + contrib.svg  (" + own.length + " repos, " + contrib.total + " contribuciones)");
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
