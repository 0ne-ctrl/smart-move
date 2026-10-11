// SCENA 9 (battute 14–15): si torna all'anno.
//   battuta 14 (pausa della musica): la telecamera parte da ottobre e si allarga su tutto il 2026 già pianificato
//              (piano vero: ferie della settimana del 12, ufficio ogni lunedì, schema weekend); un riflesso attraversa l'anno,
//              poi tutto viene risucchiato al centro sulla salita
//   battuta 15 (colpo finale): icona con la S che si timbra a sedicesimi, nome, frase, indirizzo
import { Audio } from '@remotion/media';
import { AbsoluteFill, Easing, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { useT } from '../i18n';
import { useLayout } from '../layout';
import { ferieRange, withWeekly, yearPlan } from '../plan';
import { C, FONT } from '../theme';
import { BAR, BEAT, lerp, out, punch } from '../timing';
import { DOTS, S } from './Year';

const FERIE = Object.fromEntries(ferieRange('2026-10-12', '2026-10-16').map(k => [k, 'ferie' as const]));
const PLAN = yearPlan(2026, withWeekly(FERIE, [1], 2026), 'weekend');
const SUCK = BAR - 12, HIT = BAR;

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useT(), L = useLayout(), Y = { ...L.year, y0: L.year.y0 + (L.portrait ? 70 : 50) };
  const monthW = 7 * Y.cell + Y.gapX, monthH = Y.title + 6 * Y.cell + Y.gapY;
  // ottobre (mese 9): da lì parte la telecamera
  const ox = Y.x0 + (9 % Y.cols) * monthW + 3.5 * Y.cell, oy = Y.y0 + Math.floor(9 / Y.cols) * monthH + Y.title + 3 * Y.cell;
  const zoomStart = (L.portrait ? 900 : 800) / (7 * Y.cell);
  const z = lerp(frame, [0, 46], [0, 1], Easing.bezier(0.6, 0, 0.1, 1));
  const s = zoomStart + (1 - zoomStart) * z;
  // la telecamera porta ottobre dal centro dello schermo alla sua posizione
  const tx = (L.W / 2 - ox) * (1 - z), ty = (L.H / 2 - oy) * (1 - z);
  const suck = lerp(frame, [SUCK, HIT], [0, 1], Easing.in(Easing.cubic));
  const shine = lerp(frame, [22, 52], [-0.3, 1.3]); // riflesso in diagonale

  const grid = PLAN.map((days, m) => {
    const offset = (new Date(Date.UTC(2026, m, 1)).getUTCDay() + 6) % 7;
    const mx = Y.x0 + (m % Y.cols) * monthW, my = Y.y0 + Math.floor(m / Y.cols) * monthH;
    return (
      <div key={m}>
        <div style={{ position: 'absolute', left: mx, top: my, fontSize: Y.title * 0.62, fontWeight: 700, letterSpacing: '0.12em',
          color: m === 9 ? C.text : C.print, textTransform: 'uppercase' }}>{t.months[m].slice(0, 3)}</div>
        {days.map((x, i) => {
          const c = (offset + i) % 7, r = Math.floor((offset + i) / 7);
          const px = mx + c * Y.cell, py = my + Y.title + r * Y.cell;
          const glow = Math.max(0, 1 - Math.abs((px / L.W + py / L.H) / 2 - shine) * 6);
          const k = Y.cell, st = x.state;
          const box: React.CSSProperties = { position: 'absolute', left: px + k * 0.12, top: py + k * 0.12, width: k * 0.76, height: k * 0.76, borderRadius: k * 0.2 };
          if (st === 'ferie') return <div key={i} style={{ ...box, left: px - 1, width: k + 2, top: py + k * 0.3, height: k * 0.42, borderRadius: 2, background: C.ferie }} />;
          if (st.startsWith('smart')) return <div key={i} style={{ ...box, background: glow > 0.05 ? `color-mix(in srgb, #fff ${glow * 70}%, ${C.smart})` : C.smart,
            boxShadow: glow > 0.05 ? `0 0 ${20 * glow}px rgb(120 180 255 / ${glow})` : undefined }} />;
          if (st === 'office') return <div key={i} style={{ ...box, border: `2px solid ${C.office}`, opacity: 0.8 }} />;
          if (st === 'holiday') return <div key={i} style={{ ...box, background: C.holidayText, opacity: 0.85 }} />;
          return <div key={i} style={{ ...box, left: px + k * 0.38, top: py + k * 0.38, width: k * 0.24, height: k * 0.24, borderRadius: '50%',
            background: C.muted, opacity: st === 'weekend' ? 0.25 : 0.5 }} />;
        })}
      </div>
    );
  });

  const icon = L.icon.size * (L.portrait ? 0.82 : 0.7);
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.text, overflow: 'hidden' }}>
      <Audio name="Risucchio" from={SUCK - 6} src={staticFile('sfx/whoosh.wav')} volume={0.4} />
      {S.map((_, i) => <Audio key={i} name={`S ${i + 1}`} from={Math.round(HIT + 2 + i * BEAT / 4)} src={staticFile(`sfx/pop-${i}.wav`)} volume={0.18} />)}
      {frame < HIT && (
        <AbsoluteFill style={{ opacity: 1 - suck, scale: String(1 - 0.92 * suck), rotate: `${-20 * suck}deg` }}>
          <AbsoluteFill style={{ translate: `${tx}px ${ty}px`, scale: String(s), transformOrigin: `${ox}px ${oy}px` }}>{grid}</AbsoluteFill>
          <div style={{ position: 'absolute', top: L.portrait ? 150 : 70, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: L.portrait ? 96 : 84, fontWeight: 700, letterSpacing: '-0.025em', ...punch(frame, BEAT, 1.5) }}>{t.year[0]}</div>
            <div style={{ fontSize: L.portrait ? 50 : 44, fontWeight: 600, color: C.muted, ...punch(frame, 2 * BEAT, 1.2) }}>{t.year[1]}</div>
          </div>
        </AbsoluteFill>
      )}
      {frame >= HIT && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: L.portrait ? 50 : 30, padding: 60,
          scale: String(1 + 0.04 * lerp(frame, [HIT, 2 * BAR], [0, 1])) }}>
          <svg viewBox="0 0 512 512" width={icon} height={icon} style={{ filter: 'drop-shadow(0 40px 70px rgb(0 102 204 / .55))', ...punch(frame, HIT, 1.8) }}>
            <defs><radialGradient id="g3" cx="20%" cy="10%" r="100%">
              <stop offset="0" stopColor="#0a4a94" /><stop offset=".6" stopColor="#0a2a5c" /><stop offset="1" stopColor="#031733" />
            </radialGradient></defs>
            <rect width="512" height="512" rx="112" fill="url(#g3)" />
            {DOTS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="6" fill="#4d94db" opacity={i % 7 > 4 ? 0.3 : 0.7} />)}
            {S.map(([x, y], i) => {
              const at = HIT + 2 + i * BEAT / 4;
              return <rect key={i} x={x} y={y} width="41" height="41" rx="10" fill="#f0f6fc" style={{ transformBox: 'fill-box', transformOrigin: 'center',
                opacity: lerp(frame, [at, at + 2], [0, 1]), scale: String(lerp(frame, [at, at + 4], [1.7, 1])) }} />;
            })}
          </svg>
          <div style={{ fontSize: L.portrait ? 170 : 150, fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1, ...punch(frame, HIT + 2, 1.6) }}>Smart Move</div>
          <div style={{ fontSize: L.portrait ? 46 : 40, fontWeight: 600, color: C.muted, textAlign: 'center', maxWidth: 900, lineHeight: 1.3,
            ...punch(frame, HIT + BEAT, 1.2) }}>{t.outro[0]}<br />{t.outro[1]}</div>
          <div style={{ fontSize: L.portrait ? 50 : 44, fontWeight: 700, padding: '22px 48px', borderRadius: 999, background: C.smart,
            boxShadow: `0 0 ${60 + 30 * Math.sin(frame / 6)}px rgb(0 102 204 / .6)`, ...punch(frame, HIT + 2 * BEAT, 1.5),
            translate: `0px ${(1 - spring({ frame: frame - HIT - 2 * BEAT, fps, config: { damping: 12 } })) * 40}px` }}>
            smart-move.it
          </div>
        </AbsoluteFill>
      )}
      {/* sulla pausa: la riga di luce che segue la telecamera */}
      <AbsoluteFill style={{ pointerEvents: 'none', opacity: frame < HIT ? lerp(frame, [0, 10], [0.6, 0], out) : 0,
        background: 'radial-gradient(closest-side, rgb(77 148 219 / .35), transparent)' }} />
    </AbsoluteFill>
  );
};
