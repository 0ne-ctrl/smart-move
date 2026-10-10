// ============================================================
// FESTIVITÀ NAZIONALI DI OGNI PAESE
// Solo calcoli, niente pagina: la usa plan.js (holidays), che sceglie il paese con setCountry().
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

// Regole di ogni paese (codici ISO, come in Intl.DisplayNames), una festività per voce:
//   'MM-GG'       data fissa                     es. '12-25' = Natale
//   'MM-GG@AAAA'  data fissa, dall'anno AAAA     es. '10-04@2026' = San Francesco, dal 2026
//   'E+N'         N giorni dopo Pasqua (o prima) es. 'E+1' = Pasquetta, 'E-2' = Venerdì santo
//   'MM:n:g'      n-esimo giorno g del mese (g: 1 = lunedì … 5 = venerdì; n = -1 ultimo)
//                 es. '11:4:4' = quarto giovedì di novembre (Thanksgiving)
// obs = giorni sostitutivi quando la festa cade nel weekend:
//   'us' sabato → venerdì prima, domenica → lunedì dopo; 'uk' primo giorno feriale libero dopo.
// ponytail: solo festività nazionali ricorrenti; regionali e una tantum (es. giubilei UK) si segnano come ferie.
export const COUNTRIES = {
  IT: { rules: ['01-01', '01-06', 'E+1', '04-25', '05-01', '06-02', '08-15', '10-04@2026', '11-01', '12-08', '12-25', '12-26'] },
  // US: le sei festività che quasi tutte le aziende private danno libere (Capodanno, Memorial Day, 4 luglio, Labor Day,
  // Thanksgiving, Natale); le altre federali (MLK, Presidents' Day, Juneteenth, Columbus, Veterans) molte aziende le lavorano.
  // (i festivi non si possono cliccare: chi li ha liberi li segna come ferie)
  US: { obs: 'us', rules: ['01-01', '05:-1:1', '07-04', '09:1:1', '11:4:4', '12-25'] },
  GB: { obs: 'uk', rules: ['01-01', 'E-2', 'E+1', '05:1:1', '05:-1:1', '08:-1:1', '12-25', '12-26'] },
  DE: { rules: ['01-01', 'E-2', 'E+1', '05-01', 'E+39', 'E+50', '10-03', '12-25', '12-26'] },
  FR: { rules: ['01-01', 'E+1', '05-01', '05-08', 'E+39', 'E+50', '07-14', '08-15', '11-01', '11-11', '12-25'] },
  ES: { rules: ['01-01', '01-06', 'E-2', '05-01', '08-15', '10-12', '11-01', '12-06', '12-08', '12-25'] },
};

// Le date di un anno secondo le regole, come millisecondi UTC (Date.UTC gestisce da solo i cambi di mese)
function dates(y, rules) {
  const [em, ed] = easter(y);
  return rules.flatMap(r => {
    if (r[0] === 'E') return [Date.UTC(y, em, ed + +r.slice(1))];
    if (r.includes(':')) {
      const [m, n, g] = r.split(':').map(Number);
      if (n > 0) { const f = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); return [Date.UTC(y, m - 1, 1 + (g - f + 7) % 7 + 7 * (n - 1))]; }
      const last = new Date(Date.UTC(y, m, 0)); // giorno 0 del mese dopo = ultimo di questo
      return [Date.UTC(y, m - 1, last.getUTCDate() - (last.getUTCDay() - g + 7) % 7)];
    }
    const [md, from] = r.split('@'), [m, d] = md.split('-').map(Number);
    return from && y < +from ? [] : [Date.UTC(y, m - 1, d)];
  });
}

// Restituisce l'insieme (Set) delle festività di un anno per il paese c, come chiavi "AAAA-MM-GG"
// ('none' o paese sconosciuto = nessuna). Memorizzato in cache: ogni anno e paese si calcola una volta sola.
const cache = {};
export function holidaysOf(y, c) {
  const key = c + y, rules = COUNTRIES[c]?.rules;
  if (cache[key]) return cache[key];
  if (!rules) return cache[key] = new Set();
  const day = t => new Date(t).getUTCDay(), DAY = 864e5, out = new Set();
  const add = t => out.add(new Date(t).toISOString().slice(0, 10));
  if (COUNTRIES[c].obs === 'us') {
    // Anche l'anno dopo: il 1° gennaio di sabato si festeggia il 31 dicembre di quest'anno
    [...dates(y, rules), ...dates(y + 1, rules)].forEach(t => add(day(t) === 6 ? t - DAY : day(t) === 0 ? t + DAY : t));
  } else {
    const all = dates(y, rules).sort((a, b) => a - b);
    all.forEach(add);
    // 'uk': in ordine di data, ogni festa nel weekend passa al primo feriale non già festivo
    // (Natale sabato → lunedì 27, Santo Stefano domenica → martedì 28)
    if (COUNTRIES[c].obs === 'uk') all.filter(t => day(t) % 6 === 0).forEach(t => {
      while (day(t) % 6 === 0 || out.has(new Date(t).toISOString().slice(0, 10))) t += DAY;
      add(t);
    });
  }
  // Solo le date di quest'anno (la regola 'us' ne calcola anche dell'anno dopo)
  return cache[key] = new Set([...out].filter(k => k.startsWith(y + '-')));
}
