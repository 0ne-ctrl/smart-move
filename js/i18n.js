// ============================================================
// LINGUE: italiano (scritto direttamente in index.html) e inglese.
// - EN: testi inglesi degli elementi di index.html con data-i18n="chiave". Una stringa sostituisce il
//   contenuto (stesso HTML interno: <b>, <span data-q>, data-mode); un oggetto sostituisce attributi.
// - T: testi scritti dal JavaScript (app.js), nelle due lingue.
// Nomi di mesi, giorni e paesi non stanno qui: li dà il browser (Intl), vedi app.js.
// ============================================================

export const EN = {
  // Barra in alto
  skip: 'Skip to the current month',
  prev: { 'aria-label': 'Previous year' },
  next: { 'aria-label': 'Next year' },
  segLegend: 'WFH pattern',
  segAlt: 'Alternate days',
  segWeek: 'Near the weekend',
  flip: 'Swap weeks',
  ics: { 'aria-label': 'Calendar', title: 'Export a month to your calendar (.ics)' },
  settings: { 'aria-label': 'Settings', title: 'Settings' },
  undo: { 'aria-label': 'Undo', title: 'Undo last change (Ctrl+Z)' },
  help: { 'aria-label': 'How it works', title: 'Guide' },

  // Guida "?"
  tHead: 'How it works',
  t1: `Every month you get <b><span data-q="month">10</span> WFH days</b>, at most <b><span data-q="week">3</span> a week</b>: the page suggests them automatically,
      <span data-mode="alterni">alternating <b>Mon‑Wed‑Fri</b> and <b>Tue‑Thu</b> weeks, never on consecutive days.</span>
      <span data-mode="weekend">first on <b>Mondays and Fridays</b>, then next to holidays, time off and other WFH days, for longer stretches away from the office.</span>`,
  t2: '<b>Click a day</b> and pick from the menu: <b>WFH</b>, <b>office</b>, <b>time off</b> or <b>automatic</b> (the page decides). Working weekends? Saturdays and Sundays can be marked too.',
  t3: "The month's remaining WFH days <b>rearrange themselves</b> around time off and fixed days.",
  t4: "Each month's counter shows how many WFH days you're using. Want <b>fewer</b>? Press <b>−</b> next to the month's counter; <b>+</b> brings them back.",
  t5: 'When you open the page you see the current month and the next ones; <b>past months</b> are hidden: show them with the button above the calendar.',
  t6: '<b>Going on a trip?</b> Mark your time off, then set the days around it as WFH (e.g. the Friday before and the Monday after).',
  t7: 'Public holidays of the chosen country (in the <b>settings</b>) are already excluded. Mark <b>local holidays</b> as time off.',
  t8: `<span data-mode="alterni">Prefer long weekends? Choose <b>Near the weekend</b> at the top.</span>
      <span data-mode="weekend">Prefer spread-out WFH days? Choose <b>Alternate days</b> at the top.</span>`,
  t9: `Have a <b>fixed office day</b> (e.g. the Tuesday meeting)? Click one of those days and choose <b>office every Tuesday</b>:
      it applies all year. For an exception, pick another state on that single day.`,
  t11: 'Made a mistake? The <b>arrow</b> at the top (or <b>Ctrl+Z</b>) undoes the last change.',
  t10: 'If the alternation is the wrong way round, press <b>"Swap weeks"</b>.',
  // Impostazioni
  setHead: 'Settings',
  tLang: 'Language and holidays',
  lang: 'Language',
  country: 'Public holidays',
  tLook: 'Theme and sounds',
  theme: 'Dark theme',
  sound: 'Sounds',
  tData: 'Your data',
  dataHelp: `Your data is saved only in this browser. On iPhone, Safari deletes it after 7 days without visits:
    add the page to your Home Screen (it becomes an app that also works offline), or save a copy with <b>Export</b> and restore it with <b>Import</b>.
    The Home Screen app starts empty: to bring your Safari data over, use <b>Export</b> here and <b>Import</b> in the app.`,
  export: 'Export',
  import: 'Import',
  done: 'Done',
  icsHelp: `Want your WFH days in your calendar? The <b>calendar</b> icon at the top downloads a month's WFH days and time off
    as an .ics file, to import into Google, Outlook or Apple Calendar. If you change the plan later, download and import it again.`,
  resetHelp: '<b>Reset all</b> deletes time off, fixed days and limits and reopens the initial setup.',
  resetAll: 'Reset all',
  gotIt: 'Got it',

  // Onboarding
  onboard: { 'aria-label': 'Initial setup' },
  ob1: 'Welcome to Smart Move',
  ob1Text: 'The page plans your WFH days for the whole year by itself. Just tell it the rules of your job: the month below changes as you choose.',
  obQuota: 'WFH days per month',
  quotaMinus: { 'aria-label': 'One less WFH day per month' },
  quotaPlus: { 'aria-label': 'One more WFH day per month' },
  obWeek: 'Max per week',
  weekMinus: { 'aria-label': 'One less WFH day per week' },
  weekPlus: { 'aria-label': 'One more WFH day per week' },
  ob1Note: 'You can change them anytime in the <b>settings</b>, the gear icon at the top.',
  ob2: 'How do you like your WFH days?',
  cardAlt: 'Alternate days',
  mini1: '<span class="d smart-auto">M</span><span class="d auto">T</span><span class="d smart-auto">W</span><span class="d auto">T</span><span class="d smart-auto">F</span>',
  mini2: '<span class="d auto">M</span><span class="d smart-auto">T</span><span class="d auto">W</span><span class="d smart-auto">T</span><span class="d auto">F</span>',
  cardAltText: 'Never two days in a row: a bit at home, a bit at the office.',
  cardWeek: 'Near the weekend',
  mini3: '<span class="d smart-auto">M</span><span class="d auto">T</span><span class="d auto">W</span><span class="d auto">T</span><span class="d smart-auto">F</span>',
  cardWeekText: 'Long weekends and bridges next to holidays and time off.',
  ob3: 'Try it: click a day',
  ob3Text: 'A menu opens: choose <b>WFH</b>, <b>office</b>, <b>time off</b> or <b>automatic</b> (the page decides). The other WFH days move by themselves. "Reset" puts the month back as it was.',
  ob3Weekly: `Have a <b>fixed office day</b>, like the Tuesday meeting? Click one of those days and choose
      <b>office every Tuesday</b>, at the bottom of the menu: it applies all year.`,
  ob4: 'Any time off already?',
  ob4Text: 'Mark it now, so your WFH days arrange themselves around it. For a <b>local holiday</b> the first field is enough. You can skip this step and do it later from the calendar.',
  from: 'from',
  to: 'to (optional)',
  obFerie: 'Mark as time off',
  ob5: 'All set',
  ob5Summary: `<b><span data-q="month">10</span> WFH days a month</b>, at most <b><span data-q="week">3</span> a week</b>,
      <span data-mode="alterni">on alternate days</span><span data-mode="weekend">near the weekend</span>.`,
  ob5Text: 'You can change the pattern at the top whenever you like, limits and language in the <b>settings</b>. The <b>?</b> button reopens the full guide.',
  ob5Ics: `Want your WFH days in your calendar too? The <b>calendar</b> icon at the top downloads a month as an .ics file,
      to import into Google, Outlook or Apple Calendar.`,
  back: 'Back',

  // Esporta in calendario
  icsHead: 'Export to calendar',
  icsText: "Every WFH day and every day off in the month becomes an all-day event, with the text you choose here. If you change a day later, export the month again and delete the event you no longer need from your calendar by hand.",
  month: 'Month',
  icsSmart: 'WFH text',
  icsSmartPh: { placeholder: 'Working from home' },
  icsFerie: 'Time off text',
  icsFeriePh: { placeholder: 'Time off' },
  cancel: 'Cancel',
  download: 'Download',

  // Easter egg, legenda, menu del giorno
  car: 'Want to know what your car is worth??',
  yes: 'Yes',
  no: 'No',
  lgSmartAuto: '<i class="smart-auto"></i>suggested WFH',
  lgSmart: '<i class="smart"></i>fixed WFH',
  lgAuto: '<i class="auto"></i>office',
  lgOffice: '<i class="office"></i>fixed office',
  lgFerie: '<i class="ferie"></i>time off',
  lgHoliday: '<i class="holiday"></i>holiday',
  mAuto: '<i class="smart-auto"></i>automatic',
  mSmart: '<i class="smart"></i>WFH',
  mOffice: '<i class="office"></i>office',
  mFerie: '<i class="ferie"></i>time off',
};

// Testi del JavaScript. Le funzioni ricevono i pezzi variabili (numeri, nomi di mesi e giorni).
export const T = {
  it: {
    // Nome di ogni stato letto dai lettori di schermo (il colore da solo non basta)
    states: { 'smart-auto': 'smart proposto', smart: 'smart fissato', office: 'ufficio fissato', ferie: 'ferie', auto: 'ufficio', holiday: 'festivo', weekend: 'weekend' },
    count: (n, q, f, w) => `smart ${n}/${q}${f ? ` · ferie ${f}` : ''}${w ? ` · >${w}/sett.` : ''}`,
    past: (show, first, last) => `${show ? 'Nascondi' : 'Mostra'} ${first}${last ? ' – ' + last : ''}`,
    less: m => `Uno smart in meno a ${m}`, more: m => `Uno smart in più a ${m}`,
    lessT: 'Uno smart in meno', moreT: 'Uno smart in più',
    reset: 'Reset', resetM: m => `Reset ${m}`,
    day: (d, m) => `${d} ${m}`, over: ', oltre il massimo settimanale',
    weekly: day => `ufficio ogni ${day}`,
    none: 'Nessuna',
    saveFail: 'Questo browser non salva i dati: ricaricando la pagina le modifiche si perdono. Usa Esporta per tenerne una copia.',
    resetAll: 'Cancellare tutto (ferie, giorni fissati e limiti) e ricominciare da capo?',
    importAsk: 'Sostituire i dati attuali con quelli del file?', badFile: 'File non valido.',
    noStorage: 'Questo browser non permette di salvare i dati.',
    step: (n, tot) => `Passo ${n} di ${tot}`, start: 'Inizia', next: 'Avanti',
    noFrom: 'Scegli prima una data nel campo "dal".', badDate: "Data non valida: controlla l'anno.",
    noDays: 'In quel periodo non ci sono giorni lavorativi (solo weekend o festivi).',
    marked: (a, b, n) => `${n === 1 ? a + ' segnato' : `${a} – ${b}: ${n} giorni segnati`} come ferie. Puoi aggiungerne altre.`,
  },
  en: {
    states: { 'smart-auto': 'suggested WFH', smart: 'fixed WFH', office: 'fixed office', ferie: 'time off', auto: 'office', holiday: 'holiday', weekend: 'weekend' },
    count: (n, q, f, w) => `WFH ${n}/${q}${f ? ` · off ${f}` : ''}${w ? ` · >${w}/wk` : ''}`,
    past: (show, first, last) => `${show ? 'Hide' : 'Show'} ${first}${last ? ' – ' + last : ''}`,
    less: m => `One less WFH day in ${m}`, more: m => `One more WFH day in ${m}`,
    lessT: 'One less WFH day', moreT: 'One more WFH day',
    reset: 'Reset', resetM: m => `Reset ${m}`,
    day: (d, m) => `${m} ${d}`, over: ', over the weekly maximum',
    weekly: day => `office every ${day}`,
    none: 'None',
    saveFail: "This browser doesn't save data: your changes will be lost when you reload the page. Use Export to keep a copy.",
    resetAll: 'Delete everything (time off, fixed days and limits) and start over?',
    importAsk: 'Replace the current data with the one in the file?', badFile: 'Invalid file.',
    noStorage: "This browser doesn't allow saving data.",
    step: (n, tot) => `Step ${n} of ${tot}`, start: 'Start', next: 'Next',
    noFrom: 'First pick a date in the "from" field.', badDate: 'Invalid date: check the year.',
    noDays: 'There are no working days in that period (only weekends or holidays).',
    marked: (a, b, n) => `${n === 1 ? a : `${a} – ${b}: ${n} days`} marked as time off. You can add more.`,
  },
};

// Scrive i testi della lingua scelta negli elementi con data-i18n. L'italiano è quello di index.html:
// la prima volta se ne tiene una copia (contenuto o attributi), così si può tornare indietro senza ricaricare.
// Gli elementi copiati dal JavaScript (legende delle finestre) vanno creati prima della prima chiamata.
const orig = new Map();
export function applyLang(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(e => {
    const en = EN[e.dataset.i18n];
    if (!orig.has(e)) orig.set(e, typeof en === 'string' ? e.innerHTML
      : Object.fromEntries(Object.keys(en).map(a => [a, e.getAttribute(a)])));
    const v = lang === 'en' ? en : orig.get(e);
    if (typeof v === 'string') e.innerHTML = v; else for (const a in v) e.setAttribute(a, v[a]);
  });
}
