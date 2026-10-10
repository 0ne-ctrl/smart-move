import { AbsoluteFill, Composition } from 'remotion';
import { Promo } from './Promo';
import { DemoScene } from './scenes/Demo';
import { C } from './theme';
import { DEMO, END, OUTRO } from './timing';

// Solo la demo su sfondo navy fermo (niente aloni a tempo): da qui si fa docs/demo.gif del README
const DemoOnly: React.FC = () => <AbsoluteFill style={{ background: C.bg }}><DemoScene /></AbsoluteFill>;

// Trailer verticale 1080×1920 (Reels, TikTok, Shorts), 30 fotogrammi al secondo.
// END = 952 fotogrammi = 17 battute da 56 (vedi timing.ts) ≈ 31,7 s
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="SmartMovePromo" component={Promo} durationInFrames={END} fps={30} width={1080} height={1920} />
    <Composition id="SmartMoveDemo" component={DemoOnly} durationInFrames={OUTRO - DEMO} fps={30} width={1080} height={1920} />
  </>
);
