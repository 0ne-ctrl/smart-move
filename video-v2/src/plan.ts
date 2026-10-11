// ============================================================
// LOGICA DI SMART MOVE: la stessa dell'app, importata da js/plan.js (niente copia da tenere allineata).
// Qui restano solo i tipi e due funzioni che servono al video.
// Limiti predefiniti dell'app: 10 smart al mese, massimo 3 a settimana.
// ============================================================
import * as app from '../../js/plan.js';

export const QUOTA: number = app.QUOTA;

export type State = 'weekend' | 'holiday' | 'ferie' | 'office' | 'smart' | 'smart-auto' | 'auto';
export type Day = { d: number; key: string; wi: number; state: State; over?: boolean };
export type Mode = 'alterni' | 'weekend';
export type Ov = Record<string, State>;

// plan.js è JavaScript: qui gli si danno i tipi
const planMonth = app.planMonth as (y: number, m: number, ov: Ov, flip: boolean, prev?: number[], quota?: number, mode?: Mode) => Day[];
const smartWi = app.smartWi as (days: Day[]) => number[];
// Giorno fisso: copia di ov con "office" (wd) o "smart" (ws) su quei giorni della settimana (1 = lunedì … 5 = venerdì)
export const withWeekly = app.withWeekly as (ov: Ov, wd: number[], y: number, ws?: number[]) => Ov;

// Il mese come lo mostra l'app: come render(), passa gli smart di ogni mese al successivo
// partendo dal dicembre dell'anno prima. Così le settimane a cavallo tornano uguali all'app.
export function monthPlan(y: number, m: number, ov: Ov = {}, mode: Mode = 'alterni', quota = QUOTA) {
  let prev = smartWi(planMonth(y - 1, 11, ov, false, [], QUOTA, mode));
  for (let i = 0; i < m; i++) prev = smartWi(planMonth(y, i, ov, false, prev, QUOTA, mode));
  return planMonth(y, m, ov, false, prev, quota, mode);
}

// Ordine in cui la scelta greedy aggiunge gli smart: il k-esimo è quello che compare
// passando da quota k-1 a quota k (la scelta è deterministica, quindi i piani sono annidati).
export function pickOrder(y: number, m: number, ov: Ov = {}, mode: Mode = 'alterni') {
  const order: string[] = [];
  for (let q = 1; q <= QUOTA; q++) {
    const k = monthPlan(y, m, ov, mode, q).find(x => x.state === 'smart-auto' && !order.includes(x.key));
    if (k) order.push(k.key);
  }
  return order;
}

// ============================================================
// AGGIUNTE DEL PROMO v2: i dati veri dietro ogni scena
// ============================================================
const holidays = app.holidays as (y: number) => Set<string>;
const wIndex = app.wIndex as (y: number, m: number, d: number) => number | null;
export const ferieRange = app.ferieRange as (from: string, to?: string) => string[];

// Giorni lavorativi dell'anno (feriali meno festività): 254 nel 2026 in Italia
export const workdays = (y: number) => {
  let n = 0;
  for (let m = 0; m < 12; m++) for (let d = 1; d <= new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); d++)
    if (wIndex(y, m, d) !== null && !holidays(y).has(app.iso(y, m, d))) n++;
  return n;
};

// I 12 mesi come li disegna render() dell'app: gli smart di ogni mese passano al successivo
export function yearPlan(y: number, ov: Ov = {}, mode: Mode = 'alterni') {
  let prev = smartWi(planMonth(y - 1, 11, ov, false, [], QUOTA, mode));
  return Array.from({ length: 12 }, (_, m) => {
    const days = planMonth(y, m, ov, false, prev, QUOTA, mode);
    prev = smartWi(days);
    return days;
  });
}

// Passaggio da un piano all'altro: gli smart che spariscono "volano" su quelli nuovi.
// Prima si accoppiano nella stessa riga del calendario (stessa settimana), poi quelli rimasti, in ordine di data.
export function flights(before: Day[], after: Day[], row: (d: number) => number) {
  const isS = (x: Day) => x.state.startsWith('smart');
  const gone = before.filter((x, i) => isS(x) && !isS(after[i])).map(x => x.d);
  const come = after.filter((x, i) => isS(x) && !isS(before[i])).map(x => x.d);
  const pairs: [number, number][] = [];
  for (const g of [...gone]) {
    const k = come.findIndex(c => row(c) === row(g));
    if (k >= 0) { pairs.push([g, come[k]]); come.splice(k, 1); gone.splice(gone.indexOf(g), 1); }
  }
  gone.forEach((g, i) => pairs.push([g, come[i]]));
  return pairs.sort((a, b) => a[0] - b[0]);
}
