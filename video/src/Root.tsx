import { Composition } from 'remotion';
import { Promo } from './Promo';
import { END } from './timing';

// Trailer verticale 1080×1920 (Reels, TikTok, Shorts), 30 fotogrammi al secondo.
// END = 952 fotogrammi = 17 battute da 56 (vedi timing.ts) ≈ 31,7 s
export const RemotionRoot: React.FC = () => (
  <Composition id="SmartMovePromo" component={Promo} durationInFrames={END} fps={30} width={1080} height={1920} />
);
