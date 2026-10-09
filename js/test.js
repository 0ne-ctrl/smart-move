// ============================================================
// AUTOVERIFICA
// ============================================================
// Controlli eseguiti a ogni caricamento (app.js importa questo file per primo), sempre con i limiti
// predefiniti 10/3: quelli scelti dall'utente vengono applicati subito dopo. Se qualcosa si rompe
// modificando il codice, nella console del browser (F12 → Console) compare "Assertion failed".
// Fuori dal browser: node js/test.js
import { QUOTA, WEEK_MAX, holidays, planMonth, ferieRange, smartWi } from './plan.js';
import { SOUNDS, synth } from './sounds.js';

function selfTest() {
  // Suoni: numeri validi, picco a 0,9 e durata giusta
  for (const name in SOUNDS) {
    const a = synth(name, 8000);
    console.assert(a.length > 0 && a.every(Number.isFinite) && Math.abs(a.reduce((p, x) => Math.max(p, Math.abs(x)), 0) - 0.9) < 1e-6, 'suono ' + name);
  }
  console.assert(holidays(2026).has('2026-04-06'), 'Pasquetta 2026');
  console.assert(holidays(2027).has('2027-03-29'), 'Pasquetta 2027');
  const smartOf = ds => ds.filter(x => x.state.startsWith('smart'));
  // Ottobre 2026 senza modifiche: quota piena e nessuno smart attaccato a un altro
  const oct = smartOf(planMonth(2026, 9, {}, false));
  console.assert(oct.length === QUOTA, 'ottobre: quota piena', oct.length);
  console.assert(oct.every((x, i) => i === 0 || x.wi - oct[i - 1].wi >= 2), 'ottobre: niente smart consecutivi');
  // Viaggio: una settimana di ferie con smart fissati prima e dopo → quota comunque piena
  const trip = { '2026-10-09': 'smart', '2026-10-19': 'smart' };
  for (let d = 12; d <= 16; d++) trip[`2026-10-${d}`] = 'ferie';
  console.assert(smartOf(planMonth(2026, 9, trip, false)).length === QUOTA, 'ottobre con ferie: quota piena');
  // Quota del mese ridotta con −: ne propone di meno; con 0 restano solo gli smart fissati
  console.assert(smartOf(planMonth(2026, 9, {}, false, [], 8)).length === 8, 'ottobre con quota 8');
  console.assert(smartOf(planMonth(2026, 9, { '2026-10-09': 'smart' }, false, [], 0)).length === 1, 'quota 0: resta il fissato');
  // Modalità "vicino al weekend": ottobre 2026 ha 5 venerdì e 4 lunedì → tutti smart, più 1 attaccato
  const wk = smartOf(planMonth(2026, 9, {}, false, [], QUOTA, 'weekend'));
  const dowOf = x => ((x.wi % 5) + 5) % 5;
  console.assert(wk.length === QUOTA, 'weekend: quota piena', wk.length);
  console.assert(wk.filter(x => dowOf(x) === 0 || dowOf(x) === 4).length === 9, 'weekend: tutti i lun e ven', wk.map(x => x.d));
  // Festivo di martedì (2 giugno 2026): il lunedì 1 fa ponte
  console.assert(smartOf(planMonth(2026, 5, {}, false, [], QUOTA, 'weekend')).some(x => x.d === 1), 'weekend: ponte lun 1 giugno');
  // Ferie lunedì 2 novembre (mese dopo): venerdì 30 ottobre deve restare smart, attaccato al ponte
  console.assert(smartOf(planMonth(2026, 9, { '2026-11-02': 'ferie' }, false, [], QUOTA, 'weekend')).some(x => x.d === 30), 'weekend: ven 30 ottobre');
  // Tutto il 2026, mese dopo mese, con entrambe le modalità: quota piena e nessuna settimana oltre il massimo
  for (const mode of ['alterni', 'weekend']) {
    const perWeek = {};
    let prev = [];
    for (let m = 0; m < 12; m++) {
      prev = smartWi(planMonth(2026, m, {}, false, prev, QUOTA, mode));
      console.assert(prev.length === QUOTA, `2026 ${mode}: quota piena nel mese ${m + 1}`, prev.length);
      prev.forEach(wi => perWeek[Math.floor(wi / 5)] = (perWeek[Math.floor(wi / 5)] || 0) + 1);
    }
    console.assert(Object.values(perWeek).every(c => c <= WEEK_MAX), `2026 ${mode}: max 3 a settimana`);
  }
  // 4 smart fissati a mano nella stessa settimana → devono essere segnalati
  const four = { '2026-10-05': 'smart', '2026-10-06': 'smart', '2026-10-07': 'smart', '2026-10-08': 'smart' };
  console.assert(planMonth(2026, 9, four, false).some(x => x.over), '4 smart fissati in una settimana segnalati');
  // Settimana a cavallo: settembre 2026 finisce mer 30, gio 1 e ven 2 ottobre fissati smart → a settembre ne resta 1
  console.assert(smartOf(planMonth(2026, 8, { '2026-10-01': 'smart', '2026-10-02': 'smart' }, false, [], QUOTA, 'weekend')).filter(x => x.d >= 28).length === 1, 'settimana a cavallo: smart fissati nel mese dopo');
  // Ferie dell'onboarding: 24–28 dicembre 2026 → solo gio 24 e lun 28 (25 festivo, 26–27 weekend)
  console.assert(ferieRange('2026-12-28', '2026-12-24').join() === '2026-12-24,2026-12-28', 'ferie 24-28 dicembre');
  console.assert(ferieRange('2026-12-07').join() === '2026-12-07', 'ferie di un giorno solo');
}
selfTest();
