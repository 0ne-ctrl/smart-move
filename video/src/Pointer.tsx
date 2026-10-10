// Cursore del mouse e menu del giorno (come #menu nell'app), usati nella demo (ferie, giorno fisso, export).
// c1 = fotogramma del primo click, c2 = secondo click; frame è il tempo della scena.
import { Easing, interpolate, spring, useVideoConfig } from 'remotion';
import { C } from './theme';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// Freccia del mouse: entra dal basso a destra, clicca su a e poi su b (px dal centro del contenitore;
// di base a = centro del giorno, b = voce "Ferie" del menu)
type Pt = [number, number];
export const Cursor: React.FC<{ frame: number; c1: number; c2: number; a?: Pt; b?: Pt }> = ({ frame, c1, c2, a = [0, 0], b = [30, -212] }) => {
  const move = (a: number, b: number) => interpolate(frame, [a, b], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const t1 = move(c1 - 24, c1 - 3), t2 = move(c1 + 8, c2 - 5);
  const x = a[0] + 340 * (1 - t1) + (b[0] - a[0]) * t2, y = a[1] + 560 * (1 - t1) + (b[1] - a[1]) * t2;
  // "pressione": il cursore si rimpicciolisce un attimo a ogni click
  const press = Math.min(...[c1, c2].map(c => interpolate(frame, [c - 3, c, c + 4], [1, 0.82, 1], clamp)));
  const ring = (c: number) => interpolate(frame, [c, c + 14], [0, 1], clamp);
  return (
    <div style={{ position: 'absolute', left: '50%', top: '50%', translate: `${x}px ${y}px`, zIndex: 20,
      opacity: interpolate(frame, [c1 - 26, c1 - 20, c2 + 26, c2 + 38], [0, 1, 1, 0], clamp) }}>
      {[c1, c2].map(c => ring(c) > 0 && ring(c) < 1 && (
        <div key={c} style={{ position: 'absolute', width: 120, height: 120, left: -60, top: -60, borderRadius: '50%',
          border: `4px solid ${C.text}`, opacity: 1 - ring(c), scale: String(0.2 + ring(c)) }} />
      ))}
      <svg width="78" height="78" viewBox="0 0 24 24" style={{ position: 'absolute', left: -13, top: -6.5, scale: String(press), transformOrigin: '13px 6.5px',
        filter: 'drop-shadow(0 6px 10px rgb(0 0 0 / .5))' }}>
        <path d="M4 2l16 11.5-7 1.3L9 22z" fill="#fff" stroke={C.bg} strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

// Menu del giorno: automatico / smart / ufficio / ferie / ufficio ogni <giorno>, sopra la casella.
// pick = voce cliccata in c2; left = menu allineato a sinistra del giorno (prima colonna, altrimenti esce dallo schermo)
export const Menu: React.FC<{ frame: number; c1: number; c2: number; weekday: string; pick?: string; left?: boolean }> = ({ frame, c1, c2, weekday, pick = 'Ferie', left }) => {
  const { fps } = useVideoConfig();
  const open = spring({ frame: frame - c1 - 2, fps, config: { damping: 18 } }) * interpolate(frame, [c2 + 3, c2 + 10], [1, 0], clamp);
  if (open <= 0.01) return null;
  return (
    // pieno, non vetro: sopra il calendario il vetro lascerebbe leggere i giorni sotto
    <div style={{ position: 'absolute', bottom: '100%', left: left ? 0 : '50%', translate: left ? '-8px -12px' : '-50% -12px', padding: 8, borderRadius: 34, minWidth: 330,
      background: '#061a3a', border: `2px solid ${C.glassEdge}`, boxShadow: '0 30px 60px -20px rgb(0 0 0 / .6)',
      opacity: open, scale: String(interpolate(open, [0, 1], [0.9, 1])), transformOrigin: left ? 'bottom left' : 'bottom center', whiteSpace: 'nowrap', fontSize: 40, fontWeight: 400, color: C.text }}>
      {['Automatico', 'Smart', 'Ufficio', 'Ferie', `Ufficio ogni ${weekday}`].map(x => (
        <div key={x} style={{ padding: '10px 28px', borderRadius: 22, background: x === pick && frame >= c2 - 8 ? C.line : undefined,
          fontWeight: x === 'Automatico' && frame < c2 ? 700 : 400 }}>{x}</div>
      ))}
    </div>
  );
};
