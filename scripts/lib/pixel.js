// Utilidades de pixel art: paleta fija, fuente bitmap 5x7 y dithering ordenado.
//
// Reglas que sigue todo lo que se dibuja con esto:
//   1. Paleta cerrada de 9 colores. Ningun color fuera de PAL.
//   2. Nada de degrades continuos: las transiciones se hacen con dithering Bayer 4x4.
//   3. Todo el texto es bitmap, dibujado como rects sobre la grilla. Sin fuentes del sistema.
//   4. Todas las coordenadas son enteros en pixeles logicos; el escalado es entero.
//
// La paleta sale del Cerro de los Siete Colores (Purmamarca, Jujuy).

const PAL = {
  ink: "#140d16", // roca en sombra
  plum: "#3b2233",
  wine: "#6d2f3d",
  terra: "#a8452f",
  ochre: "#d97e3f",
  sand: "#e8b95c",
  cream: "#f2e6d0",
  olive: "#7d8a4f",
  teal: "#3f6b6b",
};

// 5x7. Sin acentos a proposito: las pantallas arcade de la epoca tampoco los tenian.
const FONT = {
  A: "01110 10001 10001 11111 10001 10001 10001",
  B: "11110 10001 10001 11110 10001 10001 11110",
  C: "01110 10001 10000 10000 10000 10001 01110",
  D: "11110 10001 10001 10001 10001 10001 11110",
  E: "11111 10000 10000 11110 10000 10000 11111",
  F: "11111 10000 10000 11110 10000 10000 10000",
  G: "01110 10001 10000 10111 10001 10001 01111",
  H: "10001 10001 10001 11111 10001 10001 10001",
  I: "11111 00100 00100 00100 00100 00100 11111",
  J: "00111 00010 00010 00010 00010 10010 01100",
  K: "10001 10010 10100 11000 10100 10010 10001",
  L: "10000 10000 10000 10000 10000 10000 11111",
  M: "10001 11011 10101 10001 10001 10001 10001",
  N: "10001 11001 10101 10011 10001 10001 10001",
  O: "01110 10001 10001 10001 10001 10001 01110",
  P: "11110 10001 10001 11110 10000 10000 10000",
  Q: "01110 10001 10001 10001 10101 10010 01101",
  R: "11110 10001 10001 11110 10100 10010 10001",
  S: "01111 10000 10000 01110 00001 00001 11110",
  T: "11111 00100 00100 00100 00100 00100 00100",
  U: "10001 10001 10001 10001 10001 10001 01110",
  V: "10001 10001 10001 10001 10001 01010 00100",
  W: "10001 10001 10001 10101 10101 11011 01010",
  X: "10001 10001 01010 00100 01010 10001 10001",
  Y: "10001 10001 01010 00100 00100 00100 00100",
  Z: "11111 00001 00010 00100 01000 10000 11111",
  0: "01110 10011 10011 10101 11001 11001 01110",
  1: "00100 01100 00100 00100 00100 00100 01110",
  2: "01110 10001 00001 00010 00100 01000 11111",
  3: "11111 00010 00100 00010 00001 10001 01110",
  4: "00010 00110 01010 10010 11111 00010 00010",
  5: "11111 10000 11110 00001 00001 10001 01110",
  6: "00110 01000 10000 11110 10001 10001 01110",
  7: "11111 00001 00010 00100 01000 01000 01000",
  8: "01110 10001 10001 01110 10001 10001 01110",
  9: "01110 10001 10001 01111 00001 00010 01100",
  " ": "00000 00000 00000 00000 00000 00000 00000",
  ".": "00000 00000 00000 00000 00000 01100 01100",
  ",": "00000 00000 00000 00000 01100 01100 01000",
  ":": "00000 01100 01100 00000 01100 01100 00000",
  "-": "00000 00000 00000 11111 00000 00000 00000",
  "+": "00000 00100 00100 11111 00100 00100 00000",
  "/": "00001 00010 00010 00100 01000 01000 10000",
  "#": "01010 01010 11111 01010 11111 01010 01010",
  "!": "00100 00100 00100 00100 00100 00000 00100",
  "?": "01110 10001 00001 00110 00100 00000 00100",
  "%": "11001 11010 00010 00100 01000 01011 10011",
  "(": "00010 00100 01000 01000 01000 00100 00010",
  ")": "01000 00100 00010 00010 00010 00100 01000",
  "'": "00100 00100 00000 00000 00000 00000 00000",
  "*": "00000 10101 01110 11111 01110 10101 00000",
  "=": "00000 00000 11111 00000 11111 00000 00000",
  ">": "10000 01000 00100 00010 00100 01000 10000",
  "<": "00001 00010 00100 01000 00100 00010 00001",
  // glifos propios
  "·": "00000 00000 00000 01100 01100 00000 00000", // punto medio
  "▶": "10000 11000 11100 11110 11100 11000 10000", // triangulo play
  "♥": "01010 11111 11111 11111 01110 00100 00000", // corazon
};

const glyph = (ch) => {
  const g = FONT[ch] || FONT[ch.toUpperCase()];
  if (!g) throw new Error("sin glifo: " + JSON.stringify(ch));
  return g.split(" ");
};

const textWidth = (s, scale = 1) => (s.length * 6 - 1) * scale;

// Dibuja texto bitmap. Devuelve rects con coordenadas enteras.
function text(str, x, y, color, scale = 1) {
  let out = "";
  [...str].forEach((ch, i) => {
    const rows = glyph(ch);
    const ox = x + i * 6 * scale;
    for (let r = 0; r < 7; r++) {
      let c = 0;
      while (c < 5) {
        if (rows[r][c] === "1") {
          let len = 0;
          while (c + len < 5 && rows[r][c + len] === "1") len++;
          out += rect(ox + c * scale, y + r * scale, len * scale, scale, color);
          c += len;
        } else c++;
      }
    }
  });
  return out;
}

const textCentered = (str, cx, y, color, scale = 1) =>
  text(str, Math.round(cx - textWidth(str, scale) / 2), y, color, scale);

const rect = (x, y, w, h, fill) =>
  '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '"/>';

// Bayer 4x4: umbrales ordenados para simular medios tonos sin agregar colores.
const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

// Rellena una banda con dos colores mezclados por dithering.
// t(x, y) devuelve 0..1: 0 = todo colorA, 1 = todo colorB.
function dither(x0, y0, w, h, colorA, colorB, t) {
  const rows = [];
  for (let y = 0; y < h; y++) {
    let row = "";
    for (let x = 0; x < w; x++) {
      const v = Math.max(0, Math.min(1, t(x, y)));
      row += v * 16 > BAYER4[y % 4][x % 4] ? "1" : "0";
    }
    rows.push(row);
  }
  // fondo entero de colorA y encima solo los pixeles de colorB, agrupados por corridas
  let out = colorA === "none" ? "" : rect(x0, y0, w, h, colorA);
  rows.forEach((row, y) => {
    let x = 0;
    while (x < w) {
      if (row[x] === "1") {
        let len = 0;
        while (x + len < w && row[x + len] === "1") len++;
        out += rect(x0 + x, y0 + y, len, 1, colorB);
        x += len;
      } else x++;
    }
  });
  return out;
}

// Convierte un mapa de caracteres a rects, agrupando corridas horizontales.
function sprite(rows, palette, ox = 0, oy = 0) {
  let out = "";
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch !== "." && palette[ch]) {
        let len = 0;
        while (x + len < row.length && row[x + len] === ch) len++;
        out += rect(ox + x, oy + y, len, 1, palette[ch]);
        x += len;
      } else x++;
    }
  });
  return out;
}

// Disco pixelado.
function disc(cx, cy, r, color) {
  let out = "";
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y));
    if (w > 0) out += rect(cx - w, cy + y, w * 2 + 1, 1, color);
  }
  return out;
}

// Anillo de grosor arbitrario (rOut y rIn en pixeles).
function ring(cx, cy, rOut, rIn, color) {
  let out = "";
  for (let y = -rOut; y <= rOut; y++) {
    const wo = Math.floor(Math.sqrt(Math.max(0, rOut * rOut - y * y)));
    if (wo <= 0) continue;
    const wi = Math.abs(y) <= rIn ? Math.floor(Math.sqrt(rIn * rIn - y * y)) : -1;
    if (wi < 0) out += rect(cx - wo, cy + y, wo * 2 + 1, 1, color);
    else {
      out += rect(cx - wo, cy + y, wo - wi, 1, color);
      out += rect(cx + wi + 1, cy + y, wo - wi, 1, color);
    }
  }
  return out;
}

// Relleno de un cuadrilatero convexo, para las caras de un cubo isometrico.
function quad(pts, color, ox = 0, oy = 0) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const inside = (px, py) => {
    let sign = 0;
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
      const c = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
      if (c === 0) continue;
      const sc = c > 0 ? 1 : -1;
      if (sign === 0) sign = sc;
      else if (sc !== sign) return false;
    }
    return true;
  };
  let out = "";
  for (let py = y0; py <= y1; py++) {
    let run = null;
    for (let px = x0; px <= x1 + 1; px++) {
      const on = px <= x1 && inside(px + 0.5, py + 0.5);
      if (on) { if (run) run.len++; else run = { x: px, len: 1 }; }
      else if (run) { out += rect(ox + run.x, oy + py, run.len, 1, color); run = null; }
    }
  }
  return out;
}

// Engorda un mapa de sprite en 1 pixel: sirve para hacerle un contorno
// y que se lea sobre cualquier fondo.
function dilate(rows, char) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length));
  const at = (x, y) => (y < 0 || y >= h || x < 0 || x >= w ? "." : (rows[y][x] || "."));
  const out = [];
  for (let y = -1; y <= h; y++) {
    let line = "";
    for (let x = -1; x <= w; x++) {
      if (at(x, y) !== ".") { line += at(x, y); continue; }
      let vecino = false;
      for (let dy = -1; dy <= 1 && !vecino; dy++)
        for (let dx = -1; dx <= 1; dx++)
          if (at(x + dx, y + dy) !== ".") { vecino = true; break; }
      line += vecino ? char : ".";
    }
    out.push(line);
  }
  return out;
}

module.exports = { PAL, FONT, text, textCentered, textWidth, rect, dither, sprite, disc, ring, quad, dilate, BAYER4 };
