// ============================================================
// SMART MOVE: la pagina. Stato, salvataggio, disegno del calendario e click.
// I calcoli stanno in plan.js, i suoni in sounds.js, i controlli in test.js.
// ============================================================
import './test.js'; // per primo: controlla la logica con i limiti predefiniti 10/3
import { QUOTA, WEEK_MAX, setLimits, COUNTRY, setCountry, pad, iso, planMonth, ferieRange, smartWi, withWeekly, cleanOv } from './plan.js';
import { synth } from './sounds.js';
import { toIcs } from './ics.js';
import { COUNTRIES } from './holidays.js';
import { T, applyLang } from './i18n.js';

// ============================================================
// IMPOSTAZIONI
// ============================================================
const KEY = 'smartmove.v1'; // nome con cui i dati vengono salvati nel browser (localStorage)

// ============================================================
// SALVATAGGIO NEL BROWSER (localStorage)
// ============================================================
// I dati restano solo nel browser in cui li inserisci. try/catch perché in navigazione
// privata o con i dati del sito bloccati localStorage può dare errore: la pagina funziona lo stesso.
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
// Tutto lo stato da salvare: lo stesso oggetto va in localStorage e nel file di Esporta
const data = () => ({ ov, flip, mode, quota: QUOTA, weekMax: WEEK_MAX, mq, wd, country: COUNTRY });
// Se il salvataggio fallisce lo dice una volta sola: altrimenti le modifiche sparirebbero in silenzio al ricaricamento
let saveWarned = false;
// Undo: ogni save() che cambia qualcosa mette lo stato di prima (come testo JSON) in una pila.
// last = stato dell'ultimo salvataggio. La pila sta solo in memoria: ricaricando la pagina riparte vuota.
const undos = [];
let last;
function save() {
  const now = JSON.stringify(data());
  if (now !== last) { undos.push(last); if (undos.length > 50) undos.shift(); last = now; }
  try { localStorage.setItem(KEY, JSON.stringify(data())); }
  catch {
    if (!saveWarned) { saveWarned = true; alert(L.saveFail); }
  }
}

// ============================================================
// STATO DELLA PAGINA
// ============================================================
const saved = load();
// ov = scelte manuali (ripulite da cleanOv: possono arrivare da un file importato), flip = inverti settimane,
// year = anno visualizzato (parte da quello corrente).
let ov = cleanOv(saved.ov), flip = !!saved.flip, year = new Date().getFullYear();
// mode = come proporre gli smart: 'alterni' (predefinito) o 'weekend' (vedi planMonth)
let mode = saved.mode === 'weekend' ? 'weekend' : 'alterni';
// showPast = mesi passati dell'anno in corso visibili (si aprono col pulsante #past, non si salva)
let showPast = false;
// Riporta un numero dentro [lo, hi]; se non è un numero valido usa il predefinito.
// Serve per i valori scritti dall'utente e per quelli letti dal browser (potrebbero essere sporchi).
const clamp = (v, lo, hi, def) => Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : def;
// mq = quota ridotta di singoli mesi { "AAAA-MM": numero }; i mesi assenti usano QUOTA.
// Deve essere un oggetto (un array o un numero da un file importato non si salverebbe); i valori li controlla qOf.
let mq = saved.mq && typeof saved.mq === 'object' && !Array.isArray(saved.mq) ? saved.mq : {};
// wd = giorni della settimana sempre in ufficio (1 = lunedì … 5 = venerdì), es. [2] = ogni martedì
let wd = Array.isArray(saved.wd) ? [...new Set(saved.wd.filter(n => [1, 2, 3, 4, 5].includes(n)))] : [];
const dayOf = key => new Date(key).getUTCDay(); // "2026-10-13" → 2 (martedì)
const mKey = (y, m) => `${y}-${pad(m + 1)}`;
const qOf = (y, m) => clamp(mq[mKey(y, m)], 0, QUOTA, QUOTA);
// Applica i limiti scelti nell'onboarding (se non ce ne sono, restano i predefiniti)
setLimits(clamp(saved.quota, 1, 23, QUOTA), clamp(saved.weekMax, 1, 5, WEEK_MAX));

// ============================================================
// LINGUA E FESTIVITÀ
// ============================================================
// Lingua: scelta salvata a parte (come tema e suoni, "Reset tutto" non la tocca);
// senza scelta, la prima lingua del browser tra italiano e inglese, altrimenti inglese.
let lang;
try { lang = localStorage.getItem(KEY + '.lang'); } catch {}
if (!T[lang]) lang = (navigator.languages || [navigator.language]).map(l => l.slice(0, 2)).find(l => T[l]) || 'en';
// Paese delle festività (fa parte dei dati, quindi va in Esporta/Importa).
// Dati salvati senza paese = salvati prima della versione internazionale → Italia, il piano non cambia.
// Prima apertura: la regione della lingua del browser (en-GB → GB) se è tra i paesi, poi Italia per chi parla italiano.
const region = navigator.language?.split('-')[1]?.toUpperCase();
setCountry(saved.country === 'none' || Object.hasOwn(COUNTRIES, saved.country) ? saved.country
  : saved.ov ? 'IT' : COUNTRIES[region] ? region : lang === 'it' ? 'IT' : 'none');
last = JSON.stringify(data()); // stato di partenza per l'undo
// L = testi della lingua (i18n.js); MONTHS, DAYS, DOW = nomi dei mesi, dei giorni (da domenica)
// e iniziali da lunedì (L M M G V S D), presi dal browser (Intl) nella lingua scelta.
// In italiano i mesi sono minuscoli ("ottobre"): cap() li mette maiuscoli nei titoli.
let L, MONTHS, DAYS, DOW;
const cap = s => s[0].toUpperCase() + s.slice(1);
// Riempie le tendine della lingua e dei paesi (due copie: impostazioni e onboarding) con i valori attuali
function showLang() {
  const names = new Intl.DisplayNames(lang, { type: 'region' }); // "US" → "Stati Uniti" / "United States"
  document.querySelectorAll('select.country').forEach(s => {
    s.innerHTML = Object.keys(COUNTRIES).map(c => `<option value="${c}">${names.of(c)}</option>`).join('')
      + `<option value="none">${L.none}</option>`;
    s.value = COUNTRY;
  });
  document.querySelectorAll('select.lang').forEach(s => s.value = lang);
}
function setLang(l) {
  lang = l; L = T[l];
  const f = o => new Intl.DateTimeFormat(l, { ...o, timeZone: 'UTC' }).format;
  MONTHS = [...Array(12)].map((_, m) => f({ month: 'long' })(Date.UTC(2026, m, 1)));
  DAYS = [...Array(7)].map((_, d) => f({ weekday: 'long' })(Date.UTC(2026, 0, 4 + d)));   // 4 gennaio 2026 = domenica
  DOW = [...Array(7)].map((_, d) => f({ weekday: 'narrow' })(Date.UTC(2026, 0, 5 + d)));  // 5 gennaio 2026 = lunedì
  applyLang(l); showLang();
}
// La legenda dell'onboarding è una copia di quella della pagina:
// vanno fatte prima di setLang, che si ricorda il testo italiano di ogni elemento
document.querySelectorAll('dialog .legend').forEach(l => l.innerHTML = document.querySelector('body > .legend').innerHTML);
setLang(lang);

// ============================================================
// DISEGNO DEL CALENDARIO
// ============================================================
// Ricostruisce da zero tutti i 12 mesi. Viene chiamata a ogni modifica:
// costa pochissimo ed evita di dover aggiornare i singoli pezzi.
// Scrive i limiti (smart al mese, massimo a settimana) nei testi di aiuto e nei campi −/+ (impostazioni, onboarding)
function showLimits(q, w) {
  document.querySelectorAll('[data-q="month"]').forEach(e => e.textContent = q);
  document.querySelectorAll('[data-q="week"]').forEach(e => e.textContent = w);
}

// picked: il giorno appena scelto dal menu, che timbra subito e non entra nell'onda
function render(picked) {
  document.getElementById('year').textContent = year;
  document.getElementById('flip').setAttribute('aria-pressed', flip);
  document.querySelector(`[name="mode"][value="${mode}"]`).checked = true;
  // "inverti settimane" ha senso solo con i giorni alterni
  document.getElementById('flip').disabled = mode === 'weekend';
  document.getElementById('undo').disabled = !undos.length;
  // Scrive i limiti attuali nei testi di aiuto e tutorial
  showLimits(QUOTA, WEEK_MAX);
  // Nei testi mostra solo le frasi dello schema scelto (elementi con data-mode)
  document.querySelectorAll('[data-mode]').forEach(e => e.hidden = e.dataset.mode !== mode);
  const now = new Date(), today = iso(now.getFullYear(), now.getMonth(), now.getDate());
  // Pulsante dei mesi passati: solo nell'anno in corso e da febbraio in poi (a gennaio non ce ne sono)
  const pastBtn = document.getElementById('past'), nowM = now.getMonth();
  pastBtn.hidden = year !== now.getFullYear() || nowM === 0;
  pastBtn.setAttribute('aria-expanded', showPast);
  pastBtn.lastElementChild.textContent = L.past(showPast, MONTHS[0], nowM > 1 && MONTHS[nowM - 1]);
  let html = '';
  // Per gennaio serve sapere gli smart di dicembre dell'anno prima (settimana a cavallo)
  // ponytail: dicembre dell'anno prima calcolato senza il suo novembre, basta per la settimana a cavallo
  // ovAll = scelte manuali più i giorni fissi in ufficio di ogni settimana (le scelte manuali vincono)
  const ovAll = withWeekly(ov, wd, year);
  let prev = smartWi(planMonth(year - 1, 11, ovAll, flip, [], qOf(year - 1, 11), mode));
  for (let m = 0; m < 12; m++) {
    // Pianifica il mese passando gli smart del mese precedente, poi li aggiorna per il prossimo giro
    const q = qOf(year, m);
    const days = planMonth(year, m, ovAll, flip, prev, q, mode);
    prev = smartWi(days);
    // Dati per il contatore in alto nel mese
    const overWeek = days.some(x => x.over);
    const nSmart = days.filter(x => x.state.startsWith('smart')).length;
    const nFerie = days.filter(x => x.state === 'ferie').length;
    const cls = nSmart > QUOTA || overWeek ? 'over' : '';
    const mName = MONTHS[m];
    // Mese passato (anno precedente a oggi, o mese prima di quello attuale) e mese corrente
    const past = year < now.getFullYear() || (year === now.getFullYear() && m < now.getMonth());
    const current = year === now.getFullYear() && m === now.getMonth();
    // Nell'anno in corso i mesi passati restano nascosti finché non li apri (negli altri anni si vede tutto)
    const hide = past && year === now.getFullYear() && !showPast;
    // Quante caselle vuote prima del giorno 1, per allinearlo sotto la colonna giusta.
    // getUTCDay() dà 0 = domenica; "+ 6) % 7" lo trasforma in 0 = lunedì.
    const offset = (new Date(Date.UTC(year, m, 1)).getUTCDay() + 6) % 7;
    // Costruisce l'HTML del mese come testo: intestazione, L M M G V S D, caselle vuote, giorni
    html += `<div class="month ${cls} ${past ? 'past' : ''}" ${current ? 'id="current"' : ''} ${hide ? 'hidden' : ''}><div class="mh"><h2>${cap(MONTHS[m])}</h2>
      <span class="count ${nSmart < q ? 'under' : ''}">${L.count(nSmart, q, nFerie, overWeek && WEEK_MAX)}</span>
      <span class="ctl"><span class="step"><button data-step="${m}:-1" aria-label="${L.less(mName)}" title="${L.lessT}" aria-disabled="${q <= 0}">−</button><button data-step="${m}:1" aria-label="${L.more(mName)}" title="${L.moreT}" aria-disabled="${q >= QUOTA}">+</button></span>
      <button class="reset" data-reset="${m}" aria-label="${L.resetM(mName)}">${L.reset}</button></span></div><div class="days">`
      + DOW.map(x => `<span class="dow">${x}</span>`).join('')
      + '<span></span>'.repeat(offset)
      + days.map(x => {
          // Le classi CSS corrispondono allo stato del giorno (vedi i colori in style.css)
          const c = `d ${x.state} ${x.key === today ? 'today' : ''} ${x.over ? 'over' : ''}`;
          // Weekend e festivi non sono cliccabili (<span>); gli altri sono pulsanti che portano
          // con sé data e stato (data-key, data-state) per il gestore dei click
          // aria-label: "9 ottobre, smart proposto", per chi usa un lettore di schermo
          const name = `${L.day(x.d, mName)}, ${L.states[x.state]}${x.over ? L.over : ''}`;
          return x.state === 'weekend' ? `<span class="${c}">${x.d}</span>`
            : x.state === 'holiday' ? `<span class="${c}" title="${L.states.holiday}">${x.d}</span>`
            : `<button class="${c}" data-key="${x.key}" data-state="${x.state}" aria-label="${name}">${x.d}</button>`;
        }).join('')
      + '</div></div>';
  }
  // Stato di ogni giorno prima di ridisegnare, per animare solo quelli cambiati (.land in style.css).
  // Cambiando anno le chiavi sono diverse: non si anima niente.
  const grid = document.getElementById('grid');
  const was = new Map([...grid.querySelectorAll('[data-key]')].map(b => [b.dataset.key, b.dataset.state]));
  grid.innerHTML = html;
  let wave = 0; // passi dell'onda più lunga: i mesi la fanno in parallelo, quindi basta un pop per passo
  grid.querySelectorAll('.days').forEach(ds => {
    // --i: ordine tra i giorni del mese che ricevono un segno (non quelli tornati in ufficio, che non hanno niente da mostrare)
    let i = 0;
    ds.querySelectorAll('[data-key]').forEach(b => {
      const w = was.get(b.dataset.key);
      if (w === undefined || w === b.dataset.state) return;
      b.classList.add('land');
      if (b.dataset.key !== picked && b.dataset.state !== 'auto') b.style.setProperty('--i', i++);
    });
    wave = Math.max(wave, i);
  });
  // Un pop in salita per ogni passo dell'onda, a tempo con i segni (stessi ritardi di .land in style.css;
  // dopo il settimo passo i segni arrivano tutti insieme), come l'ondata del video
  for (let j = 0; j < Math.min(wave, 7); j++) play('pop' + (3 + j), 0.35, 0.18 + j * 0.09);
  // Durante l'onboarding: copia il mese corrente nell'anteprima cliccabile (senza id, per non duplicarlo)
  if (document.getElementById('onboard').open) {
    const copy = document.getElementById('current')?.cloneNode(true);
    copy?.removeAttribute('id');
    document.getElementById('preview').replaceChildren(...(copy ? [copy] : []));
  }
}

// ============================================================
// INTERAZIONI
// ============================================================
// Suoni: si possono spegnere dalle impostazioni (scelta salvata a parte, "Reset tutto" non la tocca).
// L'AudioContext nasce al primo suono, cioè dopo un click: prima il browser non lo lascerebbe suonare.
let soundOn = true, ac;
try { soundOn = localStorage.getItem(KEY + '.sound') !== '0'; } catch {}
const buffers = {}; // suoni già calcolati, uno per nome
const play = (name, vol = 0.5, delay = 0) => {
  if (!soundOn) return;
  try {
    ac ??= new AudioContext();
    if (!buffers[name]) {
      const a = synth(name, ac.sampleRate);
      buffers[name] = ac.createBuffer(1, a.length, ac.sampleRate);
      buffers[name].copyToChannel(a, 0);
    }
    const src = ac.createBufferSource(), gain = ac.createGain();
    src.buffer = buffers[name]; gain.gain.value = vol;
    src.connect(gain).connect(ac.destination);
    src.start(ac.currentTime + delay);
  } catch {} // niente audio (browser vecchio o bloccato): l'app funziona lo stesso
};
const soundBtn = document.getElementById('sound');
const showSound = () => soundBtn.setAttribute('aria-pressed', soundOn);
soundBtn.addEventListener('click', () => {
  soundOn = !soundOn;
  try { localStorage.setItem(KEY + '.sound', soundOn ? '1' : '0'); } catch {}
  showSound(); play('switch');
});
showSound();

// Un solo gestore per tutti i click sulla griglia ("event delegation"): invece di
// collegare ~365 pulsanti, si guarda cosa è stato cliccato tramite gli attributi data-*.
// Lo stesso gestore serve anche l'anteprima dell'onboarding (#preview), che è una copia del mese.
const onDayClick = e => {
  const t = e.target;
  if (t.dataset.key) { play('click'); return openMenu(t); } // click su un giorno: si sceglie dal menu
  if (t.dataset.step) {
    // − / + sul mese: cambia quanti smart fare in quel mese, tra 0 e la quota normale.
    // Tornati alla quota normale la voce si cancella.
    const [m, d] = t.dataset.step.split(':').map(Number), k = mKey(year, m);
    const q = clamp(qOf(year, m) + d, 0, QUOTA, QUOTA);
    if (q === QUOTA) delete mq[k]; else mq[k] = q;
    play(d > 0 ? 'pop7' : 'pop2', 0.4); // + più acuto, − più grave
  } else if (t.dataset.reset) {
    // Click su "reset": cancella tutte le scelte manuali del mese (chiavi che iniziano con "AAAA-MM-")
    // e la sua eventuale quota ridotta
    const prefix = `${year}-${pad(+t.dataset.reset + 1)}-`;
    Object.keys(ov).forEach(k => k.startsWith(prefix) && delete ov[k]);
    delete mq[mKey(year, +t.dataset.reset)];
    play('whoosh', 0.3);
  } else return; // click altrove: niente da fare
  save(); render();
  // render() ricrea tutti i pulsanti: rimette il focus su quello appena usato,
  // altrimenti chi usa la tastiera ripartirebbe da inizio pagina.
  // querySelector prende il primo nella pagina: con l'onboarding aperto è quello dell'anteprima
  // (#onboard sta prima di #grid), così il focus resta dentro la finestra.
  document.querySelector(t.dataset.step ? `[data-step="${t.dataset.step}"]` : `[data-reset="${t.dataset.reset}"]`)?.focus();
};
// Menu degli stati: si apre sopra il giorno b, con lo stato attuale in grassetto
const menu = document.getElementById('menu');
let menuKey; // giorno a cui si riferisce il menu aperto
const hideMenu = () => menu.matches(':popover-open') && menu.hidePopover();
const openMenu = b => {
  hideMenu();
  menuKey = b.dataset.key;
  const cur = b.dataset.state === 'smart-auto' ? 'auto' : b.dataset.state;
  menu.setAttribute('aria-label', b.getAttribute('aria-label'));
  menu.querySelectorAll('[data-set]').forEach(x => x.toggleAttribute('aria-current', x.dataset.set === cur));
  // Interruttore del giorno fisso: "ufficio ogni martedì", premuto se la regola c'è già
  const wb = menu.querySelector('[data-weekly]'), d = dayOf(menuKey);
  wb.lastChild.textContent = L.weekly(DAYS[d]);
  wb.setAttribute('aria-pressed', wd.includes(d));
  // Con l'onboarding aperto il resto della pagina è inerte: il menu deve stare dentro la finestra
  (onboard.open ? onboard : document.body).append(menu);
  menu.showPopover();
  // Centrato sopra il giorno, dentro lo schermo; se non c'è spazio sopra va sotto
  const r = b.getBoundingClientRect();
  menu.style.left = Math.min(innerWidth - menu.offsetWidth - 8, Math.max(8, r.left + r.width / 2 - menu.offsetWidth / 2)) + 'px';
  menu.style.top = (r.top - menu.offsetHeight - 6 < 8 ? r.bottom + 6 : r.top - menu.offsetHeight - 6) + 'px';
  menu.querySelector('[aria-current]').focus();
};
// Scelta dal menu. "auto" = nessuna scelta manuale → si cancella.
menu.addEventListener('click', e => {
  if (e.target.closest('[data-weekly]')) {
    // Giorno fisso: aggiunge o toglie la regola per quel giorno della settimana; le vecchie eccezioni
    // "auto" di quel giorno non servono più e si cancellano (altrimenti riattivando la regola resterebbero)
    const d = dayOf(menuKey);
    wd = wd.includes(d) ? wd.filter(x => x !== d) : [...wd, d];
    Object.keys(ov).forEach(k => ov[k] === 'auto' && dayOf(k) === d && delete ov[k]);
    hideMenu(); save(); render(); play('switch');
    return document.querySelector(`[data-key="${menuKey}"]`)?.focus();
  }
  const s = e.target.closest('[data-set]')?.dataset.set;
  if (!s) return;
  // "automatico" cancella la scelta; su un giorno fisso resta "auto" scritto, come eccezione alla regola
  if (s === 'auto') { if (wd.includes(dayOf(menuKey))) ov[menuKey] = 'auto'; else delete ov[menuKey]; }
  else ov[menuKey] = s;
  hideMenu(); save(); render(menuKey); // render() suona anche i pop degli smart spostati
  // Suono della scelta: timbro per smart/ufficio, evidenziatore per le ferie
  play({ smart: 'pop5', office: 'pop0', ferie: 'ferie', auto: 'pop3' }[s], s === 'ferie' ? 0.45 : 0.4);
  // render() ricrea i pulsanti: focus di nuovo sul giorno (il primo trovato: con l'onboarding è quello dell'anteprima)
  const b = document.querySelector(`[data-key="${menuKey}"]`);
  b?.focus();
});
// Chiuso con Esc o cliccando fuori: se il focus era nel menu torna sul giorno
menu.addEventListener('beforetoggle', e => {
  if (e.newState === 'closed' && menu.contains(document.activeElement))
    setTimeout(() => document.querySelector(`[data-key="${menuKey}"]`)?.focus());
});
// capture: prende anche lo scorrimento dentro una finestra (es. l'onboarding su telefono), che non arriva alla pagina
addEventListener('scroll', hideMenu, { passive: true, capture: true });
document.getElementById('grid').addEventListener('click', onDayClick);
document.getElementById('preview').addEventListener('click', onDayClick);
// Undo: rimette lo stato prima dell'ultima modifica. Lo snapshot viene da data(), quindi non serve ricontrollarlo.
// save() trova lo stesso testo di last e non impila niente.
function undo() {
  if (!undos.length) return;
  hideMenu(); // il menu aperto si riferisce a un giorno che potrebbe cambiare
  const s = undos.pop(), d = JSON.parse(s);
  ({ ov, flip, mode, mq, wd } = d);
  setLimits(d.quota, d.weekMax); setCountry(d.country); showLang();
  onboard.querySelector(`[name="omode"][value="${mode}"]`).checked = true; // render() sincronizza solo i segmenti in alto
  last = s; save(); render(); play('whoosh', 0.25);
}
document.getElementById('undo').addEventListener('click', undo);
// Ctrl+Z (Cmd+Z su Mac), ma non dentro i campi di testo, dove annulla quello che hai scritto
document.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey
      && !e.target.closest('input, textarea, select')) { e.preventDefault(); undo(); }
});
// Interruttore "inverti settimane"
document.getElementById('flip').addEventListener('click', () => { flip = !flip; save(); render(); play('switch'); });
// Schema in alto (due segmenti): giorni alterni o vicino al weekend
document.querySelectorAll('[name="mode"]').forEach(r => r.addEventListener('change', () => { mode = r.value; save(); render(); play('switch'); }));
// Interruttore "Tema scuro" (impostazioni): passa da chiaro a scuro e viceversa e ricorda la scelta.
// Il tema attuale è quello scelto (data-theme) oppure, se non c'è, quello del sistema.
const themeBtn = document.getElementById('theme');
const isDark = () => (document.documentElement.dataset.theme ||
  (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) === 'dark';
const showTheme = () => themeBtn.setAttribute('aria-pressed', isDark());
themeBtn.addEventListener('click', () => {
  const t = isDark() ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(KEY + '.theme', t); } catch {}
  showTheme(); play('switch');
});
showTheme();

// Mostra/nasconde i mesi passati, che compaiono sotto il pulsante, prima del mese corrente
document.getElementById('past').addEventListener('click', () => { showPast = !showPast; render(); play('whoosh', 0.2); });
// Frecce per cambiare anno
document.getElementById('prev').addEventListener('click', () => { year--; render(); play('whoosh', 0.25); });
document.getElementById('next').addEventListener('click', () => { year++; render(); play('whoosh', 0.25); });

// Impostazioni: il pulsante con i cursori le apre. Ogni modifica dentro vale e si salva subito.
const settingsDlg = document.getElementById('settingsDlg');
document.getElementById('settings').addEventListener('click', () => settingsDlg.showModal());
// − / + dei limiti (impostazioni e passo 1 dell'onboarding). I numeri accanto li riscrive render() (showLimits).
// Le quote ridotte dei singoli mesi restano salvate: qOf le tiene sotto la nuova quota.
document.querySelectorAll('.stepper [data-set]').forEach(b => b.addEventListener('click', () => {
  const [what, d] = b.dataset.set.split(':');
  if (what === 'quota') setLimits(clamp(QUOTA + +d, 1, 23, QUOTA), WEEK_MAX);
  else setLimits(QUOTA, clamp(WEEK_MAX + +d, 1, 5, WEEK_MAX));
  save(); render(); play(+d > 0 ? 'pop7' : 'pop2', 0.4);
}));

// "Reset tutto": dopo una conferma cancella tutti i dati salvati e ricarica la pagina,
// che riparte come alla prima apertura (onboarding compreso)
document.getElementById('resetAll').addEventListener('click', () => {
  if (!confirm(L.resetAll)) return;
  try { localStorage.removeItem(KEY); localStorage.removeItem(KEY + '.tutorial'); localStorage.removeItem(KEY + '.ics'); } catch {}
  location.reload();
});

// Tutorial: il pulsante "?" lo apre; quando viene chiuso si salva che è stato visto
const tutorial = document.getElementById('tutorial');
document.getElementById('help').addEventListener('click', () => tutorial.showModal());
// Fa scaricare un file di testo con il nome dato
function download(name, type, text) {
  const a = document.createElement('a');
  a.href = `data:${type},` + encodeURIComponent(text);
  a.download = name;
  a.click();
}
// Esporta: scarica i dati come file smart-move.json (copia di sicurezza, o per passarli a un altro browser)
document.getElementById('export').addEventListener('click', () =>
  download('smart-move.json', 'application/json', JSON.stringify(data())));
// Calendario: la finestra #icsDlg chiede il mese (dell'anno mostrato) e il testo degli eventi,
// poi scarica smart (fissati e proposti) e ferie di quel mese come smart-move-AAAA-MM.ics.
// I testi scelti restano salvati in smartmove.v1.ics per la volta dopo.
const icsDlg = document.getElementById('icsDlg'), icsMonth = document.getElementById('icsMonth'),
      icsSmart = document.getElementById('icsSmart'), icsFerie = document.getElementById('icsFerie');
document.getElementById('ics').addEventListener('click', () => {
  const now = new Date();
  icsMonth.innerHTML = MONTHS.map((n, m) => `<option value="${m}">${cap(n)} ${year}</option>`).join('');
  icsMonth.value = year === now.getFullYear() ? now.getMonth() : 0; // di base il mese corrente
  let t = {};
  try { t = JSON.parse(localStorage.getItem(KEY + '.ics')) || {}; } catch {}
  icsSmart.value = typeof t.smart === 'string' ? t.smart : '';
  icsFerie.value = typeof t.ferie === 'string' ? t.ferie : '';
  icsDlg.returnValue = ''; // Esc chiude senza cambiarlo: senza questo resterebbe "ok" dalla volta prima
  icsDlg.showModal();
});
icsDlg.addEventListener('close', () => {
  if (icsDlg.returnValue !== 'ok') return;
  // Campo vuoto → il testo suggerito (placeholder)
  const smart = icsSmart.value.trim() || icsSmart.placeholder, ferie = icsFerie.value.trim() || icsFerie.placeholder;
  try { localStorage.setItem(KEY + '.ics', JSON.stringify({ smart: icsSmart.value.trim(), ferie: icsFerie.value.trim() })); } catch {}
  // I giorni li legge dalla griglia già disegnata da render(), in ordine di data
  const ym = mKey(year, +icsMonth.value);
  const days = [...document.querySelectorAll(`#grid [data-key^="${ym}-"]`)]
    .filter(b => b.dataset.state.startsWith('smart') || b.dataset.state === 'ferie')
    .map(b => [b.dataset.key, b.dataset.state === 'ferie' ? ferie : smart]);
  const stamp = new Date().toISOString().replace(/[-:]|\.\d+/g, ''); // "20261010T083000Z"
  download(`smart-move-${ym}.ics`, 'text/calendar', toIcs(days, stamp));
});
// Importa: legge un file esportato, lo salva al posto dei dati attuali e ricarica la pagina.
// Il controllo dei valori lo fa il normale caricamento (vedi "STATO DELLA PAGINA").
const importFile = document.getElementById('import');
document.getElementById('importBtn').addEventListener('click', () => importFile.click());
importFile.addEventListener('change', async () => {
  const f = importFile.files[0];
  importFile.value = ''; // così si può reimportare lo stesso file
  if (!f || !confirm(L.importAsk)) return;
  let d;
  try { d = JSON.parse(await f.text()); } catch {}
  if (!d || typeof d !== 'object' || Array.isArray(d)) return alert(L.badFile);
  try { localStorage.setItem(KEY, JSON.stringify(d)); localStorage.setItem(KEY + '.tutorial', '1'); }
  catch { return alert(L.noStorage); }
  location.reload();
});
// Easter egg: ogni 10 click sul titolo "Smart Move" compare la finestra #car;
// "Sì" porta al sito, "No" la chiude
const car = document.getElementById('car');
let titleClicks = 0;
document.querySelector('h1').addEventListener('click', () => {
  if (++titleClicks % 10 === 0) car.showModal();
});
car.addEventListener('cancel', e => e.preventDefault()); // Esc nei browser senza closedby
car.addEventListener('close', () => {
  if (car.returnValue === 'si') location.href = 'https://www.noicompriamoauto.it/';
});

// ------------------------------------------------------------
// ONBOARDING a passi. Ogni scelta cambia subito lo stato vero e lo salva,
// quindi alla chiusura (anche con Esc) non resta niente da applicare.
// ------------------------------------------------------------
const onboard = document.getElementById('onboard');
const panes = onboard.querySelectorAll('.pane'), dots = onboard.querySelectorAll('.dots i');
const back = document.getElementById('obBack'), next = document.getElementById('obNext');
let step = 0;
// Testi del passo attuale: "Passo n di 5" e "Avanti" / "Inizia" (rifatti anche quando cambia la lingua)
const stepTexts = () => {
  document.getElementById('obStep').textContent = L.step(step + 1, panes.length);
  next.textContent = step === panes.length - 1 ? L.start : L.next;
};
// Mostra il passo n: pallini, testi, pulsanti e anteprima (non serve nell'ultimo)
const go = n => {
  step = n;
  panes.forEach((p, i) => p.hidden = i !== n);
  dots.forEach((d, i) => d.classList.toggle('on', i === n));
  stepTexts();
  back.hidden = n === 0;
  document.getElementById('preview').hidden = n === panes.length - 1;
  // Il focus sul titolo fa leggere il nuovo passo ai lettori di schermo
  panes[n].querySelector('h2').focus();
};
back.addEventListener('click', () => { go(step - 1); play('whoosh', 0.2); });
next.addEventListener('click', () => { if (step === panes.length - 1) onboard.close(); else go(step + 1); play('whoosh', 0.2); });
// Passo 1: − / + sui limiti, collegati insieme a quelli delle impostazioni (vedi sopra)
// Passo 2: le schede dello schema fanno la stessa cosa dei segmenti in alto
onboard.querySelectorAll('[name="omode"]').forEach(r => r.addEventListener('change', () => {
  mode = r.value; save(); render(); play('switch');
}));
// Passo 4: segna come ferie i giorni lavorativi del periodo (senza "al" vale un giorno solo)
document.getElementById('obFerie').addEventListener('click', () => {
  const from = document.getElementById('obFrom').value, to = document.getElementById('obTo').value || from;
  const msg = document.getElementById('obMsg');
  if (!from) { msg.textContent = L.noFrom; return; }
  // Anno a 5-6 cifre (Chrome lo permette): il confronto tra date come testo segnerebbe mesi di ferie
  if (![from, to].every(v => /^\d{4}-\d\d-\d\d$/.test(v))) { msg.textContent = L.badDate; return; }
  const keys = ferieRange(from, to);
  keys.forEach(k => ov[k] = 'ferie');
  save(); render(); if (keys.length) play('ferie', 0.45);
  const fmt = k => new Date(k + 'T12:00').toLocaleDateString(lang, { day: 'numeric', month: 'long' });
  msg.textContent = !keys.length ? L.noDays : L.marked(fmt(keys[0]), fmt(keys.at(-1)), keys.length);
  document.getElementById('obFrom').value = document.getElementById('obTo').value = '';
});
// Lingua e paese (passo 1, e la stessa coppia di tendine nelle impostazioni). Cambiare lingua riscrive tutti i testi
// senza ricaricare; cambiare paese ricalcola il piano con le nuove festività.
document.querySelectorAll('select.lang').forEach(s => s.addEventListener('change', () => {
  try { localStorage.setItem(KEY + '.lang', s.value); } catch {}
  setLang(s.value); stepTexts(); render(); play('switch');
}));
document.querySelectorAll('select.country').forEach(s => s.addEventListener('change', () => {
  setCountry(s.value); save(); showLang(); render(); play('switch');
}));
// Chiusura (Inizia o Esc): onboarding visto per sempre, anteprima svuotata
onboard.addEventListener('close', () => {
  try { localStorage.setItem(KEY + '.tutorial', '1'); } catch {}
  document.getElementById('preview').replaceChildren();
});

// Primo disegno del calendario, partendo dal mese corrente
render();
// Alla prima visita (nessun segno salvato) apre l'onboarding in automatico
let seen = false;
try { seen = !!localStorage.getItem(KEY + '.tutorial'); } catch {}
if (!seen) {
  onboard.querySelector(`[name="omode"][value="${mode}"]`).checked = true;
  onboard.showModal();
  render(); // ora che la finestra è aperta, riempie l'anteprima
  go(0);
}

// ------------------------------------------------------------
// APP INSTALLABILE (PWA): sw.js tiene una copia dei file del sito, così funziona anche senza rete.
// Errori ignorati: senza service worker (es. pagina aperta da file://) il sito va lo stesso.
// ------------------------------------------------------------
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
