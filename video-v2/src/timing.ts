// ============================================================
// TEMPO DEL PROMO v2, uguale a scripts/suoni.mjs: 120 BPM, 1 battito = 15 fotogrammi, 1 battuta = 60.
// Ogni scena inizia su una battuta, ogni animazione su un battito, un ottavo (7,5) o un sedicesimo.
// ============================================================
import { Easing, interpolate } from 'remotion';

export const BEAT = 15, BAR = 4 * BEAT, EIGHTH = BEAT / 2;
// Scene (fotogrammi): conteggio 0 · anno 120 · drop 240 · mese 300 · chiusura 840 · fine 960
export const YEAR = 2 * BAR, DROP = 4 * BAR, MONTH = 5 * BAR, OUTRO = 14 * BAR, END = 16 * BAR;

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
// interpolate già "chiuso" ai due estremi, con easing facoltativo
export const lerp = (f: number, i: number[], o: number[], easing?: (t: number) => number) => interpolate(f, i, o, { ...clamp, easing });
export const ease = Easing.bezier(0.65, 0, 0.35, 1), out = Easing.bezier(0.16, 1, 0.3, 1), inn = Easing.bezier(0.7, 0, 0.84, 0);

// "Colpo" su un battito (da v1): compare grande (from) e si assesta in 5 fotogrammi
export const punch = (frame: number, at: number, from = 1.5) => ({
  opacity: lerp(frame, [at, at + 2], [0, 1]),
  scale: String(lerp(frame, [at, at + 5], [from, 1], out)),
});
