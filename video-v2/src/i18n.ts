// ============================================================
// TESTI DEL PROMO v2 in italiano e inglese (la lingua arriva dalla composizione, come in v1)
// ============================================================
import { createContext, useContext } from 'react';

export type Lang = 'it' | 'en';

const it = {
  // Conteggio: i numeri veri del 2026 (calcolati in plan.ts)
  workdays: 'giorni di lavoro nel 2026',
  smartDays: 'da fare in smart',
  which: 'Quali?',
  tagline: 'Lo smart working si pianifica da solo',
  months: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
  dow: ['L', 'M', 'M', 'G', 'V', 'S', 'D'],
  // Titolo e sottotitolo di ogni momento del mese
  rhythm: ['Ha un ritmo', 'lun-mer-ven, poi mar-gio: mai due di fila'],
  ferie: ['Segna le ferie', 'il piano si riscrive da solo'],
  weekend: ['Weekend lunghi', 'smart vicino a sabato e domenica'],
  fixed: ['Un giorno fisso', "ufficio ogni lunedì, tutto l'anno"],
  export: ['Nel tuo calendario', 'Google, Outlook o Apple'],
  year: ['Tutto il 2026', 'già pianificato'],
  week: (n: number) => `${n}/3 questa settimana`,
  count: (n: number) => `smart ${n}/10`,
  days: (n: number) => `${n} giorni`,
  events: (n: number) => `${n} eventi`,
  seg: ['Giorni alterni', 'Vicino al weekend'],
  weekly: 'Ufficio ogni lunedì',
  smart: 'Smart', ferieEv: 'Ferie',
  outro: ['Gratis, senza account.', 'I dati restano nel tuo browser.'],
};

const en: typeof it = {
  workdays: 'workdays in 2026',
  smartDays: 'of them from home',
  which: 'Which ones?',
  tagline: 'WFH days that plan themselves',
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  dow: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  rhythm: ['It has a rhythm', 'Mon-Wed-Fri, then Tue-Thu: never back to back'],
  ferie: ['Mark your time off', 'the plan rewrites itself'],
  weekend: ['Long weekends', 'WFH next to Saturday and Sunday'],
  fixed: ['A fixed day', 'office every Monday, all year'],
  export: ['In your calendar', 'Google, Outlook or Apple'],
  year: ['All of 2026', 'already planned'],
  week: n => `${n}/3 this week`,
  count: n => `WFH ${n}/10`,
  days: n => `${n} days`,
  events: n => `${n} events`,
  seg: ['Alternate days', 'Near the weekend'],
  weekly: 'Office every Monday',
  smart: 'WFH', ferieEv: 'Time off',
  outro: ['Free, no account.', 'Your data stays in your browser.'],
};

export const LangContext = createContext<Lang>('it');
export const useT = () => ({ it, en })[useContext(LangContext)];
