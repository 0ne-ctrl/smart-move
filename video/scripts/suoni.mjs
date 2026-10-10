// ============================================================
// GENERA MUSICA ED EFFETTI SONORI del video, da zero (nessun campione, nessuna licenza).
// Uso (nel distrobox remotion-box, dentro video/):  node scripts/suoni.mjs
// Scrive file WAV in public/sfx/. Rilancialo dopo aver cambiato questo script.
// ============================================================
import fs from 'node:fs';

const SR = 44100;          // campioni al secondo
const OUT = new URL('../public/sfx/', import.meta.url);
fs.mkdirSync(OUT, { recursive: true });

// Rumore pseudo-casuale con seme fisso: lo script dà sempre lo stesso risultato
let seed = 7;
const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 * 2 - 1; };
const hz = midi => 440 * 2 ** ((midi - 69) / 12); // nota MIDI → frequenza (69 = La 440)
const TAU = 2 * Math.PI;

// Scrive un WAV 16 bit stereo; L e R sono Float32Array con valori tra -1 e 1
function wav(name, L, R = L) {
  const n = L.length, b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  const s = x => Math.round(Math.max(-1, Math.min(1, x)) * 32767);
  for (let i = 0; i < n; i++) { b.writeInt16LE(s(L[i]), 44 + i * 4); b.writeInt16LE(s(R[i]), 46 + i * 4); }
  fs.writeFileSync(new URL(name, OUT), b);
}

// Porta il picco a "peak" (es. 0.9), così nessun file satura
const normalize = (peak, ...chs) => {
  const m = Math.max(...chs.map(c => c.reduce((a, x) => Math.max(a, Math.abs(x)), 0)));
  chs.forEach(c => c.forEach((x, i) => { c[i] = x / m * peak; }));
};

// ============================================================
// MUSICA: electro-pop, La minore, giro Lam – Fa – Do – Sol (un accordo per battuta).
// Tempo: 1 battito = 14 fotogrammi a 30 fps (128,57 BPM), uguale a src/timing.ts,
// così ogni taglio del video cade su un battito.
// Struttura (battute): 0 domanda a colpi · 1–2 cresce · 3 rullata e salita, poi silenzio ·
//                      4–15 drop (cassa piena, synth che "pompano", melodia dalla 7) · 16 colpo finale
// ============================================================
const BEAT = 14 / 30, BAR = 4 * BEAT, BARS = 17, N = Math.ceil(BARS * BAR * SR);
const DROP = 4, END = 16;
const PROG = ['Am', 'F', 'C', 'G'];
// Basso + 4 note dell'accordo (MIDI), voci vicine tra un accordo e l'altro
const CH = { Am: [45, [57, 60, 64, 69]], F: [41, [57, 60, 65, 69]], C: [48, [55, 60, 64, 67]], G: [43, [55, 59, 62, 67]] };
const chordOf = b => CH[b === END ? 'Am' : PROG[b % 4]];

// "Bus" = tracce separate, così filtro e sidechain si applicano solo agli accordi
const bus = () => ({ L: new Float32Array(N), R: new Float32Array(N) });
const chords = bus(), bass = bus(), lead = bus(), drums = bus(), hits = bus(), send = bus();
// Somma un suono (fn: tempo in s → campione) nella traccia b, a partire da t0; rev = quanto va al riverbero
function add(b, t0, len, fn, pan = 0.5, rev = 0) {
  const i0 = Math.round(t0 * SR), n = Math.min(Math.round(len * SR), N - i0);
  for (let j = 0; j < n; j++) {
    const v = fn(j / SR), l = v * (1 - pan), r = v * pan;
    b.L[i0 + j] += l; b.R[i0 + j] += r;
    if (rev) { send.L[i0 + j] += l * rev; send.R[i0 + j] += r * rev; }
  }
}

// Onda a dente di sega senza "fruscio digitale" (polyBLEP); restituisce un generatore campione per campione
const saw = f => {
  let ph = (rnd() + 1) / 2; const dt = f / SR;
  return () => {
    ph += dt; if (ph >= 1) ph -= 1;
    let v = 2 * ph - 1;
    if (ph < dt) { const x = ph / dt; v -= x + x - x * x - 1; } else if (ph > 1 - dt) { const x = (ph - 1) / dt; v -= x * x + x + x + 1; }
    return v;
  };
};
// Filtro passa-basso semplice (un polo), con stato: const f = lp(); f(campione, frequenza di taglio)
const lp = () => { let y = 0; return (x, fc) => { y += (1 - Math.exp(-TAU * fc / SR)) * (x - y); return y; }; };
// Rumore filtrato passa-alto (per piatti e charleston)
const hiss = () => { let p = 0; return () => { const x = rnd(), y = x - p; p = x; return y; }; };
const smooth = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);

// ---------- ACCORDI (supersaw: 5 seghe un po' stonate tra loro, allargate in stereo) ----------
const DET = [-0.12, -0.05, 0, 0.05, 0.12], PAN = [0.1, 0.3, 0.5, 0.7, 0.9];
const chord = (notes, t0, len, env, amp) => notes.forEach(m => DET.forEach((d, k) => {
  const o = saw(hz(m + d)); add(chords, t0, len, t => amp * env(t) * o(), PAN[k]);
}));
for (let b = 0; b < BARS; b++) {
  const t0 = b * BAR, [, notes] = chordOf(b);
  if (b === 0) for (let k = 0; k < 4; k++) chord(notes, t0 + k * BEAT, 0.45, t => Math.exp(-t * 8), 0.09);       // un colpo per parola
  else if (b < 3) for (let k = 0; k < 8; k++) chord(notes, t0 + k * BEAT / 2, 0.25, t => Math.exp(-t * 13), 0.07); // ottavi
  else if (b === 3) chord(notes, t0, 3.5 * BEAT, t => (t / (3.5 * BEAT)) ** 2, 0.08);                               // si gonfia, poi stop
  else if (b < END) chord(notes, t0, BAR + 0.01, t => Math.min(1, t / 0.005), 0.07);                                // tenuti, "pompano"
  else chord(notes, t0, 2.2, t => Math.exp(-t * 1.6), 0.09);                                                         // colpo finale
}
// Filtro che si apre (domanda → drop) e sidechain: il volume si abbassa a ogni cassa e risale
const barOf = t => Math.floor(t / BAR);
const cutoff = t => {
  const b = barOf(t);
  if (b < 3) return 300 * (3500 / 300) ** (t / (3 * BAR));
  if (b === 3) return 1500 + 4000 * ((t - 3 * BAR) / BAR);
  return 6000;
};
const duck = t => {
  const b = barOf(t), x = smooth((t % BEAT) / (0.55 * BEAT));
  if (b >= DROP && b < END) return 0.12 + 0.88 * x;
  if (b === 1 || b === 2) return 0.5 + 0.5 * x;
  return 1;
};
for (const ch of [chords.L, chords.R]) {
  const f1 = lp(), f2 = lp();
  for (let i = 0; i < N; i++) { const t = i / SR; ch[i] = f2(f1(ch[i], cutoff(t)), cutoff(t)) * duck(t); }
}

// ---------- BASSO ----------
for (let b = 1; b < BARS; b++) {
  const t0 = b * BAR, [root] = chordOf(b);
  if (b < 3) for (let k = 0; k < 4; k++) add(bass, t0 + k * BEAT, 0.4, t => 0.5 * Math.exp(-t * 6) * Math.sin(TAU * hz(root - 12) * t));
  if (b >= DROP && b < END) for (let k = 0; k < 4; k++) {
    // basso in levare (tra una cassa e l'altra), come nella house: sub + sega filtrata
    const o = saw(hz(root)), f = lp(), len = BEAT / 2 * 0.95;
    add(bass, t0 + k * BEAT + BEAT / 2, len, t => Math.min(1, t / 0.004) * (1 - t / len) ** 0.4 *
      (0.55 * Math.sin(TAU * hz(root - 12) * t) + 0.35 * f(o(), 900)));
  }
  if (b === END) add(bass, t0, 2.2, t => 0.6 * Math.exp(-t * 1.8) * Math.sin(TAU * hz(33) * t));
}

// ---------- BATTERIA ----------
const kick = (t0, a = 1) => add(drums, t0, 0.35, t => a * (0.9 * Math.exp(-t * 9) * Math.sin(TAU * (45 * t + 105 * (1 - Math.exp(-t * 35)) / 35))
  + (t < 0.003 ? 0.3 * rnd() * (1 - t / 0.003) : 0)));
const clap = t0 => { const h = hiss(); add(drums, t0, 0.2, t => {
  const e = Math.max(...[0, 0.011, 0.022].map(d => t >= d ? Math.exp(-(t - d) * (d === 0.022 ? 18 : 120)) : 0));
  return 0.5 * e * h();
}, 0.5, 0.25); };
const hat = (t0, open, a = 1) => { const h = hiss(); add(drums, t0, open ? 0.2 : 0.05, t => a * (open ? 0.16 : 0.12) * Math.exp(-t * (open ? 18 : 90)) * h(), 0.6); };
const snare = (t0, a) => { const h = hiss(); add(drums, t0, 0.2, t => a * (0.45 * Math.sin(TAU * 190 * t) * Math.exp(-t * 25) + 0.5 * h() * Math.exp(-t * 16)), 0.5, 0.2); };
const crash = t0 => { const h = hiss(); add(hits, t0, 1.8, t => 0.22 * Math.exp(-t * 2) * h(), 0.5, 0.3); };
const impact = t0 => add(hits, t0, 1.6, t => 0.9 * Math.exp(-t * 2.5) * Math.sin(TAU * (30 * t + 40 * (1 - Math.exp(-t * 8)) / 8))
  + 0.4 * Math.exp(-t * 25) * rnd(), 0.5, 0.35);

for (let b = 0; b < BARS; b++) {
  const t0 = b * BAR;
  for (let k = 0; k < 4; k++) {
    const tb = t0 + k * BEAT;
    if (b === 0) kick(tb, 0.6);                                   // colpi sotto le parole della domanda
    if (b === 1 || b === 2) { kick(tb, 0.8); hat(tb + BEAT / 2, false); }
    if (b >= DROP && b < END) {
      kick(tb);
      if (k % 2) clap(tb);
      hat(tb + BEAT / 2, true);
      [0.25, 0.75].forEach(s => hat(tb + s * BEAT, false, 0.5));  // sedicesimi leggeri
    }
  }
  if (b === DROP || b === 8 || b === 12) crash(t0);           // un piatto ogni 4 battute
  if (b === DROP || b === END) { impact(t0); kick(t0); }
}
// Rullata della battuta 3: ottavi, poi sedicesimi, poi trentaduesimi, sempre più forte; si ferma a 3 battiti e mezzo
{
  const t0 = 3 * BAR, roll = [];
  for (let s = 0; s < 4; s++) roll.push(s * BEAT / 2);
  for (let s = 0; s < 4; s++) roll.push(2 * BEAT + s * BEAT / 4);
  for (let s = 0; s < 4; s++) roll.push(3 * BEAT + s * BEAT / 8);
  roll.forEach(h => snare(t0 + h, 0.35 + 0.65 * h / (3.5 * BEAT)));
}
// Salita (riser): rumore che si schiarisce + nota che sale di due ottave, battute 2–3, si ferma prima del drop
{
  const t0 = 2 * BAR, len = BAR + 3.5 * BEAT, f = lp();
  let ph = 0;
  add(hits, t0, len, t => {
    const u = t / len;
    ph += hz(57 + 24 * u) / SR; // la nota sale da La3 a La5
    return u * u * (0.35 * f(rnd(), 300 * (9000 / 300) ** u) + 0.06 * Math.sin(TAU * ph));
  }, 0.5, 0.4);
}

// ---------- MELODIA (battute 7–15): pluck in La minore pentatonica, ottavi ----------
const A = [76, 0, 76, 74, 72, 0, 69, 0, 72, 0, 74, 0, 76, 79, 76, 0];
const B = [79, 0, 79, 76, 74, 0, 72, 0, 74, 0, 76, 74, 72, 0, 69, 0];
const MELODY = [[7, A], [9, B], [11, A], [13, B], [15, A.slice(0, 8)]];
for (const [bar0, notes] of MELODY) notes.forEach((m, s) => {
  if (!m) return;
  const t0 = bar0 * BAR + s * BEAT / 2, loud = bar0 >= 9 ? 1 : 0.75;
  [[0, 1], [12, 0.3]].forEach(([oct, a]) => {
    const o1 = saw(hz(m + oct) * 0.997), o2 = saw(hz(m + oct) * 1.003), f = lp();
    add(lead, t0, 0.5, t => loud * a * 0.3 * Math.exp(-t * 6) * Math.min(1, t / 0.003) * f(o1() + o2(), 700 + 5000 * Math.exp(-t * 12)), 0.5, 0.35);
  });
});

// ---------- RIVERBERO (Schroeder: 4 eco paralleli + 2 diffusori) ----------
const reverb = (x, delays) => {
  const y = new Float32Array(N);
  delays.forEach(ms => { const D = Math.round(ms * SR / 1000), buf = new Float32Array(N); let d = 0;
    for (let i = 0; i < N; i++) { const fb = i >= D ? buf[i - D] : 0; d += 0.4 * (fb - d); buf[i] = x[i] + 0.78 * d; y[i] += fb / delays.length; } });
  for (const ms of [5, 1.7]) { const D = Math.round(ms * SR / 1000), z = Float32Array.from(y);
    for (let i = 0; i < N; i++) y[i] = -0.7 * z[i] + (i >= D ? z[i - D] + 0.7 * y[i - D] : 0); }
  return y;
};
const revL = reverb(send.L, [29.7, 37.1, 41.1, 43.7]), revR = reverb(send.R, [31.3, 35.9, 42.7, 45.1]);

// ---------- MIX: somma, normalizza, leggera saturazione per più "volume" percepito ----------
const L = new Float32Array(N), R = new Float32Array(N);
for (let i = 0; i < N; i++) {
  L[i] = 0.55 * chords.L[i] + 0.7 * bass.L[i] + 0.5 * lead.L[i] + 0.8 * drums.L[i] + 0.6 * hits.L[i] + 0.5 * revL[i];
  R[i] = 0.55 * chords.R[i] + 0.7 * bass.R[i] + 0.5 * lead.R[i] + 0.8 * drums.R[i] + 0.6 * hits.R[i] + 0.5 * revR[i];
}
normalize(1, L, R);
for (const c of [L, R]) c.forEach((x, i) => { c[i] = Math.tanh(1.8 * x) / Math.tanh(1.8); });
normalize(0.9, L, R);
wav('music.wav', L, R);

// ============================================================
// EFFETTI SONORI (mono)
// ============================================================
const fx = (len, fn) => { const a = new Float32Array(Math.round(len * SR)); a.forEach((_, i) => { a[i] = fn(i / SR); }); normalize(0.9, a); return a; };

// "Pop" di uno smart che cade: nota che scende di un poco nei primi 15 ms, coda corta.
// Dieci altezze sulla scala pentatonica di Do, così una fila di pop suona come una melodia.
[72, 74, 76, 79, 81, 84, 86, 88, 91, 93].forEach((m, i) => {
  const f = hz(m);
  wav(`pop-${i}.wav`, fx(0.25, t => {
    const ph = TAU * f * (t + 0.5 * 0.015 * (1 - Math.exp(-t / 0.015))); // glissando da 1,5×f a f
    return Math.exp(-t * 22) * Math.min(1, t / 0.002) * (Math.sin(ph) + 0.3 * Math.sin(2 * ph));
  }));
});

// Clic del mouse: pressione (scatto secco) e rilascio più debole 70 ms dopo
const tick = (t, f, a) => t < 0 ? 0 : a * Math.exp(-t * 400) * (Math.sin(TAU * f * t) + 0.5 * rnd());
wav('click.wav', fx(0.12, t => tick(t, 2800, 1) + tick(t - 0.07, 3400, 0.4)));

// Interruttore: due scatti più gravi e un piccolo "toc"
wav('switch.wav', fx(0.2, t => tick(t, 1400, 1) + tick(t - 0.035, 1900, 0.7) + (t > 0.035 ? 0.4 * Math.exp(-(t - 0.035) * 30) * Math.sin(TAU * 520 * t) : 0)));

// Rumore filtrato con taglio che si sposta: base per fruscio di transizione ed evidenziatore
const swish = (len, f0, f1, shape) => { let y = 0; return fx(len, t => {
  const u = t / len, fc = f0 * (f1 / f0) ** u, a = 1 - Math.exp(-TAU * fc / SR);
  y += a * (rnd() - y); return y * shape(u);
}); };
// Fruscio leggero sui tagli di scena: sale e scende
wav('whoosh.wav', swish(0.6, 300, 3000, u => Math.sin(Math.PI * u) ** 2));
// Evidenziatore delle ferie: strisciata breve che si chiude netta
wav('ferie.wav', swish(0.3, 900, 5000, u => Math.min(1, u * 4) * (1 - u) ** 0.5));

console.log('Suoni scritti in', decodeURIComponent(OUT.pathname));
