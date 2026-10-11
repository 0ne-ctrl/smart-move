import { Composition } from 'remotion';
import { Promo } from './Promo';
import { MonthScene } from './scenes/Month';
import { LangContext, type Lang } from './i18n';
import { Background } from './theme';
import { END, MONTH, OUTRO } from './timing';

// Solo il mese (ritmo → export) con gli aloni dello sfondo fermi, per la GIF orizzontale del README (docs/demo-wide*.gif)
const MonthOnly: React.FC<{ lang: Lang }> = ({ lang }) => (
  <LangContext.Provider value={lang}><Background still /><MonthScene /></LangContext.Provider>
);

// Promo v2: lo stesso componente in verticale (Reels, TikTok, Shorts) e in orizzontale (YouTube, README),
// in italiano e, con "EN", in inglese. 960 fotogrammi = 16 battute a 120 BPM = 32 s.
const TALL = { fps: 30, width: 1080, height: 1920, durationInFrames: END };
const WIDE = { ...TALL, width: 1920, height: 1080 };
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="PromoV2" component={Promo} {...TALL} defaultProps={{ lang: 'it' as Lang }} />
    <Composition id="PromoV2EN" component={Promo} {...TALL} defaultProps={{ lang: 'en' as Lang }} />
    <Composition id="PromoV2Wide" component={Promo} {...WIDE} defaultProps={{ lang: 'it' as Lang }} />
    <Composition id="PromoV2WideEN" component={Promo} {...WIDE} defaultProps={{ lang: 'en' as Lang }} />
    <Composition id="DemoV2Wide" component={MonthOnly} {...WIDE} durationInFrames={OUTRO - MONTH} defaultProps={{ lang: 'it' as Lang }} />
    <Composition id="DemoV2WideEN" component={MonthOnly} {...WIDE} durationInFrames={OUTRO - MONTH} defaultProps={{ lang: 'en' as Lang }} />
  </>
);
