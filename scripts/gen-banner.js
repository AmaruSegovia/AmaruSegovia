// Genera assets/banner.svg — pantalla de titulo arcade.
//
// Grilla de 240x80 pixeles logicos, escalada x5 (1200x400).
// Sin degrades ni glows: areas planas con transiciones ditheradas, y todo el texto en bitmap.
// Ver scripts/lib/pixel.js para las reglas.
//
// Uso: node scripts/gen-banner.js [dir-extra-para-preview]
//
// OJO: si cambias el banner, subi el ?v= de la URL en el README. GitHub lo sirve por
// su proxy Camo, que cachea por URL, y sin eso el perfil sigue mostrando el viejo.

const { PAL, text, textCentered, textWidth, rect, dither, sprite } = require("./lib/pixel");

const W = 240, H = 84, SCALE = 5;
const HORIZON = 44, GROUND_Y = 62;

// --- cielo ---
// Planos con franjas ditheradas solo en las uniones: asi lo hace el pixel art de verdad,
// y de paso el archivo pesa la mitad que ditherando todo.
const BANDS = [
  { to: 17, color: PAL.ink },
  { to: 28, color: PAL.plum },
  { to: 36, color: PAL.wine },
  { to: HORIZON, color: PAL.terra },
];
let sky = "";
let prevTo = 0, prevColor = PAL.ink;
for (const b of BANDS) {
  sky += rect(0, prevTo, W, b.to - prevTo, b.color);
  if (prevTo > 0) {
    const th = 6, ty = prevTo - Math.floor(th / 2);
    sky += dither(0, ty, W, th, prevColor, b.color, (x, y) => y / (th - 1));
  }
  prevTo = b.to; prevColor = b.color;
}
sky += dither(0, HORIZON - 5, W, 5, PAL.terra, PAL.ochre, (x, y) => y / 4);

// --- estrellas: solo arriba, donde el cielo esta oscuro ---
let seed = 20260829;
const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
let stars = "";
for (let i = 0; i < 62; i++) {
  const x = Math.floor(rnd() * W), y = Math.floor(rnd() * 27);
  stars += '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + (rnd() > 0.7 ? PAL.cream : PAL.sand) + '" opacity="0.9">'
    + '<animate attributeName="opacity" values="0.15;0.85;0.15" dur="' + (2 + rnd() * 3).toFixed(1)
    + 's" begin="' + (rnd() * 4).toFixed(1) + 's" repeatCount="indefinite"/></rect>';
}

// --- sol ---
function disc(cx, cy, r, color) {
  let out = "";
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y));
    if (w > 0) out += rect(cx - w, cy + y, w * 2 + 1, 1, color);
  }
  return out;
}
const sun = disc(214, 25, 8, PAL.sand);

// --- cerros ---
function ridgeFn(points) {
  return (x) => {
    for (let i = 0; i < points.length - 1; i++) {
      const [x0, y0] = points[i], [x1, y1] = points[i + 1];
      if (x >= x0 && x <= x1) return Math.round(y0 + ((y1 - y0) * (x - x0)) / (x1 - x0));
    }
    return points[points.length - 1][1];
  };
}

// cordon de atras: silueta plana, da profundidad
const backRidge = ridgeFn([[0, 42], [34, 34], [62, 38], [92, 29], [128, 36], [158, 31], [196, 39], [240, 35]]);
let back = "";
for (let x = 0; x < W; x++) back += rect(x, backRidge(x), 1, GROUND_Y - backRidge(x), PAL.plum);

// cerro de adelante: estratos inclinados en los siete colores, con linea de contorno
const frontRidge = ridgeFn([[0, 54], [26, 48], [48, 42], [70, 46], [96, 40], [124, 47], [150, 41], [178, 48], [208, 44], [240, 50]]);
const STRATA = [PAL.wine, PAL.terra, PAL.ochre, PAL.sand, PAL.cream, PAL.olive, PAL.teal];
// cada color de estrato con su equivalente en sombra
const SHADE = {
  [PAL.wine]: PAL.plum, [PAL.terra]: PAL.wine, [PAL.ochre]: PAL.terra, [PAL.sand]: PAL.ochre,
  [PAL.cream]: PAL.sand, [PAL.olive]: PAL.teal, [PAL.teal]: PAL.plum,
};
const BAND_H = 6, SLOPE = 0.38;
const bandAt = (x, y) => Math.floor((y + x * SLOPE) / BAND_H);
const litAt = (x, y) => STRATA[((bandAt(x, y) % STRATA.length) + STRATA.length) % STRATA.length];
// la luz viene de arriba: la parte baja de la ladera va en sombra, siguiendo el perfil
const shadowY = (x) => frontRidge(x) + 13;
const colorAt = (x, y) => (y >= shadowY(x) ? SHADE[litAt(x, y)] : litAt(x, y));

let front = "";
for (let x = 0; x < W; x++) {
  const top = frontRidge(x);
  let y = top;
  while (y < GROUND_Y) {
    const c = colorAt(x, y);
    let len = 1;
    while (y + len < GROUND_Y && colorAt(x, y + len) === c) len++;
    front += rect(x, y, 1, len, c);
    // linea de separacion entre estratos: los lee como capas de roca, no como rayas sueltas
    if (y + len < GROUND_Y) front += rect(x, y + len - 1, 1, 1, PAL.ink);
    y += len;
  }
  front += rect(x, top, 1, 1, PAL.ink);
}


// --- suelo ---
const ground = rect(0, GROUND_Y, W, H - GROUND_Y, PAL.ink)
  + dither(0, GROUND_Y, W, 5, PAL.ink, PAL.plum, (x, y) => 1 - y / 4);

// --- mate ---
const MATE = [
  "..............bb....",
  ".............bb.....",
  "............bb......",
  "...........bb.......",
  "..........bb........",
  ".....kkkkkkbk.......",
  "....kgggggggkk......",
  "....kgGgggGggk......",
  "...koooooooooook....",
  "...kottttttttowk....",
  "..kottttttttttwk....",
  ".kottttttttttttwk...",
  ".kottttttttttttwk...",
  ".kottttttttttttwk...",
  ".kottttttttttwwk....",
  "..kttttttttttwk.....",
  "..kkttttttttkk......",
  "...kkooooookk.......",
  "....kkkkkkkk........",
  "....................",
];
const MATE_PAL = { k: PAL.ink, b: PAL.cream, g: PAL.olive, G: PAL.teal,
                   o: PAL.ochre, t: PAL.terra, w: PAL.wine };
const MATE_X = 16, MATE_Y = GROUND_Y + 1;
const mate = sprite(MATE, MATE_PAL, MATE_X, MATE_Y);


// cardon, para que el suelo no sea una franja vacia
const CACTUS = [
  ".....ooo.....",
  ".....oCo.....",
  ".....oCo.....",
  ".....oCo.....",
  ".ooo.oCo.ooo.",
  ".oCo.oCo.oCo.",
  ".oCo.oCo.oCo.",
  ".oCo.oCo.oCo.",
  ".oCoooCoooCo.",
  ".....oCo.....",
  ".....oCo.....",
  ".....oCo.....",
  ".....oCo.....",
  ".....oCo.....",
  ".....oCo.....",
  ".....ooo.....",
]
const cactus = sprite(CACTUS, { o: PAL.teal, C: PAL.olive }, W - 32, GROUND_Y + 4);

const steam = [[6, -3, 0], [9, -5, 0.9], [12, -3, 1.8]].map(([dx, dy, delay]) => {
  const x = MATE_X + dx, y = MATE_Y + dy;
  return '<rect x="' + x + '" y="' + y + '" width="1" height="1" fill="' + PAL.cream + '" opacity="0">'
    + '<animate attributeName="opacity" values="0;0.75;0.3;0" dur="2.8s" begin="' + delay + 's" repeatCount="indefinite"/>'
    + '<animate attributeName="y" values="' + y + ";" + (y - 6) + '" dur="2.8s" begin="' + delay + 's" repeatCount="indefinite"/>'
    + "</rect>";
}).join("");

// --- texto ---
const TITLE = "AMARU SEGOVIA";
const title = textCentered(TITLE, W / 2 + 1, 15, PAL.ink, 2)   // sombra dura, sin blur
            + textCentered(TITLE, W / 2, 14, PAL.cream, 2);
const subtitle = textCentered("GAME DEV / FRONTEND DEV", W / 2, 32, PAL.sand, 1);
const player = text("PLAYER 1", 4, 3, PAL.olive, 1);
const place = text("JUJUY · ARGENTINA", W - 4 - textWidth("JUJUY · ARGENTINA"), 3, PAL.olive, 1);
const start = "<g>" + textCentered("▶ PRESS START", W / 2, 70, PAL.sand, 1)
  + '<animate attributeName="opacity" values="1;1;1;0" dur="1.6s" calcMode="discrete" repeatCount="indefinite"/></g>';

// --- scanlines ---
let scan = "";
for (let y = 0; y < H; y += 2) scan += rect(0, y, W, 1, PAL.ink);

const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" width="' + W * SCALE +
  '" height="' + H * SCALE + '" shape-rendering="crispEdges" role="img" ' +
  'aria-label="Amaru Segovia, game developer y frontend developer. Jujuy, Argentina.">' +
  sky + stars + sun + back + front + ground +
  title + subtitle + player + place +
  steam + cactus + mate + start +
  '<g opacity="0.13">' + scan + "</g>" +
  rect(0, 0, W, 1, PAL.ink) + rect(0, H - 1, W, 1, PAL.ink) +
  rect(0, 0, 1, H, PAL.ink) + rect(W - 1, 0, 1, H, PAL.ink) +
  "</svg>";

const fs = require("fs");
fs.mkdirSync("assets", { recursive: true });
fs.writeFileSync("assets/banner.svg", svg);
if (process.argv[2]) fs.writeFileSync(process.argv[2] + "/banner.svg", svg);
console.log("assets/banner.svg  " + (svg.length / 1024).toFixed(1) + " KB  (" + W + "x" + H + " logicos, x" + SCALE + ")");
