// Genera assets/inventario.svg — las herramientas como items de inventario RPG.
//
// No existe un pack de pixel art con logos de Unity, C#, Blender o TypeScript
// (revisado: pixelarticons y la libreria de HackerNoon son iconos de UI genericos,
// y ademas van en grilla 24x24 monocromo, que romperia este sistema).
// Asi que cada icono se compone acá con las mismas primitivas y la misma paleta.
//
// Uso: node scripts/gen-inventory.js [dir-extra-para-preview]

const { PAL, text, textWidth, rect, dither, sprite } = require("./lib/pixel");

const W = 240, SCALE = 5;

// --- primitivas ---
const disc = (cx, cy, r, color) => {
  let out = "";
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y));
    if (w > 0) out += rect(cx - w, cy + y, w * 2 + 1, 1, color);
  }
  return out;
};
const ring = (cx, cy, r, color) => {
  let out = "";
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y));
    if (w <= 0) continue;
    const inner = Math.abs(y) <= r - 2 ? Math.floor(Math.sqrt((r - 2) * (r - 2) - y * y)) : -1;
    if (inner <= 0) out += rect(cx - w, cy + y, w * 2 + 1, 1, color);
    else {
      out += rect(cx - w, cy + y, w - inner, 1, color);
      out += rect(cx + inner + 1, cy + y, w - inner, 1, color);
    }
  }
  return out;
};
const box = (x, y, w, h, fill, border) =>
  rect(x, y, w, h, fill) + rect(x, y, w, 1, border) + rect(x, y + h - 1, w, 1, border)
  + rect(x, y, 1, h, border) + rect(x + w - 1, y, 1, h, border);

// texto centrado dentro de una celda de 16
const label16 = (s, ox, oy, color) => text(s, ox + Math.round((16 - textWidth(s)) / 2), oy, color);

// --- iconos, 16x16 cada uno, dibujados en (ox, oy) ---

// Unity: caja isometrica
// cara superior baja: con una tapa alta se leia como un baul, no como un cubo
const UNITY_CUBE = [
  "................",
  "....kkkkkkkk....",
  "..kksssssssskk..",
  "kkkkkkkkkkkkkkkk",
  "kttttttkwwwwwwwk",
  "kttttttkwwwwwwwk",
  "kttttttkwwwwwwwk",
  "kttttttkwwwwwwwk",
  "kttttttkwwwwwwwk",
  "kttttttkwwwwwwwk",
  "kttttttkwwwwwwwk",
  "kttttttkwwwwwwwk",
  "kttttttkwwwwwwwk",
  "kkkkkkkkkkkkkkkk",
  "................",
  "................",
];

// hexagono limpio; el que salia de una tabla de offsets se leia como una hoja
const NODE_HEX = [
  "....oooo....",
  "...oo..oo...",
  "..oo....oo..",
  ".oo......oo.",
  "oo........oo",
  "oo........oo",
  "oo........oo",
  "oo........oo",
  "oo........oo",
  ".oo......oo.",
  "..oo....oo..",
  "...oo..oo...",
  "....oooo....",
];

const ICONS = {
  // cubo 3D: lo que hacés todo el día en Unity
  UNITY: (x, y) => sprite(UNITY_CUBE, { k: PAL.ink, s: PAL.sand, t: PAL.terra, w: PAL.wine }, x, y),

  // ficha de lenguaje
  "C#": (x, y) => box(x + 1, y + 2, 14, 12, PAL.wine, PAL.terra) + label16("C#", x, y + 5, PAL.cream),

  // el logo de Blender es un anillo con un punto: se sostiene sin el color naranja
  BLENDER: (x, y) => ring(x + 8, y + 8, 7, PAL.ochre) + disc(x + 10, y + 8, 2, PAL.cream),

  // esfera sombreada: tres bandas duras, no dithering. Ditherada quedaba como una frutilla.
  SHADERS: (x, y) => {
    const R = 7;
    let s = "";
    for (let py = -R; py <= R; py++) {
      let run = null;
      for (let px = -R; px <= R + 1; px++) {
        const dentro = px * px + py * py <= R * R;
        // luz desde arriba a la izquierda
        const d = (px + 3) * 0.55 + (py + 3) * 0.75;
        const c = !dentro ? null : d < -1.2 ? PAL.cream : d < 4 ? PAL.terra : PAL.wine;
        if (run && run.c === c) run.len++;
        else {
          if (run && run.c) s += rect(x + 8 + run.x, y + 8 + py, run.len, 1, run.c);
          run = { c, x: px, len: 1 };
        }
      }
      if (run && run.c) s += rect(x + 8 + run.x, y + 8 + py, run.len, 1, run.c);
    }
    return s;
  },

  // disco con la N calada
  "NEXT.JS": (x, y) => disc(x + 8, y + 8, 7, PAL.cream) + text("N", x + 6, y + 5, PAL.ink),

  TS: (x, y) => box(x + 1, y + 2, 14, 12, PAL.teal, PAL.olive) + label16("TS", x, y + 5, PAL.cream),

  NODE: (x, y) => sprite(NODE_HEX, { o: PAL.olive }, x + 2, y + 2),

  // dos commits y una rama que sale
  GIT: (x, y) =>
    rect(x + 4, y + 3, 2, 10, PAL.terra) + rect(x + 5, y + 7, 6, 2, PAL.terra)
    + rect(x + 10, y + 7, 2, 6, PAL.terra)
    + disc(x + 5, y + 3, 2, PAL.sand) + disc(x + 5, y + 13, 2, PAL.sand)
    + disc(x + 11, y + 13, 2, PAL.ochre),
};

const ROWS = [
  ["UNITY", "C#", "BLENDER", "SHADERS"],
  ["NEXT.JS", "TS", "NODE", "GIT"],
];

const PITCH = 56, X0 = 8;
const H = 90;

let s = rect(0, 0, W, H, PAL.ink)
  + rect(0, 0, W, 1, PAL.cream) + rect(0, H - 1, W, 1, PAL.cream)
  + rect(0, 0, 1, H, PAL.cream) + rect(W - 1, 0, 1, H, PAL.cream)
  + rect(2, 2, W - 4, 1, PAL.plum) + rect(2, H - 3, W - 4, 1, PAL.plum);

s += text("INVENTARIO", 8, 7, PAL.cream);
s += text("JUEGOS / WEB", W - 8 - textWidth("JUEGOS / WEB"), 7, PAL.plum);
s += rect(8, 17, W - 16, 1, PAL.plum);

ROWS.forEach((row, r) => {
  const boxY = 21 + r * 35;
  row.forEach((name, c) => {
    const cell = X0 + c * PITCH;
    const bx = cell + Math.round((PITCH - 20) / 2);
    s += box(bx, boxY, 20, 20, PAL.plum, PAL.wine);
    s += ICONS[name](bx + 2, boxY + 2);
    const lw = textWidth(name);
    s += text(name, cell + Math.round((PITCH - lw) / 2), boxY + 23, PAL.sand);
  });
});

const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" width="' + W * SCALE +
  '" height="' + H * SCALE + '" shape-rendering="crispEdges" role="img" ' +
  'aria-label="Herramientas: Unity, C#, Blender, shaders, Next.js, TypeScript, Node y Git">' +
  s + "</svg>";

const fs = require("fs");
fs.mkdirSync("assets", { recursive: true });
fs.writeFileSync("assets/inventario.svg", svg);
if (process.argv[2]) fs.writeFileSync(process.argv[2] + "/inventario.svg", svg);
console.log("assets/inventario.svg  " + (svg.length / 1024).toFixed(1) + " KB");
