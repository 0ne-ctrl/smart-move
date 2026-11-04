// ============================================================
// EFFETTI VETRO: lenti e riflesso sul bordo, alla Liquid Glass
// ============================================================
// Porting in JavaScript semplice (senza React) delle parti di Glisse che servono qui:
// mappe delle lenti, filtro SVG con dispersione dei colori, riflesso sul bordo.
// Originale: https://github.com/0kzh/glisse (src/internal/lens.ts e refraction.ts), con questa licenza:
//
//   MIT License — Copyright (c) 2026 Kelvin Zhang
//   Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
//   documentation files (the "Software"), to deal in the Software without restriction, including without limitation
//   the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
//   to permit persons to whom the Software is furnished to do so, subject to the following conditions:
//   The above copyright notice and this permission notice shall be included in all copies or substantial portions
//   of the Software.
//   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
//   THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
//   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF
//   CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
//   DEALINGS IN THE SOFTWARE.
//
// Le prime funzioni sono pure (niente DOM: le controlla test.js anche con node), glassUp() in fondo le applica alla pagina.

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
// erf(x) ≈ tanh(√π x): la sfumatura con cui la piega svanisce verso il centro
const erf = x => Math.tanh(1.7724538509 * x);

// Distanza con segno dal bordo di un rettangolo arrotondato centrato in 0,0 (negativa dentro)
export function distance(x, y, hw, hh, r) {
  const qx = Math.abs(x) - hw + r, qy = Math.abs(y) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

// Arco di cerchio che scende di `sag` su `half`, scalato perché la sua pendenza valga in media 1/2:
// la pendenza della "cupola" del vetro decide quanto piega ogni punto vicino al bordo
function arc(sag, half) {
  const radius = (half * half + sag * sag) / (2 * sag);
  let sum = 0;
  for (let i = 0; i <= 200; i++) {
    const x = (i / 200) * half, s = x / Math.sqrt(radius * radius - x * x);
    sum += i === 0 || i === 200 ? s / 2 : s;
  }
  const mean = sum / 200;
  return { radius, scale: mean > 0 ? 0.5 / mean : 1 };
}
const slope = (x, { radius, scale }) => { const i = Math.min(x, 0.999 * radius); return (i / Math.sqrt(radius * radius - i * i)) * scale; };

// Come piega il vetro (i valori del pannello di Glisse): fascia del bordo che piega = depth del lato corto,
// cupola = dome del lato corto, spostamento massimo = strength del lato corto, rosso piegato più del blu.
export const GLASS = { strength: 0.45, depth: 0.25, dome: 0.5, dispersion: 0.4 };

// Mappa di una lente grande width×height px con angoli `radius`, a `density` pixel per px.
// Tre immagini RGBA: across e down sono grigi (128 = fermo, più chiaro = prende da destra / da sotto, cioè
// dall'interno), mask ha l'alpha dove la lente piega: altrove il contenuto resta esatto, senza lo spostamento
// di un pixel che un 128 "quasi fermo" darebbe. Grigi e non rosso/verde: su schermi a gamma ampia
// Chrome converte i colori della mappa, e una spinta in giù diventerebbe anche di lato.
export function lensMap({ width, height, radius }, density, o = GLASS) {
  const hw = width / 2, hh = height / 2, r = clamp(radius, 0, Math.min(hw, hh));
  const columns = Math.max(1, Math.round(width * density)), rows = Math.max(1, Math.round(height * density));
  const across = new Uint8ClampedArray(columns * rows * 4), down = new Uint8ClampedArray(columns * rows * 4), mask = new Uint8ClampedArray(columns * rows * 4);
  const grey = (d, i, v, a = 255) => { d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = a; };
  const side = Math.min(width, height), depth = o.depth * side, dome = o.dome * side;
  const iw = Math.max(0, hw - depth), ih = Math.max(0, hh - depth), ir = clamp(r, 0, Math.min(iw, ih));
  const ramp = depth > 0 ? 1 / (depth * Math.SQRT2) : 1e6;
  const sag = Math.max(0.01, Math.min(dome, Math.min(hw, hh) - 1));
  const ax = arc(sag, hw), ay = arc(sag, hh);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const i = (row * columns + col) * 4;
      const x = ((col + 0.5) / columns) * width - hw, y = ((row + 0.5) / rows) * height - hh;
      const edge = distance(x, y, hw, hh, r);
      if (edge >= 0) { grey(across, i, 128); grey(down, i, 128); grey(mask, i, 0, 0); continue; } // fuori dalla forma
      const dx = Math.sign(x) * slope(Math.abs(x), ax), dy = Math.sign(y) * slope(Math.abs(y), ay);
      // 1 nella fascia del bordo, 0 verso il centro, con una sfumatura morbida tra le due
      const falloff = 0.5 * (1 + erf(distance(x, y, iw, ih, ir) * ramp));
      grey(across, i, Math.round((0.5 - 0.5 * dx * falloff) * 255));
      grey(down, i, Math.round((0.5 - 0.5 * dy * falloff) * 255));
      grey(mask, i, 0, Math.round(255 * Math.min(1, falloff * 20, -edge)));
    }
  }
  return { columns, rows, across, down, mask };
}

// Riflesso sul bordo, come lo disegna iOS 26: una linea di luce più forte proprio sul bordo e sparita 1,2 px
// più dentro; la luce da in alto a sinistra accende i lati sinistro e alto, il suo riflesso quelli destro e basso,
// e svanisce negli angoli in mezzo. Sotto la luce, la linea del bordo (edgeWidth px del colore `edge` [r,g,b,a]).
// Lungo un lato dritto è sempre uguale: per questo basta un'immagine piccola, stirata con border-image.
const RIM_WIDTH = 1.22;
export function rimMap({ width, height, radius }, shine, density, edge = [0, 0, 0, 0], edgeWidth = 1) {
  const columns = Math.max(1, Math.round(width * density)), rows = Math.max(1, Math.round(height * density));
  const data = new Uint8ClampedArray(columns * rows * 4);
  const hw = width / 2, hh = height / 2, corner = clamp(radius, 0, Math.min(hw, hh)), half = 0.5 / density;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const x = ((col + 0.5) / columns) * width - hw, y = ((row + 0.5) / rows) * height - hh;
      const depth = -distance(x, y, hw, hh, corner);
      if (depth < -half || depth > Math.max(2 * RIM_WIDTH, edgeWidth + half)) continue;
      // direzione verso fuori del bordo più vicino
      const qx = Math.abs(x) - hw + corner, qy = Math.abs(y) - hh + corner;
      let nx = 0, ny = 0;
      if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy); nx = Math.sign(x) * qx / l; ny = Math.sign(y) * qy / l; }
      else if (qx > qy) nx = Math.sign(x); else ny = Math.sign(y);
      const facing = Math.abs(nx + ny); // 1 sui lati, √2 negli angoli in alto a sinistra e in basso a destra, 0 negli altri due
      const along = Math.max(0, depth) / (RIM_WIDTH * Math.sqrt(Math.max(1, facing)));
      const cover = clamp((depth + half) * density, 0, 1); // quanto del pixel sta dentro la forma
      const lined = clamp((Math.min(edgeWidth, depth + half) - Math.max(0, depth - half)) * density, 0, 1);
      const light = along < 1 ? shine * Math.min(1, facing) ** 1.5 * (1 - along ** 1.5) * cover : 0;
      const line = edge[3] * lined * (1 - light), alpha = light + line;
      if (alpha <= 0) continue;
      const i = (row * columns + col) * 4;
      for (let c = 0; c < 3; c++) data[i + c] = Math.round((255 * light + edge[c] * line) / alpha);
      data[i + 3] = Math.round(255 * alpha);
    }
  }
  return { columns, rows, data };
}

// ------------------------------------------------------------
// Sulla pagina (da qui in giù serve il DOM)
// ------------------------------------------------------------
const NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs = {}) => { const e = document.createElementNS(NS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
let defs; // <svg> nascosto che contiene i filtri
const canvas = () => document.createElement('canvas');
const png = (columns, rows, data) => {
  const c = canvas(); c.width = columns; c.height = rows;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(columns, rows);
  img.data.set(data); ctx.putImageData(img, 0, 0); return c.toDataURL();
};

// Filtro SVG di una lente grande w×h px: piega il contenuto (o lo sfondo, in backdrop-filter) solo nella fascia
// del bordo, una volta per ciascuno di rosso, verde e blu (dispersione), poi rimette insieme i tre colori.
// box = unità relative all'elemento: WebKit (Safari, iPhone) disegna i filtri su HTML solo così, e lì
// lo spostamento in orizzontale e in verticale ha una scala per lato.
const CHANNELS = ['1 0 0 0 0  0 0 0 0 0  0 0 0 0 0', '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0', '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0'];
const filters = new Map(); // un filtro per misura, riusato
function lensFilter(w, h, radius, box) {
  const density = Math.min(devicePixelRatio || 1, 2), key = [w, h, radius, density, box].join('|');
  if (filters.has(key)) return filters.get(key);
  const m = lensMap({ width: w, height: h, radius }, density);
  const unit = box ? 'objectBoundingBox' : 'userSpaceOnUse';
  const f = el('filter', { id: 'glass-' + filters.size, filterUnits: unit, primitiveUnits: unit, 'color-interpolation-filters': 'sRGB',
    x: 0, y: 0, width: box ? 1 : w, height: box ? 1 : h });
  const image = (data, result) => el('feImage', { href: png(m.columns, m.rows, data), preserveAspectRatio: 'none', result });
  const matrix = (i, values, result) => el('feColorMatrix', { in: i, type: 'matrix', values, result });
  const sum = (a, b, result) => el('feComposite', { in: a, in2: b, operator: 'arithmetic', k2: 1, k3: 1, result });
  f.append(image(m.across, 'across'), image(m.down, 'down'), image(m.mask, 'raw'), el('feFlood', { 'flood-color': 'rgb(128,128,128)', result: 'neutral' }));
  // Ogni spinta come grigio con alpha 1/2 (= fermo) per la direzione che non usa
  for (const p of ['across', 'down']) {
    const half = el('feComponentTransfer', { in: p + '-grey', result: p + '-pull' });
    half.append(el('feFuncA', { type: 'linear', slope: 0, intercept: 0.5 }));
    f.append(el('feComposite', { in: p, in2: 'neutral', operator: 'over', result: p + '-grey' }), half);
  }
  const reach = GLASS.strength * Math.min(w, h), spectrum = [1 + 0.2 * GLASS.dispersion, 1 + 0.1 * GLASS.dispersion, 1];
  CHANNELS.forEach((ch, i) => {
    f.append(
      el('feDisplacementMap', { in: 'SourceGraphic', in2: 'across-pull', scale: (box ? reach / w : reach) * spectrum[i], xChannelSelector: 'R', yChannelSelector: 'A', result: 'x' + i }),
      el('feDisplacementMap', { in: 'x' + i, in2: 'down-pull', scale: (box ? reach / h : reach) * spectrum[i], xChannelSelector: 'A', yChannelSelector: 'R', result: 'ray' + i }),
      // ogni colore tiene un terzo della sua opacità, così sommati tornano opachi quanto prima (niente bordi grigi)
      matrix('ray' + i, ch + '  0 0 0 0.3333 0', 'light' + i));
  });
  f.append(sum('light0', 'light1', 'l01'), sum('l01', 'light2', 'spread'), matrix('spread', '3 0 0 0 0  0 3 0 0 0  0 0 3 0 0  0 0 0 1 0', 'bent'),
    // dove piega il contenuto piegato, altrove quello di prima: si sommano esatti dove la piega svanisce
    el('feComposite', { in: 'bent', in2: 'raw', operator: 'in', result: 'inside' }),
    el('feComposite', { in: 'SourceGraphic', in2: 'raw', operator: 'out', result: 'outside' }),
    sum('inside', 'outside', 'seen'));
  defs.append(f);
  const url = `url("#${f.id}")`;
  filters.set(key, url);
  return url;
}

// Mette su `target` la variabile CSS `prop` col filtro della lente grande quanto `shape` (di solito lo stesso
// elemento), e la rifà quando cambia misura: dopo, quando la pagina è libera (requestIdleCallback).
function fitLens(shape, target, prop, box) {
  let t;
  const fit = () => {
    const w = shape.offsetWidth, h = shape.offsetHeight;
    if (!w || !h) return; // nascosto (menu chiuso): ci pensa il prossimo cambio di misura
    const r = Math.min(w / 2, h / 2, parseFloat(getComputedStyle(shape).borderTopLeftRadius) || 0);
    target.style.setProperty(prop, lensFilter(w, h, r, box));
  };
  new ResizeObserver(() => { (window.cancelIdleCallback || clearTimeout)(t); t = (window.requestIdleCallback || setTimeout)(fit); }).observe(shape);
}

// Riflesso sul bordo per gli elementi con angoli --r: un'immagine quadrata appena più grande di due angoli,
// tagliata in 9 pezzi da border-image (gli angoli restano com'erano, i lati si stirano). Una per tema,
// con la linea del bordo nel colore di --glass-edge di quel tema; style.css sceglie quella del tema attuale.
function paintRims() {
  const root = document.documentElement, density = Math.min(devicePixelRatio || 1, 3);
  const r = parseFloat(getComputedStyle(root).getPropertyValue('--r')) || 12, side = Math.ceil(r) + 2, size = 2 * side + 2;
  const probe = document.createElement('i'); probe.style.color = 'var(--glass-edge)'; root.append(probe);
  for (const [theme, shine] of [['light', 0.3], ['dark', 0.13]]) {
    probe.style.colorScheme = theme; // light-dark() di --glass-edge si risolve col tema dell'elemento
    const edge = getComputedStyle(probe).color.match(/[\d.]+/g).map(Number);
    const m = rimMap({ width: size, height: size, radius: r }, shine, density, [edge[0], edge[1], edge[2], edge[3] ?? 1]);
    root.style.setProperty('--rim-' + theme, `url("${png(m.columns, m.rows, m.data)}")`);
  }
  probe.remove();
  root.style.setProperty('--rim-cut', String(Math.round(side * density)));
  root.style.setProperty('--rim-w', side + 'px');
}

// Accende gli effetti (una volta sola, quando data-glass="on"): riflessi, e le lenti che il browser sa disegnare
// (data-lens, scritto dallo script nell'<head>): "backdrop" su Chromium (anche sui telefoni) piega lo sfondo di legenda,
// menu e pallino degli interruttori, e la pillola dello schema; "copy" su WebKit solo la pillola.
// shortcut: le immagini restano alla densità dello schermo di partenza; spostando la finestra su uno schermo diverso si rifanno ricaricando.
let up = false;
export function glassUp() {
  const root = document.documentElement;
  if (up || root.dataset.glass !== 'on') return;
  up = true;
  defs = el('svg', { 'aria-hidden': 'true', width: 0, height: 0, style: 'position:absolute' });
  document.body.append(defs);
  paintRims();
  if (!root.dataset.lens) return;
  const pill = document.querySelector('.seg .lens .bend');
  fitLens(pill, pill, '--pill-lens', root.dataset.lens === 'copy');
  if (root.dataset.lens === 'backdrop') {
    for (const sel of ['body > .legend', '#menu']) { const e = document.querySelector(sel); fitLens(e, e, '--lens', false); }
    // pallino degli interruttori: misura letta dal CSS (::after non si può osservare), uguale per tutti, lente su :root
    const k = getComputedStyle(document.querySelector('.toggle i'), '::after'), w = parseFloat(k.width), h = parseFloat(k.height);
    if (w && h) root.style.setProperty('--knob-lens', lensFilter(w, h, Math.min(w, h) / 2, false));
  }
}
