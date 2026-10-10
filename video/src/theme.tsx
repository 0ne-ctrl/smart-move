// ============================================================
// COLORI, FONT E SFONDO: gli stessi del tema scuro di style.css
// ============================================================
import { loadFont } from '@remotion/fonts';
import { AbsoluteFill, staticFile, useCurrentFrame } from 'remotion';

// Titillium Web, pesi 400/600/700 (come l'app: niente 500)
for (const w of ['400', '600', '700']) {
  loadFont({ family: 'Titillium Web', url: staticFile(`fonts/titillium-web-${w}.woff2`), weight: w });
}
export const FONT = '"Titillium Web", system-ui, sans-serif';

// Tema scuro navy (variabili CSS --bg, --text, --smart… di style.css)
export const C = {
  bg: '#010b1a', text: '#f0f6fc', muted: '#9bb3cf', line: '#173e72', print: '#4d94db',
  smart: '#0066cc', smartText: '#fff', smartAuto: '#0a2a5c', smartAutoText: '#b2d1f0',
  office: '#b2d1f0', ferie: '#cdb447', ferieText: '#221d05', holiday: '#4a2229', holidayText: '#ff9f92',
  glass: 'rgb(3 23 51 / .5)', glassEdge: 'rgb(178 209 240 / .14)',
};

// Sfondo come body::before dell'app: due aloni blu che si muovono piano.
// pulse (0–1) li accende a tempo di musica: nel drop si illuminano a ogni cassa. still: aloni fermi (GIF del README).
export const Background: React.FC<{ pulse?: number; still?: boolean }> = ({ pulse = 0, still = false }) => {
  const frame = useCurrentFrame(), f = still ? 0 : frame;
  return (
    <AbsoluteFill style={{
      background: `radial-gradient(900px 700px at ${20 + Math.sin(f / 90) * 8}% ${12 + Math.cos(f / 110) * 5}%, rgb(0 102 204 / ${0.48 + 0.3 * pulse}), transparent 70%),
                   radial-gradient(1000px 800px at ${85 - Math.sin(f / 100) * 8}% ${88 - Math.cos(f / 80) * 5}%, rgb(102 163 224 / ${0.22 + 0.25 * pulse}), transparent 70%),
                   ${C.bg}`,
    }} />
  );
};
