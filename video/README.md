# Trailer di Smart Move

Progetto [Remotion](https://www.remotion.dev/) del trailer verticale (1080×1920, ~32 s). Il calendario del video usa la stessa logica dell'app (`../js/plan.js`).

```sh
npm i                                  # dipendenze
node scripts/suoni.mjs                 # musica ed effetti → public/sfx/*.wav (sintetizzati, nessun campione esterno)
npx remotion studio                    # anteprima
npx remotion render SmartMovePromo out/smart-move.mp4
cp out/smart-move.mp4 ../docs/trailer.mp4   # il video linkato dal README principale

# Versione inglese (README.en.md): stesse composizioni con "EN", testi in src/i18n.ts
npx remotion render SmartMovePromoEN out/smart-move-en.mp4 && cp out/smart-move-en.mp4 ../docs/trailer-en.mp4
```

La GIF del README ora viene dal promo v2 (`../video-v2`, composizioni `DemoV2Wide`/`DemoV2WideEN`).

- `src/timing.ts`: tempo sulla musica (1 battito = 14 fotogrammi), da tenere uguale a `BEAT`/`BARS` in `scripts/suoni.mjs`
- `src/scenes/`: domanda → logo → demo in 5 momenti → chiusura
- `src/i18n.ts`: tutte le scritte, in italiano e inglese (la lingua arriva dalla prop `lang` della composizione)

Per alcune aziende Remotion richiede una licenza: [condizioni](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).

Licenze: il codice di questa cartella è MIT come il resto del repo (`../LICENSE`); il font Titillium Web in `public/fonts/` è sotto SIL OFL (`public/fonts/OFL.txt`).
