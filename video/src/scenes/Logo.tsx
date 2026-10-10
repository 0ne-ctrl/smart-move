// SCENA 2 (battuta 4, il drop): "Smart Move" sbatte sullo schermo, sopra i tre segni dell'app,
// poi l'inquadratura ci passa attraverso per entrare nella demo.
import { Audio } from '@remotion/media';
import { AbsoluteFill, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Mark } from '../Calendar';
import type { State } from '../plan';
import { useT } from '../i18n';
import { C, FONT } from '../theme';
import { BAR, BEAT, punch } from '../timing';

const CELLS: [number, State][] = [[6, 'smart-auto'], [7, 'smart'], [8, 'ferie']];
const MARKS = BEAT / 2; // i tre segni cadono a ottavi dopo il colpo
// Easter egg "six seven": dopo l'8 il 6 e il 7 vanno su e giù a turno, uno al battito, fino all'uscita
const SIX7 = 2 * BEAT;
const bob = (frame: number, i: number) => i > 1 || frame < SIX7 ? 0
  : 10 * Math.min(1, (frame - SIX7) / 4) * Math.sin(2 * Math.PI * (frame - SIX7) / BEAT) * (i ? 1 : -1);

export const LogoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useT();
  const { fps } = useVideoConfig();
  // Ultimi 8 fotogrammi: zoom dentro il logo verso la demo
  const through = interpolate(frame, [BAR - 8, BAR], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad) });
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.text, alignItems: 'center', justifyContent: 'center', gap: 70,
      scale: String(1 + 1.6 * through), opacity: 1 - through }}>
      {CELLS.map((_, i) => <Audio key={i} name={`Pop segno ${i + 1}`} from={MARKS * (i + 1)} src={staticFile(`sfx/pop-${5 + i * 2}.wav`)} volume={0.4} />)}
      <Audio name="Fruscio verso la demo" from={BAR - 10} src={staticFile('sfx/whoosh.wav')} volume={0.35} />
      <div style={{ display: 'flex', gap: 16 }}>
        {CELLS.map(([d, s], i) => (
          <div key={d} style={{ position: 'relative', isolation: 'isolate', width: 170, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 60, fontWeight: s === 'smart' ? 700 : 400, color: s === 'smart' ? C.smartText : s === 'ferie' ? C.ferieText : C.smartAutoText,
            opacity: frame >= MARKS * (i + 1) ? 1 : 0, translate: `0px ${bob(frame, i)}px` }}>
            <div style={{ position: 'absolute', inset: 0, zIndex: -1 }}>
              <Mark state={s} p={spring({ frame: frame - MARKS * (i + 1), fps, config: { damping: 11 } })} />
            </div>
            {d}
          </div>
        ))}
      </div>
      <div style={{ fontSize: 180, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, ...punch(frame, 0, 2) }}>Smart Move</div>
      <div style={{ fontSize: 54, fontWeight: 600, color: C.muted, textAlign: 'center', lineHeight: 1.2, ...punch(frame, 2 * BEAT, 1.15) }}>
        {t.tagline[0]}<br />{t.tagline[1]}
      </div>
    </AbsoluteFill>
  );
};
