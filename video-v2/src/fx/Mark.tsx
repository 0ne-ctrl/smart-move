// ============================================================
// SEGNO DI UN GIORNO, come le caselle dell'app (.d::before in style.css), in scala per una casella di "cell" px.
// In più rispetto a v1: il timbro ha schiacciamento ed elasticità (squash & stretch) quando cade.
// ============================================================
import { interpolate } from 'remotion';
import type { State } from '../plan';
import { C } from '../theme';
import { lerp } from '../timing';

// Stato disegnato: quelli dell'app più "blank" (giorno non ancora rivelato, solo il numero tenue)
export type Look = State | 'blank';

// t = fotogrammi dall'arrivo del segno (null = è lì da sempre, nessuna animazione)
export const Mark: React.FC<{ state: Look; cell: number; t?: number | null; hp?: number }> = ({ state, cell, t = null, hp }) => {
  const K = cell / 40;
  // Timbro: cade grande (1.6 → 1), all'impatto si schiaccia e rimbalza
  const s = t === null ? 1 : lerp(t, [0, 4], [1.6, 1]);
  const squash = t === null ? 0 : interpolate(t, [3, 5, 8, 12], [0, 0.16, -0.06, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const o = t === null ? 1 : lerp(t, [0, 2], [0, 1]);
  const box: React.CSSProperties = { position: 'absolute', inset: 4 * K, borderRadius: 9 * K, opacity: o,
    scale: `${s * (1 + squash)} ${s * (1 - squash)}` };
  // Evidenziatore delle ferie: striscia bassa che sborda e si unisce ai giorni vicini; hp = quanto è già steso (0–1)
  const marker = (p: number) => p > 0 && (
    <div style={{ position: 'absolute', top: '27%', bottom: '21%', left: -K, width: `calc(${p * 100}% + ${2 * K * p}px)`,
      background: C.ferie, borderRadius: p < 1 ? `0 ${12 * K}px ${12 * K}px 0` : 2 * K,
      // bordo "bagnato": la punta che avanza è più scura e lucida
      boxShadow: p < 1 ? `inset ${-3 * K}px 0 ${2 * K}px rgb(120 95 0 / .55)` : undefined }} />
  );
  // onda d'urto all'impatto dei timbri
  const ring = t !== null && t >= 3 && t < 18 && (state === 'smart-auto' || state === 'smart' || state === 'office') && (
    <div style={{ position: 'absolute', inset: 4 * K, borderRadius: 11 * K, border: `${1.5 * K}px solid ${state === 'office' ? C.office : C.print}`,
      opacity: lerp(t, [3, 18], [0.9, 0]), scale: String(lerp(t, [3, 18], [1, 1.7], (x: number) => 1 - (1 - x) ** 3)) }} />
  );
  return (
    <>
      {ring}
      {state === 'smart-auto' && <div style={{ ...box, background: C.smartAuto, border: `${K}px dashed ${C.smartAutoText}` }} />}
      {state === 'smart' && <div style={{ ...box, background: C.smart }} />}
      {state === 'office' && <div style={{ ...box, inset: 5 * K, border: `${K}px solid ${C.office}`,
        background: `repeating-linear-gradient(135deg, rgb(178 209 240 / .45) 0 ${1.5 * K}px, transparent ${1.5 * K}px ${5 * K}px)` }} />}
      {state === 'holiday' && <div style={{ ...box, background: C.holiday }} />}
      {state === 'ferie' && marker(1)}
      {hp !== undefined && state !== 'ferie' && marker(hp)}
    </>
  );
};

// Colore e peso del numero per ogni stato (le variabili --fg dell'app)
export const fg = (s: Look) => ({
  weekend: 'rgb(155 179 207 / .55)', holiday: C.holidayText, ferie: C.ferieText, office: C.text, blank: 'rgb(155 179 207 / .28)',
  smart: C.smartText, 'smart-auto': C.smartAutoText, auto: C.text,
}[s]);
export const bold = (s: Look) => s === 'smart' || s === 'holiday' || s === 'office';
