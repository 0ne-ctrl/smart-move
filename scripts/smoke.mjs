// Prova dell'app in Chromium headless (scripts/chromium.mjs): i flussi che selfTest() non copre perché stanno in js/app.js
// e hanno bisogno della pagina: onboarding con anteprima, menu del giorno, annulla (pulsante e Ctrl+Z), giorno fisso con
// eccezione, export .ics e .json, lingua e paese, frecce della tastiera, anno e mesi passati, un file importato ostile
// (chiavi e valori non validi), service worker. Fallisce anche se la pagina scrive errori o "Assertion failed" in console
// o apre un alert.
// Uso, dalla cartella del progetto: node scripts/smoke.mjs → una riga PASS/FAIL per controllo; esce con codice 1 se qualcosa fallisce.
// Data finta sabato 10/10/2026 (come screenshots.mjs), lingua italiana e festività italiane, suoni spenti.
import { existsSync, readFileSync } from 'node:fs';
import { launch, sleep } from './chromium.mjs';

const { site, cdp, js, onEvent, profile, close } = await launch();
let failed = 0;
const check = (name, ok, extra) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra === undefined ? '' : ' → ' + JSON.stringify(extra)}`); if (!ok) failed++; };
// Errori della pagina: console.error/assert, eccezioni, errori di rete (file mancanti)
const logs = [];
onEvent(m => {
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'assert'].includes(m.params.type)) logs.push(m.params.type + ': ' + m.params.args.map(a => a.value ?? a.description).join(' '));
  if (m.method === 'Runtime.exceptionThrown') logs.push('eccezione: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') logs.push('log: ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
});
// Aspetta un file scaricato (i download finiscono nel profilo, dove il flatpak può scrivere)
const downloaded = async name => { const f = `${profile}/${name}`; for (let i = 0; i < 20 && !existsSync(f); i++) await sleep(250); return readFileSync(f, 'utf8'); };
const state = key => js(`document.querySelector('#grid [data-key="${key}"]')?.dataset.state`);
// Apre il menu di un giorno della griglia e sceglie una voce (data-set o data-weekly)
const pick = async (key, sel) => { await js(`document.querySelector('#grid [data-key="${key}"]').click()`); await sleep(250); await js(`document.querySelector('#menu ${sel}').click()`); await sleep(700); };
// Tendine delle impostazioni (lingua e paese)
const select = (cls, v) => js(`{ const s = document.querySelector('#settingsDlg select.${cls}'); s.value = '${v}'; s.dispatchEvent(new Event('change')) }`);
const arrow = (key, k) => js(`{ const b = document.querySelector('#grid [data-key="${key}"]'); b.focus(); b.dispatchEvent(new KeyboardEvent('keydown', { key: '${k}', bubbles: true })) }`);

try {
  await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Log.enable');
  await cdp('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: profile });
  // Data finta; alert = errore (nessun controllo lo aspetta); confirm = sì (Importa, Reset tutto)
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: `{const R=Date,T=new R(2026,9,10,10).getTime();
    class D extends R{constructor(...a){a.length?super(...a):super(T)} static now(){return T}} Date=D;
    window.alert=m=>console.error('alert: '+m); window.confirm=()=>true;}` });
  // Prima apertura: nessun dato salvato, tranne lingua, paese e suoni, per non dipendere dal browser
  await cdp('Page.navigate', { url: site }); await sleep(500);
  await js(`localStorage.clear(); localStorage.setItem('smartmove.v1', '{"country":"IT"}'); localStorage.setItem('smartmove.v1.lang', 'it'); localStorage.setItem('smartmove.v1.sound', '0'); location.reload()`);
  await sleep(2000);

  // ONBOARDING: si apre da solo, l'anteprima è cliccabile e il menu si apre dentro la finestra
  check('onboarding aperto alla prima visita', await js(`document.getElementById('onboard').open`));
  check('anteprima con il mese corrente', await js(`document.querySelector('#preview .month h2')?.textContent`) === 'Ottobre');
  await js(`document.querySelector('#preview [data-key="2026-10-14"]').click()`); await sleep(250);
  check("menu aperto dentro l'onboarding", await js(`document.getElementById('menu').matches(':popover-open') && document.getElementById('onboard').contains(document.getElementById('menu'))`));
  await js(`document.querySelector('#menu [data-set="ferie"]').click()`); await sleep(700);
  check("ferie dall'anteprima", await js(`document.querySelector('#preview [data-key="2026-10-14"]').dataset.state`) === 'ferie');
  for (let i = 0; i < 5; i++) { await js(`document.getElementById('obNext').click()`); await sleep(200); }
  check('onboarding chiuso dopo 5 passi', !(await js(`document.getElementById('onboard').open`)));
  check('onboarding segnato come visto', await js(`localStorage.getItem('smartmove.v1.tutorial')`) === '1');

  // MENU DEL GIORNO E ANNULLA
  const before = await state('2026-10-13');
  await pick('2026-10-13', '[data-set="smart"]');
  check('giorno fissato smart', await state('2026-10-13') === 'smart');
  check('contatore di ottobre', await js(`document.querySelector('#current .count').textContent`) === 'smart 10/10 · ferie 1');
  await js(`document.getElementById('undo').click()`); await sleep(700);
  check('annulla col pulsante', await state('2026-10-13') === before, before);
  await pick('2026-10-13', '[data-set="office"]');
  await js(`document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))`); await sleep(700);
  check('annulla con Ctrl+Z', await state('2026-10-13') === before);

  // GIORNO FISSO: ufficio ogni martedì, con un'eccezione "automatico"
  await pick('2026-10-13', '[data-weekly="office"]');
  check('tutti i martedì di ottobre in ufficio', await js(`['06', '13', '20', '27'].every(d => document.querySelector('#grid [data-key="2026-10-' + d + '"]').dataset.state === 'office')`));
  check("vale tutto l'anno", await state('2026-01-13') === 'office');
  await pick('2026-10-20', '[data-set="auto"]');
  check('eccezione alla regola', await state('2026-10-20') !== 'office' && await state('2026-10-27') === 'office');
  check('nessun mese oltre i limiti', !(await js(`!!document.querySelector('#grid .month.over')`)));

  // EXPORT: calendario .ics di ottobre e dati .json
  await js(`document.getElementById('ics').click()`); await sleep(300);
  await js(`{ const d = document.getElementById('icsDlg'); document.getElementById('icsMonth').value = '9'; d.returnValue = 'ok'; d.close() }`);
  const ics = await downloaded('smart-move-2026-10.ics');
  const nEvents = await js(`[...document.querySelectorAll('#grid [data-key^="2026-10-"]')].filter(b => b.dataset.state.startsWith('smart') || b.dataset.state === 'ferie').length`);
  check('ics: un evento per ogni smart e ferie', ics.split('BEGIN:VEVENT').length - 1 === nEvents, nEvents);
  check('ics: ferie del 14 col testo predefinito', ics.includes('DTSTART;VALUE=DATE:20261014\r\nDTEND;VALUE=DATE:20261015\r\nSUMMARY:Ferie'));
  check('ics: niente martedì in ufficio', !ics.includes('DTSTART;VALUE=DATE:20261013') && !ics.includes('DTSTART;VALUE=DATE:20261027'));
  await js(`document.getElementById('export').click()`);
  const json = JSON.parse(await downloaded('smart-move.json'));
  check('json esportato', json.wd?.join() === '2' && json.ov?.['2026-10-14'] === 'ferie' && json.ov?.['2026-10-20'] === 'auto' && json.country === 'IT', json);

  // TASTIERA: frecce tra i giorni, saltando i festivi (8 dicembre)
  await arrow('2026-10-13', 'ArrowRight');
  check('freccia destra: giorno dopo', await js(`document.activeElement.dataset.key`) === '2026-10-14');
  await arrow('2026-12-07', 'ArrowRight');
  check('freccia destra salta il festivo', await js(`document.activeElement.dataset.key`) === '2026-12-09');

  // LINGUA E PAESE
  await select('lang', 'en'); await sleep(400);
  check('lingua inglese', await js(`document.documentElement.lang + '|' + document.querySelector('#tutorial h2').textContent + '|' + document.querySelector('#current .count').textContent`) === 'en|How it works|WFH 10/10 · off 1');
  await select('lang', 'it'); await sleep(400);
  await select('country', 'US'); await sleep(700);
  check('festività US: Thanksgiving festivo, Pasquetta no', await state('2026-11-26') === undefined && await state('2026-04-06') !== undefined);
  await select('country', 'IT'); await sleep(700);
  check('festività IT: Pasquetta festiva', await state('2026-04-06') === undefined);

  // TEMA: l'interruttore forza il tema e lascia attivo solo il meta theme-color di quel tema
  await js(`document.getElementById('theme').click()`); await sleep(200);
  const theme = await js(`document.documentElement.dataset.theme`);
  check('tema forzato con il suo theme-color', ['light', 'dark'].includes(theme) && await js(`[...document.querySelectorAll('meta[name="theme-color"]')].map(m => m.dataset.theme + ':' + m.media).join()`) === (theme === 'dark' ? 'light:not all,dark:all' : 'light:all,dark:not all'), theme);

  // ANNO E MESI PASSATI
  await js(`document.getElementById('next').click()`); await sleep(300);
  check('anno dopo', await js(`document.getElementById('year').textContent`) === '2027' && await js(`document.getElementById('past').hidden`));
  await js(`document.getElementById('prev').click(); document.getElementById('past').click()`); await sleep(300);
  check('mesi passati mostrati', await js(`[...document.querySelectorAll('#grid .month.past')].every(m => !m.hidden)`));

  // FILE IMPORTATO OSTILE: stessa strada di Importa (localStorage + ricaricamento); il caricamento deve ripulire tutto
  const bad = { ov: { '2026-10-12': '"><img src=x onerror=alert(1)>', '<b>': 'ferie', '2026-10-15': 'ferie' }, mq: { '2026-10': '<b>', '2026-11': 99, '2026-12': -3 },
    quota: '7', weekMax: 9, wd: ['2', 2, 7], ws: [2, 5, 'x'], country: '__proto__', mode: 'zzz', flip: 'yes' };
  await js(`localStorage.setItem('smartmove.v1', ${JSON.stringify(JSON.stringify(bad))}); location.reload()`); await sleep(2000);
  check('importato: niente HTML estraneo nella pagina', !(await js(`document.body.innerHTML.includes('<img')`)));
  check('importato: le ferie valide restano', await state('2026-10-15') === 'ferie');
  check('importato: limiti riportati nei bordi', await js(`document.querySelector('#settingsDlg [data-q="month"]').textContent + '/' + document.querySelector('#settingsDlg [data-q="week"]').textContent`) === '10/5');
  check('importato: quote dei mesi riportate tra 0 e 10', await js(`document.querySelectorAll('#grid .count')[10].textContent + ' | ' + document.querySelectorAll('#grid .count')[11].textContent`) === 'smart 10/10 | smart 3/0');
  check('importato: martedì ufficio, venerdì smart', await state('2026-10-13') === 'office' && await state('2026-10-16') === 'smart');
  check('importato: paese e schema predefiniti', await js(`document.querySelector('#settingsDlg select.country').value + '|' + document.querySelector('[name="mode"]:checked').value`) === 'IT|alterni');
  // Il service worker controlla la pagina (ricaricata dopo la registrazione) e ha salvato la copia dei file
  check('service worker attivo', await js(`!!navigator.serviceWorker.controller`));
  check('service worker: copia di app.js in cache', await js(`caches.open('smart-move').then(c => c.match('js/app.js')).then(r => !!r)`));
} catch (e) { console.log('ERRORE', e.message); failed++; }
finally {
  check('nessun errore in console', !logs.length, logs.length ? logs : undefined);
  await close();
  process.exit(failed ? 1 : 0);
}
