// ============================================================
// MUSICA ED EFFETTI SONORI del promo v2, sintetizzati da zero (nessun campione, nessuna licenza).
// Uso (nel distrobox remotion-box, dentro video-v2/):  node scripts/suoni.mjs  → public/sfx/*.wav
// Parte dagli stessi strumenti di video/scripts/suoni.mjs (wav, saw, lp, riverbero), con un brano nuovo:
// future house in Re minore a 120 BPM (1 battito = 15 fotogrammi a 30 fps, uguale a src/timing.ts).
// ============================================================
import fs from 'node:fs';

const SR = 44100;
const OUT = new URL('../public/sfx/', import.meta.url);
fs.mkdirSync(OUT, { recursive: true });

// Rumore con seme fisso: lo script dà sempre lo stesso risultato
let seed = 11;
const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 * 2 - 1; };
const hz = midi => 440 * 2 ** ((midi - 69) / 12);
const TAU = 2 * Math.PI;

function wav(name, L, R = L) {
  const n = L.length, b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(SR, 24);
  b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  const s = x => Math.round(Math.max(-1, Math.min(1, x)) * 32767);
  for (let i = 0; i < n; i++) { b.writeInt16LE(s(L[i]), 44 + i * 4); b.writeInt16LE(s(R[i]), 46 + i * 4); }
  fs.writeFileSync(new URL(name, OUT), b);
}
const normalize = (peak, ...chs) => {
  const m = Math.max(...chs.map(c => c.reduce((a, x) => Math.max(a, Math.abs(x)), 0)));
  chs.forEach(c => c.forEach((x, i) => { c[i] = x / m * peak; }));
};

// ============================================================
// STRUTTURA (battute da 2 s, come le scene in src/timing.ts)
//   0–1 conteggio: solo tic dell'orologio e due colpi sulle scritte
//   2–3 l'anno: cassa filtrata, pad che si apre, salita, rullata; ultimo mezzo battito di silenzio
//   4 drop · 5–6 ritmo: gli accordi suonano lo schema degli smart (lun-mer-ven in battere, mar-gio in levare)
//   7–13 groove con melodia · 14 pausa (niente cassa, pad che sale) · 15 colpo finale
// ============================================================
const BEAT = 0.5, BAR = 4 * BEAT, BARS = 16, N = Math.ceil(BARS * BAR * SR);
const DROP = 4, BREAK = 14, HIT = 15;
// Un accordo per battuta: Rem – Sib – Fa – Do (i–VI–III–VII); basso + 4 voci vicine
const CH = { Dm: [38, [57, 62, 65, 69]], Bb: [34, [58, 62, 65, 70]], F: [41, [57, 60, 65, 69]], C: [36, [55, 60, 64, 67]] };
const BARCH = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'C', 'Dm'];
const chordOf = b => CH[BARCH[b]];

const bus = () => ({ L: new Float32Array(N), R: new Float32Array(N) });
const pad = bus(), stabs = bus(), bass = bus(), lead = bus(), drums = bus(), hits = bus(), send = bus();
function add(b, t0, len, fn, pan = 0.5, rev = 0) {
  const i0 = Math.round(t0 * SR), n = Math.min(Math.round(len * SR), N - i0);
  for (let j = 0; j < n; j++) {
    const v = fn(j / SR), l = v * (1 - pan), r = v * pan;
    b.L[i0 + j] += l; b.R[i0 + j] += r;
    if (rev) { send.L[i0 + j] += l * rev; send.R[i0 + j] += r * rev; }
  }
}
const saw = f => {
  let ph = (rnd() + 1) / 2; const dt = f / SR;
  return () => {
    ph += dt; if (ph >= 1) ph -= 1;
    let v = 2 * ph - 1;
    if (ph < dt) { const x = ph / dt; v -= x + x - x * x - 1; } else if (ph > 1 - dt) { const x = (ph - 1) / dt; v -= x * x + x + x + 1; }
    return v;
  };
};
const lp = () => { let y = 0; return (x, fc) => { y += (1 - Math.exp(-TAU * fc / SR)) * (x - y); return y; }; };
const hiss = () => { let p = 0; return () => { const x = rnd(), y = x - p; p = x; return y; }; };
const smooth = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);

// ---------- PAD (supersaw) nella salita e nella pausa, filtrato più sotto ----------
const DET = [-0.11, -0.04, 0, 0.04, 0.11], PAN = [0.1, 0.3, 0.5, 0.7, 0.9];
const padChord = (notes, t0, len, env, amp) => notes.forEach(m => DET.forEach((d, k) => {
  const o = saw(hz(m + d)); add(pad, t0, len, t => amp * env(t) * o(), PAN[k], 0.3);
}));
for (const b of [2, 3, BREAK]) {
  const [, notes] = chordOf(b), len = b === 3 ? 3.5 * BEAT : BAR;
  padChord(notes, b * BAR, len, t => Math.min(1, t / 0.4) * (b === 3 ? 1 : 0.8), 0.06);
}
const barOf = t => Math.floor(t / BAR);
const padCut = t => {
  const b = barOf(t);
  if (b < 4) return 250 * (6000 / 250) ** Math.min(1, (t - 2 * BAR) / (1.875 * BAR));
  return 300 * (5000 / 300) ** ((t - BREAK * BAR) / BAR);
};
for (const ch of [pad.L, pad.R]) {
  const f1 = lp(), f2 = lp();
  for (let i = 0; i < N; i++) { const t = i / SR; ch[i] = f2(f1(ch[i], padCut(t)), padCut(t)); }
}

// ---------- STAB D'ORGANO HOUSE (armoniche 1–4, attacco secco) ----------
const organ = (m, t0, len, amp, pan = 0.5, rev = 0.15) => {
  const f = hz(m);
  add(stabs, t0, len, t => amp * Math.min(1, t / 0.002) * Math.exp(-t * (5 / len)) *
    (Math.sin(TAU * f * t) + 0.55 * Math.sin(TAU * 2 * f * t) + 0.3 * Math.sin(TAU * 3.01 * f * t) + 0.18 * Math.sin(TAU * 4 * f * t)), pan, rev);
};
const stab = (b, t0, len = 0.2, amp = 0.05, up = 0) => {
  const [, notes] = chordOf(b);
  notes.forEach((m, k) => organ(m + up, t0, len, amp, 0.35 + 0.1 * k));
};
for (let b = 0; b < BARS; b++) {
  const t0 = b * BAR;
  if (b === 1) [0, 2].forEach(k => stab(b, t0 + k * BEAT, 0.6, 0.06));               // colpi sotto "120" e "Quali?"
  if (b === DROP || (b >= 7 && b < BREAK)) for (let k = 0; k < 4; k++) stab(b, t0 + k * BEAT + BEAT / 2); // levare classico
  // Battute 5–6: lo schema degli smart. Una settimana = una battuta, un giorno = un ottavo (lun = primo ottavo)
  if (b === 5) [0, 2, 4].forEach(e => stab(b, t0 + e * BEAT / 2, 0.35, 0.07, 12));     // lun mer ven: in battere
  if (b === 6) [1, 3].forEach(e => stab(b, t0 + e * BEAT / 2, 0.35, 0.07, 12));        // mar gio: in levare
  if (b === HIT) stab(b, t0, 2, 0.07, 12);
}
// sidechain: tutto quello che è tonale si abbassa a ogni cassa
const duck = t => {
  const b = barOf(t), x = smooth((t % BEAT) / (0.5 * BEAT));
  return b >= DROP && b < BREAK ? 0.2 + 0.8 * x : b === 2 || b === 3 ? 0.55 + 0.45 * x : 1;
};
for (const ch of [pad.L, pad.R, stabs.L, stabs.R]) ch.forEach((x, i) => { ch[i] = x * duck(i / SR); });

// ---------- BASSO: sub nel conteggio, in levare dal drop ----------
for (let b = 0; b < BARS; b++) {
  const t0 = b * BAR, [root] = chordOf(b);
  if (b >= DROP && b < BREAK) for (let k = 0; k < 4; k++) {
    const o = saw(hz(root + 12)), f = lp(), len = BEAT / 2 * 0.9;
    add(bass, t0 + k * BEAT + BEAT / 2, len, t => Math.min(1, t / 0.004) * (1 - t / len) ** 0.5 *
      (0.6 * Math.sin(TAU * hz(root) * t) + 0.3 * f(o(), 700 + 900 * Math.exp(-t * 20))));
  }
  if (b === 2 || b === 3) for (let k = 0; k < (b === 3 ? 3 : 4); k++)
    add(bass, t0 + k * BEAT, 0.4, t => 0.45 * Math.exp(-t * 5) * Math.sin(TAU * hz(root) * t));
  if (b === HIT) add(bass, t0, 4, t => 0.8 * Math.exp(-t * 0.9) * Math.sin(TAU * (hz(26) * t + 30 * (1 - Math.exp(-t * 3)) / 3)));
}

// ---------- BATTERIA ----------
const kick = (t0, a = 1) => add(drums, t0, 0.35, t => a * (0.95 * Math.exp(-t * 8) * Math.sin(TAU * (48 * t + 110 * (1 - Math.exp(-t * 32)) / 32))
  + (t < 0.003 ? 0.3 * rnd() * (1 - t / 0.003) : 0)));
const clap = (t0, a = 1) => { const h = hiss(); add(drums, t0, 0.22, t => {
  const e = Math.max(...[0, 0.01, 0.021].map(d => t >= d ? Math.exp(-(t - d) * (d === 0.021 ? 16 : 120)) : 0));
  return a * 0.5 * e * h();
}, 0.5, 0.3); };
const hat = (t0, open, a = 1, pan = 0.62) => { const h = hiss(); add(drums, t0, open ? 0.2 : 0.05, t => a * (open ? 0.15 : 0.12) * Math.exp(-t * (open ? 16 : 95)) * h(), pan); };
const snare = (t0, a) => { const h = hiss(); add(drums, t0, 0.2, t => a * (0.4 * Math.sin(TAU * 200 * t) * Math.exp(-t * 25) + 0.5 * h() * Math.exp(-t * 15)), 0.5, 0.25); };
// Tic dell'orologio: legnetto acuto, alternato tic / tac
const tock = (t0, hi) => add(drums, t0, 0.08, t => 0.45 * Math.exp(-t * 70) * (Math.sin(TAU * (hi ? 1900 : 1500) * t) + 0.4 * Math.sin(TAU * 3100 * t)), hi ? 0.4 : 0.6, 0.1);
const crash = t0 => { const h = hiss(); add(hits, t0, 2, t => 0.2 * Math.exp(-t * 1.8) * h(), 0.5, 0.3); };
const impact = t0 => add(hits, t0, 2, t => 0.9 * Math.exp(-t * 2.2) * Math.sin(TAU * (28 * t + 45 * (1 - Math.exp(-t * 7)) / 7))
  + 0.4 * Math.exp(-t * 22) * rnd(), 0.5, 0.4);

for (let b = 0; b < BARS; b++) {
  const t0 = b * BAR;
  for (let k = 0; k < 4; k++) {
    const tb = t0 + k * BEAT;
    if (b < 2) { tock(tb, k % 2 === 0); if (k === 0) kick(tb, b ? 0.8 : 0.5); }
    if (b === 2 || (b === 3 && k < 3)) { kick(tb, 0.7); hat(tb + BEAT / 2, false, 0.8); }
    if (b >= DROP && b < BREAK) {
      kick(tb);
      if (k % 2) clap(tb);
      hat(tb + BEAT / 2, true);
      if (b >= 7) [0.25, 0.75].forEach(s => hat(tb + s * BEAT, false, 0.45, 0.35));
    }
  }
  if (b === DROP || b === 8 || b === 12) crash(t0);
  if (b === DROP || b === HIT) { impact(t0); kick(t0); }
  if (b === HIT) crash(t0);
}
// Rullata della battuta 3 (ottavi → sedicesimi → trentaduesimi), poi silenzio
{
  const t0 = 3 * BAR, roll = [];
  for (let s = 0; s < 4; s++) roll.push(s * BEAT / 2);
  for (let s = 0; s < 4; s++) roll.push(2 * BEAT + s * BEAT / 4);
  for (let s = 0; s < 4; s++) roll.push(3 * BEAT + s * BEAT / 8);
  roll.forEach(h => snare(t0 + h, 0.3 + 0.7 * h / (3.5 * BEAT)));
}
// Rullata breve in fondo alla battuta 13, verso la pausa
for (let s = 0; s < 4; s++) snare(13 * BAR + 3 * BEAT + s * BEAT / 4, 0.3 + 0.15 * s);
// Salite: rumore che si schiarisce + nota che sale; battute 2–3 (verso il drop) e 14 (verso il finale)
const riser = (t0, len, amp) => {
  const f = lp(); let ph = 0;
  add(hits, t0, len, t => {
    const u = t / len;
    ph += hz(50 + 24 * u) / SR;
    return amp * u * u * (0.35 * f(rnd(), 300 * (9000 / 300) ** u) + 0.07 * Math.sin(TAU * ph));
  }, 0.5, 0.4);
};
riser(2 * BAR, BAR + 3.5 * BEAT, 1);
riser(BREAK * BAR, BAR - 0.02, 0.9);

// ---------- MELODIA (battute 7–13): pluck in Re minore, ottavi ----------
const PA = [74, 0, 74, 77, 0, 76, 74, 0, 77, 0, 81, 0, 79, 77, 76, 74];
const PB = [74, 0, 74, 77, 0, 79, 77, 0, 76, 0, 74, 0, 72, 0, 74, 0];
const MELODY = [[7, PA], [9, PB], [11, PA.slice(0, 8)], [12, PB]];
for (const [bar0, notes] of MELODY) notes.forEach((m, s) => {
  if (!m) return;
  const t0 = bar0 * BAR + s * BEAT / 2;
  [[0, 1], [12, 0.25]].forEach(([oct, a]) => {
    const o1 = saw(hz(m + oct) * 0.996), o2 = saw(hz(m + oct) * 1.004), f = lp();
    add(lead, t0, 0.45, t => a * 0.28 * Math.exp(-t * 7) * Math.min(1, t / 0.003) * f(o1() + o2(), 600 + 5500 * Math.exp(-t * 14)), 0.5, 0.4);
  });
});

// ---------- RIVERBERO (Schroeder) ----------
const reverb = (x, delays) => {
  const y = new Float32Array(N);
  delays.forEach(ms => { const D = Math.round(ms * SR / 1000), buf = new Float32Array(N); let d = 0;
    for (let i = 0; i < N; i++) { const fb = i >= D ? buf[i - D] : 0; d += 0.4 * (fb - d); buf[i] = x[i] + 0.8 * d; y[i] += fb / delays.length; } });
  for (const ms of [5, 1.7]) { const D = Math.round(ms * SR / 1000), z = Float32Array.from(y);
    for (let i = 0; i < N; i++) y[i] = -0.7 * z[i] + (i >= D ? z[i - D] + 0.7 * y[i - D] : 0); }
  return y;
};
const revL = reverb(send.L, [29.7, 37.1, 41.1, 43.7]), revR = reverb(send.R, [31.3, 35.9, 42.7, 45.1]);

// ---------- MIX ----------
const L = new Float32Array(N), R = new Float32Array(N);
const mix = (o, k) => 0.5 * pad[k][o] + 0.75 * stabs[k][o] + 0.75 * bass[k][o] + 0.45 * lead[k][o] + 0.85 * drums[k][o] + 0.6 * hits[k][o];
for (let i = 0; i < N; i++) { L[i] = mix(i, 'L') + 0.5 * revL[i]; R[i] = mix(i, 'R') + 0.5 * revR[i]; }
normalize(1, L, R);
for (const c of [L, R]) c.forEach((x, i) => { c[i] = Math.tanh(1.7 * x) / Math.tanh(1.7); });
// sfumata negli ultimi 0,3 s
for (const c of [L, R]) for (let i = N - Math.round(0.3 * SR); i < N; i++) c[i] *= (N - i) / (0.3 * SR);
normalize(0.9, L, R);
wav('music.wav', L, R);

// ============================================================
// EFFETTI SONORI (mono)
// ============================================================
const fx = (len, fn) => { const a = new Float32Array(Math.round(len * SR)); a.forEach((_, i) => { a[i] = fn(i / SR); }); normalize(0.9, a); return a; };
const tick = (t, f, a) => t < 0 ? 0 : a * Math.exp(-t * 400) * (Math.sin(TAU * f * t) + 0.5 * rnd());

// Pop sulla pentatonica di Re minore: una fila di pop suona come una melodia
[74, 77, 79, 81, 84, 86, 89, 91, 93, 96].forEach((m, i) => {
  const f = hz(m);
  wav(`pop-${i}.wav`, fx(0.25, t => {
    const ph = TAU * f * (t + 0.5 * 0.015 * (1 - Math.exp(-t / 0.015)));
    return Math.exp(-t * 22) * Math.min(1, t / 0.002) * (Math.sin(ph) + 0.3 * Math.sin(2 * ph));
  }));
});
// Contachilometri: uno scatto a ogni decina, veloce all'inizio e sempre più lento (come l'easing del numero).
// roll: 0 → 254 in 1,5 s; rolldown: 254 → 120 in 0,45 s
const roll = (len, steps, ease) => fx(len, t => {
  let v = 0;
  for (let k = 1; k <= steps; k++) { const tk = ease(k / steps) * len * 0.92; v += tick(t - tk, 2400 + 600 * (k % 2), 0.5 + 0.5 * k / steps); }
  return v;
});
wav('roll.wav', roll(1.5, 25, u => 1 - Math.cbrt(1 - u)));
wav('rolldown.wav', roll(0.45, 13, u => u));
wav('click.wav', fx(0.12, t => tick(t, 2800, 1) + tick(t - 0.07, 3400, 0.4)));
wav('switch.wav', fx(0.2, t => tick(t, 1400, 1) + tick(t - 0.035, 1900, 0.7) + (t > 0.035 ? 0.4 * Math.exp(-(t - 0.035) * 30) * Math.sin(TAU * 520 * t) : 0)));
// Timbro: tonfo grave + schiocco di carta
wav('stamp.wav', fx(0.3, t => 0.9 * Math.exp(-t * 28) * Math.sin(TAU * (90 * t + 60 * (1 - Math.exp(-t * 60)) / 60)) + 0.35 * Math.exp(-t * 90) * rnd()));
const swish = (len, f0, f1, shape) => { let y = 0, z = 0; return fx(len, t => {
  const u = t / len, fc = f0 * (f1 / f0) ** u, a = 1 - Math.exp(-TAU * fc / SR);
  y += a * (rnd() - y); z += a * (y - z); return (y - 0.5 * z) * shape(u);
}); };
wav('whoosh.wav', swish(0.6, 300, 3000, u => Math.sin(Math.PI * u) ** 2));
// Colpo di frusta per i passaggi veloci (whip pan): breve, sale molto
wav('whip.wav', swish(0.32, 400, 9000, u => Math.sin(Math.PI * u ** 0.6) ** 3));
// Evidenziatore trascinato su una settimana: feltro che sfrega, con un leggero tremolio della mano
wav('marker.wav', swish(0.75, 1800, 3200, u => Math.min(1, u * 12) * (1 - u) ** 0.3 * (0.75 + 0.25 * Math.sin(TAU * 11 * u))));
// Carta che vola (eventi nell'export)
wav('card.wav', swish(0.18, 2500, 7000, u => Math.sin(Math.PI * u) ** 2));

console.log('Suoni scritti in', decodeURIComponent(OUT.pathname));
