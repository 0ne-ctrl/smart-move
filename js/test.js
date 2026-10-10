// ============================================================
// AUTOVERIFICA
// ============================================================
// Controlli eseguiti a ogni caricamento (app.js importa questo file per primo), sempre con i limiti
// predefiniti 10/3: quelli scelti dall'utente vengono applicati subito dopo. Se qualcosa si rompe
// modificando il codice, nella console del browser (F12 → Console) compare "Assertion failed".
// Fuori dal browser: node js/test.js
import { QUOTA, WEEK_MAX, setCountry, holidays, planMonth, ferieRange, smartWi, withWeekly } from './plan.js';
import { SOUNDS, synth } from './sounds.js';
import { toIcs } from './ics.js';

function selfTest() {
  // Suoni: numeri validi, picco a 0,9 e durata giusta
  for (const name in SOUNDS) {
    const a = synth(name, 8000);
    console.assert(a.length > 0 && a.every(Number.isFinite) && Math.abs(a.reduce((p, x) => Math.max(p, Math.abs(x)), 0) - 0.9) < 1e-6, 'suono ' + name);
  }
  console.assert(holidays(2026).has('2026-04-06'), 'Pasquetta 2026');
  console.assert(holidays(2027).has('2027-03-29'), 'Pasquetta 2027');
  // Festività degli altri paesi (giorni sostitutivi compresi), poi si torna all'Italia per gli altri controlli
  const has = (c, y, ...ks) => { setCountry(c); return ks.every(k => holidays(y).has(k)); };
  console.assert(has('US', 2021, '2021-12-31') && !has('US', 2022, '2022-01-01'), 'US: 1° gennaio 2022 (sabato) festeggiato il 31/12');
  console.assert(has('US', 2026, '2026-07-03', '2026-11-26', '2026-05-25', '2026-09-07'), 'US 2026: 4 luglio sostitutivo, Thanksgiving, Memorial, Labor Day');
  console.assert(['2026-01-19', '2026-02-16', '2026-06-19', '2026-10-12', '2026-11-11'].every(k => !has('US', 2026, k)), 'US: niente MLK, Presidents, Juneteenth, Columbus, Veterans');
  console.assert(has('GB', 2027, '2027-12-27', '2027-12-28', '2027-03-26', '2027-08-30'), 'GB 2027: Natale e Santo Stefano sostitutivi, Venerdì santo, Summer');
  console.assert(has('DE', 2026, '2026-05-14', '2026-05-25', '2026-10-03'), 'DE 2026: Ascensione, Pentecoste, 3 ottobre');
  console.assert(has('FR', 2026, '2026-07-14', '2026-05-08'), 'FR 2026');
  console.assert(has('ES', 2026, '2026-04-03', '2026-10-12'), 'ES 2026: Venerdì santo, 12 ottobre');
  console.assert(has('GR', 2026, '2026-02-23', '2026-03-25', '2026-04-10', '2026-04-13', '2026-10-28') && !has('GR', 2026, '2026-04-06'),
    'GR 2026: Lunedì puro, 25 marzo, Pasqua ortodossa (12 aprile) e non quella cattolica');
  console.assert(has('GR', 2027, '2027-05-03') && has('GR', 2025, '2025-04-21'), 'GR: Pasquetta ortodossa 2027 e 2025');
  setCountry('none'); console.assert(holidays(2026).size === 0, 'nessun paese: nessuna festività');
  setCountry('IT');
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
  // Smart fissato lunedì 2 novembre, settimane invertite: venerdì 30 ottobre non va proposto (sarebbero attaccati)
  const nov2 = smartOf(planMonth(2026, 9, { '2026-11-02': 'smart' }, true));
  console.assert(nov2.length === QUOTA && !nov2.some(x => x.d === 30), 'smart fissato nel mese dopo: niente smart il giorno prima', nov2.map(x => x.d));
  // Ferie dell'onboarding: 24–28 dicembre 2026 → solo gio 24 e lun 28 (25 festivo, 26–27 weekend)
  console.assert(ferieRange('2026-12-28', '2026-12-24').join() === '2026-12-24,2026-12-28', 'ferie 24-28 dicembre');
  console.assert(ferieRange('2026-12-07').join() === '2026-12-07', 'ferie di un giorno solo');
  // Martedì sempre in ufficio: nessuno smart di martedì, quota comunque piena, in entrambi gli schemi;
  // un martedì segnato a mano (smart o "auto") fa eccezione alla regola
  for (const mode of ['alterni', 'weekend']) {
    const tue = smartOf(planMonth(2026, 9, withWeekly({}, [2], 2026), false, [], QUOTA, mode));
    console.assert(tue.length === QUOTA && tue.every(x => new Date(Date.UTC(2026, 9, x.d)).getUTCDay() !== 2), `martedì in ufficio (${mode})`, tue.length);
  }
  const fixed = withWeekly({ '2026-10-13': 'smart', '2026-10-20': 'auto' }, [2], 2026);
  console.assert(fixed['2026-10-06'] === 'office' && fixed['2026-10-13'] === 'smart' && fixed['2026-10-20'] === 'auto' && fixed['2025-12-30'] === 'office' && fixed['2027-01-26'] === 'office', 'giorno fisso: eccezioni e anni vicini');
  // Calendario .ics: evento di un giorno intero che finisce il giorno dopo (anche a cavallo d'anno), righe CRLF
  const cal = toIcs([['2026-12-31', 'Ferie']], '20261010T000000Z');
  console.assert(cal.includes('\r\nDTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101\r\n') && cal.endsWith('END:VCALENDAR\r\n'), 'ics: 31 dicembre');
  // Titolo scritto dall'utente con caratteri speciali del formato
  console.assert(toIcs([['2026-10-09', 'Casa; via Roma, 1\\2']], '').includes('\r\nSUMMARY:Casa\\; via Roma\\, 1\\\\2\r\n'), 'ics: titolo escapato');
}
selfTest();
