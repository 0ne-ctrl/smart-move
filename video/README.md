# Trailer di Smart Move

Progetto [Remotion](https://www.remotion.dev/) del trailer verticale (1080×1920, ~32 s). Il calendario del video usa la stessa logica dell'app (`../js/plan.js`).

```sh
npm i                                  # dipendenze
node scripts/suoni.mjs                 # musica ed effetti → public/sfx/*.wav (sintetizzati, nessun campione esterno)
npx remotion studio                    # anteprima
npx remotion render SmartMovePromo out/smart-move.mp4
cp out/smart-move.mp4 ../docs/trailer.mp4   # il video linkato dal README principale

# GIF del README: solo la demo, su sfondo fermo (composizione SmartMoveDemo)
npx remotion render SmartMoveDemo out/demo.mp4 --muted
ffmpeg -i out/demo.mp4 -vf "fps=12,scale=320:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle" ../docs/demo.gif

# Versione inglese (README.en.md): stesse composizioni con "EN", testi in src/i18n.ts
npx remotion render SmartMovePromoEN out/smart-move-en.mp4 && cp out/smart-move-en.mp4 ../docs/trailer-en.mp4
npx remotion render SmartMoveDemoEN out/demo-en.mp4 --muted   # poi lo stesso ffmpeg, verso ../docs/demo-en.gif
```

- `src/timing.ts`: tempo sulla musica (1 battito = 14 fotogrammi), da tenere uguale a `BEAT`/`BARS` in `scripts/suoni.mjs`
- `src/scenes/`: domanda → logo → demo in 5 momenti → chiusura
- `src/i18n.ts`: tutte le scritte, in italiano e inglese (la lingua arriva dalla prop `lang` della composizione)

Per alcune aziende Remotion richiede una licenza: [condizioni](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
