// ============================================================
// TRAILER COMPLETO, montato sulla musica (vedi timing.ts): tagli netti sui battiti, niente dissolvenze,
// così non si vedono mai due calendari sovrapposti.
//   domanda (0) → drop + logo (224) → demo con un solo calendario (280) → chiusura (840) → fine (952)
// ============================================================
import { Audio } from '@remotion/media';
import { AbsoluteFill, interpolate, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { DemoScene } from './scenes/Demo';
import { HookScene } from './scenes/Hook';
import { LogoScene } from './scenes/Logo';
import { OutroScene } from './scenes/Outro';
import { LangContext, type Lang } from './i18n';
import { Background } from './theme';
import { BAR, BEAT, DEMO, END, LOGO, OUTRO } from './timing';

export const Promo: React.FC<{ lang: Lang }> = ({ lang }) => {
  const frame = useCurrentFrame();
  // Dal drop in poi gli aloni si accendono a ogni cassa (un battito = BEAT fotogrammi)
  const pulse = frame >= LOGO && frame < END - BAR ? Math.exp(-(frame % BEAT) / 4) : 0;
  // Lampo bianco sul drop e sul colpo finale
  const flash = Math.max(...[LOGO, END - BAR].map(t => interpolate(frame, [t, t + 8], [0.6, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) * (frame >= t ? 1 : 0)));
  // La lingua delle scritte (it/en) passa a tutte le scene
  return (
    <LangContext.Provider value={lang}>
      <AbsoluteFill>
        <Background pulse={pulse} />
        {/* Musica generata da scripts/suoni.mjs: ha già le sue dinamiche, qui solo il volume e la sfumata finale */}
        <Audio name="Musica" src={staticFile('sfx/music.wav')}
          volume={f => interpolate(f, [END - 20, END], [0.8, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />
        <Sequence name="Domanda" durationInFrames={LOGO}><HookScene /></Sequence>
        <Sequence name="Logo" from={LOGO} durationInFrames={DEMO - LOGO}><LogoScene /></Sequence>
        <Sequence name="Demo" from={DEMO} durationInFrames={OUTRO - DEMO}><DemoScene /></Sequence>
        <Sequence name="Chiusura" from={OUTRO} durationInFrames={END - OUTRO}><OutroScene /></Sequence>
        <AbsoluteFill style={{ background: '#fff', opacity: flash, pointerEvents: 'none' }} />
      </AbsoluteFill>
    </LangContext.Provider>
  );
};
