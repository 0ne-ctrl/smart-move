// Rifà le immagini del README in docs/ (italiano) e docs/en/ (inglese):
//   menu.png, export.png, onboarding.png       ritagli dell'app
//   desktop-light|dark.webp, mobile.webp       schermate intere, in cornice di browser e telefono (frame.html)
// Uso, dalla cartella del progetto: node scripts/screenshots.mjs
// Serve la pagina con python3 -m http.server e la fotografa con Chromium headless pilotato via DevTools.
// Chromium di base è il flatpak org.chromium.Chromium; per un altro: CHROME=/percorso/chromium node scripts/screenshots.mjs
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url)), HTTP = 8765, DEVTOOLS = 9333, SITE = `http://127.0.0.1:${HTTP}/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const until = async url => { for (let i = 0; i < 60; i++) { try { return await (await fetch(url)).json(); } catch { await sleep(250); } } throw new Error('non risponde: ' + url); };

// SERVER E CHROMIUM
// il flatpak vede solo la sua cartella in ~/.var/app, quindi il profilo temporaneo sta lì
const profile = process.env.CHROME ? `${tmpdir()}/smart-move-shots` : `${homedir()}/.var/app/org.chromium.Chromium/smart-move-shots`;
const [cmd, ...pre] = process.env.CHROME ? [process.env.CHROME] : ['flatpak', 'run', 'org.chromium.Chromium'];
const server = spawn('python3', ['-m', 'http.server', String(HTTP), '-d', ROOT], { stdio: 'ignore' });
spawn(cmd, [...pre, '--headless=new', `--remote-debugging-port=${DEVTOOLS}`, `--user-data-dir=${profile}`, '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const browser = await until(`http://127.0.0.1:${DEVTOOLS}/json/version`);
await until(SITE + 'manifest.webmanifest');

// COLLEGAMENTO DEVTOOLS: una scheda, cdp(metodo, parametri) → risultato
const tab = await (await fetch(`http://127.0.0.1:${DEVTOOLS}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let id = 0; const wait = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); wait.get(m.id)?.(m); wait.delete(m.id); };
const cdp = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); })
  .then(m => { if (m.error) throw new Error(method + ': ' + m.error.message); return m.result; });
const js = async expr => (await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.value;
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
  // Cornice attorno a una schermata (PNG), salvata come WebP con gli angoli trasparenti
  async function framed(file, png, kind, theme, w) {
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1500, height: 1100, deviceScaleFactor: 2, mobile: false });
    await cdp('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    await cdp('Page.navigate', { url: SITE + 'scripts/frame.html' }); await sleep(500);
    await js(`frame('${kind}', '${theme}', 'data:image/png;base64,${png.toString('base64')}', ${w})`);
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
    await load({ lang, w: 390, h: 844 }); const mobile = await capture('png');
    await load({ lang, w: 1280, h: 1000, onboarding: true }); await sleep(500);
    writeFileSync(dir + 'onboarding.png', await capture('png', await rect('#onboard')));
    await framed(dir + 'desktop-light.webp', light, 'browser', 'light', 1280);
    await framed(dir + 'desktop-dark.webp', dark, 'browser', 'dark', 1280);
    await framed(dir + 'mobile.webp', mobile, 'phone', 'dark', 390);
    console.log(lang, 'ok');
  }
} finally {
  // chiude solo questo Chromium (via DevTools) e il server, poi cancella il profilo temporaneo
  const b = new WebSocket(browser.webSocketDebuggerUrl);
  await new Promise(r => b.onopen = r);
  b.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
  server.kill();
  await sleep(1000);
  rmSync(profile, { recursive: true, force: true });
  process.exit();
}
