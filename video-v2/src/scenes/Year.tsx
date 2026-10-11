// SCENE 2–3 (battute 2–4): l'anno e il drop.
//   battuta 2: i 365 giorni del 2026 esplodono dal centro e si mettono in fila, mese per mese, a onda diagonale;
//              sul terzo battito le festività si accendono di rosso
//   battuta 3: la telecamera si avvicina e trema sulla rullata, poi mezzo battito di silenzio (tutto trattiene il fiato)
//   battuta 4 (drop): i 120 smart dell'anno (piano vero) si accendono a onda; poi il k-esimo smart di ogni mese
//              vola sul k-esimo giorno della "S" dell'icona (10 smart al mese = 10 giorni della S),
//              sotto compare l'icona, sopra il nome; alla fine la telecamera entra nella S, verso il mese.
import { Audio } from '@remotion/media';
import { AbsoluteFill, Easing, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { useT } from '../i18n';
import { useLayout } from '../layout';
import { yearPlan } from '../plan';
import { C, FONT } from '../theme';
import { BAR, BEAT, EIGHTH, lerp, ease, out, punch } from '../timing';

const PLAN = yearPlan(2026);
// Icona dell'app (icons/icon.svg, viewBox 512): i 10 giorni della "S" in ordine di tratto e i 35 puntini del mese
export const S = [[281.5, 143.5], [235.5, 143.5], [189.5, 143.5], [143.5, 189.5], [189.5, 235.5], [235.5, 235.5], [281.5, 281.5], [235.5, 327.5], [189.5, 327.5], [143.5, 327.5]];
export const DOTS = Array.from({ length: 35 }, (_, i) => [118 + (i % 7) * 46, 164 + Math.floor(i / 7) * 46]);

// Tempi (fotogrammi della scena; 0 = battuta 2)
const HOLI = 3 * BEAT, PUSH = BAR, HOLD = 2 * BAR - EIGHTH, IGNITE = 2 * BAR, FLY = IGNITE + BEAT, ICON = IGNITE + 2 * BEAT - 4,
  WORD = IGNITE + 2 * BEAT, TAG = IGNITE + 3 * BEAT, DIVE = 3 * BAR - 10;

export const YearScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = useT(), L = useLayout(), Y = L.year, ic = L.icon;
  const k = ic.size / 512;
  // Telecamera: si avvicina e trema sempre di più nella battuta 3, torna indietro di colpo sul drop
  const push = frame < IGNITE ? lerp(frame, [PUSH, HOLD], [1, 1.12], Easing.in(Easing.quad)) : 1 + 0.12 * (1 - spring({ frame: frame - IGNITE, fps, config: { damping: 14 } }));
  const amp = frame < HOLD ? lerp(frame, [PUSH, HOLD], [0, 9]) : frame < IGNITE ? 0 : lerp(frame, [IGNITE, IGNITE + 8], [22, 0]);
  const shake = `${amp * Math.sin(frame * 1.9) * Math.cos(frame * 0.7)}px ${amp * Math.sin(frame * 2.6 + 1)}px`;
  // Mezzo battito di silenzio: i giorni trattengono il fiato (si stringono e si spengono un poco)
  const breath = frame >= HOLD && frame < IGNITE ? lerp(frame, [HOLD, IGNITE], [0, 1], ease) : 0;
  // Ingresso nella S alla fine
  const dive = lerp(frame, [DIVE, 3 * BAR], [0, 1], Easing.in(Easing.cubic));

  const cx = L.W / 2, cy = L.H / 2;
  const monthW = 7 * Y.cell + Y.gapX, monthH = Y.title + 6 * Y.cell + Y.gapY;
  const dots: React.ReactNode[] = [];
  PLAN.forEach((days, m) => {
    const offset = (new Date(Date.UTC(2026, m, 1)).getUTCDay() + 6) % 7;
    let nth = 0;
    days.forEach((day, i) => {
      const col = (offset + i) % 7, row = Math.floor((offset + i) / 7);
      const gx = (m % Y.cols) * 7 + col, gy = Math.floor(m / Y.cols) * 6 + row;
      const px = Y.x0 + (m % Y.cols) * monthW + (col + 0.5) * Y.cell, py = Y.y0 + Math.floor(m / Y.cols) * monthH + Y.title + (row + 0.5) * Y.cell;
      // esplosione dal centro, a onda diagonale
      const b = spring({ frame: frame - (gx + gy) * 0.35, fps, config: { damping: 15, stiffness: 110 } });
      const jx = (random(`x${m}-${i}`) - 0.5) * 140, jy = (random(`y${m}-${i}`) - 0.5) * 140;
      let x = interpolate(b, [0, 1], [cx + jx, px]), y = interpolate(b, [0, 1], [cy + jy, py]);
      const smart = day.state.startsWith('smart'), weekend = day.state === 'weekend', holiday = day.state === 'holiday';
      const lit = smart ? spring({ frame: frame - IGNITE - (gx + gy) * 0.22, fps, config: { damping: 11 } }) : 0;
      const red = holiday ? spring({ frame: frame - HOLI - m * 0.5, fps, config: { damping: 12 } }) : 0;
      // volo verso la S: il k-esimo smart del mese va sul k-esimo giorno della S
      let fly = 0, size = Y.cell * (0.42 + 0.36 * lit + 0.12 * red);
      if (smart) {
        const [sx, sy] = S[nth++] ?? S[9];
        fly = lerp(frame, [FLY + m * 0.7, FLY + m * 0.7 + 14], [0, 1], ease);
        const tx = ic.x + (sx + 20.5 - 256) * k, ty = ic.y + (sy + 20.5 - 256) * k;
        // curva: il punto di controllo sta di lato, così ogni giorno arriva girando
        const mx = (x + tx) / 2 + (ty - y) * 0.35, my = (y + ty) / 2 - (tx - x) * 0.35;
        const u = fly;
        x = (1 - u) ** 2 * x + 2 * u * (1 - u) * mx + u * u * tx;
        y = (1 - u) ** 2 * y + 2 * u * (1 - u) * my + u * u * ty;
        size = interpolate(u, [0, 1], [size, 41 * k]);
      }
      const fade = smart ? 1 : lerp(frame, [IGNITE, IGNITE + 10], [1, 0.25]) * lerp(frame, [FLY, FLY + 8], [1, 0]);
      const bg = smart && lit > 0.05 ? (fly > 0.9 ? '#f0f6fc' : C.smart) : red > 0.05 ? C.holidayText : C.muted;
      dots.push(
        <div key={`${m}-${i}`} style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size,
          borderRadius: interpolate(lit + red, [0, 1], [size / 2, size * 0.24], { extrapolateRight: 'clamp' }),
          background: bg, opacity: b * fade * (weekend ? 0.3 : smart || holiday ? 1 : 0.55) * (1 - 0.35 * breath),
          boxShadow: lit > 0.05 && fly < 1 ? `0 0 ${18 * lit}px rgb(0 102 204 / ${0.8 * lit})` : undefined }} />,
      );
    });
  });

  return (
    <AbsoluteFill style={{ fontFamily: FONT, color: C.text, overflow: 'hidden' }}>
      {[0, 1, 2, 3].map(i => <Audio key={i} name={`Pop festività ${i}`} from={HOLI + i * 2} src={staticFile(`sfx/pop-${6 + i}.wav`)} volume={0.25} />)}
      <Audio name="Fruscio dentro la S" from={DIVE - 6} src={staticFile('sfx/whoosh.wav')} volume={0.4} />
      <AbsoluteFill style={{ scale: String(1 + 7 * dive), transformOrigin: `${ic.x}px ${ic.y}px`, opacity: 1 - lerp(dive, [0.6, 1], [0, 1]) }}>
        {/* "2026" enorme e vuoto dietro la griglia */}
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', fontSize: L.portrait ? 430 : 520, fontWeight: 700,
          letterSpacing: '-0.04em', color: 'transparent', WebkitTextStroke: `3px ${C.line}`,
          opacity: lerp(frame, [10, 40], [0, 0.9]) * lerp(frame, [IGNITE, IGNITE + 10], [1, 0]),
          scale: String(1.15 - 0.15 * lerp(frame, [0, IGNITE], [0, 1])) }}>2026</AbsoluteFill>
        <AbsoluteFill style={{ scale: String(push * (1 - 0.03 * breath)), translate: shake }}>
          {/* nomi dei mesi, a onda come i giorni */}
          {t.months.map((name, m) => (
            <div key={name} style={{ position: 'absolute', left: Y.x0 + (m % Y.cols) * monthW, top: Y.y0 + Math.floor(m / Y.cols) * monthH,
              fontSize: Y.title * 0.62, fontWeight: 700, letterSpacing: '0.12em', color: C.print, textTransform: 'uppercase',
              opacity: lerp(frame, [8 + m * 1.2, 16 + m * 1.2], [0, 1]) * lerp(frame, [IGNITE + 4, IGNITE + 12], [1, 0]),
              translate: `0px ${lerp(frame, [8 + m * 1.2, 18 + m * 1.2], [16, 0], out)}px` }}>{name.slice(0, 3)}</div>
          ))}
          {/* icona dietro i giorni che atterrano */}
          {frame >= ICON && icon(frame - ICON)}
          {dots}
        </AbsoluteFill>
        <div style={{ position: 'absolute', top: L.word.y, width: '100%', textAlign: 'center', fontSize: L.word.size, fontWeight: 700,
          letterSpacing: '-0.035em', lineHeight: 1, ...punch(frame, WORD, 1.8), opacity: lerp(frame, [WORD, WORD + 2, DIVE, DIVE + 5], [0, 1, 1, 0]) }}>Smart Move</div>
        <div style={{ position: 'absolute', top: L.word.y + L.word.size * 1.12, width: '100%', textAlign: 'center', fontSize: L.portrait ? 50 : 46,
          fontWeight: 600, color: C.muted, ...punch(frame, TAG, 1.15), opacity: lerp(frame, [TAG, TAG + 2, DIVE, DIVE + 5], [0, 1, 1, 0]) }}>{t.tagline}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );

  // Fondo dell'icona: quadrato navy sfumato e il mese di puntini (i giorni della S ci atterrano sopra)
  function icon(f: number) {
    const s = spring({ frame: f, fps, config: { damping: 13 } });
    return (
      <svg viewBox="0 0 512 512" width={ic.size} height={ic.size} style={{ position: 'absolute', left: ic.x - ic.size / 2, top: ic.y - ic.size / 2,
        scale: String(0.6 + 0.4 * s), opacity: s, filter: 'drop-shadow(0 40px 60px rgb(0 102 204 / .45))' }}>
        <defs><radialGradient id="g2" cx="20%" cy="10%" r="100%">
          <stop offset="0" stopColor="#0a4a94" /><stop offset=".6" stopColor="#0a2a5c" /><stop offset="1" stopColor="#031733" />
        </radialGradient></defs>
        <rect width="512" height="512" rx="112" fill="url(#g2)" />
        {DOTS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="6" fill="#4d94db" opacity={(i % 7 > 4 ? 0.3 : 0.7) * lerp(f, [i * 0.3, i * 0.3 + 4], [0, 1])} />)}
      </svg>
    );
  }
};
