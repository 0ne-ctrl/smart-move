// Chromium headless pilotato via DevTools (protocollo CDP), per gli script di questa cartella (screenshots.mjs, smoke.mjs).
// launch() avvia python3 -m http.server sulla cartella del progetto e il Chromium flatpak (org.chromium.Chromium;
// per un altro Chromium: CHROME=/percorso/chromium), apre una scheda e restituisce:
//   site                    indirizzo della pagina (http://127.0.0.1:8765/)
//   cdp(metodo, parametri)  comando DevTools → risultato (es. 'Page.navigate', 'Page.captureScreenshot')
//   js(espressione)         esegue JavaScript nella pagina e ne dà il valore; se la pagina lancia un errore, lo rilancia qui
//   onEvent(fn)             fn riceve ogni evento DevTools (es. Runtime.consoleAPICalled, dopo Runtime.enable)
//   profile                 cartella del profilo temporaneo (dentro il sandbox del flatpak: lì Chromium può scrivere)
//   close()                 chiude Chromium e il server e cancella il profilo
// Nessuna dipendenza: WebSocket e fetch sono quelli di Node.
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const sleep = ms => new Promise(r => setTimeout(r, ms));
// Aspetta che un indirizzo risponda con JSON (server e Chromium ci mettono un attimo a partire)
const until = async url => { for (let i = 0; i < 60; i++) { try { return await (await fetch(url)).json(); } catch { await sleep(250); } } throw new Error('non risponde: ' + url); };

export async function launch() {
  const HTTP = 8765, DEVTOOLS = 9333, site = `http://127.0.0.1:${HTTP}/`;
  // il flatpak vede solo la sua cartella in ~/.var/app, quindi il profilo temporaneo sta lì
  const profile = process.env.CHROME ? `${tmpdir()}/smart-move-chromium` : `${homedir()}/.var/app/org.chromium.Chromium/smart-move-chromium`;
  const [cmd, ...pre] = process.env.CHROME ? [process.env.CHROME] : ['flatpak', 'run', 'org.chromium.Chromium'];
  const server = spawn('python3', ['-m', 'http.server', String(HTTP), '-d', ROOT], { stdio: 'ignore' });
  spawn(cmd, [...pre, '--headless=new', `--remote-debugging-port=${DEVTOOLS}`, `--user-data-dir=${profile}`, '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  const browser = await until(`http://127.0.0.1:${DEVTOOLS}/json/version`);
  await until(site + 'manifest.webmanifest');

  // Una scheda. I messaggi DevTools hanno un id (risposte ai comandi) oppure un method (eventi)
  const tab = await (await fetch(`http://127.0.0.1:${DEVTOOLS}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const wait = new Map(), listeners = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.method) listeners.forEach(f => f(m)); wait.get(m.id)?.(m); wait.delete(m.id); };
  const cdp = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); })
    .then(m => { if (m.error) throw new Error(method + ': ' + m.error.message); return m.result; });
  const js = async expr => {
    const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('nella pagina: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  };
  const close = async () => {
    // chiude solo questo Chromium (via DevTools) e il server, poi cancella il profilo temporaneo
    const b = new WebSocket(browser.webSocketDebuggerUrl);
    await new Promise(r => b.onopen = r);
    b.send(JSON.stringify({ id: 1, method: 'Browser.close' }));
    ws.close(); server.kill();
    await sleep(1000);
    rmSync(profile, { recursive: true, force: true });
  };
  return { site, cdp, js, onEvent: f => listeners.push(f), profile, close };
}
