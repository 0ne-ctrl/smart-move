// ============================================================
// IMPAGINAZIONE: l'unico posto che sa se il video è verticale (9:16) o orizzontale (16:9).
// Le scene leggono da qui misure e posizioni; il resto del codice è uguale per i due formati.
// ============================================================
import { useVideoConfig } from 'remotion';

export function useLayout() {
  const { width: W, height: H } = useVideoConfig();
  const portrait = H > W;
  return {
    W, H, portrait,
    // Conteggio: dimensione del numero
    big: portrait ? 300 : 320,
    // Anno: mesi in griglia (3×4 verticale, 6×2 orizzontale), casella di un giorno, spazi
    year: portrait
      ? { cols: 3, cell: 40, gapX: 50, gapY: 46, title: 46, x0: 70, y0: 330 }
      : { cols: 6, cell: 36, gapX: 36, gapY: 54, title: 44, x0: 108, y0: 250 },
    // Icona e scritta del drop
    icon: portrait ? { size: 440, x: W / 2, y: 760 } : { size: 400, x: W / 2, y: 380 },
    word: portrait ? { y: 1130, size: 170 } : { y: 740, size: 160 },
    // Mese grande: casella, centro; didascalie e comandi sotto (verticale) o a sinistra (orizzontale)
    cell: portrait ? 136 : 112,
    month: portrait ? { x: W / 2, y: 1000 } : { x: 1330, y: 560 },
    caption: portrait
      ? { top: 220, left: 70, width: W - 140, align: 'center' as const, title: 96, sub: 46 }
      : { top: 330, left: 110, width: 730, align: 'left' as const, title: 88, sub: 40 },
    ui: portrait ? { x: W / 2, y: 1500 } : { x: 120 + 320, y: 760 },
    // Export: dove va il mese e dove sta il telefono
    exportMonth: portrait ? { x: W / 2, y: 735, s: 0.6 } : { x: 1090, y: 560, s: 0.56 },
    phone: portrait ? { x: W / 2, y: 1430, w: 600, h: 800 } : { x: 1600, y: 560, w: 440, h: 880 },
  };
}
export type Layout = ReturnType<typeof useLayout>;
