import { AbsoluteFill, Composition } from 'remotion';
import { Promo } from './Promo';
import { DemoScene } from './scenes/Demo';
import { LangContext, type Lang } from './i18n';
import { C } from './theme';
import { DEMO, END, OUTRO } from './timing';

// Solo la demo su sfondo navy fermo (niente aloni a tempo): da qui si fa docs/demo.gif del README
const DemoOnly: React.FC<{ lang: Lang }> = ({ lang }) => (
  <LangContext.Provider value={lang}><AbsoluteFill style={{ background: C.bg }}><DemoScene /></AbsoluteFill></LangContext.Provider>
);

// Trailer verticale 1080×1920 (Reels, TikTok, Shorts), 30 fotogrammi al secondo.
// END = 952 fotogrammi = 17 battute da 56 (vedi timing.ts) ≈ 31,7 s. Ogni composizione in italiano e, con "EN", in inglese.
const V = { fps: 30, width: 1080, height: 1920 };
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="SmartMovePromo" component={Promo} durationInFrames={END} {...V} defaultProps={{ lang: 'it' as Lang }} />
    <Composition id="SmartMovePromoEN" component={Promo} durationInFrames={END} {...V} defaultProps={{ lang: 'en' as Lang }} />
    <Composition id="SmartMoveDemo" component={DemoOnly} durationInFrames={OUTRO - DEMO} {...V} defaultProps={{ lang: 'it' as Lang }} />
    <Composition id="SmartMoveDemoEN" component={DemoOnly} durationInFrames={OUTRO - DEMO} {...V} defaultProps={{ lang: 'en' as Lang }} />
  </>
);
