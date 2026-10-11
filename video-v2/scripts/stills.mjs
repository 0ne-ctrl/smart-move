// Fotogrammi di controllo: un solo bundle, poi un PNG per ogni (composizione, fotogramma).
// Uso (in remotion-box, dentro video-v2/): node scripts/stills.mjs <cartella> <fotogrammi, es. 10,60,95> [composizioni, es. PromoV2,PromoV2Wide]
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';

const [dir, frames, comps = 'PromoV2,PromoV2Wide'] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
for (const id of comps.split(',')) {
  const composition = await selectComposition({ serveUrl, id });
  for (const frame of frames.split(',').map(Number)) {
    const output = path.join(dir, `${id}-${String(frame).padStart(3, '0')}.png`);
    await renderStill({ serveUrl, composition, frame, output, scale: 0.5 });
    console.log(output);
  }
}
