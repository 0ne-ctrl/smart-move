// ============================================================
// TESTI DEL VIDEO in italiano e inglese. La lingua arriva dalla composizione (Root.tsx, prop "lang")
// tramite LangContext; le scene leggono i testi con useT().
// ============================================================
import { createContext, useContext } from 'react';

export type Lang = 'it' | 'en';

const it = {
  // Hook: la domanda (una riga per battito; l'ultima colorata) e i 16 dubbi, nell'ordine di CHIPS in Hook.tsx
  question: ['Quando vado', 'in ufficio', 'questo', 'mese?'],
  chips: ['lunedì?', 'max 3 a settimana', 'ferie', '10 al mese', 'il ponte?', 'Pasquetta', 'mercoledì?', 'riunione giovedì',
    'ufficio?', 'smart?', 'ferie ad agosto', '4 ottobre', 'giovedì?', 'venerdì?', 'settimana a cavallo', '…boh'],
  think: 'Ci pensa',
  tagline: ['Lo smart working', 'si pianifica da solo'],
  // Calendario
  months: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
  dow: ['L', 'M', 'M', 'G', 'V', 'S', 'D'],
  count: (n: number, q: number, ferie?: number) => `smart ${n}/${q}${ferie ? ` · ferie ${ferie}` : ''}`,
  events: (n: number) => `${n} eventi`,
  // Menu del giorno: automatico, smart, ufficio, ferie, poi il giorno fisso
  menu: ['Automatico', 'Smart', 'Ufficio', 'Ferie'],
  weekly: (day: string) => `Ufficio ogni ${day}`,
  tuesday: 'martedì', monday: 'lunedì',
  // Demo: titolo e sottotitolo dei cinque momenti
  captions: [['Decidi tu i limiti', 'smart al mese e massimo a settimana'], ['Segna le ferie', 'il piano si ricalcola da solo'],
    ['Due schemi', 'smart distanziati o weekend lunghi'], ['Un giorno fisso', "ufficio ogni lunedì, tutto l'anno"],
    ['Nel tuo calendario', 'Google, Outlook o Apple Calendar']],
  steppers: ['Giorni di smart al mese', 'Massimo a settimana'],
  seg: ['Giorni alterni', 'Vicino al weekend'],
  // Finestra dell'export ed eventi nel calendario
  exportTitle: 'Esporta in calendario',
  fields: [['Mese', 'Ottobre 2026 ▾'], ['Testo degli smart', 'Smart working'], ['Testo delle ferie', 'Ferie']],
  cancel: 'Annulla', download: 'Scarica',
  // Chiusura
  outro: ['Gratis, senza account.', 'I dati restano nel tuo browser.'],
};

const en: typeof it = {
  question: ['Office', 'or home', 'this', 'month?'],
  chips: ['Monday?', 'max 3 a week', 'time off', '10 a month', 'long weekend?', 'Thanksgiving', 'Wednesday?', 'Thursday meeting',
    'office?', 'WFH?', 'summer vacation', 'Bank holiday', 'Thursday?', 'Friday?', 'month-end week', '…dunno'],
  think: 'Leave it to',
  tagline: ['WFH days', 'that plan themselves'],
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  dow: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  count: (n, q, off) => `WFH ${n}/${q}${off ? ` · off ${off}` : ''}`,
  events: n => `${n} events`,
  menu: ['Automatic', 'WFH', 'Office', 'Time off'],
  weekly: day => `Office every ${day}`,
  tuesday: 'Tuesday', monday: 'Monday',
  captions: [['You set the limits', 'WFH days per month and max per week'], ['Mark your time off', 'the plan recalculates itself'],
    ['Two patterns', 'spread-out WFH or long weekends'], ['A fixed day', 'office every Monday, all year'],
    ['In your calendar', 'Google, Outlook or Apple Calendar']],
  steppers: ['WFH days per month', 'Max per week'],
  seg: ['Alternate days', 'Near the weekend'],
  exportTitle: 'Export to calendar',
  fields: [['Month', 'October 2026 ▾'], ['WFH text', 'WFH'], ['Time off text', 'Time off']],
  cancel: 'Cancel', download: 'Download',
  outro: ['Free, no account.', 'Your data stays in your browser.'],
};

export const LangContext = createContext<Lang>('it');
export const useT = () => ({ it, en })[useContext(LangContext)];
