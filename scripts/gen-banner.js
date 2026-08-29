// Genera assets/banner.svg — pantalla de titulo arcade. Todo self-hosted, sin fuentes externas:
// el titulo se dibuja como pixeles (rects) para que se vea igual en cualquier lado.
// Uso: node scripts/gen-banner.js [dir-extra-para-preview]

const FONT = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  M: ["10001", "11011", "10101", "10001", "10001", "10001", "10001"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

// junta pixeles contiguos en un solo rect: menos nodos, archivo mas chico
function runs(rows, w) {
  const out = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < w) {
      const ch = row[x];
      if (ch && ch !== "0" && ch !== ".") {
        let len = 0;
        while (x + len < w && row[x + len] === ch) len++;
        out.push({ x, y, len, ch });
        x += len;
      } else x++;
    }
  });
  return out;
}

function pixelText(text, scale) {
  const cols = Array.from({ length: 7 }, () => "");
  [...text].forEach((c, ci) => {
    const g = FONT[c];
    if (!g) throw new Error("sin glifo: " + c);
    for (let r = 0; r < 7; r++) cols[r] += g[r] + (ci < text.length - 1 ? "0" : "");
  });
  const w = cols[0].length;
  const body = runs(cols, w).map((r) =>
    '<rect x="' + r.x * scale + '" y="' + r.y * scale + '" width="' + r.len * scale + '" height="' + scale + '"/>').join("");
  return { body, width: w * scale, height: 7 * scale };
}

// mate con bombilla — 16x16
const MATE = [
  ".............bb.",
  "............bb..",
  "...........bb...",
  "..........bb....",
  "....kkkkkkbk....",
  "...kgggggggk....",
  "...kGgggggGk....",
  "..kmmmmmmmmmk...",
  "..kMMMMMMMMMk...",
  ".kMMMMMMMMMMDk..",
  ".kMMMMMMMMMMDk..",
  ".kMMMMMMMMMMDk..",
  "..kMMMMMMMMDk...",
  "..kkMMMMMMkk....",
  "...kkmmmmkk.....",
  "....kkkkkk......",
];
const PAL = {
  k: "#120d1e", // contorno
  b: "#c9d1d9", // bombilla
  g: "#6aa84f", // yerba
  G: "#3f6b2a", // yerba en sombra
  m: "#a8703f", // borde de la calabaza
  M: "#7a4a24", // cuerpo
  D: "#4f2f16", // sombra del cuerpo
};

const mate = (sc) => runs(MATE, 16).map((r) =>
  '<rect x="' + r.x * sc + '" y="' + r.y * sc + '" width="' + r.len * sc + '" height="' + sc + '" fill="' + PAL[r.ch] + '"/>').join("");

// vapor saliendo de la yerba
function steam(sc) {
  const wisps = [[4, -1, 0], [6, -2, 0.9], [8, -1, 1.8]];
  return wisps.map(([cx, cy, delay]) => {
    const x = cx * sc, y = cy * sc, s = Math.round(sc * 0.6);
    return '<rect x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" rx="1" fill="#d8cff0" opacity="0">' +
      '<animate attributeName="opacity" values="0;0.55;0.35;0" dur="2.6s" begin="' + delay + 's" repeatCount="indefinite"/>' +
      '<animate attributeName="y" values="' + y + ";" + (y - sc * 3.5) + '" dur="2.6s" begin="' + delay + 's" repeatCount="indefinite"/>' +
      "</rect>";
  }).join("");
}

// PRNG con semilla para que la salida sea reproducible
let seed = 20260829;
const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;

const W = 1200, H = 300;
let stars = "";
for (let i = 0; i < 70; i++) {
  const x = Math.round(rnd() * W), y = Math.round(rnd() * (H - 70));
  const s = rnd() > 0.86 ? 3 : 2;
  stars += '<rect x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" fill="#a394e8" opacity="0.5">' +
    '<animate attributeName="opacity" values="0.12;0.85;0.12" dur="' + (2 + rnd() * 3).toFixed(2) +
    's" begin="' + (rnd() * 4).toFixed(2) + 's" repeatCount="indefinite"/></rect>';
}

const T = pixelText("AMARU SEGOVIA", 8);
const tx = Math.round((W - T.width) / 2), ty = 62;
const SC = 6, spX = 78, spY = H - 16 * SC - 22;

const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" width="' + W + '" height="' + H +
'" role="img" aria-label="Amaru Segovia — Game Developer y Frontend Developer">' +
'<defs>' +
'<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#08050f"/><stop offset="50%" stop-color="#170e2f"/><stop offset="100%" stop-color="#33155f"/></linearGradient>' +
'<linearGradient id="ttlg" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0%" stop-color="#fff2b8"/><stop offset="35%" stop-color="#ffc46b"/><stop offset="70%" stop-color="#ff6fb5"/><stop offset="100%" stop-color="#a06bff"/></linearGradient>' +
'<radialGradient id="glow" cx="50%" cy="30%" r="65%"><stop offset="0%" stop-color="#c78bff" stop-opacity="0.34"/><stop offset="100%" stop-color="#c78bff" stop-opacity="0"/></radialGradient>' +
'<pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="2" fill="#000" opacity="0.24"/></pattern>' +
'<pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0 L0 0 0 48" fill="none" stroke="#c78bff" stroke-opacity="0.22" stroke-width="1"/></pattern>' +
'</defs>' +
'<rect width="' + W + '" height="' + H + '" fill="url(#sky)"/>' +
'<rect y="' + (H - 96) + '" width="' + W + '" height="96" fill="url(#grid)"/>' +
"<g>" + stars + "</g>" +
'<rect width="' + W + '" height="' + H + '" fill="url(#glow)"/>' +
'<g transform="translate(' + (tx + 5) + " " + (ty + 6) + ')" fill="#4c1d7a" opacity="0.85">' + T.body + "</g>" +
'<g transform="translate(' + tx + " " + ty + ')" fill="url(#ttlg)">' + T.body + "</g>" +
'<text x="' + W / 2 + '" y="' + (ty + T.height + 40) + '" text-anchor="middle" font-family="' + "ui-monospace,'DejaVu Sans Mono','Courier New',monospace" +
'" font-size="21" fill="#ded7f5" letter-spacing="5">GAME DEVELOPER &#215; FRONTEND DEVELOPER</text>' +
'<text x="' + W / 2 + '" y="' + (ty + T.height + 72) + '" text-anchor="middle" font-family="' + "ui-monospace,'DejaVu Sans Mono','Courier New',monospace" +
'" font-size="15" fill="#8f83bd" letter-spacing="3">UNITY &#183; C# &#183; BLENDER &#183; NEXT.JS</text>' +
'<text x="' + W / 2 + '" y="' + (H - 28) + '" text-anchor="middle" font-family="' + "ui-monospace,'DejaVu Sans Mono','Courier New',monospace" +
'" font-size="17" fill="#ffd76b" letter-spacing="4">&#9654; PRESS START' +
'<animate attributeName="opacity" values="1;1;0;0" dur="1.3s" calcMode="discrete" repeatCount="indefinite"/></text>' +
'<g transform="translate(' + spX + " " + spY + ')">' + steam(SC) + mate(SC) + "</g>" +
'<text x="' + (W - 40) + '" y="' + (H - 28) + '" text-anchor="end" font-family="' + "ui-monospace,'DejaVu Sans Mono','Courier New',monospace" +
'" font-size="13" fill="#7a6fa5" letter-spacing="2">JUJUY &#183; ARGENTINA</text>' +
'<text x="40" y="42" font-family="' + "ui-monospace,'DejaVu Sans Mono','Courier New',monospace" +
'" font-size="13" fill="#7a6fa5" letter-spacing="2">PLAYER 1</text>' +
'<rect width="' + W + '" height="' + H + '" fill="url(#scan)"/>' +
'<rect width="' + W + '" height="46" fill="#ffffff" opacity="0.04"><animate attributeName="y" values="-46;' + H + '" dur="6s" repeatCount="indefinite"/></rect>' +
'<rect x="2" y="2" width="' + (W - 4) + '" height="' + (H - 4) + '" fill="none" stroke="#c78bff" stroke-opacity="0.5" stroke-width="4"/>' +
'<rect x="8" y="8" width="' + (W - 16) + '" height="' + (H - 16) + '" fill="none" stroke="#ff6fb5" stroke-opacity="0.18" stroke-width="1"/>' +
"</svg>";

const fs = require("fs");
fs.mkdirSync("assets", { recursive: true });
fs.writeFileSync("assets/banner.svg", svg);
if (process.argv[2]) fs.writeFileSync(process.argv[2] + "/banner-preview.svg", svg);
console.log("assets/banner.svg  " + (svg.length / 1024).toFixed(1) + " KB");
