// Genera stats.svg y contrib.svg desde datos publicos de GitHub. Sin servicios externos.
// Uso: node scripts/gen-stats.js <dir-salida>
const USER = "AmaruSegovia";
const OUT = process.argv[2] || "dist";
const TOKEN = process.env.GITHUB_TOKEN || "";
const MONO = "ui-monospace,'DejaVu Sans Mono','Courier New',monospace";

const LANG_COLOR = {
  "C#": "#178600", TypeScript: "#3178c6", JavaScript: "#f1e05a", ShaderLab: "#222c37",
  Processing: "#0096D8", HTML: "#e34c26", CSS: "#663399", EJS: "#a91e50", Java: "#b07219",
  "C++": "#f34b7d", C: "#555555", Python: "#3572A5", HLSL: "#aace60", PLpgSQL: "#336790",
  SCSS: "#c6538c", Shell: "#89e051", Batchfile: "#C1F12E", GLSL: "#5686a5",
};
const FALLBACK = ["#b36bff", "#ff6fb5", "#ffd76b", "#5ad2ff", "#7bdc8f", "#ff9d6b", "#c0a8ff", "#8f83bd"];

// varios colores oficiales de lenguajes son casi negros: los reemplazo por la paleta
const readable = (hex, i) => {
  if (!hex) return FALLBACK[i % FALLBACK.length];
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum < 0.22 ? FALLBACK[i % FALLBACK.length] : hex;
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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

function contribSvg(contrib) {
  const days = contrib.days;
  const CELL = 16, GAP = 4, STEP = CELL + GAP, X0 = 92, Y0 = 92;
  const LV = ["#1c1433", "#4a2d7a", "#7b3fd4", "#b36bff", "#ff6fb5"];
  const first = new Date(days[0].date + "T00:00:00Z");
  const weekStart = new Date(first);
  weekStart.setUTCDate(first.getUTCDate() - first.getUTCDay());

  let maxCol = 0, cells = "", lastMonth = -1;
  const monthAt = {};
  for (const d of days) {
    const dt = new Date(d.date + "T00:00:00Z");
    const col = Math.floor((dt - weekStart) / 604800000);
    const row = dt.getUTCDay();
    if (col > maxCol) maxCol = col;
    // una sola etiqueta por mes: sin esto varias columnas del mismo mes la repiten
    if (dt.getUTCDate() <= 7 && dt.getUTCMonth() !== lastMonth) {
      monthAt[col] = dt.getUTCMonth();
      lastMonth = dt.getUTCMonth();
    }
    cells += '<rect x="' + (X0 + col * STEP) + '" y="' + (Y0 + row * STEP) +
      '" width="' + CELL + '" height="' + CELL + '" rx="3" fill="' + LV[d.level] + '"/>';
  }

  const gridW = (maxCol + 1) * STEP, gridH = 7 * STEP;
  const W = X0 + gridW + 60, H = Y0 + gridH + 78;
  const MES = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
  const months = Object.keys(monthAt).map((col) =>
    '<text x="' + (X0 + col * STEP) + '" y="' + (Y0 - 12) + '" font-family="' + MONO +
    '" font-size="11" fill="#7a6fa5" letter-spacing="1">' + MES[monthAt[col]] + "</text>").join("");
  const DIA = ["", "LUN", "", "MIE", "", "VIE", ""];
  const dayLabels = DIA.map((t, i) => t
    ? '<text x="' + (X0 - 12) + '" y="' + (Y0 + i * STEP + 12) + '" text-anchor="end" font-family="' +
      MONO + '" font-size="11" fill="#7a6fa5">' + t + "</text>" : "").join("");
  const legend = LV.map((c, i) =>
    '<rect x="' + (W - 200 + i * 22) + '" y="' + (H - 34) + '" width="14" height="14" rx="3" fill="' + c + '"/>').join("");

  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H +
'" role="img" aria-label="' + contrib.total + " contribuciones de " + USER + ' en el ultimo anio">' +
'<defs>' +
'<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0b0716"/><stop offset="100%" stop-color="#1c1036"/></linearGradient>' +
'<pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="#000" opacity="0.16"/></pattern>' +
'<clipPath id="gridclip"><rect x="' + X0 + '" y="' + Y0 + '" width="' + gridW + '" height="' + gridH + '"/></clipPath>' +
'</defs>' +
'<rect width="' + W + '" height="' + H + '" fill="url(#bg)"/>' +
'<text x="60" y="46" font-family="' + MONO + '" font-size="19" fill="#ff6fb5" letter-spacing="5">CONTINUE?</text>' +
'<text x="60" y="68" font-family="' + MONO + '" font-size="13" fill="#8f83bd">' + contrib.total + ' contribuciones en el ultimo a&#241;o</text>' +
'<text x="' + (W - 60) + '" y="46" text-anchor="end" font-family="' + MONO + '" font-size="12" fill="#6b6390" letter-spacing="2">' +
  days[0].date + " &#8594; " + days[days.length - 1].date + "</text>" +
'<line x1="60" y1="80" x2="' + (W - 60) + '" y2="80" stroke="#b36bff" stroke-opacity="0.28" stroke-width="2"/>' +
months + dayLabels +
"<g>" + cells + "</g>" +
'<g clip-path="url(#gridclip)"><rect x="' + X0 + '" y="' + Y0 + '" width="90" height="' + gridH + '" fill="#ffffff" opacity="0.07">' +
'<animate attributeName="x" values="' + (X0 - 90) + ";" + (X0 + gridW) + '" dur="4.5s" repeatCount="indefinite"/></rect></g>' +
'<text x="' + (W - 214) + '" y="' + (H - 23) + '" text-anchor="end" font-family="' + MONO + '" font-size="11" fill="#7a6fa5">MENOS</text>' +
legend +
'<text x="' + (W - 200 + 5 * 22 + 6) + '" y="' + (H - 23) + '" font-family="' + MONO + '" font-size="11" fill="#7a6fa5">MAS</text>' +
'<rect width="' + W + '" height="' + H + '" fill="url(#scan)"/>' +
'<rect x="2" y="2" width="' + (W - 4) + '" height="' + (H - 4) + '" fill="none" stroke="#b36bff" stroke-opacity="0.45" stroke-width="4"/>' +
"</svg>";
}

(async () => {
  const fs0 = require("fs");
  // --contrib: genera solo el grid (no toca la API, sirve para probar sin token)
  if (process.argv.includes("--contrib")) {
    const c = await contributions();
    fs0.mkdirSync(OUT, { recursive: true });
    fs0.writeFileSync(OUT + "/contrib.svg", contribSvg(c));
    return console.log("ok -> " + OUT + "/contrib.svg  (" + c.total + " contribuciones, " + c.days.length + " dias)");
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
  const top = Object.entries(bytes).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([name, v], i) => ({ name, pct: (v / total) * 100, color: readable(LANG_COLOR[name], i) }));
  const shown = top.reduce((a, l) => a + l.pct, 0);
  if (shown < 99.5) top.push({ name: "Otros", pct: 100 - shown, color: "#4a4370" });

  const years = ((Date.now() - new Date(user.created_at)) / 31557600000).toFixed(1);
  const W = 1200, H = 300;
  const boxes = [
    { n: own.length, l: "REPOS" },
    { n: contrib.total, l: "CONTRIBUCIONES" },
    { n: user.followers, l: "SEGUIDORES" },
    { n: years, l: "AÑOS EN GITHUB" },
  ];
  const bw = 258, gap = 20, x0 = (W - (bw * 4 + gap * 3)) / 2;
  const boxSvg = boxes.map((b, i) => {
    const x = x0 + i * (bw + gap);
    return '<g><rect x="' + x + '" y="76" width="' + bw + '" height="92" rx="6" fill="#150d2b" stroke="#b36bff" stroke-opacity="0.4" stroke-width="2"/>' +
      '<text x="' + (x + bw / 2) + '" y="126" text-anchor="middle" font-family="' + MONO + '" font-size="38" font-weight="bold" fill="#ffd76b">' + b.n + "</text>" +
      '<text x="' + (x + bw / 2) + '" y="152" text-anchor="middle" font-family="' + MONO + '" font-size="12" fill="#8f83bd" letter-spacing="2">' + b.l + "</text></g>";
  }).join("");

  const barX = 60, barW = W - 120, barY = 200;
  let acc = 0;
  const bar = top.map((l) => {
    const w = (l.pct / 100) * barW, x = barX + acc;
    acc += w;
    return '<rect x="' + x.toFixed(1) + '" y="' + barY + '" width="' + Math.max(w, 0).toFixed(1) + '" height="18" fill="' + l.color + '"/>';
  }).join("");
  const legCols = 4, legW = barW / legCols;
  const legend = top.map((l, i) => {
    const x = barX + (i % legCols) * legW, y = barY + 48 + Math.floor(i / legCols) * 26;
    return '<g><rect x="' + x + '" y="' + (y - 10) + '" width="11" height="11" rx="2" fill="' + l.color + '"/>' +
      '<text x="' + (x + 19) + '" y="' + y + '" font-family="' + MONO + '" font-size="13" fill="#ded7f5">' +
      esc(l.name) + ' <tspan fill="#8f83bd">' + l.pct.toFixed(1) + "%</tspan></text></g>";
  }).join("");

  const stats = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H +
'" role="img" aria-label="Estadisticas de GitHub de ' + USER + '">' +
'<defs>' +
'<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0b0716"/><stop offset="100%" stop-color="#1c1036"/></linearGradient>' +
'<pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="#000" opacity="0.18"/></pattern>' +
'</defs>' +
'<rect width="' + W + '" height="' + H + '" fill="url(#bg)"/>' +
'<text x="60" y="48" font-family="' + MONO + '" font-size="19" fill="#ff6fb5" letter-spacing="5">' + USER.toUpperCase() + "</text>" +
'<text x="' + (W - 60) + '" y="48" text-anchor="end" font-family="' + MONO + '" font-size="12" fill="#6b6390" letter-spacing="2">ACTUALIZADO ' +
  new Date().toISOString().slice(0, 10) + "</text>" +
'<line x1="60" y1="60" x2="' + (W - 60) + '" y2="60" stroke="#b36bff" stroke-opacity="0.3" stroke-width="2"/>' +
boxSvg +
'<text x="60" y="' + (barY - 12) + '" font-family="' + MONO + '" font-size="13" fill="#8f83bd" letter-spacing="3">LENGUAJES</text>' +
"<g>" + bar + "</g>" +
'<rect x="' + barX + '" y="' + barY + '" width="' + barW + '" height="18" fill="none" stroke="#0b0716" stroke-width="2"/>' +
legend +
'<rect width="' + W + '" height="' + H + '" fill="url(#scan)"/>' +
'<rect x="2" y="2" width="' + (W - 4) + '" height="' + (H - 4) + '" fill="none" stroke="#b36bff" stroke-opacity="0.45" stroke-width="4"/>' +
"</svg>";

  const fs = require("fs");
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(OUT + "/stats.svg", stats);
  fs.writeFileSync(OUT + "/contrib.svg", contribSvg(contrib));
  console.log("ok -> " + OUT + "  (" + own.length + " repos, " + contrib.total + " contribuciones, " +
    contrib.days.length + " dias, " + top.length + " langs)");
})().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
