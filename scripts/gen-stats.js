// Genera stats.svg desde la API de GitHub. Sin servicios externos.
// Uso: node scripts/gen-stats.js <dir-salida>
const USER = "AmaruSegovia";
const OUT = process.argv[2] || "dist";
const TOKEN = process.env.GITHUB_TOKEN || "";

const LANG_COLOR = {
  "C#":"#178600","TypeScript":"#3178c6","JavaScript":"#f1e05a","ShaderLab":"#222c37",
  "Processing":"#0096D8","HTML":"#e34c26","CSS":"#663399","EJS":"#a91e50","Java":"#b07219",
  "C++":"#f34b7d","C":"#555555","Python":"#3572A5","ASP.NET":"#9400ff","SCSS":"#c6538c",
  "HLSL":"#aace60","ShaderLab ":"#222c37","Batchfile":"#C1F12E","Shell":"#89e051",
};
const FALLBACK = ["#b36bff","#ff6fb5","#ffd76b","#5ad2ff","#7bdc8f","#ff9d6b","#c0a8ff","#8f83bd"];

const api = async (p) => {
  const r = await fetch("https://api.github.com" + p, {
    headers: { "User-Agent": "profile-stats", Accept: "application/vnd.github+json",
      ...(TOKEN ? { Authorization: "Bearer " + TOKEN } : {}) },
  });
  if (!r.ok) throw new Error(p + " -> " + r.status);
  return r.json();
};
// varios colores oficiales de lenguajes son casi negros: los reemplazo por la paleta
const readable = (hex, i) => {
  if (!hex) return FALLBACK[i % FALLBACK.length];
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.2126*((n>>16)&255) + 0.7152*((n>>8)&255) + 0.0722*(n&255)) / 255;
  return lum < 0.22 ? FALLBACK[i % FALLBACK.length] : hex;
};
const esc = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const MONO = `ui-monospace,'DejaVu Sans Mono','Courier New',monospace`;

(async () => {
  const user = await api(`/users/${USER}`);
  let repos = [], page = 1;
  for (;;) {
    const b = await api(`/users/${USER}/repos?per_page=100&page=${page}`);
    repos = repos.concat(b); if (b.length < 100) break; page++;
  }
  const own = repos.filter((r) => !r.fork);
  const stars = own.reduce((a, r) => a + r.stargazers_count, 0);

  // bytes por lenguaje
  const bytes = {};
  for (const r of own) {
    try {
      const l = await api(`/repos/${USER}/${r.name}/languages`);
      for (const [k, v] of Object.entries(l)) bytes[k] = (bytes[k] || 0) + v;
    } catch (e) {
      await new Promise((r2) => setTimeout(r2, 1500));
      const l = await api(`/repos/${USER}/${r.name}/languages`); // si vuelve a fallar, corta: mejor eso que publicar porcentajes falsos
      for (const [k, v] of Object.entries(l)) bytes[k] = (bytes[k] || 0) + v;
    }
  }
  const total = Object.values(bytes).reduce((a, b) => a + b, 0) || 1;
  const top = Object.entries(bytes).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([name, v], i) => ({ name, pct: (v / total) * 100, color: readable(LANG_COLOR[name], i) }));
  const shown = top.reduce((a, l) => a + l.pct, 0);
  if (shown < 99.5) top.push({ name: "Otros", pct: 100 - shown, color: "#4a4370" });

  const years = ((Date.now() - new Date(user.created_at)) / 31557600000).toFixed(1);
  const W = 1200, H = 300;
  const boxes = [
    { n: own.length, l: "REPOS" }, { n: stars, l: "STARS" },
    { n: user.followers, l: "SEGUIDORES" }, { n: years, l: "AÑOS EN GITHUB" },
  ];
  const bw = 258, gap = 20, x0 = (W - (bw * 4 + gap * 3)) / 2;
  const boxSvg = boxes.map((b, i) => {
    const x = x0 + i * (bw + gap);
    return `<g><rect x="${x}" y="76" width="${bw}" height="92" rx="6" fill="#150d2b" stroke="#b36bff" stroke-opacity="0.4" stroke-width="2"/>`
      + `<text x="${x + bw/2}" y="126" text-anchor="middle" font-family="${MONO}" font-size="38" font-weight="bold" fill="#ffd76b">${b.n}</text>`
      + `<text x="${x + bw/2}" y="152" text-anchor="middle" font-family="${MONO}" font-size="12" fill="#8f83bd" letter-spacing="2">${b.l}</text></g>`;
  }).join("");

  const barX = 60, barW = W - 120, barY = 200;
  let acc = 0;
  const bar = top.map((l) => {
    const w = (l.pct / 100) * barW, x = barX + acc; acc += w;
    return `<rect x="${x.toFixed(1)}" y="${barY}" width="${Math.max(w,0).toFixed(1)}" height="18" fill="${l.color}"/>`;
  }).join("");

  const legCols = 4, legW = barW / legCols;
  const legend = top.map((l, i) => {
    const x = barX + (i % legCols) * legW, y = barY + 48 + Math.floor(i / legCols) * 26;
    return `<g><rect x="${x}" y="${y - 10}" width="11" height="11" rx="2" fill="${l.color}"/>`
      + `<text x="${x + 19}" y="${y}" font-family="${MONO}" font-size="13" fill="#ded7f5">${esc(l.name)} <tspan fill="#8f83bd">${l.pct.toFixed(1)}%</tspan></text></g>`;
  }).join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Estadisticas de GitHub de ${USER}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0b0716"/><stop offset="100%" stop-color="#1c1036"/></linearGradient>
<pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="#000" opacity="0.18"/></pattern>
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<text x="60" y="48" font-family="${MONO}" font-size="19" fill="#ff6fb5" letter-spacing="5">${USER.toUpperCase()}</text>
<text x="${W-60}" y="48" text-anchor="end" font-family="${MONO}" font-size="12" fill="#6b6390" letter-spacing="2">ACTUALIZADO ${new Date().toISOString().slice(0,10)}</text>
<line x1="60" y1="60" x2="${W-60}" y2="60" stroke="#b36bff" stroke-opacity="0.3" stroke-width="2"/>
${boxSvg}
<text x="60" y="${barY-12}" font-family="${MONO}" font-size="13" fill="#8f83bd" letter-spacing="3">LENGUAJES</text>
<g>${bar}</g>
<rect x="${barX}" y="${barY}" width="${barW}" height="18" fill="none" stroke="#0b0716" stroke-width="2"/>
${legend}
<rect width="${W}" height="${H}" fill="url(#scan)"/>
<rect x="2" y="2" width="${W-4}" height="${H-4}" fill="none" stroke="#b36bff" stroke-opacity="0.45" stroke-width="4"/>
</svg>`;
  require("fs").mkdirSync(OUT, { recursive: true });
  require("fs").writeFileSync(OUT + "/stats.svg", svg);
  console.log(`stats.svg listo -> ${OUT}  (${own.length} repos, ${stars} stars, ${top.length} langs)`);
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });
