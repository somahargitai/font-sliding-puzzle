# Font Sliding Puzzle

Csúsztatós kirakó, ahol a kép mindig egy adott betűtípus egy adott betűje. Saját font fájl betölthető, a raszter és a hiányzó csempe szabadon beállítható, a játékban időzítő és automata megoldó is van.

A folyamat: a **tervezőben** elkészített játékokat **elmented**, ezek a **könyvtárba** kerülnek. A főképernyő **Start** gombja a játékkönyvtárat nyitja meg (kattintásra indul egy mentett játék), a **fogaskerék** pedig a **szerkesztőt** (ugyanazok a játékok, de kattintásra szerkesztés indul, illetve új is hozzáadható). Játszani egérrel vagy a **nyílbillentyűkkel** lehet, a végén pedig **visszajátszható** lépésről lépésre a megoldás.

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

Kimenet: a futtatható + a telepítők a `src-tauri/target/release/bundle/` alatt.

## Telepítő / terjesztés (Windows + macOS)

**Nincs egyetlen fájl, ami mindkét rendszerre települ** — operációs rendszerenként külön telepítő készül, és a felhasználó a sajátját tölti le:

| Platform | Kimenet | Build-gép igénye |
|---|---|---|
| Windows | `.msi` (WiX) és `.exe` (NSIS) | Windows + Rust + MS C++ Build Tools (WebView2 gyári Win10/11-en) |
| macOS | `.dmg` (+ `.app`), Apple Silicon és/vagy Intel | macOS + Rust + Xcode Command Line Tools |

A Tauri **nem cross-compilel** megbízhatóan: macOS telepítőt csak Macen, Windowsosat csak Windowson lehet építeni. Mindkettőt egy helyről a **GitHub Actions** workflow gyártja le: `.github/workflows/release.yml` (`macos-latest` + `windows-latest` runner, `tauri-apps/tauri-action`).

Kiadás indítása:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

vagy az Actions fülön a *Run workflow* gombbal. A workflow legyártja a Windows (`.msi` + `.exe`) és a macOS univerzális (`.dmg`) telepítőt, és egy **draft GitHub Release**-hez csatolja őket (a Releases fülön publikálható).

**Költség:** publikus repón a GitHub Actions ingyenes és korlátlan. Privát repón a Free csomag havi 2000 ingyenes percet ad, de a macOS runner 10×, a Windows 2× szorzóval számol — alkalmi kiadásokra így is bőven elég.

macOS univerzális build (Intel + Apple Silicon egyben):

```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
npm run tauri build -- --target universal-apple-darwin
```

**Aláírás (különben figyelmeztetés, de működik):**
- **macOS:** aláírás nélkül a Gatekeeper blokkol; sima telepítéshez Apple Developer Program ($99/év) + Developer ID cert + notarizálás kell.
- **Windows:** aláírás nélkül SmartScreen „ismeretlen kiadó"; sima telepítéshez Authenticode kódaláíró tanúsítvány kell.

## Mappa-szerkezet

```
src/              frontend (TypeScript + Vite)
  main.ts         belépő pont, view router
  nav.ts          navigációs típus
  start.ts        kezdőképernyő (fix SVG logó, Start → játékkönyvtár, fogaskerék → szerkesztő)
  library.ts      könyvtár nézet két módban: "play" (indítás) és "edit" (szerkesztés/törlés/új)
  planner.ts      tervező nézet (font, raszter, hiányzó csempe, háttérminta → mentés vagy módosítás)
  artwork.ts      vászon-rajzolás: háttérminta + betű, glyph-illesztés, csempére szeletelés
  builtins.ts     4 beépített játék (becsatolt fontok + kitöltés), futásidőben kirajzolva
  fonts.ts        becsatolt + rendszer fontok listája, @font-face betöltés
  game.ts         játék nézet (időzítő, megoldó, win detect, visszajátszás)
  puzzle.ts       sliding logika + IDA* megoldó
  state.ts        megosztott konfig (könyvtár → játék)
  storage.ts      mentett játékok + beépítettek verziózott szinkronja (localStorage)
  styles.css      stílusok + @font-face

public/fonts/     becsatolt, szabadon terjeszthető fontok (commitolva, az appba kerülnek)
fonts-licensed/   jogdíjas/trial fontok — gitignore-ban, NEM kerül commitba és buildbe

.github/workflows/release.yml   Windows + macOS telepítő GitHub Actionsön

src-tauri/        Rust shell (natív ablak)
  src/main.rs
  src/lib.rs
  Cargo.toml
  tauri.conf.json
```

## Hogy működik

- **Tervező:** becsatolt fontok közül választhatsz (Roboto Slab, Bebas Neue, Fira Sans, Gabriela), rendszer-családokból (serif, sans-serif, monospace, Georgia…), vagy saját font fájlt töltesz be (`FontFace` API). A betű egy Canvas-ra rajzolódik, az eltolás/méret/szín állítható (nyilakkal is, `Shift` + nyíl = nagyobb lépés). A raszter overlay rákerül a canvasra, kattintásra kiválasztható a hiányzó csempe. A **Mentés** a felszeletelt csempéket, egy előnézeti képet és a konfigurációt `localStorage`-ba teszi (`font-sliding-puzzle:saved` kulcs), majd a szerkesztőbe navigál.
- **Glyph-kitöltés:** a betű *tényleges festett része* (nem az em-doboz) van felskálázva és középre igazítva, hogy minél jobban kitöltse a játékteret (`fitGlyph` az `actualBoundingBox*` metrikákból számol). Új játéknál ez automatikus, és betű-/fontváltáskor újraszámol; a `📐 Kitöltés` gomb bármikor újra alkalmazza.
- **Háttérminta (egyediség-garancia):** a sliding puzzle akkor megoldható egyértelműen, ha minden csempe **vizuálisan különbözik** — különben két „üres" csempe felcserélhető. A betű viszont gyakran nem fed rá minden csempére. Ezért a tervezőben bekapcsolható egy **mintás háttér** (`artwork.ts`): pozíciófüggő, seedelt színfoltok + finom textúra, ami minden régiónak külön színt ad. Szeleteléskor (`sliceUnique`) a kód ellenőrzi, hogy a csempék mind különböznek-e, és ütközés esetén új seedet húz — így a megoldhatóság a betűtől függetlenül **garantált**. Az új és a beépített játékok alapból mintás háttérrel készülnek.
- **Beépített játékok:** induláskor (`syncBuiltins`, `font-sliding-puzzle:builtins-version` kulcs) bekerül 4 beépített feladat (R/8/G/a a becsatolt fontokkal, különböző rácsméretek, az egyik időzítős), futásidőben kirajzolva, glyph-kitöltéssel. A verzió emelésekor frissülnek (a saját játékaid érintetlenül maradnak); törölhetők, és csak verzióváltáskor jönnek vissza.

## Fontok és licencek

A `public/fonts/` mappában csak **szabadon terjeszthető** fontok vannak (commitolva, és az appba is becsomagolódnak): Roboto Slab (Apache 2.0), Fira Sans / Gabriela / Bebas Neue (SIL OFL). Részletek és a teljes licenctextek hozzáadásáról: `public/fonts/README.md`.

A jogdíjas / trial / „personal use" fontok (Gotham, Baskerville MT Pro, Trajan Pro, Cocogoose trial, …) a `fonts-licensed/` mappában vannak, ami **gitignore-ban** szerepel — nem kerül a repóba és a buildbe sem. Ezeket helyben, a tervező „saját fájl" feltöltőjével lehet használni.
- **Könyvtár:** a mentett játékok rasztere előnézeti képpel. *Play* módban (Start gomb) a kártyára kattintva (vagy `Enter`/`Space`) indul a játék. *Edit* módban (fogaskerék) a kártya a tervezőt nyitja meg az adott játékkal szerkesztésre, a `+ Új játék` üres tervezőt, a sarokban lévő ✕ pedig töröl. A szerkesztő mentés gombja (`updatePuzzle`) felülírja a meglévő bejegyzést, megtartva az azonosítóját.
- **Játék:** a tervezőben kirajzolt canvas felszeletelve PNG dataURL-ekké → ezek a csempék. A keverés visszafelé random érvényes lépésekkel történik a megoldott állapotból, így garantáltan megoldható. Játszani egérrel vagy a **nyílbillentyűkkel** lehet: a nyíl iránya jelzi, melyik csempe csússzon (pl. `←` a hézagtól jobbra lévő csempét húzza balra).
- **Visszajátszás:** a játékos minden lépése külön történetbe kerül; megoldás (vagy lejárt idő) után a felugró ablak **Visszajátszás** gombja review módba vált, ahol a `←`/`→` nyilakkal (vagy a gombokkal) lépésről lépésre végignézhető a játszma.
- **Megoldó:** IDA\* Manhattan-távolság heurisztikával (3×3 és 4×4 esetén optimum lépésszámot ad). 5×5+ esetén vagy ha az IDA\* túllépi a node-limitet, fallback: a játékban felvett mozgástörténet visszafelé játszása (ciklusok kihagyva — nem feltétlen minimum, de mindig megoldja).
