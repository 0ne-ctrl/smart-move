// SCENA 1 (battute 0–3): il problema. La domanda entra parola per parola sui colpi della musica,
// poi intorno esplodono i dubbi (con i segni dell'app), tutto viene risucchiato e resta "Ci pensa".
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, FONT } from '../theme';
import { BAR, BEAT, punch } from '../timing';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// Domanda: una riga per battito della prima battuta
const QUESTION = ['Quando vado', 'in ufficio', 'questo', 'mese?'];

// Dubbi che spuntano a ottavi nelle battute 1–2: testo, segno, posizione (% dello schermo), rotazione
type Kind = 'plain' | 'dash' | 'smart' | 'ferie' | 'holiday';
const CHIPS: [string, Kind, number, number, number][] = [
  ['lunedì?', 'plain', 24, 10, -6], ['max 3 a settimana', 'dash', 64, 17, 4], ['ferie', 'ferie', 20, 26, -3], ['10 al mese', 'smart', 76, 30, 5],
  ['il ponte?', 'plain', 28, 70, -5], ['Pasquetta', 'holiday', 72, 75, 3], ['mercoledì?', 'plain', 30, 84, 6], ['riunione giovedì', 'dash', 64, 91, -4],
  ['ufficio?', 'plain', 78, 8, 3], ['smart?', 'dash', 18, 42, -8], ['ferie ad agosto', 'ferie', 72, 52, 4], ['4 ottobre', 'holiday', 22, 60, -4],
  ['giovedì?', 'plain', 80, 64, 7], ['venerdì?', 'plain', 46, 4, -2], ['settimana a cavallo', 'dash', 46, 96, 3], ['…boh', 'plain', 50, 47, 0],
];
// Stile di ogni segno, come gli stati del calendario
const KIND: Record<Kind, React.CSSProperties> = {
  plain: { color: C.text },
  dash: { background: C.smartAuto, border: `3px dashed ${C.smartAutoText}`, color: C.smartAutoText, padding: '6px 22px', borderRadius: 20 },
  smart: { background: C.smart, color: C.smartText, fontWeight: 700, padding: '8px 24px', borderRadius: 20 },
  ferie: { background: C.ferie, color: C.ferieText, padding: '2px 18px', borderRadius: 14 },
  holiday: { background: C.holiday, color: C.holidayText, fontWeight: 700, padding: '8px 24px', borderRadius: 20 },
};

const SUCK = 3 * BAR, THINK = 3 * BAR + 2 * BEAT; // risucchio (battuta 3) e "Ci pensa" (terzo battito)

export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Telecamera che trema sempre di più mentre i dubbi si accumulano
  const amp = interpolate(frame, [BAR, SUCK + BEAT], [0, 14], clamp);
  const shake = `${amp * Math.sin(frame * 1.7) * Math.cos(frame * 0.9)}px ${amp * Math.sin(frame * 2.3 + 1)}px`;
  // Battuta 3: tutto viene risucchiato al centro girando
  const suck = interpolate(frame, [SUCK, SUCK + 26], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.text }}>
      <AbsoluteFill style={{ translate: shake, scale: String(1 - suck), rotate: `${-25 * suck}deg`, opacity: 1 - suck }}>
        {/* Domanda: si spegne quando arrivano i dubbi */}
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: '100px 80px',
          opacity: interpolate(frame, [BAR, BAR + 8], [1, 0.22], clamp), scale: String(interpolate(frame, [BAR, BAR + 8], [1, 0.92], clamp)) }}>
          {QUESTION.map((line, i) => (
            <div key={line} style={{ fontSize: 150, fontWeight: 700, lineHeight: 1.02, letterSpacing: '-0.02em',
              color: i === 3 ? C.print : C.text, ...punch(frame, i * BEAT) }}>{line}</div>
          ))}
        </AbsoluteFill>
        {/* Dubbi a ottavi */}
        {CHIPS.map(([text, kind, x, y, rot], i) => {
          const at = BAR + i * BEAT / 2, s = spring({ frame: frame - at, fps, config: { damping: 9, stiffness: 220 } });
          return (
            <div key={text} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, translate: '-50% -50%', rotate: `${rot}deg`,
              scale: String(s * (i === CHIPS.length - 1 ? 1.6 : 1)), opacity: frame >= at ? 1 : 0,
              fontSize: 58, fontWeight: 600, whiteSpace: 'nowrap', ...KIND[kind] }}>{text}</div>
          );
        })}
      </AbsoluteFill>
      {/* Terzo battito della battuta 3: resta solo la risposta, poi silenzio fino al drop */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 150, fontWeight: 700, letterSpacing: '-0.02em', ...punch(frame, THINK, 1.8) }}>Ci pensa</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
