// ============================================================
// SUONI: gli stessi del video promo (video/scripts/suoni.mjs), calcolati campione per campione,
// quindi nessun file audio. synth(nome, sr) restituisce il suono come numeri tra -1 e 1;
// a farlo suonare ci pensa play() in app.js.
// ============================================================
// Rumore pseudo-casuale con seme fisso: ogni suono viene sempre uguale
let seed = 7;
const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 * 2 - 1; };
const TAU = 2 * Math.PI, hz = m => 440 * 2 ** ((m - 69) / 12); // nota MIDI → frequenza (69 = La 440)
// Scatto secco (base di clic e interruttore): rumore + nota acuta che si spengono in pochi millesimi
const tick = (t, f, a) => t < 0 ? 0 : a * Math.exp(-t * 400) * (Math.sin(TAU * f * t) + 0.5 * rnd());
// Rumore filtrato con taglio che si sposta da f0 a f1 (fruscio, evidenziatore); shape = volume nel tempo (0→1)
const swish = (sr, len, f0, f1, shape) => { let y = 0; return [len, t => {
  const u = t / len, fc = f0 * (f1 / f0) ** u;
  y += (1 - Math.exp(-TAU * fc / sr)) * (rnd() - y); return y * shape(u);
}]; };
// Ogni suono: sr (campioni al secondo) => [durata in secondi, funzione tempo → campione]
export const SOUNDS = {
  click: () => [0.12, t => tick(t, 2800, 1) + tick(t - 0.07, 3400, 0.4)],                         // pressione e rilascio
  switch: () => [0.2, t => tick(t, 1400, 1) + tick(t - 0.035, 1900, 0.7) + (t > 0.035 ? 0.4 * Math.exp(-(t - 0.035) * 30) * Math.sin(TAU * 520 * t) : 0)],
  whoosh: sr => swish(sr, 0.6, 300, 3000, u => Math.sin(Math.PI * u) ** 2),                            // sale e scende
  ferie: sr => swish(sr, 0.3, 900, 5000, u => Math.min(1, u * 4) * (1 - u) ** 0.5),                    // strisciata
};
// "Pop" di un timbro: dieci note della pentatonica di Do (pop0 = Do5 … pop9 = La6), così più pop di fila fanno una melodia
[72, 74, 76, 79, 81, 84, 86, 88, 91, 93].forEach((m, i) => SOUNDS['pop' + i] = () => [0.25, t => {
  const f = hz(m), ph = TAU * f * (t + 0.5 * 0.015 * (1 - Math.exp(-t / 0.015))); // parte un po' più acuta e scende in 15 ms
  return Math.exp(-t * 22) * Math.min(1, t / 0.002) * (Math.sin(ph) + 0.3 * Math.sin(2 * ph));
}]);
export function synth(name, sr) {
  seed = 7; // stesso rumore a ogni chiamata, qualunque suono sia stato calcolato prima
  const [len, fn] = SOUNDS[name](sr), a = new Float32Array(Math.round(len * sr));
  for (let i = 0; i < a.length; i++) a[i] = fn(i / sr);
  const peak = a.reduce((p, x) => Math.max(p, Math.abs(x)), 0);
  return a.map(x => x / peak * 0.9); // stesso volume massimo per tutti
}
