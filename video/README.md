# Trailer di Smart Move

Progetto [Remotion](https://www.remotion.dev/) del trailer verticale (1080×1920, ~32 s). Il calendario del video usa la stessa logica dell'app (`../js/plan.js`).

```sh
npm i                                  # dipendenze
node scripts/suoni.mjs                 # musica ed effetti → public/sfx/*.wav (sintetizzati, nessun campione esterno)
npx remotion studio                    # anteprima
npx remotion render SmartMovePromo out/smart-move.mp4
cp out/smart-move.mp4 ../docs/trailer.mp4   # il video linkato dal README principale
```

- `src/timing.ts`: tempo sulla musica (1 battito = 14 fotogrammi), da tenere uguale a `BEAT`/`BARS` in `scripts/suoni.mjs`
- `src/scenes/`: domanda → logo → demo in 5 momenti → chiusura

Per alcune aziende Remotion richiede una licenza: [condizioni](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
