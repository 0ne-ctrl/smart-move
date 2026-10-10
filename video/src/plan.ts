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
// Giorno fisso in ufficio: copia di ov con "office" su quei giorni della settimana (1 = lunedì … 5 = venerdì)
export const withWeekly = app.withWeekly as (ov: Ov, wd: number[], y: number) => Ov;

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
