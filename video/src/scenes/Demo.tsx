// SCENA 3 (battute 5–14): la demo. Un solo calendario, sempre nello stesso punto, per cinque momenti di 2 battute:
//   A) i limiti si scelgono con −/+ (come nell'onboarding), poi gli smart cadono uno per ottavo, nell'ordine di planMonth
//   B) un click segna martedì 13 come ferie e lo smart si sposta da solo sul 27
//   C) il segmento passa a "Vicino al weekend" e il mese si ripianifica a ondata
//   D) click sul 19 → "Ufficio ogni lunedì": i lunedì diventano ufficio fissato e gli smart vanno su gio-ven
//   E) l'icona calendario apre l'export, "Scarica", e smart e ferie atterrano come eventi in una vista calendario
// Cambiano solo le scritte sopra, con un colpo sul primo battito di ogni momento.
import { Audio } from '@remotion/media';
import { AbsoluteFill, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Calendar } from '../Calendar';
import { monthPlan, pickOrder, QUOTA, withWeekly } from '../plan';
import { Cursor, Menu } from '../Pointer';
import { C, FONT } from '../theme';
import { BAR, BEAT, punch } from '../timing';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const DAY = '2026-10-13', MOVED = '2026-10-27', FERIE = { [DAY]: 'ferie' as const };
// I quattro piani mostrati, calcolati con la vera logica dell'app
const alterni = monthPlan(2026, 9), order = pickOrder(2026, 9);
const conFerie = monthPlan(2026, 9, FERIE), weekend = monthPlan(2026, 9, FERIE, 'weekend');
// D: ogni lunedì in ufficio (1 = lunedì, come wd nell'app); E: gli stessi giorni senza segni, per la vista calendario
const MON = '2026-10-19', fisso = monthPlan(2026, 9, withWeekly(FERIE, [1], 2026), 'weekend');
const plain = fisso.map(x => ({ ...x, state: x.state === 'weekend' ? x.state : 'auto' as const }));
const events = fisso.filter(x => x.state.startsWith('smart') || x.state === 'ferie');
const row = (key: string) => Math.floor((3 + +key.slice(8) - 1) / 7); // riga della griglia (ottobre 2026 parte di giovedì)

// Inizio dei tre momenti e degli eventi (fotogrammi della scena, tutti su battiti o ottavi)
const A = 0, B = 2 * BAR, CC = 4 * BAR, D = 6 * BAR, E = 8 * BAR, LEN = 10 * BAR;
const PLUS1 = A, PLUS2 = A + BEAT;           // "+" degli smart al mese (9 → 10) e del massimo a settimana (2 → 3), sul battere
const PICK0 = A + BEAT, PICK = BEAT / 2;      // primo smart al secondo battito, insieme al secondo "+", poi uno per ottavo
const CLICK1 = B + 2 * BEAT, CLICK2 = B + BAR; // click sul giorno, click su "Ferie" (battere della battuta dopo)
const SWITCH = CC + BEAT;                      // scatto dell'interruttore
const CLICK3 = D + 2 * BEAT, CLICK4 = D + BAR; // click sul 19, click su "Ufficio ogni lunedì"
const WAVE = CLICK4 + 4;                       // ondata dei lunedì: una riga per ottavo
const CLICK5 = E + BEAT, CLICK6 = E + 3 * BEAT; // click sull'icona calendario, click su "Scarica"
const SWAP = E + BAR;                          // battuta 14: il calendario diventa vista calendario
const LAND = SWAP + BEAT / 2;                  // gli eventi atterrano una riga per ottavo
const ROWS = [0, 1, 2, 3, 4];

// Titolo e sottotitolo di un momento: le parole entrano a colpi, all'uscita salgono e spariscono
const Caption: React.FC<{ frame: number; from: number; to: number; title: string; sub: string }> = ({ frame, from, to, title, sub }) => {
  if (frame < from || frame >= to) return null;
  const out = interpolate(frame, [to - 7, to], [0, 1], clamp);
  return (
    <div style={{ position: 'absolute', top: 210, left: 80, right: 80, textAlign: 'center', opacity: 1 - out, translate: `0px ${-50 * out}px` }}>
      <div style={{ fontSize: 100, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
        {title.split(' ').map((w, i) => (
          <span key={i} style={{ display: 'inline-block', marginRight: '0.25em', ...punch(frame, from + i * 3, 1.6) }}>{w}</span>
        ))}
      </div>
      <div style={{ fontSize: 50, fontWeight: 600, color: C.muted, marginTop: 18,
        opacity: interpolate(frame, [from + 10, from + 16], [0, 1], clamp),
        translate: `0px ${interpolate(frame, [from + 10, from + 18], [24, 0], { ...clamp, easing: Easing.out(Easing.cubic) })}px` }}>{sub}</div>
    </div>
  );
};

export const DemoScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = (at: number, damping = 12) => spring({ frame: frame - at, fps, config: { damping } });

  // Quale piano mostrare e come passare dal precedente (p = avanzamento per giorno)
  let days = alterni, prevDays, p: (key: string) => number, label;
  if (frame < B) {
    p = key => { const i = order.indexOf(key); return i < 0 ? 1 : sp(PICK0 + i * PICK); };
    label = `smart ${order.filter((_, i) => frame >= PICK0 + i * PICK).length}/${QUOTA}`;
  } else if (frame < CC) {
    days = conFerie; prevDays = alterni;
    p = key => key === DAY ? sp(CLICK2 + 2, 14) : key === MOVED ? sp(CLICK2 + BEAT) : 1;
    label = frame < CLICK2 ? `smart ${QUOTA}/${QUOTA}` : `smart ${QUOTA}/${QUOTA} · ferie 1`;
  } else if (frame < D) {
    days = weekend; prevDays = conFerie;
    p = key => sp(SWITCH + 6 + (+key.slice(8)) * 1.5, 13); // ondata giorno per giorno
    label = `smart ${QUOTA}/${QUOTA} · ferie 1`;
  } else if (frame < SWAP) {
    days = fisso; prevDays = weekend;
    // riga per riga: prima il lunedì diventa ufficio, 3 fotogrammi dopo si spostano gli smart della settimana
    p = key => sp(WAVE + row(key) * PICK + (fisso.find(x => x.key === key)?.state === 'office' ? 0 : 3), 13);
    label = `smart ${QUOTA}/${QUOTA} · ferie 1`;
  } else {
    days = plain; prevDays = fisso;
    p = () => sp(SWAP, 20); // i segni dell'app si spengono tutti insieme sul battere
    label = `${events.filter(x => frame >= LAND + row(x.key) * PICK).length} eventi`;
  }

  // Telecamera: entra con un piccolo zoom, si avvicina al 13 durante il click, esce alla fine
  const enter = sp(0, 200), leave = interpolate(frame, [LEN - 8, LEN], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const push = interpolate(frame, [B, CLICK1, CLICK2 + BEAT, CC, D, CLICK3, CLICK4 + BEAT, E], [1, 1.08, 1.08, 1, 1, 1.08, 1.08, 1],
    { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const knob = sp(SWITCH, 16);
  // Finestra dell'export: si apre dopo il click sull'icona, si chiude dopo "Scarica" (come Menu)
  const dlg = sp(CLICK5 + 2, 18) * interpolate(frame, [CLICK6 + 3, CLICK6 + 10], [1, 0], clamp);
  const press = (c: number) => interpolate(frame, [c - 2, c, c + 5], [1, 0.9, 1], clamp);
  // Overlay sui giorni: menu e cursore in B e D, etichette degli eventi in E
  const overlay: Record<string, React.ReactNode> =
    frame >= B && frame < CC ? { [DAY]: <><Menu frame={frame} c1={CLICK1} c2={CLICK2} weekday="martedì" /><Cursor frame={frame} c1={CLICK1} c2={CLICK2} /></> }
    : frame >= D && frame < E ? { [MON]: <><Menu frame={frame} c1={CLICK3} c2={CLICK4} weekday="lunedì" pick="Ufficio ogni lunedì" left />
        <Cursor frame={frame} c1={CLICK3} c2={CLICK4} b={[150, -122]} /></> }
    : frame >= SWAP ? Object.fromEntries(events.map(x => [x.key, <Chip key={x.key} ferie={x.state === 'ferie'} p={sp(LAND + row(x.key) * PICK, 14)} />]))
    : {};

  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.text }}>
      {/* Suoni: un pop per smart (scala che sale), clic, evidenziatore, interruttore, fruscio d'uscita */}
      {order.map((_, i) => <Audio key={i} name={`Pop smart ${i + 1}`} from={PICK0 + i * PICK} src={staticFile(`sfx/pop-${i}.wav`)} volume={0.4} />)}
      {/* il secondo "+" non ha clic: cade insieme al primo pop */}
      <Audio name="Più al mese" from={PLUS1} src={staticFile('sfx/click.wav')} volume={0.6} />
      <Audio name="Clic giorno" from={CLICK1 - 1} src={staticFile('sfx/click.wav')} volume={0.7} />
      <Audio name="Clic ferie" from={CLICK2 - 1} src={staticFile('sfx/click.wav')} volume={0.7} />
      <Audio name="Evidenziatore" from={CLICK2 + 2} src={staticFile('sfx/ferie.wav')} volume={0.4} />
      <Audio name="Pop spostato" from={CLICK2 + BEAT} src={staticFile('sfx/pop-5.wav')} volume={0.4} />
      <Audio name="Interruttore" from={SWITCH - 1} src={staticFile('sfx/switch.wav')} volume={0.5} />
      <Audio name="Clic lunedì" from={CLICK3 - 1} src={staticFile('sfx/click.wav')} volume={0.7} />
      <Audio name="Clic giorno fisso" from={CLICK4 - 1} src={staticFile('sfx/click.wav')} volume={0.7} />
      <Audio name="Scatto giorno fisso" from={CLICK4 + 1} src={staticFile('sfx/switch.wav')} volume={0.5} />
      {ROWS.map(r => <Audio key={'d' + r} name={`Pop ondata ${r + 1}`} from={WAVE + r * PICK + 3} src={staticFile(`sfx/pop-${3 + r}.wav`)} volume={0.35} />)}
      <Audio name="Clic icona" from={CLICK5 - 1} src={staticFile('sfx/click.wav')} volume={0.7} />
      <Audio name="Clic scarica" from={CLICK6 - 1} src={staticFile('sfx/click.wav')} volume={0.7} />
      <Audio name="Fruscio vista calendario" from={SWAP - 8} src={staticFile('sfx/whoosh.wav')} volume={0.3} />
      {ROWS.map(r => <Audio key={'e' + r} name={`Pop eventi ${r + 1}`} from={LAND + r * PICK} src={staticFile(`sfx/pop-${5 + r}.wav`)} volume={0.35} />)}
      <Audio name="Fruscio uscita" from={LEN - 10} src={staticFile('sfx/whoosh.wav')} volume={0.35} />

      <AbsoluteFill style={{ opacity: 1 - leave, scale: String(1 - 0.15 * leave) }}>
        <Caption frame={frame} from={A} to={B} title="Decidi tu i limiti" sub="smart al mese e massimo a settimana" />
        <Caption frame={frame} from={B} to={CC} title="Segna le ferie" sub="il piano si ricalcola da solo" />
        <Caption frame={frame} from={CC} to={D} title="Due schemi" sub="smart distanziati o weekend lunghi" />
        <Caption frame={frame} from={D} to={E} title="Un giorno fisso" sub="ufficio ogni lunedì, tutto l'anno" />
        <Caption frame={frame} from={E} to={LEN} title="Nel tuo calendario" sub="Google, Outlook o Apple Calendar" />

        {/* Il calendario: sempre qui, cambia solo il contenuto */}
        <div style={{ position: 'absolute', top: 560, left: '50%', translate: '-50% 0px', transformOrigin: frame < CC ? '30% 50%' : '12% 62%',
          opacity: enter, scale: String(interpolate(enter, [0, 1], [0.85, 1]) * push) }}>
          <Calendar y={2026} m={9} days={days} prevDays={prevDays} p={p} label={label} overlay={overlay} />
        </div>

        {/* A: i due limiti dell'onboarding, con −/+ (solo nel primo momento) */}
        {frame < B && <div style={{ position: 'absolute', top: 1480, left: 130, width: 820, padding: '20px 36px', borderRadius: 40,
          background: C.glass, border: `2px solid ${C.line}`, ...punch(frame, A, 1.3) }}>
          <Stepper frame={frame} label="Giorni di smart al mese" from={9} at={PLUS1} scale={press(PLUS1)} />
          <Stepper frame={frame} label="Massimo a settimana" from={2} at={PLUS2} scale={press(PLUS2)} />
        </div>}

        {/* Segmento dei due schemi, come .seg nell'app (solo nel terzo momento) */}
        {frame < D && <div style={{ position: 'absolute', top: 1500, left: '50%', translate: `-50% ${interpolate(frame, [CC, CC + 8], [40, 0], clamp)}px`,
          opacity: interpolate(frame, [CC, CC + 6], [0, 1], clamp), display: 'flex', padding: 8, borderRadius: 30,
          background: C.glass, border: `2px solid ${C.line}`, fontSize: 42, fontWeight: 600 }}>
          <div style={{ position: 'absolute', top: 8, bottom: 8, left: 8, width: 380, borderRadius: 22, background: C.smart, translate: `${knob * 380}px 0px` }} />
          {['Giorni alterni', 'Vicino al weekend'].map((x, i) => (
            <div key={x} style={{ position: 'relative', width: 380, padding: '18px 0', textAlign: 'center',
              color: (i === 1) === knob > 0.5 ? C.smartText : C.muted }}>{x}</div>
          ))}
        </div>}

        {/* E: icona calendario (la stessa di #ics nella barra dell'app), poi la finestra dell'export */}
        {frame >= E && <>
          <div style={{ position: 'absolute', top: 1500, left: 470, ...punch(frame, E, 1.4) }}>
            <div style={{ width: 140, height: 140, borderRadius: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', scale: String(press(CLICK5)),
              background: frame >= CLICK5 ? C.smart : C.glass, border: `2px solid ${C.line}` }}>
              <svg viewBox="0 0 16 16" width="72" height="72" fill="none" stroke={C.text} strokeWidth="1.5" strokeLinecap="round">
                <rect x="2" y="3" width="12" height="11" rx="2" /><path d="M2 7h12M5.5 1.5v3M10.5 1.5v3" />
              </svg>
            </div>
          </div>
          {dlg > 0.01 && <ExportDialog open={dlg} pressed={frame >= CLICK6 - 8} scale={press(CLICK6)} />}
          <div style={{ position: 'absolute', left: 540, top: 1570 }}>
            <Cursor frame={frame} c1={CLICK5} c2={CLICK6} b={[212, -233]} />
          </div>
        </>}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Finestra "Esporta in calendario" semplificata (#icsDlg): mese, testo degli smart e delle ferie, Annulla / Scarica.
// Piena come il menu, non vetro, perché sta sopra il calendario.
const ExportDialog: React.FC<{ open: number; pressed: boolean; scale: number }> = ({ open, pressed, scale }) => {
  const field = (label: string, value: string) => (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontSize: 32, fontWeight: 600, color: C.muted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 42, padding: '12px 24px', borderRadius: 18, border: `2px solid ${C.line}`, background: C.bg }}>{value}</div>
    </div>
  );
  return (
    <div style={{ position: 'absolute', top: 640, left: 160, width: 760, padding: 48, borderRadius: 40, background: '#061a3a',
      border: `2px solid ${C.glassEdge}`, boxShadow: '0 40px 90px -20px rgb(0 0 0 / .7)', opacity: open, scale: String(interpolate(open, [0, 1], [0.9, 1])) }}>
      <div style={{ fontSize: 58, fontWeight: 700 }}>Esporta in calendario</div>
      {field('Mese', 'Ottobre 2026 ▾')}
      {field('Testo degli smart', 'Smart working')}
      {field('Testo delle ferie', 'Ferie')}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 20, marginTop: 40, fontSize: 42, fontWeight: 600 }}>
        <div style={{ padding: '16px 36px', borderRadius: 22, color: C.muted }}>Annulla</div>
        <div style={{ padding: '16px 36px', borderRadius: 22, background: pressed ? '#3385d6' : C.smart, color: C.smartText, scale: String(scale) }}>Scarica</div>
      </div>
    </div>
  );
};

// Evento di un giorno intero nella vista calendario: etichetta in basso nella casella, cade dall'alto.
// Il testo lungo si tronca con "…", come nei calendari veri.
const Chip: React.FC<{ ferie: boolean; p: number }> = ({ ferie, p }) => p <= 0 ? null : (
  <div style={{ position: 'absolute', left: 4, right: 4, bottom: 4, height: 30, lineHeight: '30px', padding: '0 6px', borderRadius: 8,
    fontSize: 20, fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    background: ferie ? C.ferie : C.smart, color: ferie ? C.ferieText : C.smartText,
    opacity: Math.min(1, p * 2), translate: `0px ${interpolate(p, [0, 1], [-40, 0])}px` }}>
    {ferie ? 'Ferie' : 'Smart working'}
  </div>
);

// Una riga dei limiti, come .stepper nell'onboarding: etichetta, −, numero, +.
// In "at" il + si accende e si preme, e il numero sale di uno con un colpo.
const Stepper: React.FC<{ frame: number; label: string; from: number; at: number; scale: number }> = ({ frame, label, from, at, scale }) => {
  const btn = (on: boolean): React.CSSProperties => ({ width: 84, height: 84, borderRadius: '50%', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 52, border: `2px solid ${on ? C.smart : C.line}`, background: on ? C.smart : undefined });
  const on = frame >= at;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '12px 0', fontSize: 40, fontWeight: 600 }}>
      <div style={{ marginRight: 'auto', color: C.muted }}>{label}</div>
      <div style={btn(false)}>−</div>
      <div style={{ width: 80, textAlign: 'center', fontSize: 64, fontWeight: 700, ...(on ? punch(frame, at, 1.6) : {}) }}>{on ? from + 1 : from}</div>
      <div style={{ ...btn(on), scale: String(scale) }}>+</div>
    </div>
  );
};
