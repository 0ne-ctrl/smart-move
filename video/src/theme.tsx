// ============================================================
// COLORI, FONT E SFONDO: gli stessi del tema scuro di style.css
// ============================================================
import { loadFont } from '@remotion/fonts';
import { AbsoluteFill, staticFile, useCurrentFrame } from 'remotion';

// Titillium Web, pesi 400/600/700 (come l'app: niente 500)
for (const w of ['400', '600', '700']) {
  loadFont({ family: 'Titillium Web', url: staticFile(`fonts/titillium-web-${w}.woff2`), weight: w });
}
export const FONT = '"Titillium Web", system-ui, sans-serif';

// Tema scuro navy (variabili CSS --bg, --text, --smart… di style.css)
export const C = {
  bg: '#010b1a', text: '#f0f6fc', muted: '#9bb3cf', line: '#173e72', print: '#4d94db',
  smart: '#0066cc', smartText: '#fff', smartAuto: '#0a2a5c', smartAutoText: '#b2d1f0',
  office: '#b2d1f0', ferie: '#cdb447', ferieText: '#221d05', holiday: '#4a1f2b', holidayText: '#ff9f92',
  glass: 'rgb(3 23 51 / .5)', glassEdge: 'rgb(178 209 240 / .14)',
  // Componenti alla Glisse (sezione COMPONENTI di style.css): pulsanti di vetro, niente blu pieno
  btnGlass: 'rgb(140 180 230 / .1)', btnGlassOn: 'rgb(140 180 230 / .22)', btnEdge: 'rgb(255 255 255 / .1)', highlight: 'rgb(235 240 250 / .12)',
  // scelta attiva: vetro tinto (--tint-bg è color-mix(#0066cc 30%, #031733)), testo e icona --tint
  tint: '#8cc0f2', tintBg: '#022f61', tintEdge: 'rgb(140 192 242 / .4)', tintTrack: '#2c6aa8', knob: '#e6f0fa',
  panel: '#061a3a', // menu e finestre: --glass-strong già sopra il fondo (pieni, sopra il calendario)
};
// Riflesso sul bordo del vetro (--rim), con lo spessore del video (px = 1px dell'app in scala)
export const rim = (px = 2) => `inset 0 ${px}px 0 rgb(255 255 255 / .16), inset 0 ${-px}px 0 rgb(0 0 0 / .3)`;
// Pulsante di vetro dell'app; on = premuto (si illumina, non si rimpicciolisce)
export const glassBtn = (on = false, px = 2): React.CSSProperties => ({
  background: on ? C.btnGlassOn : C.btnGlass, border: `${px}px solid ${C.btnEdge}`, boxShadow: rim(px),
});

// Icone dei due schemi, come i simboli #i-alt e #i-week di index.html
export const SegIcon: React.FC<{ week?: boolean; size: number }> = ({ week, size }) => (
  <svg viewBox="0 0 18 18" width={size} height={size} style={{ flex: 'none' }}>
    {week ? <>
      <g fill="currentColor"><rect x="7.3" y="3.3" width="9.4" height="4.4" rx="2.2" /><rect x="1.3" y="10.3" width="9.4" height="4.4" rx="2.2" /></g>
      <g fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="3.5" cy="5.5" r="1.6" /><circle cx="14.5" cy="12.5" r="1.6" /></g>
    </> : <>
      <g fill="currentColor"><circle cx="3.5" cy="5.5" r="2.2" /><circle cx="14.5" cy="5.5" r="2.2" /><circle cx="9" cy="12.5" r="2.2" /></g>
      <g fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="9" cy="5.5" r="1.6" /><circle cx="3.5" cy="12.5" r="1.6" /><circle cx="14.5" cy="12.5" r="1.6" /></g>
    </>}
  </svg>
);

// Contatore del mese coi segni al posto delle parole (cnt() in js/i18n.js): smart = cerchio mezzo pieno e mezzo tenue, ferie = capsula gialla
export const Count: React.FC<{ n: number; q: number; ferie?: number; size: number }> = ({ n, q, ferie, size }) => {
  const dot: React.CSSProperties = { display: 'inline-block', width: size, height: size, borderRadius: '50%', marginRight: size * 0.4, verticalAlign: '-0.05em',
    background: `linear-gradient(90deg, ${C.smart} 50%, ${C.smartAuto} 50%)`, border: `${size / 10}px solid ${C.smart}` };
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      <i style={dot} />{n}/{q}
      {!!ferie && <> · <i style={{ ...dot, width: size * 1.4, height: size * 0.8, borderRadius: 999, background: C.ferie, border: 0, verticalAlign: 0 }} />{ferie}</>}
    </span>
  );
};

// Sfondo come body::before dell'app: due aloni blu che si muovono piano.
// pulse (0–1) li accende a tempo di musica: nel drop si illuminano a ogni cassa. still: aloni fermi (GIF del README).
export const Background: React.FC<{ pulse?: number; still?: boolean }> = ({ pulse = 0, still = false }) => {
  const frame = useCurrentFrame(), f = still ? 0 : frame;
  return (
    <AbsoluteFill style={{
      background: `radial-gradient(900px 700px at ${20 + Math.sin(f / 90) * 8}% ${12 + Math.cos(f / 110) * 5}%, rgb(0 102 204 / ${0.48 + 0.3 * pulse}), transparent 70%),
                   radial-gradient(1000px 800px at ${85 - Math.sin(f / 100) * 8}% ${88 - Math.cos(f / 80) * 5}%, rgb(102 163 224 / ${0.22 + 0.25 * pulse}), transparent 70%),
                   ${C.bg}`,
    }} />
  );
};
