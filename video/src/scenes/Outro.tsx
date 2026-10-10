// SCENA 4 (battute 15–16): chiusura. Sul taglio entra l'icona dell'app e la sua "S" si accende giorno per giorno,
// poi nome e frase a colpi; sul colpo finale della musica (battuta 16) arriva l'indirizzo del sito con un piccolo accordo.
import { Audio } from '@remotion/media';
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { useT } from '../i18n';
import { C, FONT } from '../theme';
import { BAR, BEAT, punch } from '../timing';

const HIT = BAR; // colpo finale = inizio della battuta 16
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// Icona dell'app, copiata da icons/icon.svg (se cambi quella, aggiorna qui): griglia 5×5 di giorni,
// i 13 accesi formano la "S" (in ordine di tratto, dall'alto a destra). I puntini stanno su tutti i 25 giorni,
// come un calendario vuoto: ogni giorno acceso copre il suo, quindi alla fine l'icona è uguale a quella dell'app.
const S = [[352, 112], [292, 112], [232, 112], [172, 112], [112, 172], [172, 232], [232, 232], [292, 232], [352, 292],
  [292, 352], [232, 352], [172, 352], [112, 352]];
const DOTS = Array.from({ length: 25 }, (_, i) => [136 + (i % 5) * 60, 136 + Math.floor(i / 5) * 60]);
const AppIcon: React.FC<{ frame: number }> = ({ frame }) => (
  <svg viewBox="0 0 512 512" width="300" height="300" style={{ filter: 'drop-shadow(0 30px 50px rgb(0 102 204 / .45))', ...punch(frame, 0, 1.8) }}>
    <defs><radialGradient id="g" cx="20%" cy="10%" r="100%">
      <stop offset="0" stopColor="#0a4a94" /><stop offset=".6" stopColor="#0a2a5c" /><stop offset="1" stopColor="#031733" />
    </radialGradient></defs>
    <rect width="512" height="512" rx="112" fill="url(#g)" />
    <g fill="#4d94db" opacity=".7">{DOTS.map(([x, y]) => <circle key={x + '-' + y} cx={x} cy={y} r="7" />)}</g>
    {/* un giorno acceso ogni sedicesimo, con il "timbro" dell'app (cade grande e si assesta) */}
    {S.map(([x, y], i) => {
      const at = 4 + i * BEAT / 4;
      return <rect key={i} x={x} y={y} width="48" height="48" rx="14" fill="#f0f6fc"
        style={{ transformBox: 'fill-box', transformOrigin: 'center', opacity: interpolate(frame, [at, at + 2], [0, 1], clamp),
          scale: String(interpolate(frame, [at, at + 4], [1.6, 1], clamp)) }} />;
    })}
  </svg>
);

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const t = useT();
  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.text, alignItems: 'center', justifyContent: 'center', gap: 50, padding: '100px 80px' }}>
      {/* Accordo do-mi-la sul colpo finale */}
      <Audio name="Accordo do" from={HIT} src={staticFile('sfx/pop-5.wav')} volume={0.25} />
      <Audio name="Accordo mi" from={HIT} src={staticFile('sfx/pop-7.wav')} volume={0.2} />
      <Audio name="Accordo la" from={HIT} src={staticFile('sfx/pop-9.wav')} volume={0.2} />
      <AppIcon frame={frame} />
      <div style={{ fontSize: 160, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, ...punch(frame, BEAT, 1.8) }}>Smart Move</div>
      <div style={{ fontSize: 50, fontWeight: 600, color: C.muted, textAlign: 'center', lineHeight: 1.3 }}>
        <div style={punch(frame, 2 * BEAT, 1.3)}>{t.outro[0]}</div>
        <div style={punch(frame, 3 * BEAT, 1.3)}>{t.outro[1]}</div>
      </div>
      <div style={{ fontSize: 50, fontWeight: 600, color: C.text, padding: '24px 48px', borderRadius: 999, background: C.smart,
        boxShadow: '0 0 80px rgb(0 102 204 / .6)', ...punch(frame, HIT, 1.6) }}>
        0ne-ctrl.github.io/smart-move
      </div>
    </AbsoluteFill>
  );
};
