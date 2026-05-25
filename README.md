# Font Sliding Puzzle

Csúsztatós kirakó, ahol a kép mindig egy adott betűtípus egy adott betűje. Saját font fájl betölthető, a raszter és a hiányzó csempe szabadon beállítható, a játékban időzítő és automata megoldó is van.

## Fejlesztés

Előfeltételek:

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (stabil toolchain)
- Windows: Microsoft Visual Studio C++ Build Tools, WebView2 (Win11-en gyárilag van)

```powershell
npm install
npm run tauri dev
```

Első futáskor a cargo build pár percig tart (Tauri + WebView2 wrapper crate-ek), utána másodperc.

## Build

```powershell
npm run tauri build
```

Kimenet: `src-tauri/target/release/font-sliding-puzzle.exe` + telepítő `src-tauri/target/release/bundle/` alatt.

## Mappa-szerkezet

```
src/              frontend (TypeScript + Vite)
  main.ts         belépő pont, view router
  nav.ts          navigációs típus
  start.ts        kezdőképernyő
  planner.ts      tervező nézet (font, raszter, hiányzó csempe)
  game.ts         játék nézet (időzítő, megoldó, win detect)
  puzzle.ts       sliding logika + IDA* megoldó
  state.ts        megosztott konfig
  styles.css      stílusok

src-tauri/        Rust shell (natív ablak)
  src/main.rs
  src/lib.rs
  Cargo.toml
  tauri.conf.json
```

## Hogy működik

- **Tervező:** font fájl `FontFace` API-val betöltve egy Canvas-ra rajzolódik a betű, az eltolás/méret/szín állítható (nyilakkal is, `Shift` + nyíl = nagyobb lépés). A raszter overlay rákerül a canvasra, kattintásra kiválasztható a hiányzó csempe.
- **Játék:** a tervezőben kirajzolt canvas felszeletelve PNG dataURL-ekké → ezek a csempék. A kevrés visszafelé random érvényes lépésekkel történik a megoldott állapotból, így garantáltan megoldható.
- **Megoldó:** IDA\* Manhattan-távolság heurisztikával (3×3 és 4×4 esetén optimum lépésszámot ad). 5×5+ esetén vagy ha az IDA\* túllépi a node-limitet, fallback: a játékban felvett mozgástörténet visszafelé játszása (ciklusok kihagyva — nem feltétlen minimum, de mindig megoldja).
