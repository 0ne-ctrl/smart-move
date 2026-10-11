// SCENA 1 (battute 0–1): i numeri veri. Un contachilometri gira fino ai giorni di lavoro del 2026 (254),
// sulla battuta 1 scende a 120 (10 smart × 12 mesi) e diventa blu, sul terzo battito arriva "Quali?".
// Negli ultimi fotogrammi tutto implode al centro: da lì esplodono i 365 giorni della scena dopo.
import { Audio } from '@remotion/media';
import { AbsoluteFill, Easing, staticFile, useCurrentFrame } from 'remotion';
import { useT } from '../i18n';
import { useLayout } from '../layout';
import { QUOTA, workdays } from '../plan';
import { C, FONT } from '../theme';
import { BAR, BEAT, lerp, out, punch } from '../timing';

const WORK = workdays(2026), SMART = QUOTA * 12;
const UP = Math.round(1.5 * 30 * 0.92), DOWN = BAR, DOWN_LEN = 13.5; // come roll.wav e rolldown.wav
const WHICH = BAR + 2 * BEAT, IMPLODE = 2 * BAR - 8;

// Valore del contachilometri nel fotogramma f (numero con decimali: le cifre girano in modo continuo)
const valueAt = (f: number) => f < DOWN
  ? WORK * Easing.out(Easing.cubic)(Math.min(1, f / UP))
  : lerp(f, [DOWN, DOWN + DOWN_LEN], [WORK, SMART], Easing.inOut(Easing.quad));

// Contachilometri: ogni cifra è una striscia 0…9 che scorre. Le cifre alte girano solo mentre
// quella sotto passa da 9 a 0 (come quelli veri); la sfocatura segue la velocità.
const Odometer: React.FC<{ v: number; speed: number; size: number; color: string }> = ({ v, speed, size, color }) => {
  const h = size * 1.05;
  return (
    <div style={{ display: 'flex', height: h, overflow: 'hidden', fontSize: size, fontWeight: 700, lineHeight: `${h}px`, color,
      maskImage: 'linear-gradient(transparent, #000 18%, #000 82%, transparent)' }}>
      {[2, 1, 0].map(p => {
        const unit = 10 ** p, below = v % unit;
        const pos = Math.floor(v / unit) % 10 + (p === 0 ? v % 1 : Math.max(0, below - (unit - 1)));
        return (
          <div key={p} style={{ width: size * 0.56, textAlign: 'center', translate: `0px ${-pos * h}px`,
            filter: `blur(${Math.min(10, speed / unit ** 0.5 * 0.5)}px)` }}>
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, i) => <div key={i}>{d}</div>)}
          </div>
        );
      })}
    </div>
  );
};

export const CountScene: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useT(), L = useLayout();
  const v = valueAt(frame), speed = Math.abs(v - valueAt(frame - 1));
  const blue = lerp(frame, [DOWN, DOWN + DOWN_LEN], [0, 1]);
  // il numero sale e si rimpicciolisce quando arriva "Quali?"
  const lift = lerp(frame, [WHICH - 4, WHICH + 6], [0, 1], out);
  const implode = lerp(frame, [IMPLODE, 2 * BAR], [0, 1], Easing.in(Easing.cubic));
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.text, alignItems: 'center', justifyContent: 'center',
      scale: String(1 - 0.9 * implode), opacity: 1 - implode, rotate: `${implode * 8}deg` }}>
      <Audio name="Contachilometri" src={staticFile('sfx/roll.wav')} volume={0.5} />
      <Audio name="Contachilometri giù" from={DOWN} src={staticFile('sfx/rolldown.wav')} volume={0.5} />
      <Audio name="Implosione" from={IMPLODE - 6} src={staticFile('sfx/whoosh.wav')} volume={0.3} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
        translate: `0px ${-lift * (L.portrait ? 260 : 170)}px`, scale: String(1 - 0.35 * lift) }}>
        {/* l'anno, piccolo e spaziato, sopra il numero */}
        <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: '0.5em', marginRight: '-0.5em', color: C.print, ...punch(frame, 0, 1.1) }}>2026</div>
        <div style={{ ...punch(frame, 0, 1.3) }}>
          <Odometer v={v} speed={speed} size={L.big}
            color={`color-mix(in srgb, ${C.print} ${blue * 100}%, ${C.text})`} />
        </div>
        {/* etichetta: cambia sulla battuta 1 insieme al numero */}
        <div style={{ position: 'relative', height: 70, width: L.W, fontSize: 56, fontWeight: 600, color: C.muted, textAlign: 'center' }}>
          {frame < DOWN
            ? <div style={punch(frame, BEAT, 1.2)}>{t.workdays}</div>
            : <div style={{ color: C.text, ...punch(frame, DOWN + 4, 1.2) }}>{t.smartDays}</div>}
        </div>
      </div>
      <div style={{ position: 'absolute', top: '50%', width: '100%', textAlign: 'center', fontSize: L.portrait ? 190 : 200,
        fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, translate: `0px ${L.portrait ? 40 : 60}px`, ...punch(frame, WHICH, 2.2) }}>
        {t.which}
      </div>
    </AbsoluteFill>
  );
};
