// ============================================================
// CALENDARIO .ics: file da importare in Google, Outlook o Apple Calendar (formato iCalendar, RFC 5545).
// Solo testo, niente pagina: la usano app.js (pulsante "Calendario") e test.js.
// ============================================================
// days = [["AAAA-MM-GG", "Titolo"], ...]: un evento di un giorno intero per ogni data.
// stamp = momento dell'esportazione come "AAAAMMGGTHHMMSSZ" (DTSTAMP, obbligatorio nel formato).
// L'UID dipende solo dalla data: reimportando il file, il calendario aggiorna l'evento invece di duplicarlo.
// Non può però cancellare i giorni che non sono più nel file (es. smart diventato ufficio): quelli vanno tolti a mano.
// TRANSP:TRANSPARENT = l'evento non ti segna "occupato" negli inviti.
// Il titolo lo scrive l'utente: \ ; , e gli a capo vanno "escapati", altrimenti rompono il formato.
// ponytail: righe lunghe non spezzate a 75 byte come vorrebbe il formato; i titoli sono al massimo 60 caratteri
// (maxlength in index.html) e i calendari le leggono lo stesso. Da spezzare se si accettano testi lunghi.
export function toIcs(days, stamp) {
  const ymd = k => k.replaceAll('-', '');                                             // "2026-10-09" → "20261009"
  const next = k => new Date(Date.parse(k) + 864e5).toISOString().slice(0, 10);      // giorno dopo (fine evento, esclusa)
  const text = s => s.replace(/[\\;,]/g, '\\$&').replace(/\r?\n/g, '\\n');
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Smart Move//IT',
    ...days.flatMap(([k, title]) => ['BEGIN:VEVENT', `UID:${k}@smart-move`, `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(k)}`, `DTEND;VALUE=DATE:${ymd(next(k))}`, `SUMMARY:${text(title)}`,
      'TRANSP:TRANSPARENT', 'END:VEVENT']),
    'END:VCALENDAR', ''].join('\r\n'); // il formato vuole righe chiuse da CRLF
}
