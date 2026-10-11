// ============================================================
// PROMO v2 "Un anno in 32 secondi", montato sulla musica (scripts/suoni.mjs, 120 BPM):
//   conteggio (0) → anno (120) → drop + logo (240) → il mese (300) → l'anno pianificato + chiusura (840) → fine (960)
// Dall'anno si scende al mese, alla settimana, al giorno, e alla fine si torna all'anno.
// ============================================================
import { Audio } from '@remotion/media';
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { CountScene } from './scenes/Count';
import { YearScene } from './scenes/Year';
import { MonthScene } from './scenes/Month';
import { OutroScene } from './scenes/Outro';
import { LangContext, type Lang } from './i18n';
import { Background } from './theme';
import { BAR, BEAT, DROP, END, lerp, MONTH, OUTRO, YEAR } from './timing';

const HIT = END - BAR; // colpo finale

export const Promo: React.FC<{ lang: Lang }> = ({ lang }) => {
  const frame = useCurrentFrame();
  // Gli aloni dello sfondo si accendono a ogni cassa, dal drop alla pausa e sul colpo finale
  const pulse = (frame >= DROP && frame < OUTRO) || frame >= HIT ? Math.exp(-(frame % BEAT) / 5) : 0;
  const flash = Math.max(...[DROP, HIT].map(t => (frame >= t ? lerp(frame, [t, t + 9], [0.32, 0]) : 0)));
  return (
    <LangContext.Provider value={lang}>
      <AbsoluteFill>
        <Background pulse={pulse} />
        <Audio name="Musica" src={staticFile('sfx/music.wav')} />
        <Sequence name="Conteggio" durationInFrames={YEAR}><CountScene /></Sequence>
        <Sequence name="Anno e drop" from={YEAR} durationInFrames={MONTH - YEAR}><YearScene /></Sequence>
        <Sequence name="Il mese" from={MONTH} durationInFrames={OUTRO - MONTH}><MonthScene /></Sequence>
        <Sequence name="Anno pianificato e chiusura" from={OUTRO} durationInFrames={END - OUTRO}><OutroScene /></Sequence>
        <AbsoluteFill style={{ background: '#9cc8ff', mixBlendMode: 'screen', opacity: flash, pointerEvents: 'none' }} />
      </AbsoluteFill>
    </LangContext.Provider>
  );
};
