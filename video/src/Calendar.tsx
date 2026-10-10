// ============================================================
// CALENDARIO DI UN MESE, disegnato come nell'app (style.css, classi .d, .smart, .ferie…)
// Le misure dell'app sono moltiplicate per K: la casella passa da ~40px a 114px.
// ============================================================
import { interpolate } from 'remotion';
import { useT } from './i18n';
import { C, FONT } from './theme';
import type { Day, State } from './plan';

const K = 2.85, CELL = 114, GAP = 6;

// Segno di uno stato (il ::before delle caselle): tratteggio = proposto, timbro = fissato, evidenziatore = ferie
export const Mark: React.FC<{ state: State; p?: number }> = ({ state, p = 1 }) => {
  if (p <= 0) return null;
  const inset = state === 'smart' || state === 'office' ? 5 * K : 4 * K;
  const base: React.CSSProperties = {
    position: 'absolute', inset, borderRadius: 8 * K, opacity: p,
    // il timbro "cade" dall'alto, come l'animazione stamp dell'app
    scale: String(interpolate(p, [0, 1], [1.35, 1])),
  };
  if (state === 'smart-auto') return <div style={{ ...base, background: C.smartAuto, border: `${K}px dashed ${C.smartAutoText}` }} />;
  if (state === 'smart') return <div style={{ ...base, background: C.smart }} />;
  // Ufficio fissato: "timbro a righe", righe oblique a 135° più bordo (come .office in style.css)
  if (state === 'office') return <div style={{ ...base, border: `${K}px solid ${C.office}`,
    background: `repeating-linear-gradient(135deg, rgb(178 209 240 / .45) 0 ${1.5 * K}px, transparent ${1.5 * K}px ${5 * K}px)` }} />;
  if (state === 'holiday') return <div style={{ ...base, background: C.holiday }} />;
  // Evidenziatore: striscia bassa che sborda di poco e si stende da sinistra.
  // ponytail: angoli interni dritti tra ferie consecutive non gestiti, il video ne mostra una sola
  if (state === 'ferie') return <div style={{ ...base, inset: undefined, top: '26%', bottom: '22%', left: -K, right: -K,
    scale: `${interpolate(p, [0, 1], [0.2, 1])} 1`, transformOrigin: 'left', background: C.ferie }} />;
  return null;
};

// Colore e peso del numero per ogni stato (le variabili --fg dell'app)
const fg = (s: State) => ({
  weekend: 'rgb(155 179 207 / .7)', holiday: C.holidayText, ferie: C.ferieText, office: C.text,
  smart: C.smartText, 'smart-auto': C.smartAutoText, auto: C.text,
}[s]);
const bold = (s: State) => s === 'smart' || s === 'holiday' || s === 'office';

type Props = {
  y: number; m: number;
  days: Day[];
  prevDays?: Day[];           // piano di prima: ogni giorno passa dal vecchio segno al nuovo
  p?: (key: string) => number; // avanzamento 0→1 del passaggio, per giorno
  overlay?: Record<string, React.ReactNode>; // cose disegnate sopra un giorno (cursore, menu)
  label?: string;             // contatore a destra del nome del mese
};

export const Calendar: React.FC<Props> = ({ y, m, days, prevDays, p = () => 1, overlay = {}, label }) => {
  const t = useT();
  const offset = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7; // caselle vuote prima del giorno 1
  return (
    <div style={{
      fontFamily: FONT, color: C.text, padding: 40, borderRadius: 18 * K, background: C.glass,
      border: `2px solid ${C.glassEdge}`, boxShadow: '0 40px 90px -30px rgb(0 0 0 / .6)', backdropFilter: 'blur(30px) saturate(1.4)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 12px 24px' }}>
        <div style={{ fontSize: 60, fontWeight: 700, color: C.print }}>{t.months[m]} {y}</div>
        <div style={{ fontSize: 40, fontWeight: 600, color: C.muted }}>{label}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, ${CELL}px)`, gap: GAP }}>
        {t.dow.map((x, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 30, fontWeight: 600, color: C.muted, paddingBottom: 8 }}>{x}</div>
        ))}
        {Array.from({ length: offset }, (_, i) => <div key={'e' + i} />)}
        {days.map((x, i) => {
          const t = p(x.key), was = prevDays?.[i].state ?? 'auto', now = x.state;
          const s = t < 0.5 ? was : now;
          return (
            <div key={x.key} style={{
              position: 'relative', isolation: 'isolate', height: CELL, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 40, fontWeight: bold(s) ? 700 : 400, color: fg(s), zIndex: overlay[x.key] ? 10 : undefined,
            }}>
              <div style={{ position: 'absolute', inset: 0, zIndex: -1 }}>
                {was === now ? <Mark state={now} /> : <><Mark state={was} p={1 - t} /><Mark state={now} p={t} /></>}
              </div>
              {x.d}
              {overlay[x.key]}
            </div>
          );
        })}
      </div>
    </div>
  );
};
