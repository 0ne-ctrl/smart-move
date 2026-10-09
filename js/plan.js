// ============================================================
// LOGICA DI SMART MOVE: festività, giorni feriali e pianificazione dei mesi.
// Solo calcoli, niente pagina: la usano app.js, test.js e il video (video/src/plan.ts).
// ============================================================
// Limiti: valori predefiniti, sostituiti da quelli scelti nell'onboarding (vedi app.js).
// Chi li importa non può riassegnarli: si cambiano con setLimits(), e tutti vedono il nuovo valore.
export let QUOTA = 10;     // giorni di smart al mese
export let WEEK_MAX = 3;   // massimo giorni di smart nella stessa settimana
export function setLimits(q, w) { QUOTA = q; WEEK_MAX = w; }

// Piccole utilità per costruire le date in formato testo "AAAA-MM-GG" (es. "2026-10-08").
// Questo formato è usato come "chiave" di ogni giorno ovunque nel codice.
// Attenzione: in JavaScript i mesi partono da 0 (gennaio = 0, dicembre = 11), da qui il "m + 1".
export const pad = n => String(n).padStart(2, '0');           // 7 → "07"
export const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`; // (2026, 9, 8) → "2026-10-08"

// ============================================================
// FESTIVITÀ
// ============================================================

// Calcola la data di Pasqua di un anno (algoritmo di Meeus/Jones/Butcher).
// È una formula astronomica standard: non serve capirla, basta sapere che
// restituisce [mese (da 0), giorno]. Es. easter(2026) → [3, 5] = 5 aprile.
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4,
        f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3),
        h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4,
        l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451),
        t = h + l - 7 * m + 114;
  return [Math.floor(t / 31) - 1, (t % 31) + 1];
}

// Restituisce l'insieme (Set) delle festività nazionali di un anno, come chiavi "AAAA-MM-GG".
// Il risultato viene memorizzato in holidayCache, così ogni anno si calcola una volta sola.
const holidayCache = {};
export function holidays(y) {
  if (holidayCache[y]) return holidayCache[y];
  // Festività a data fissa
  const s = new Set(['01-01','01-06','04-25','05-01','06-02','08-15','11-01','12-08','12-25','12-26'].map(x => `${y}-${x}`));
  if (y >= 2026) s.add(`${y}-10-04`); // San Francesco, festa nazionale dal 2026
  // Pasquetta = giorno dopo Pasqua. Date.UTC gestisce da solo il cambio mese (es. 31 marzo + 1 = 1 aprile).
  const [m, d] = easter(y);
  const pm = new Date(Date.UTC(y, m, d + 1));
  s.add(iso(y, pm.getUTCMonth(), pm.getUTCDate()));
  return holidayCache[y] = s;
}

// ============================================================
// NUMERAZIONE DEI GIORNI FERIALI
// ============================================================
// Ogni giorno da lunedì a venerdì riceve un numero progressivo, contando solo i feriali
// a partire da lunedì 1 gennaio 2024 (EPOCH). Sabato e domenica ricevono null.
//
//   lun 1 gen 2024 → 0, mar → 1, mer → 2, gio → 3, ven → 4,
//   lun 8 gen 2024 → 5, mar → 6, ...
//
// A cosa serve:
// - Distanza tra due giorni lavorativi = differenza dei numeri (venerdì → lunedì = 1, sono "attaccati").
// - Settimana di un giorno = numero diviso 5, arrotondato per difetto.
// - Alternanza: prendendo i giorni con numero pari si ottiene lun-mer-ven (0,2,4) in una
//   settimana e mar-gio (6,8) nella successiva. Succede perché la settimana lavorativa ha
//   5 giorni (dispari), quindi la parità si inverte da una settimana all'altra.
const EPOCH = Date.UTC(2024, 0, 1); // lunedì 1 gennaio 2024
export function wIndex(y, m, d) {
  // n = giorni di calendario trascorsi da EPOCH (864e5 = millisecondi in un giorno)
  const n = Math.round((Date.UTC(y, m, d) - EPOCH) / 864e5);
  // w = numero della settimana, dow = giorno della settimana (0 = lunedì ... 6 = domenica)
  const w = Math.floor(n / 7), dow = n - w * 7;
  // Ogni settimana conta 5 feriali; weekend → null
  return dow < 5 ? w * 5 + dow : null;
}

// ============================================================
// CUORE DEL PROGRAMMA: pianificazione di un mese
// ============================================================
// Restituisce un array con un oggetto per ogni giorno del mese:
//   { d: numero del giorno, key: "AAAA-MM-GG", wi: numero feriale, state: stato, over: true/false }
//
// Stati possibili:
//   weekend     sabato/domenica
//   holiday     festività nazionale
//   ferie       segnato a mano come ferie
//   office      segnato a mano come ufficio (lo smart non verrà mai proposto qui)
//   smart       segnato a mano come smart (conta nella quota)
//   smart-auto  smart proposto automaticamente
//   auto        giorno libero non scelto → ufficio
//
// Parametri:
//   y, m  anno e mese (mese da 0)
//   ov    "override": le scelte fatte a mano, es. { "2026-10-12": "ferie", "2026-10-09": "smart" }
//   flip  true = scambia quale settimana è lun-mer-ven e quale mar-gio
//   prev  numeri feriali degli smart del mese precedente, per rispettare WEEK_MAX
//         nelle settimane a cavallo tra due mesi
//   quota smart da fare in questo mese (di solito QUOTA, meno se l'utente l'ha ridotta con −)
//   mode  'alterni' = smart distanziati, settimane lun-mer-ven / mar-gio;
//         'weekend' = smart attaccati a weekend, festivi, ferie e altri smart (blocchi lunghi fuori ufficio)
export function planMonth(y, m, ov, flip, prev = [], quota = QUOTA, mode = 'alterni') {
  // 1) Crea la lista dei giorni del mese con il loro stato iniziale.
  //    Date.UTC(y, m + 1, 0) = "giorno 0 del mese dopo" = ultimo giorno di questo mese → n = quanti giorni ha.
  const hol = holidays(y), days = [], n = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  for (let d = 1; d <= n; d++) {
    const key = iso(y, m, d), wi = wIndex(y, m, d);
    // Ordine di priorità: weekend → festivo → scelta manuale → altrimenti "auto"
    days.push({ d, key, wi, state: wi === null ? 'weekend' : hol.has(key) ? 'holiday' : ov[key] || 'auto' });
  }

  // 2) Contatore degli smart per settimana: perWeek[numero settimana] = quanti smart.
  const week = wi => Math.floor(wi / 5), perWeek = {};
  const count = wi => { perWeek[week(wi)] = (perWeek[week(wi)] || 0) + 1; };

  // Conta gli smart fissati a mano DOPO la fine di questo mese: se il mese finisce di
  // mercoledì e giovedì/venerdì (mese dopo) sono smart fissati, valgono per la stessa settimana.
  // Il confronto k > end funziona perché le date "AAAA-MM-GG" si ordinano come testo.
  const end = iso(y, m, n);
  Object.keys(ov).forEach(k => { // smart fissati nel mese dopo (stessa settimana)
    if (ov[k] === 'smart' && k > end) { const [yy, mm, dd] = k.split('-').map(Number); count(wIndex(yy, mm - 1, dd)); }
  });

  // Smart fissati a mano in questo mese: consumano quota e contano nella loro settimana,
  // così come gli smart del mese precedente (prev).
  const smart = days.filter(x => x.state === 'smart').map(x => x.wi);
  [...prev, ...smart].forEach(count);

  // near = tutti gli smart già decisi (serve a misurare la distanza dei candidati)
  const near = [...prev, ...smart];
  // cand = giorni ancora liberi, tra cui scegliere gli smart da proporre
  const cand = days.filter(x => x.state === 'auto');
  // away = numeri feriali dei giorni già lontani dall'ufficio: smart e ferie fissati (di qualunque mese),
  // festivi di quest'anno e del prossimo (es. 1° gennaio per il 31 dicembre), smart del mese prima.
  // Servono alla modalità 'weekend' per attaccarci i nuovi smart. Il weekend non serve: basta sapere se è lun o ven.
  const toWi = k => { const [yy, mm, dd] = k.split('-').map(Number); return wIndex(yy, mm - 1, dd); };
  const away = new Set([...prev,
    ...Object.keys(ov).filter(k => ov[k] === 'smart' || ov[k] === 'ferie').map(toWi),
    ...[...hol, ...holidays(y + 1)].map(toWi)]);
  // Confronta due punteggi elemento per elemento: vince il primo valore diverso più alto
  const better = (a, b) => { for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] > b[i]; return false; };

  // 3) Scelta "golosa" (greedy): finché resta quota, sceglie UN giorno alla volta, il migliore
  //    tra i candidati, e lo segna come smart-auto. Poi ricomincia con la situazione aggiornata.
  // ponytail: greedy O(n²) su ~22 giorni, irrilevante
  for (let left = quota - smart.length; left > 0; left--) {
    let best = -1, bestKey = null;
    cand.forEach((x, i) => {
      // Scarta i giorni la cui settimana ha già raggiunto il massimo
      if ((perWeek[week(x.wi)] || 0) >= WEEK_MAX) return;
      let k;
      if (mode === 'weekend') {
        // dow = giorno della settimana, 0 = lunedì … 4 = venerdì (wi parte da un lunedì)
        const dow = ((x.wi % 5) + 5) % 5;
        // touches = il giorno tocca un giorno fuori ufficio: lun/ven toccano il weekend,
        // gli altri il giorno feriale prima o dopo (nella stessa settimana)
        const touches = dow === 0 || dow === 4 || (away.has(x.wi - 1)) || (away.has(x.wi + 1));
        // Punteggio, in ordine di importanza:
        //   1° allunga un blocco fuori ufficio (weekend, festivo, ferie o smart)
        //   2° più vicino al weekend (lun/ven, poi mar/gio, poi mer)
        //   3° settimana con meno smart (così ogni weekend del mese si allunga)
        k = [touches ? 1 : 0, -Math.min(dow, 4 - dow), -(perWeek[week(x.wi)] || 0)];
      } else {
        // dist = quanti giorni lavorativi mancano allo smart più vicino (Infinity se non ce ne sono)
        const dist = near.length ? Math.min(...near.map(s => Math.abs(s - x.wi))) : Infinity;
        // pref = il giorno fa parte dello schema lun-mer-ven / mar-gio (numero pari, o dispari se flip).
        // Il "((x % 2) + 2) % 2" serve a gestire anche numeri negativi (date prima del 2024).
        const pref = (((x.wi % 2) + 2) % 2 === 0) !== flip;
        // Punteggio, confrontato in ordine di importanza:
        //   1° non attaccato a un altro smart (distanza almeno 2)
        //   2° rispetta lo schema di alternanza
        //   3° più lontano possibile dagli altri smart (li distribuisce nel mese)
        k = [dist >= 2 ? 1 : 0, pref ? 1 : 0, dist];
      }
      // Tiene il candidato con punteggio più alto; a parità vince il primo (giorno più presto)
      if (!bestKey || better(k, bestKey)) { best = i; bestKey = k; }
    });
    // Nessun candidato valido (giorni finiti o tutte le settimane piene): quota non raggiungibile
    if (best < 0) break;
    // Toglie il vincitore dai candidati e lo segna come smart proposto
    const [x] = cand.splice(best, 1);
    x.state = 'smart-auto';
    near.push(x.wi);
    away.add(x.wi);
    count(x.wi);
  }

  // 4) Segnala gli smart in settimane oltre il massimo (può succedere solo con smart fissati a mano)
  days.forEach(x => { x.over = x.state.startsWith('smart') && perWeek[week(x.wi)] > WEEK_MAX; });
  return days;
}

// Giorni lavorativi (non weekend, non festivi) tra due date "AAAA-MM-GG", estremi compresi:
// sono quelli da segnare come ferie nell'onboarding. Date al contrario vengono scambiate;
// al massimo un anno, per non bloccare la pagina con date assurde.
export function ferieRange(from, to = from) {
  if (to < from) [from, to] = [to, from];
  const out = [], [y, m, d] = from.split('-').map(Number);
  for (let i = 0; i <= 366; i++) {
    const t = new Date(Date.UTC(y, m - 1, d + i)), yy = t.getUTCFullYear(), mm = t.getUTCMonth(), dd = t.getUTCDate();
    const k = iso(yy, mm, dd);
    if (k > to) break;
    if (wIndex(yy, mm, dd) !== null && !holidays(yy).has(k)) out.push(k);
  }
  return out;
}
// Dalla lista dei giorni estrae i numeri feriali degli smart (fissati + proposti)
export const smartWi = days => days.filter(x => x.state.startsWith('smart')).map(x => x.wi);
