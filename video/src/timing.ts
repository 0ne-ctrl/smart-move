// ============================================================
// TEMPO DEL TRAILER, uguale a scripts/suoni.mjs: 1 battito = 14 fotogrammi (128,57 BPM a 30 fps).
// Tutte le animazioni e i tagli partono da multipli di BEAT, così cadono sulla musica.
// Se cambi questi numeri, cambia anche BEAT/BARS nello script e rigenera la musica.
// ============================================================
import { Easing, interpolate } from 'remotion';

export const BEAT = 14, BAR = 4 * BEAT;
// Sezioni (fotogrammi):  domanda 0 · logo 224 (drop) · demo 280 · chiusura 840 · fine 952
export const LOGO = 4 * BAR, DEMO = 5 * BAR, OUTRO = 15 * BAR, END = 17 * BAR;

// "Colpo" su un battito: l'elemento compare grande (from) e si assesta in 5 fotogrammi
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
export const punch = (frame: number, at: number, from = 1.5) => ({
  opacity: interpolate(frame, [at, at + 2], [0, 1], clamp),
  scale: String(interpolate(frame, [at, at + 5], [from, 1], { ...clamp, easing: Easing.out(Easing.cubic) })),
});
