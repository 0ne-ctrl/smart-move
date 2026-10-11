// ============================================================
// SCENE 4–8 (battute 5–13): un solo mese, ottobre 2026, ripreso da una telecamera che si muove.
// Tutti i piani sono quelli veri dell'app (monthPlan), e ogni passaggio mostra cosa cambia davvero.
//   RITMO   (5–6)  primo piano su due settimane inclinate: il calendario è un sequencer, un giorno per ottavo;
//                  lun-mer-ven cadono in battere, mar-gio in levare (la musica suona lo stesso schema)
//   FERIE   (7–8)  la telecamera si allarga sul mese; un evidenziatore si trascina sulla settimana del 12,
//                  sul battere i due smart di quella settimana volano ad arco sui giorni nuovi (2 e 27)
//   WEEKEND (9–10) il mese si gira come una carta (con motion blur) e dietro c'è lo schema "vicino al weekend";
//                  i ponti lunghi si illuminano con quanti giorni di fila fuori ufficio regalano
//   FISSO   (11)   "Ufficio ogni lunedì": i lunedì si timbrano uno dopo l'altro e gli smart si spostano
//   EXPORT  (12–13) il mese si rimpicciolisce, gli eventi volano uno per sedicesimo nel calendario del telefono
// ============================================================
import { Audio } from '@remotion/media';
import { CameraMotionBlur } from '@remotion/motion-blur';
import { AbsoluteFill, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { bold, fg, Mark, type Look } from '../fx/Mark';
import { useT } from '../i18n';
import { useLayout, type Layout } from '../layout';
import { type Day, ferieRange, flights, monthPlan, withWeekly } from '../plan';
import { C, FONT } from '../theme';
import { BAR, BEAT, EIGHTH, lerp, ease, out, punch } from '../timing';

// ---------- I PIANI (ottobre 2026: inizia di giovedì, 5 righe) ----------
const OFFSET = 3, ROWS = 5;
const FERIE = Object.fromEntries(ferieRange('2026-10-12', '2026-10-16').map(k => [k, 'ferie' as const]));
const alterni = monthPlan(2026, 9), conFerie = monthPlan(2026, 9, FERIE);
const weekend = monthPlan(2026, 9, FERIE, 'weekend'), fisso = monthPlan(2026, 9, withWeekly(FERIE, [1], 2026), 'weekend');
const col = (d: number) => (OFFSET + d - 1) % 7, row = (d: number) => Math.floor((OFFSET + d - 1) / 7);
const isSmart = (s: Look) => s.startsWith('smart');

// ---------- I TEMPI (fotogrammi della scena, 0 = battuta 5) ----------
const RH = 0, FE = 2 * BAR, WK = 4 * BAR, FX = 6 * BAR, EX = 7 * BAR, LEN = 9 * BAR;
const PULL = FE - 4;                         // la telecamera si allarga sul mese intero
const PRESS = FE + 2 * BEAT, RELEASE = FE + BAR; // evidenziatore: si preme sul 12, si rilascia sul 16
const FLIP = WK + BEAT, FLIP_LEN = BEAT;     // il mese si gira
const RIBBON = WK + 3 * BEAT;                // primo ponte, poi uno per battito
const TOGGLE = FX + BEAT;                    // interruttore "ufficio ogni lunedì"
const FLY = 13;                              // durata di un volo
const PHONE = EX + 4, CARDS = EX + BEAT + EIGHTH, CARD_STEP = BEAT / 4;
const DONE = CARDS + 14 * CARD_STEP + FLY + 4; // avviso "importato" sul telefono

// ---------- CRONOLOGIA DI OGNI GIORNO: [fotogramma, stato, animato?] ----------
type Ev = [number, Look, boolean];
const EVENTS: Record<number, Ev[]> = {};
const ev = (d: number, at: number, s: Look, anim = true) => (EVENTS[d] ??= [[-1e9, 'blank', false]]).push([at, s, anim]);
// Ritmo: righe 1 e 2 un giorno per ottavo (una settimana per battuta); le altre si rivelano quando la telecamera si allarga
const stepAt = (d: number) => (row(d) - 1) * BAR + col(d) * EIGHTH;
alterni.forEach(x => ev(x.d, row(x.d) === 1 || row(x.d) === 2 ? stepAt(x.d) : PULL + 6 + col(x.d) * 1.5 + Math.abs(row(x.d) - 1.5) * 3, x.state));
// Ferie: i giorni diventano "ferie" quando l'evidenziatore li ha coperti tutti; gli smart partono in volo
type Flight = { from: number; to: number; at: number; look: Look };
const FLIGHTS: Flight[] = [];
const fly = (pairs: [number, number][], at: (from: number, i: number) => number, before: Day[], after: Day[], leave: (d: number) => Look) =>
  pairs.forEach(([from, to], i) => {
    const t0 = at(from, i);
    FLIGHTS.push({ from, to, at: t0, look: before[from - 1].state });
    ev(from, t0, leave(from), leave(from) === 'office');
    ev(to, t0 + FLY, after[to - 1].state);
  });
[12, 14, 16].forEach(d => ev(d, RELEASE, 'ferie', false));
fly(flights(alterni, conFerie, row), (_, i) => RELEASE + i * EIGHTH, alterni, conFerie, () => 'ferie');
// Weekend: a metà del giro tutto il mese passa al nuovo schema, senza animazione (lo fa la carta che gira)
weekend.forEach(x => ev(x.d, FLIP + FLIP_LEN / 2, x.state, false));
// Giorno fisso: un lunedì per ottavo dopo l'interruttore; lo smart che c'era vola via in quel momento
const MONDAYS = fisso.filter(x => col(x.d) === 0).map(x => x.d);
const mondayAt = (d: number) => TOGGLE + (1 + MONDAYS.indexOf(d)) * EIGHTH;
fisso.forEach(x => { if (col(x.d) === 0 && x.state === 'office' && !isSmart(weekend[x.d - 1].state)) ev(x.d, mondayAt(x.d), 'office'); });
fly(flights(weekend, fisso, row), from => col(from) === 0 ? mondayAt(from) : mondayAt(from - col(from)) + 3, weekend, fisso,
  d => fisso[d - 1].state);
const lookAt = (d: number, f: number) => {
  let cur = EVENTS[d][0];
  for (const e of EVENTS[d]) if (e[0] <= f) cur = e;
  return cur;
};
// Ponti lunghi dello schema weekend: giorni di fila fuori ufficio (smart, ferie, weekend), almeno 4 e con almeno uno smart o ferie
const RUNS: number[][] = [];
{
  let run: number[] = [];
  const close = () => { if (run.length >= 4 && run.some(d => weekend[d - 1].state !== 'weekend')) RUNS.push(run); run = []; };
  weekend.forEach(x => { if (x.state === 'auto' || x.state === 'office') close(); else run.push(x.d); });
  close();
}
// Export: smart e ferie del piano finale, come eventi .ics
const EVENTS_ICS = fisso.filter(x => isSmart(x.state) || x.state === 'ferie');

// ---------- TELECAMERA: chiavi nel tempo, interpolate con easing ----------
type Cam = { x: number; y: number; s: number; rx: number; ry: number; rz: number };
function camera(f: number, L: Layout, cardH: number, rowsY: number): Cam {
  const M = L.month, close = L.portrait ? 1.14 : 1.22;
  const keys: [number, Cam][] = [
    [RH, { x: M.x, y: M.y + (cardH / 2 - rowsY) * close + 30, s: close * 0.94, rx: 26, ry: 0, rz: -4 }],
    [PULL, { x: M.x, y: M.y + (cardH / 2 - rowsY) * close, s: close, rx: 18, ry: 0, rz: 2 }],
    [PULL + 22, { x: M.x, y: M.y, s: 1, rx: 0, ry: 0, rz: 0 }],
    [PRESS, { x: M.x, y: M.y, s: 1.04, rx: 0, ry: 0, rz: 0 }],
    [RELEASE + BEAT, { x: M.x, y: M.y, s: 1.04, rx: 0, ry: 0, rz: 0 }],
    [WK, { x: M.x, y: M.y, s: 1, rx: 4, ry: -6, rz: 0 }],
    [FX - 4, { x: M.x, y: M.y, s: 1, rx: 6, ry: 8, rz: 0 }],
    [FX + 10, { x: M.x, y: M.y, s: 1.03, rx: 4, ry: 16, rz: -1 }],
    [EX, { x: M.x, y: M.y, s: 1.03, rx: 4, ry: 14, rz: -1 }],
    [EX + 16, { x: L.exportMonth.x, y: L.exportMonth.y, s: L.exportMonth.s, rx: 0, ry: 0, rz: 0 }],
  ];
  let i = keys.findIndex(([t]) => t > f);
  if (i < 0) return keys[keys.length - 1][1];
  if (i === 0) return keys[0][1];
  const [t0, a] = keys[i - 1], [t1, b] = keys[i];
  const u = ease((f - t0) / (t1 - t0));
  const mix = (k: keyof Cam) => a[k] + (b[k] - a[k]) * u;
  return { x: mix('x'), y: mix('y'), s: mix('s'), rx: mix('rx'), ry: mix('ry'), rz: mix('rz') };
}

// ---------- SCENA ----------
export const MonthScene: React.FC = () => {
  const frame = useCurrentFrame();
  // Motion blur solo dove serve: mentre la carta gira (costa un render per campione)
  const blur = frame >= FLIP - 2 && frame <= FLIP + FLIP_LEN + 2;
  return (
    <AbsoluteFill>
      <Sounds />
      {blur ? <CameraMotionBlur samples={10} shutterAngle={240}><Stage /></CameraMotionBlur> : <Stage />}
    </AbsoluteFill>
  );
};

const Stage: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useT(), L = useLayout();
  const cell = L.cell, P = cell * 0.3, HH = cell * 0.85, DR = cell * 0.42;
  const cardW = 7 * cell + 2 * P, cardH = HH + DR + ROWS * cell + 2 * P;
  const cx = (d: number) => P + (col(d) + 0.5) * cell, cy = (d: number) => P + HH + DR + (row(d) + 0.5) * cell;
  const cam = camera(frame, L, cardH, P + HH + DR + 2 * cell);
  const flip = lerp(frame, [FLIP, FLIP + FLIP_LEN], [0, 180], ease);
  const ryFlip = flip < 90 ? flip : flip - 180;
  const exit = lerp(frame, [LEN - 12, LEN], [0, 1], Easing.in(Easing.cubic));

  // Contatore nell'intestazione: smart visibili (in volo contano già)
  const smartNow = alterni.filter(x => isSmart(lookAt(x.d, frame)[1])).length + FLIGHTS.filter(fl => frame >= fl.at && frame < fl.at + FLY).length;
  const showCount = frame >= PULL;

  // Righe che nel ritmo non si vedono ancora
  const dimRow = (d: number) => row(d) === 1 || row(d) === 2 ? 1 : lerp(frame, [PULL, PULL + 16], [0.12, 1]);
  // Sequencer: il giorno che "suona" ora (ritmo, un ottavo per giorno)
  const step = frame < 2 * BAR ? Math.floor(frame / EIGHTH) : -1;
  const stepDay = step >= 0 && step % 8 < 7 ? 7 * (1 + Math.floor(step / 8)) + (step % 8) - OFFSET + 1 : -1;

  // Evidenziatore: dalla sinistra del 12 alla destra del 16
  const drag = lerp(frame, [PRESS, RELEASE - 3], [0, 1], Easing.inOut(Easing.sin));
  const dragX = P + col(12) * cell + drag * 5 * cell;
  const hp = (d: number) => d >= 12 && d <= 16 && frame >= PRESS && frame < RELEASE ? Math.max(0, Math.min(1, (dragX - P - col(d) * cell) / cell)) : undefined;

  const cells = Array.from({ length: 31 }, (_, i) => {
    const d = i + 1, [at, s, anim] = lookAt(d, frame);
    const flying = FLIGHTS.some(fl => fl.from === d && frame >= fl.at && frame < fl.at + 2);
    const playing = d === stepDay;
    return (
      <div key={d} style={{ position: 'absolute', left: cx(d) - cell / 2, top: cy(d) - cell / 2, width: cell, height: cell, isolation: 'isolate',
        display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: dimRow(d),
        fontSize: cell * 0.3, fontWeight: bold(s) ? 700 : 400, color: playing && s === 'auto' ? '#fff' : fg(s) }}>
        <div style={{ position: 'absolute', inset: 0, zIndex: -1 }}>
          <Mark state={s} cell={cell} t={anim && frame - at < 30 ? frame - at : null} hp={hp(d)} />
        </div>
        {/* un giorno d'ufficio che "suona": il numero si accende come un tasto */}
        <span style={{ scale: String(playing ? 1.25 : 1), textShadow: playing ? '0 0 18px #fff' : undefined, opacity: flying ? 0.5 : 1 }}>{d}</span>
      </div>
    );
  });

  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.text, opacity: 1 - exit, scale: String(1 - 0.08 * exit) }}>
      <Caption from={RH} to={FE} text={t.rhythm} />
      <Caption from={FE} to={WK} text={t.ferie} />
      <Caption from={WK} to={FX} text={t.weekend} />
      <Caption from={FX} to={EX} text={t.fixed} />
      <Caption from={EX} to={LEN} text={t.export} />

      {/* il mese, nello spazio 3D della telecamera */}
      <div style={{ position: 'absolute', left: cam.x - cardW / 2, top: cam.y - cardH / 2, width: cardW, height: cardH,
        transform: `perspective(2600px) rotateX(${cam.rx}deg) rotateY(${cam.ry + ryFlip}deg) rotateZ(${cam.rz}deg) scale(${cam.s})` }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: cell * 0.42, background: C.glass, border: `2px solid ${C.glassEdge}`,
          boxShadow: '0 50px 100px -30px rgb(0 0 0 / .7)', opacity: lerp(frame, [PULL, PULL + 16], [0, 1]) }} />
        <div style={{ position: 'absolute', left: P + cell * 0.1, top: P, height: HH, display: 'flex', alignItems: 'center', fontSize: cell * 0.42,
          fontWeight: 700, color: C.print, opacity: lerp(frame, [PULL, PULL + 12], [0, 1]) }}>{t.months[9]} 2026</div>
        {showCount && <div key={smartNow} style={{ position: 'absolute', right: P + cell * 0.1, top: P, height: HH, display: 'flex', alignItems: 'center',
          fontSize: cell * 0.28, fontWeight: 600, color: C.muted, opacity: lerp(frame, [PULL, PULL + 12], [0, 1]) }}>{t.count(smartNow)}</div>}
        {t.dow.map((x, i) => (
          <div key={i} style={{ position: 'absolute', left: P + i * cell, width: cell, top: P + HH, height: DR, textAlign: 'center',
            fontSize: cell * 0.22, fontWeight: 600, color: C.muted }}>{x}</div>
        ))}
        {/* ritmo: la colonna del giorno che suona si illumina come la testina di un sequencer */}
        {stepDay > 0 && <div style={{ position: 'absolute', left: cx(stepDay) - cell / 2, top: cy(stepDay) - cell / 2, width: cell, height: cell,
          borderRadius: cell * 0.22, background: 'radial-gradient(closest-side, rgb(77 148 219 / .45), transparent)' }} />}
        {/* ponti lunghi (schema weekend), dietro i segni */}
        {frame >= RIBBON && frame < FX + 8 && RUNS.map((run, k) => (
          <Ribbon key={k} run={run} at={RIBBON + k * BEAT} out={FX} cell={cell} cx={cx} cy={cy} label={t.days(run.length)} />
        ))}
        {cells}
        {/* smart in volo: si staccano (più grandi, con ombra), fanno un arco e ricadono col timbro */}
        {FLIGHTS.filter(fl => frame >= fl.at && frame < fl.at + FLY).map(fl => {
          const u = ease((frame - fl.at) / FLY), x0 = cx(fl.from), y0 = cy(fl.from), x1 = cx(fl.to), y1 = cy(fl.to);
          const h = cell * (0.9 + Math.abs(row(fl.to) - row(fl.from)) * 0.35);
          const x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u - h * 4 * u * (1 - u);
          const lift = Math.sin(Math.PI * u);
          return (
            <div key={fl.from} style={{ position: 'absolute', left: x - cell / 2, top: y - cell / 2, width: cell, height: cell, zIndex: 5,
              scale: String(1 + 0.3 * lift), rotate: `${(x1 > x0 ? 1 : -1) * 14 * lift}deg`, filter: `drop-shadow(0 ${30 * lift}px ${24 * lift}px rgb(0 0 0 / .6))` }}>
              <Mark state={fl.look} cell={cell} />
            </div>
          );
        })}
        {/* cursore che trascina l'evidenziatore */}
        {frame >= PRESS - 26 && frame < RELEASE + 26 && (
          <Pointer x={frame < PRESS ? lerp(frame, [PRESS - 24, PRESS - 3], [dragX + 3 * cell, dragX], ease) : dragX}
            y={frame < PRESS ? lerp(frame, [PRESS - 24, PRESS - 3], [cy(12) + 3 * cell, cy(12)], ease) : cy(12)}
            down={frame >= PRESS - 1 && frame < RELEASE} cell={cell}
            opacity={lerp(frame, [PRESS - 26, PRESS - 20, RELEASE + 14, RELEASE + 26], [0, 1, 1, 0])} />
        )}
      </div>

      {/* RITMO: contatore della settimana, sale a ogni smart */}
      {frame < FE && <WeekCounter frame={frame} />}
      {/* WEEKEND: i due schemi, l'interruttore scatta e il mese si gira */}
      {frame >= WK - 2 && frame < FX && (
        <div style={{ position: 'absolute', left: L.ui.x, top: L.ui.y, translate: '-50% 0px', display: 'flex', padding: 8, borderRadius: 30,
          background: C.glass, border: `2px solid ${C.line}`, fontSize: 40, fontWeight: 600, ...punch(frame, WK, 1.25),
          opacity: lerp(frame, [WK, WK + 3, FX - 6, FX], [0, 1, 1, 0]) }}>
          <div style={{ position: 'absolute', top: 8, bottom: 8, left: 8, width: 340, borderRadius: 22, background: C.smart,
            translate: `${spring({ frame: frame - FLIP + 1, fps, config: { damping: 14 } }) * 340}px 0px` }} />
          {t.seg.map((x, i) => <div key={x} style={{ position: 'relative', width: 340, padding: '18px 0', textAlign: 'center',
            color: (i === 1) === frame >= FLIP + 2 ? C.smartText : C.muted }}>{x}</div>)}
        </div>
      )}
      {/* FISSO: la voce del menu con l'interruttore */}
      {frame >= FX - 2 && frame < EX + 6 && (
        <div style={{ position: 'absolute', left: L.ui.x, top: L.ui.y, translate: '-50% 0px', display: 'flex', alignItems: 'center', gap: 30,
          padding: '20px 26px 20px 40px', borderRadius: 30, background: C.glass, border: `2px solid ${C.line}`, fontSize: 44, fontWeight: 600,
          whiteSpace: 'nowrap', ...punch(frame, FX, 1.25), opacity: lerp(frame, [FX, FX + 3, EX, EX + 6], [0, 1, 1, 0]) }}>
          {t.weekly}
          <Toggle on={spring({ frame: frame - TOGGLE, fps, config: { damping: 14 } })} />
        </div>
      )}
      {/* EXPORT: il telefono e le carte in volo */}
      {frame >= PHONE && <Phone frame={frame} cam={cam} cardW={cardW} cardH={cardH} cx={cx} cy={cy} cell={cell} />}
    </AbsoluteFill>
  );
};

// Titolo e sottotitolo di un momento: le parole entrano a colpi, all'uscita salgono e spariscono
const Caption: React.FC<{ from: number; to: number; text: string[] }> = ({ from, to, text: [title, sub] }) => {
  const frame = useCurrentFrame(), L = useLayout(), c = L.caption;
  if (frame < from || frame >= to) return null;
  const o = lerp(frame, [to - 7, to], [0, 1]);
  return (
    <div style={{ position: 'absolute', top: c.top, left: c.left, width: c.width, textAlign: c.align, opacity: 1 - o, translate: `0px ${-40 * o}px` }}>
      <div style={{ fontSize: c.title, fontWeight: 700, lineHeight: 1.02, letterSpacing: '-0.025em' }}>
        {title.split(' ').map((w, i) => (
          <span key={i} style={{ display: 'inline-block', marginRight: '0.24em', ...punch(frame, from + i * 3, 1.6) }}>{w}</span>
        ))}
      </div>
      <div style={{ fontSize: c.sub, fontWeight: 600, color: C.muted, marginTop: 16, opacity: lerp(frame, [from + 9, from + 15], [0, 1]),
        translate: `0px ${lerp(frame, [from + 9, from + 18], [24, 0], out)}px` }}>{sub}</div>
    </div>
  );
};

// Ritmo: "n/3 questa settimana", sale a ogni smart della settimana suonata
const WeekCounter: React.FC<{ frame: number }> = ({ frame }) => {
  const t = useT(), L = useLayout();
  const smartSteps = alterni.filter(x => (row(x.d) === 1 || row(x.d) === 2) && isSmart(x.state)).map(x => ({ at: stepAt(x.d), wk: row(x.d) }));
  const wk = frame < BAR ? 1 : 2, done = smartSteps.filter(s => s.wk === wk && frame >= s.at);
  const last = done[done.length - 1]?.at ?? -99;
  return (
    <div style={{ position: 'absolute', left: L.ui.x, top: L.ui.y, translate: '-50% 0px', display: 'flex', gap: 14, alignItems: 'center',
      opacity: lerp(frame, [0, 4, FE - 8, FE - 2], [0, 1, 1, 0]) }}>
      {[0, 1, 2].map(i => (
        <div key={wk * 10 + i} style={{ width: 54, height: 54, borderRadius: 14, border: `3px solid ${C.line}`,
          background: i < done.length ? C.smart : undefined, ...(i < done.length ? punch(frame, smartSteps.filter(s => s.wk === wk)[i].at, 1.5) : {}) }} />
      ))}
      <div style={{ marginLeft: 16, fontSize: 46, fontWeight: 600, color: C.muted, whiteSpace: 'nowrap', ...punch(frame, last, 1.12) }}>{t.week(done.length)}</div>
    </div>
  );
};

// Ponte lungo: alone luminoso dietro i giorni di fila fuori ufficio, una capsula per riga, con l'etichetta "N giorni"
const Ribbon: React.FC<{ run: number[]; at: number; out: number; cell: number; cx: (d: number) => number; cy: (d: number) => number; label: string }> =
  ({ run, at, out: end, cell, cx, cy, label }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    if (frame < at) return null;
    const p = spring({ frame: frame - at, fps, config: { damping: 16 } }), fade = lerp(frame, [end - 4, end + 6], [1, 0]);
    const rows = [...new Set(run.map(row))];
    const first = run[0];
    return (
      <>
        {rows.map(r => {
          const ds = run.filter(d => row(d) === r), a = ds[0], b = ds[ds.length - 1];
          return <div key={r} style={{ position: 'absolute', left: cx(a) - cell * 0.5, top: cy(a) - cell * 0.5, height: cell,
            width: (cx(b) - cx(a) + cell) * p, borderRadius: cell * 0.3, opacity: fade,
            background: 'linear-gradient(90deg, rgb(77 148 219 / .22), rgb(77 148 219 / .38))', border: `3px solid ${C.print}`,
            boxShadow: `0 0 ${40 * p}px rgb(77 148 219 / .55)` }} />;
        })}
        <div style={{ position: 'absolute', left: cx(first) - cell * 0.5, top: cy(first) - cell * 0.5, translate: `0px -62%`, zIndex: 6,
          padding: `${cell * 0.03}px ${cell * 0.16}px`, borderRadius: 999, background: C.print, color: C.bg, fontSize: cell * 0.27,
          fontWeight: 700, whiteSpace: 'nowrap', ...punch(frame, at + 3, 1.6), opacity: fade * lerp(frame, [at + 3, at + 5], [0, 1]) }}>{label}</div>
      </>
    );
  };

// Interruttore (come .toggle dell'app)
const Toggle: React.FC<{ on: number }> = ({ on }) => (
  <div style={{ position: 'relative', width: 110, height: 62, borderRadius: 31, background: 'rgb(155 179 207 / .3)' }}>
    <div style={{ position: 'absolute', inset: 0, borderRadius: 31, background: C.smart, opacity: on }} />
    <div style={{ position: 'absolute', top: 6, left: 6, width: 50, height: 50, borderRadius: 25, background: '#fff', translate: `${on * 48}px 0px` }} />
  </div>
);

// Freccia del mouse; down = tasto premuto (più piccola, con un alone)
const Pointer: React.FC<{ x: number; y: number; down: boolean; cell: number; opacity: number }> = ({ x, y, down, cell, opacity }) => (
  <div style={{ position: 'absolute', left: x, top: y, zIndex: 9, opacity }}>
    {down && <div style={{ position: 'absolute', width: cell * 0.7, height: cell * 0.7, left: -cell * 0.35, top: -cell * 0.35, borderRadius: '50%',
      background: 'rgb(255 255 255 / .18)', border: '3px solid rgb(255 255 255 / .6)' }} />}
    <svg width={cell * 0.62} height={cell * 0.62} viewBox="0 0 24 24" style={{ position: 'absolute', left: -cell * 0.1, top: -cell * 0.05,
      scale: String(down ? 0.86 : 1), transformOrigin: '4px 2px', filter: 'drop-shadow(0 6px 10px rgb(0 0 0 / .5))' }}>
      <path d="M4 2l16 11.5-7 1.3L9 22z" fill="#fff" stroke={C.bg} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  </div>
);

// Telefono con il calendario: gli eventi partono dal mese (coordinate dello schermo, la telecamera qui è piatta)
// e atterrano nel giorno giusto, uno per sedicesimo
const Phone: React.FC<{ frame: number; cam: Cam; cardW: number; cardH: number; cx: (d: number) => number; cy: (d: number) => number; cell: number }> =
  ({ frame, cam, cardW, cardH, cx, cy, cell }) => {
    const t = useT(), L = useLayout(), ph = L.phone;
    const { fps } = useVideoConfig();
    const enter = spring({ frame: frame - PHONE, fps, config: { damping: 16 } });
    const pad = ph.w * 0.07, pw = (ph.w - 2 * pad) / 7, gridTop = ph.h * 0.22, rowH = pw * 1.3;
    const left = ph.x - ph.w / 2, top = ph.y - ph.h / 2 + (1 - enter) * (L.portrait ? 500 : 0), sideX = (1 - enter) * (L.portrait ? 0 : 520);
    const pcx = (d: number) => left + sideX + pad + (col(d) + 0.5) * pw, pcy = (d: number) => top + gridTop + (row(d) + 0.5) * rowH + rowH * 0.22;
    const landed = EVENTS_ICS.filter((_, i) => frame >= CARDS + i * CARD_STEP + FLY).length;
    return (
      <>
        <div style={{ position: 'absolute', left: left + sideX, top, width: ph.w, height: ph.h, borderRadius: ph.w * 0.14, background: '#020812',
          border: '10px solid #1b2a40', boxShadow: '0 60px 120px -30px rgb(0 0 0 / .8), inset 0 0 0 2px #2b3d57', opacity: enter, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 22, left: '50%', translate: '-50% 0px', width: ph.w * 0.3, height: 34, borderRadius: 17, background: '#000' }} />
          <div style={{ position: 'absolute', top: ph.h * 0.09, left: pad, right: pad, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: ph.w * 0.085, fontWeight: 700 }}>{t.months[9]}</span>
            <span key={landed} style={{ fontSize: ph.w * 0.05, fontWeight: 600, color: C.print, ...(landed ? punch(frame, CARDS + (landed - 1) * CARD_STEP + FLY, 1.3) : { opacity: 0 }) }}>{t.events(landed)}</span>
          </div>
          {t.dow.map((x, i) => <div key={i} style={{ position: 'absolute', top: gridTop - rowH * 0.45, left: pad + i * pw, width: pw, textAlign: 'center',
            fontSize: pw * 0.3, color: C.muted, fontWeight: 600 }}>{x}</div>)}
          {Array.from({ length: 31 }, (_, i) => (
            <div key={i} style={{ position: 'absolute', left: pad + col(i + 1) * pw, top: gridTop + row(i + 1) * rowH, width: pw, height: rowH,
              borderTop: '1px solid #16243a', fontSize: pw * 0.3, textAlign: 'center', paddingTop: 4, color: col(i + 1) > 4 ? C.muted : C.text }}>{i + 1}</div>
          ))}
          {landed === EVENTS_ICS.length && <div style={{ position: 'absolute', left: pad, right: pad, bottom: ph.h * 0.05, padding: '18px 22px', borderRadius: 26,
            background: '#0b1f3d', border: `2px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 16, fontSize: ph.w * 0.042, fontWeight: 600,
            ...punch(frame, CARDS + (EVENTS_ICS.length - 1) * CARD_STEP + FLY + 4, 1.2),
            translate: `0px ${lerp(frame, [DONE, DONE + 8], [40, 0], out)}px` }}>
            <span style={{ width: ph.w * 0.08, height: ph.w * 0.08, borderRadius: '50%', background: C.smart, display: 'grid', placeItems: 'center', fontWeight: 700 }}>✓</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>smart-move-2026-10.ics</span>
          </div>}
        </div>
        {/* le carte: dal giorno nel mese al giorno nel telefono, con un arco e un giro */}
        {EVENTS_ICS.map((x, i) => {
          const t0 = CARDS + i * CARD_STEP;
          if (frame < t0) return null;
          const u = ease(Math.min(1, (frame - t0) / FLY)), lift = Math.sin(Math.PI * u);
          const sx = cam.x + (cx(x.d) - cardW / 2) * cam.s, sy = cam.y + (cy(x.d) - cardH / 2) * cam.s;
          const ex = pcx(x.d), ey = pcy(x.d);
          const w = interpolate(u, [0, 1], [cell * cam.s * 0.8, pw * 0.86]), h = interpolate(u, [0, 1], [cell * cam.s * 0.8, pw * 0.3]);
          const ferie = x.state === 'ferie';
          return (
            <div key={x.d} style={{ position: 'absolute', left: sx + (ex - sx) * u - w / 2, top: sy + (ey - sy) * u - h / 2 - 160 * lift, width: w, height: h,
              borderRadius: Math.min(w, h) * 0.3, background: ferie ? C.ferie : C.smart, rotate: `${18 * lift}deg`,
              boxShadow: `0 ${24 * lift}px ${30 * lift}px rgb(0 0 0 / .5)`, fontSize: pw * 0.2, fontWeight: 700, color: ferie ? C.ferieText : '#fff',
              overflow: 'hidden', whiteSpace: 'nowrap', textAlign: 'center', lineHeight: `${h}px`, opacity: enter }}>
              {u > 0.85 ? (ferie ? t.ferieEv : t.smart) : ''}
            </div>
          );
        })}
      </>
    );
  };

// ---------- SUONI (fuori dal motion blur, che altrimenti li ripeterebbe a ogni campione) ----------
const Sounds: React.FC = () => {
  const stamps = alterni.filter(x => (row(x.d) === 1 || row(x.d) === 2) && isSmart(x.state)).map(x => stepAt(x.d));
  return (
    <>
      {stamps.map((at, i) => <Audio key={'r' + i} name={`Timbro ritmo ${i + 1}`} from={Math.round(at)} src={staticFile('sfx/stamp.wav')} volume={0.55} />)}
      <Audio name="Fruscio mese" from={PULL - 4} src={staticFile('sfx/whoosh.wav')} volume={0.35} />
      <Audio name="Clic evidenziatore" from={PRESS - 1} src={staticFile('sfx/click.wav')} volume={0.6} />
      <Audio name="Evidenziatore" from={PRESS + 1} src={staticFile('sfx/marker.wav')} volume={0.45} />
      {FLIGHTS.map((fl, i) => <Audio key={'f' + i} name={`Volo ${fl.from}→${fl.to}`} from={Math.round(fl.at)} src={staticFile('sfx/card.wav')} volume={0.3} />)}
      {FLIGHTS.map((fl, i) => <Audio key={'l' + i} name={`Atterra ${fl.to}`} from={Math.round(fl.at + FLY)} src={staticFile('sfx/stamp.wav')} volume={0.4} />)}
      <Audio name="Interruttore schema" from={FLIP - 1} src={staticFile('sfx/switch.wav')} volume={0.5} />
      <Audio name="Frusta" from={FLIP - 2} src={staticFile('sfx/whip.wav')} volume={0.5} />
      {RUNS.map((_, k) => <Audio key={'p' + k} name={`Ponte ${k + 1}`} from={RIBBON + k * BEAT} src={staticFile(`sfx/pop-${4 + k * 2}.wav`)} volume={0.35} />)}
      <Audio name="Interruttore lunedì" from={TOGGLE - 1} src={staticFile('sfx/switch.wav')} volume={0.5} />
      {MONDAYS.map(d => <Audio key={'m' + d} name={`Lunedì ${d}`} from={Math.round(mondayAt(d))} src={staticFile('sfx/stamp.wav')} volume={0.5} />)}
      <Audio name="Telefono" from={PHONE - 2} src={staticFile('sfx/whoosh.wav')} volume={0.3} />
      {EVENTS_ICS.map((_, i) => <Audio key={'e' + i} name={`Evento ${i + 1}`} from={Math.round(CARDS + i * CARD_STEP + FLY)} src={staticFile(`sfx/pop-${i % 10}.wav`)} volume={0.2} />)}
      <Audio name="Avviso importato" from={Math.round(DONE)} src={staticFile('sfx/switch.wav')} volume={0.4} />
      <Audio name="Fruscio uscita" from={LEN - 14} src={staticFile('sfx/whoosh.wav')} volume={0.35} />
    </>
  );
};
