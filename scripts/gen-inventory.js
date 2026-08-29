// Genera assets/inventario.svg — las herramientas como items de inventario RPG.
//
// No existe un pack de pixel art con logos de Unity, C#, Blender o TypeScript
// (pixelarticons y la libreria de HackerNoon son iconos de UI genericos, y ademas
// van en grilla 24x24 monocromo, que romperia este sistema). Asi que cada icono
// se compone acá con las mismas primitivas y la misma paleta de nueve colores.
//
// Los iconos son de 24x24. Con 20x20 el logo de Blender no entraba: el cuerpo
// anular necesita al menos 3px de naranja, 2 de blanco y 3 de radio azul.
//
// Uso: node scripts/gen-inventory.js [dir-extra-para-preview]

const { PAL, text, textWidth, rect, sprite, disc, quad, line, dilate } = require("./lib/pixel");

const W = 240, SCALE = 5, ICON = 24, SLOT = 28, PITCH = 56, X0 = 8;

const box = (x, y, w, h, fill, border) =>
  rect(x, y, w, h, fill) + rect(x, y, w, 1, border) + rect(x, y + h - 1, w, 1, border)
  + rect(x, y, 1, h, border) + rect(x + w - 1, y, 1, h, border);

const centrado = (s, ox, oy, color, scale = 1) =>
  text(s, ox + Math.round((ICON - textWidth(s, scale)) / 2), oy, color, scale);

// --- Unity: cubo isometrico con las muescas y el 6 ---
const T = [10, 1], L = [0, 7], R = [19, 7], C = [10, 13], LB = [0, 17], RB = [19, 17], B = [10, 23];
const cubo = (x, y) =>
  quad([T, R, C, L], PAL.cream, x, y)      // cara de arriba
  + quad([L, C, B, LB], PAL.wine, x, y)    // cara izquierda, en sombra
  + quad([R, RB, B, C], PAL.teal, x, y);   // cara derecha

// las muescas recortadas en cada cara son lo que define la marca
// El rombo de arriba tiene que ser simetrico respecto del centro de la cara:
// al escalarlo de 20 a 24 el redondeo lo dejo torcido y se leia como una cruz.
const muescas = (x, y) =>
  quad([[10, 5], [15, 8], [10, 11], [5, 8]], PAL.sand, x, y)
  + quad([[3, 11], [7, 13], [7, 18], [3, 16]], PAL.ink, x, y)
  + quad([[13, 13], [17, 11], [17, 16], [13, 18]], PAL.ink, x, y);

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

// --- Blender ---
// No es "un anillo con un gancho": es un cuerpo anular grueso (naranja / blanco /
// azul) mas una flecha que apunta a la derecha —formada por el brazo diagonal de
// arriba y la barra horizontal— y una cola larga que baja hacia la izquierda.
// Proporciones medidas sobre el logo real, con el ancho como unidad:
//   cuerpo centro (0.65, 0.53) radio 0.35 · ojo blanco 0.21 · azul 0.135
//   punta de la flecha en (0.62, 0.21) · brazos de 0.10 de grosor
// Todo el naranja va primero y el ojo encima.
const blenderIcon = (x, y) => {
  const CX = 15, CY = 13;
  let s = disc(x + CX, y + CY, 8, PAL.ochre);              // cuerpo
  s += line(x + 11, y + 2, x + 15, y + 6, 3, PAL.ochre);   // brazo de arriba
  s += rect(x + 0, y + 6, 15, 3, PAL.ochre);               // barra horizontal
  s += line(x + 9, y + 9, x + 1, y + 17, 3, PAL.ochre);    // cola
  s += disc(x + CX, y + CY, 5, PAL.cream);                 // ojo
  s += disc(x + CX, y + CY, 3, PAL.teal);
  return s;
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

const ICONS = {
  UNITY: (x, y) => cubo(x, y) + muescas(x, y) + seis(x + 14, y + 12),

  "C#": (x, y) => box(x + 2, y + 5, 20, 14, PAL.wine, PAL.terra) + centrado("C#", x, y + 9, PAL.cream),

  BLENDER: blenderIcon,

  // esfera con tres bandas duras; ditherada quedaba como una frutilla
  SHADERS: (x, y) => {
    const R = 11;
    let s = "";
    for (let py = -R; py <= R; py++) {
      let run = null;
      for (let px = -R; px <= R + 1; px++) {
        const dentro = px * px + py * py <= R * R;
        const d = (px + 5) * 0.45 + (py + 5) * 0.62; // luz desde arriba a la izquierda
        const c = !dentro ? null : d < -1 ? PAL.cream : d < 6 ? PAL.terra : PAL.wine;
        if (run && run.c === c) run.len++;
        else {
          if (run && run.c) s += rect(x + 12 + run.x, y + 12 + py, run.len, 1, run.c);
          run = { c, x: px, len: 1 };
        }
      }
      if (run && run.c) s += rect(x + 12 + run.x, y + 12 + py, run.len, 1, run.c);
    }
    return s;
  },

  "NEXT.JS": (x, y) => disc(x + 12, y + 12, 11, PAL.cream) + centrado("N", x, y + 5, PAL.ink, 2),

  TS: (x, y) => box(x + 2, y + 5, 20, 14, PAL.teal, PAL.olive) + centrado("TS", x, y + 9, PAL.cream),

  NODE: (x, y) => sprite(NODE_HEX, { o: PAL.olive }, x + 4, y + 4),

  GIT: (x, y) =>
    rect(x + 6, y + 5, 3, 14, PAL.terra) + rect(x + 7, y + 11, 9, 3, PAL.terra)
    + rect(x + 15, y + 11, 3, 8, PAL.terra)
    + disc(x + 7, y + 5, 4, PAL.sand) + disc(x + 7, y + 19, 4, PAL.sand)
    + disc(x + 16, y + 19, 4, PAL.ochre),
};

const ROWS = [
  ["UNITY", "C#", "BLENDER", "SHADERS"],
  ["NEXT.JS", "TS", "NODE", "GIT"],
];
const H = 105;

let s = rect(0, 0, W, H, PAL.ink)
  + rect(0, 0, W, 1, PAL.cream) + rect(0, H - 1, W, 1, PAL.cream)
  + rect(0, 0, 1, H, PAL.cream) + rect(W - 1, 0, 1, H, PAL.cream)
  + rect(2, 2, W - 4, 1, PAL.plum) + rect(2, H - 3, W - 4, 1, PAL.plum);

s += text("INVENTARIO", 8, 7, PAL.cream);
s += text("JUEGOS / WEB", W - 8 - textWidth("JUEGOS / WEB"), 7, PAL.plum);
s += rect(8, 17, W - 16, 1, PAL.plum);

ROWS.forEach((row, r) => {
  const boxY = 21 + r * 42;
  row.forEach((name, c) => {
    const cell = X0 + c * PITCH;
    const bx = cell + Math.round((PITCH - SLOT) / 2);
    // el fondo del slot va en ink: con plum se comia la cara izquierda del cubo
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
console.log("assets/inventario.svg  " + (svg.length / 1024).toFixed(1) + " KB  (iconos " + ICON + "x" + ICON + ")");
