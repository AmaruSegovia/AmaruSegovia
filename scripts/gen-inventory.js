// Genera assets/inventario.svg — las herramientas como items de inventario RPG.
//
// No existe un pack de pixel art con logos de Unity, C#, Blender o TypeScript
// (pixelarticons y la libreria de HackerNoon son iconos de UI genericos, y ademas
// van en grilla 24x24 monocromo, que romperia este sistema). Asi que cada icono
// se compone acá con las mismas primitivas y la misma paleta de nueve colores.
//
// Los iconos son de 20x20: con 16x16 no entraban ni el brazo de Blender ni las
// muescas del cubo de Unity.
//
// Uso: node scripts/gen-inventory.js [dir-extra-para-preview]

const { PAL, text, textWidth, rect, sprite, disc, ring, quad, dilate } = require("./lib/pixel");

const W = 240, SCALE = 5, ICON = 20, SLOT = 24, PITCH = 56, X0 = 8;

const box = (x, y, w, h, fill, border) =>
  rect(x, y, w, h, fill) + rect(x, y, w, 1, border) + rect(x, y + h - 1, w, 1, border)
  + rect(x, y, 1, h, border) + rect(x + w - 1, y, 1, h, border);

const centrado = (s, ox, oy, color, scale = 1) =>
  text(s, ox + Math.round((ICON - textWidth(s, scale)) / 2), oy, color, scale);

// --- Unity: cubo isometrico con las muescas ---
// El cubo va corrido a la izquierda para dejarle lugar al 6 abajo a la derecha,
// como en el logo de Unity 6.
const T = [8, 1], L = [0, 6], R = [16, 6], C = [8, 11], LB = [0, 14], RB = [16, 14], B = [8, 19];
const cubo = (x, y) =>
  quad([T, R, C, L], PAL.cream, x, y)      // cara de arriba
  + quad([L, C, B, LB], PAL.wine, x, y)    // cara izquierda, en sombra
  + quad([R, RB, B, C], PAL.teal, x, y);   // cara derecha

// las muescas recortadas en cada cara son lo que define la marca
const muescas = (x, y) =>
  quad([[8, 4], [12, 6], [8, 8], [4, 6]], PAL.sand, x, y)
  + quad([[2, 8], [5, 10], [5, 15], [2, 13]], PAL.ink, x, y)
  + quad([[11, 10], [14, 8], [14, 13], [11, 15]], PAL.ink, x, y);

// el 6 va aparte, como en el logo de Unity 6
const SEIS = [
  "..oooo.",
  ".oo..oo",
  "oo.....",
  "oo.....",
  "oooooo.",
  "oo...oo",
  "oo...oo",
  "oo...oo",
  ".ooooo.",
];
const seis = (x, y) =>
  sprite(dilate(SEIS, "k"), { k: PAL.ink, o: PAL.ink }, x - 1, y - 1)
  + sprite(SEIS, { o: PAL.cream }, x, y);

// --- Blender: el anillo con el ojo, mas el brazo terminado en punta ---
// El brazo va dibujado pixel por pixel: compuesto con rects se fusionaba
// con el anillo y quedaba una sola mancha naranja.
const BRAZO = [
  "..............oo..",
  "............oooo..",
  "..oooooooooooooo..",
  "..oooooooooooo....",
  "..ooo...ooooo.....",
  "..ooo.............",
  "..oooo............",
  "...ooo............",
];

const ICONS = {
  UNITY: (x, y) => cubo(x, y) + muescas(x, y) + seis(x + 12, y + 10),

  "C#": (x, y) => box(x + 1, y + 3, 18, 14, PAL.wine, PAL.terra) + centrado("C#", x, y + 7, PAL.cream),

  BLENDER: (x, y) =>
    sprite(BRAZO, { o: PAL.ochre }, x + 1, y + 1)
    + ring(x + 11, y + 13, 6, 3, PAL.ochre)
    + disc(x + 11, y + 13, 3, PAL.cream)
    + disc(x + 11, y + 13, 2, PAL.teal),

  // esfera con tres bandas duras; ditherada quedaba como una frutilla
  SHADERS: (x, y) => {
    const R = 9;
    let s = "";
    for (let py = -R; py <= R; py++) {
      let run = null;
      for (let px = -R; px <= R + 1; px++) {
        const dentro = px * px + py * py <= R * R;
        const d = (px + 4) * 0.5 + (py + 4) * 0.7; // luz desde arriba a la izquierda
        const c = !dentro ? null : d < -1 ? PAL.cream : d < 5 ? PAL.terra : PAL.wine;
        if (run && run.c === c) run.len++;
        else {
          if (run && run.c) s += rect(x + 10 + run.x, y + 10 + py, run.len, 1, run.c);
          run = { c, x: px, len: 1 };
        }
      }
      if (run && run.c) s += rect(x + 10 + run.x, y + 10 + py, run.len, 1, run.c);
    }
    return s;
  },

  "NEXT.JS": (x, y) => disc(x + 10, y + 10, 9, PAL.cream) + centrado("N", x, y + 3, PAL.ink, 2),

  TS: (x, y) => box(x + 1, y + 3, 18, 14, PAL.teal, PAL.olive) + centrado("TS", x, y + 7, PAL.cream),

  NODE: (x, y) => sprite(NODE_HEX, { o: PAL.olive }, x + 2, y + 1),

  GIT: (x, y) =>
    rect(x + 5, y + 4, 2, 12, PAL.terra) + rect(x + 6, y + 9, 8, 2, PAL.terra)
    + rect(x + 13, y + 9, 2, 7, PAL.terra)
    + disc(x + 6, y + 4, 3, PAL.sand) + disc(x + 6, y + 16, 3, PAL.sand)
    + disc(x + 14, y + 16, 3, PAL.ochre),
};

const NODE_HEX = [
  ".....oooooo.....",
  "....oo....oo....",
  "...oo......oo...",
  "..oo........oo..",
  ".oo..........oo.",
  "oo............oo",
  "oo............oo",
  "oo............oo",
  "oo............oo",
  "oo............oo",
  "oo............oo",
  ".oo..........oo.",
  "..oo........oo..",
  "...oo......oo...",
  "....oo....oo....",
  ".....oooooo.....",
];

const ROWS = [
  ["UNITY", "C#", "BLENDER", "SHADERS"],
  ["NEXT.JS", "TS", "NODE", "GIT"],
];
const H = 95;

let s = rect(0, 0, W, H, PAL.ink)
  + rect(0, 0, W, 1, PAL.cream) + rect(0, H - 1, W, 1, PAL.cream)
  + rect(0, 0, 1, H, PAL.cream) + rect(W - 1, 0, 1, H, PAL.cream)
  + rect(2, 2, W - 4, 1, PAL.plum) + rect(2, H - 3, W - 4, 1, PAL.plum);

s += text("INVENTARIO", 8, 7, PAL.cream);
s += text("JUEGOS / WEB", W - 8 - textWidth("JUEGOS / WEB"), 7, PAL.plum);
s += rect(8, 17, W - 16, 1, PAL.plum);

ROWS.forEach((row, r) => {
  const boxY = 21 + r * 37;
  row.forEach((name, c) => {
    const cell = X0 + c * PITCH;
    const bx = cell + Math.round((PITCH - SLOT) / 2);
    s += box(bx, boxY, SLOT, SLOT, PAL.ink, PAL.wine);
    s += ICONS[name](bx + 2, boxY + 2);
    s += text(name, cell + Math.round((PITCH - textWidth(name)) / 2), boxY + SLOT + 3, PAL.sand);
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
