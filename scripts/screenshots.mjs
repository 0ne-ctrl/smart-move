// Rifà le immagini del README in docs/ (italiano) e docs/en/ (inglese):
//   menu.png, export.png, onboarding.png       ritagli dell'app
//   desktop-light|dark.webp                    schermate intere: browser con il telefono sopra l'angolo (frame.html)
// Uso, dalla cartella del progetto: node scripts/screenshots.mjs
// Serve la pagina con python3 -m http.server e la fotografa con Chromium headless pilotato via DevTools (scripts/chromium.mjs).
// Chromium di base è il flatpak org.chromium.Chromium; per un altro: CHROME=/percorso/chromium node scripts/screenshots.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, ROOT, sleep } from './chromium.mjs';

const { site: SITE, cdp, js, close } = await launch();
const rect = (sel, pad = 0) => js(`(() => { const r = document.querySelector('${sel}').getBoundingClientRect();
  return { x: r.x - ${pad}, y: r.y - ${pad}, width: r.width + 2 * ${pad}, height: r.height + 2 * ${pad}, scale: 1 }; })()`);
const capture = async (format, clip) => Buffer.from((await cdp('Page.captureScreenshot',
  { format, ...(format === 'webp' ? { quality: 90 } : {}), ...(clip ? { clip, captureBeyondViewport: true } : {}) })).data, 'base64');

try {
  await cdp('Page.enable');
  // oggi = sabato 10 ottobre 2026, così le immagini restano uguali da un giorno all'altro
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `{const R=Date,T=new R(2026,9,10,10).getTime();
    class D extends R{constructor(...a){a.length?super(...a):super(T)} static now(){return T}} Date=D;}` });

  // DATI DI ESEMPIO: ferie a fine ottobre e dicembre, un ufficio e uno smart fissati a novembre
  // (in inglese festività US e il venerdì dopo Thanksgiving in ferie); l'onboarding parte senza dati
  const OV = { '2026-10-29': 'ferie', '2026-10-30': 'ferie', '2026-11-12': 'office', '2026-11-20': 'smart',
    '2026-12-28': 'ferie', '2026-12-29': 'ferie', '2026-12-30': 'ferie', '2026-12-31': 'ferie' };
  async function load({ lang, w, h, dark = true, onboarding = false }) {
    await cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: w < 600 });
    await cdp('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: dark ? 'dark' : 'light' }] });
    await cdp('Page.navigate', { url: SITE }); await sleep(800);
    const ov = onboarding ? {} : lang === 'en' ? { ...OV, '2026-11-27': 'ferie' } : OV;
    const data = { ov, flip: false, mode: 'alterni', quota: 10, weekMax: 3, mq: {}, wd: [], ws: [], country: lang === 'en' ? 'US' : 'IT' };
    await js(`localStorage.clear(); localStorage.setItem('smartmove.v1', ${JSON.stringify(JSON.stringify(data))});
      localStorage.setItem('smartmove.v1.lang', '${lang}'); localStorage.setItem('smartmove.v1.sound', '0');
      ${onboarding ? '' : "localStorage.setItem('smartmove.v1.tutorial', '1');"} location.reload()`);
    await sleep(2500); // fine delle animazioni dei giorni
  }
  // Cornici di browser e telefono attorno alle due schermate (PNG), salvate come WebP con gli angoli trasparenti
  async function framed(file, theme, desk, phone) {
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1700, height: 1100, deviceScaleFactor: 2, mobile: false });
    await cdp('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    await cdp('Page.navigate', { url: SITE + 'scripts/frame.html' }); await sleep(500);
    await js(`frame('${theme}', 'data:image/png;base64,${desk.toString('base64')}', 1280, 'data:image/png;base64,${phone.toString('base64')}', 390)`);
    writeFileSync(file, await capture('webp', await rect('#f')));
    await cdp('Emulation.setDefaultBackgroundColorOverride', {});
  }

  for (const lang of ['it', 'en']) {
    const dir = `${ROOT}docs/${lang === 'en' ? 'en/' : ''}`;
    mkdirSync(dir, { recursive: true });
    await load({ lang, w: 1280, h: 760, dark: false }); const light = await capture('png');
    await load({ lang, w: 1280, h: 760 }); const dark = await capture('png');
    // menu di giovedì 22: più in alto il menu esce dal ritaglio del mese
    await js(`document.querySelector('[data-key="2026-10-22"]').click()`); await sleep(1200);
    writeFileSync(dir + 'menu.png', await capture('png', await rect('#current', 16)));
    await load({ lang, w: 1280, h: 760 });
    await js(`document.getElementById('ics').click()`); await sleep(1200);
    writeFileSync(dir + 'export.png', await capture('png', await rect('#icsDlg')));
    await load({ lang, w: 390, h: 844, dark: false }); const mobileLight = await capture('png');
    await load({ lang, w: 390, h: 844 }); const mobileDark = await capture('png');
    await load({ lang, w: 1280, h: 1000, onboarding: true }); await sleep(500);
    writeFileSync(dir + 'onboarding.png', await capture('png', await rect('#onboard')));
    await framed(dir + 'desktop-light.webp', 'light', light, mobileLight);
    await framed(dir + 'desktop-dark.webp', 'dark', dark, mobileDark);
    console.log(lang, 'ok');
  }
} finally {
  await close();
  process.exit();
}
