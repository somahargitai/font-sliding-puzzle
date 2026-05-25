import { Nav } from "./nav";
import { PuzzleConfig } from "./state";
import { getPuzzle, savePuzzle, updatePuzzle } from "./storage";
import { Artwork, Background, CANVAS_SIZE, fitGlyph, paintArtwork, sliceUnique } from "./artwork";
import { FONT_OPTIONS } from "./fonts";

const DEFAULT_FONT = "Roboto Slab";

type PlannerState = {
  fontFamily: string;
  letter: string;
  gridSize: number;
  fontSize: number;
  offsetX: number;
  offsetY: number;
  letterColor: string;
  bgColor: string;
  missingIndex: number;
  timerSeconds: number | null;
  background: Background;
  patternSeed: number;
};

function randomSeed(): number {
  return (Math.random() * 0x7fffffff) >>> 0;
}

function defaultState(): PlannerState {
  return {
    fontFamily: DEFAULT_FONT,
    letter: "A",
    gridSize: 4,
    fontSize: 480,
    offsetX: 0,
    offsetY: 0,
    letterColor: "#111111",
    bgColor: "#f5f5f0",
    missingIndex: 15,
    timerSeconds: null,
    background: "pattern",
    patternSeed: randomSeed(),
  };
}

function toArtwork(s: PlannerState): Artwork {
  return {
    fontFamily: s.fontFamily,
    letter: s.letter,
    fontSize: s.fontSize,
    offsetX: s.offsetX,
    offsetY: s.offsetY,
    letterColor: s.letterColor,
    bgColor: s.bgColor,
    background: s.background,
    patternSeed: s.patternSeed,
  };
}

let state: PlannerState = defaultState();

let fontCounter = 0;

export function renderPlanner(root: HTMLElement, nav: Nav, editId?: string | null): () => void {
  let editingId: string | null = editId ?? null;
  let editingName = "";
  if (editingId) {
    const saved = getPuzzle(editingId);
    if (saved) {
      const c = saved.config;
      state = {
        fontFamily: c.fontFamily,
        letter: c.letter,
        gridSize: c.gridSize,
        fontSize: c.fontSize,
        offsetX: c.offsetX,
        offsetY: c.offsetY,
        letterColor: c.letterColor,
        bgColor: c.bgColor,
        missingIndex: c.missingIndex,
        timerSeconds: c.timerSeconds,
        background: c.background ?? "plain",
        patternSeed: c.patternSeed ?? randomSeed(),
      };
      editingName = saved.name;
    } else {
      editingId = null;
    }
  } else {
    state = defaultState();
  }

  const timerOn = state.timerSeconds !== null && state.timerSeconds > 0;
  const timerMinVal = timerOn ? Math.floor(state.timerSeconds! / 60) : 2;
  const timerSecVal = timerOn ? state.timerSeconds! % 60 : 0;
  const isBuiltinFont = FONT_OPTIONS.some((f) => f.value === state.fontFamily);
  const fontOptions = [
    ...(isBuiltinFont ? [] : [{ value: state.fontFamily, label: "Egyéni (eredeti)" }]),
    ...FONT_OPTIONS,
  ]
    .map(
      (f) =>
        `<option value="${f.value}" ${f.value === state.fontFamily ? "selected" : ""}>${f.label}</option>`,
    )
    .join("");
  const fontStatusText = isBuiltinFont
    ? "Választott beépített font, vagy tölts be sajátot."
    : `Egyéni font: <code>${state.fontFamily}</code> — ha nem így néz ki, tölts be újra.`;

  root.innerHTML = `
    <div class="planner">
      <header class="planner-header">
        <button class="ghost" id="planner-back">← Szerkesztő</button>
        <div>
          <h1>${editingId ? "Játék szerkesztése" : "Új játék"}</h1>
          <p class="muted">Tölts be egy fontot, válassz betűt, állítsd be a rasztert, és válaszd ki a hiányzó csempét. Mentés után megjelenik a könyvtárban.</p>
        </div>
      </header>

      <div class="planner-body">
        <aside class="controls">
          <section>
            <h2>Név</h2>
            <label class="field">
              <span>Játék neve</span>
              <input type="text" id="puzzle-name" value="${editingName || state.letter}" maxlength="40" />
            </label>
          </section>

          <section>
            <h2>Font</h2>
            <label class="field">
              <span>Beépített font</span>
              <select id="font-family">${fontOptions}</select>
            </label>
            <label class="field">
              <span>vagy saját fájl (.ttf / .otf / .woff)</span>
              <input type="file" id="font-file" accept=".ttf,.otf,.woff,.woff2,font/*" />
            </label>
            <p class="hint" id="font-status">${fontStatusText}</p>
          </section>

          <section>
            <h2>Betű</h2>
            <label class="field">
              <span>Karakter</span>
              <input type="text" id="letter" value="${state.letter}" maxlength="2" />
            </label>
            <label class="field">
              <span>Szín</span>
              <input type="color" id="letter-color" value="${state.letterColor}" />
            </label>
            <label class="field">
              <span>Alapszín</span>
              <input type="color" id="bg-color" value="${state.bgColor}" />
            </label>
          </section>

          <section>
            <h2>Pozíció</h2>
            <label class="field">
              <span>Méret: <output id="font-size-out">${state.fontSize}</output> px</span>
              <input type="range" id="font-size" min="100" max="1500" step="10" value="${state.fontSize}" />
            </label>
            <label class="field">
              <span>Eltolás X: <output id="offset-x-out">${state.offsetX}</output></span>
              <input type="range" id="offset-x" min="-400" max="400" step="2" value="${state.offsetX}" />
            </label>
            <label class="field">
              <span>Eltolás Y: <output id="offset-y-out">${state.offsetY}</output></span>
              <input type="range" id="offset-y" min="-400" max="400" step="2" value="${state.offsetY}" />
            </label>
            <button class="ghost" id="fit-btn" type="button">📐 Kitöltés (betű a játéktérre)</button>
            <p class="hint">Tipp: nyilakkal is mozgathatod, <kbd>Shift</kbd> + nyíl = nagyobb lépés.</p>
          </section>

          <section>
            <h2>Raszter</h2>
            <label class="field">
              <span>Méret</span>
              <select id="grid-size">
                <option value="3">3 × 3</option>
                <option value="4" selected>4 × 4</option>
                <option value="5">5 × 5</option>
                <option value="6">6 × 6</option>
              </select>
            </label>
            <p class="hint">Kattints egy csempére a vásznon, hogy az legyen a hiányzó.</p>
          </section>

          <section>
            <h2>Háttér</h2>
            <label class="field row-inline">
              <input type="checkbox" id="bg-pattern" ${state.background === "pattern" ? "checked" : ""} />
              <span>Mintás háttér</span>
            </label>
            <p class="hint">A minta minden csempét egyedivé tesz, így a betűtől függetlenül is megoldható a kirakó.</p>
            <button class="ghost" id="reroll" type="button" ${state.background === "pattern" ? "" : "disabled"}>🎲 Új minta</button>
          </section>

          <section>
            <h2>Időzítő</h2>
            <label class="field row-inline">
              <input type="checkbox" id="timer-enabled" ${timerOn ? "checked" : ""} />
              <span>Visszaszámláló bekapcsolva</span>
            </label>
            <label class="field">
              <span>Időtartam (mm:ss)</span>
              <div class="row-inline">
                <input type="number" id="timer-min" min="0" max="59" value="${timerMinVal}" ${timerOn ? "" : "disabled"} />
                <span>:</span>
                <input type="number" id="timer-sec" min="0" max="59" value="${String(timerSecVal).padStart(2, "0")}" ${timerOn ? "" : "disabled"} />
              </div>
            </label>
          </section>

          <button class="primary" id="save-btn">${editingId ? "Módosítások mentése ✓" : "Mentés a könyvtárba ✓"}</button>
          <p class="hint" id="save-status"></p>
        </aside>

        <main class="canvas-area">
          <canvas id="preview" width="${CANVAS_SIZE}" height="${CANVAS_SIZE}"></canvas>
        </main>
      </div>
    </div>
  `;

  const canvas = root.querySelector<HTMLCanvasElement>("#preview")!;
  const ctx = canvas.getContext("2d")!;

  const fontFile = root.querySelector<HTMLInputElement>("#font-file")!;
  const fontStatus = root.querySelector<HTMLElement>("#font-status")!;
  const letterInput = root.querySelector<HTMLInputElement>("#letter")!;
  const letterColor = root.querySelector<HTMLInputElement>("#letter-color")!;
  const bgColor = root.querySelector<HTMLInputElement>("#bg-color")!;
  const fontSize = root.querySelector<HTMLInputElement>("#font-size")!;
  const fontSizeOut = root.querySelector<HTMLOutputElement>("#font-size-out")!;
  const offsetX = root.querySelector<HTMLInputElement>("#offset-x")!;
  const offsetXOut = root.querySelector<HTMLOutputElement>("#offset-x-out")!;
  const offsetY = root.querySelector<HTMLInputElement>("#offset-y")!;
  const offsetYOut = root.querySelector<HTMLOutputElement>("#offset-y-out")!;
  const gridSize = root.querySelector<HTMLSelectElement>("#grid-size")!;
  const timerEnabled = root.querySelector<HTMLInputElement>("#timer-enabled")!;
  const timerMin = root.querySelector<HTMLInputElement>("#timer-min")!;
  const timerSec = root.querySelector<HTMLInputElement>("#timer-sec")!;
  const fontFamilySelect = root.querySelector<HTMLSelectElement>("#font-family")!;
  const fitBtn = root.querySelector<HTMLButtonElement>("#fit-btn")!;
  const bgPattern = root.querySelector<HTMLInputElement>("#bg-pattern")!;
  const reroll = root.querySelector<HTMLButtonElement>("#reroll")!;
  const nameInput = root.querySelector<HTMLInputElement>("#puzzle-name")!;
  const saveBtn = root.querySelector<HTMLButtonElement>("#save-btn")!;
  const saveStatus = root.querySelector<HTMLElement>("#save-status")!;
  const backBtn = root.querySelector<HTMLButtonElement>("#planner-back")!;

  gridSize.value = String(state.gridSize);

  function clampMissing(): void {
    const total = state.gridSize * state.gridSize;
    if (state.missingIndex >= total) {
      state.missingIndex = total - 1;
    }
  }

  function draw(): void {
    // Artwork (what gets sliced into tiles) — no editor overlays baked in.
    paintArtwork(ctx, CANVAS_SIZE, toArtwork(state));

    // Editor-only overlays below: grid lines + the highlighted missing tile.
    const tile = CANVAS_SIZE / state.gridSize;
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    for (let i = 1; i < state.gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * tile, 0);
      ctx.lineTo(i * tile, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * tile);
      ctx.lineTo(CANVAS_SIZE, i * tile);
      ctx.stroke();
    }

    const row = Math.floor(state.missingIndex / state.gridSize);
    const col = state.missingIndex % state.gridSize;
    ctx.fillStyle = "rgba(220, 50, 50, 0.35)";
    ctx.fillRect(col * tile, row * tile, tile, tile);
    ctx.strokeStyle = "rgba(180, 30, 30, 0.9)";
    ctx.lineWidth = 3;
    ctx.strokeRect(col * tile + 1.5, row * tile + 1.5, tile - 3, tile - 3);
  }

  function setOffsetX(v: number): void {
    state.offsetX = Math.max(-400, Math.min(400, v));
    offsetX.value = String(state.offsetX);
    offsetXOut.value = String(state.offsetX);
    draw();
  }

  function setOffsetY(v: number): void {
    state.offsetY = Math.max(-400, Math.min(400, v));
    offsetY.value = String(state.offsetY);
    offsetYOut.value = String(state.offsetY);
    draw();
  }

  // Scales/centres the glyph so its ink fills the play area, then syncs the UI.
  function applyFit(): void {
    const fit = fitGlyph(state.letter, state.fontFamily);
    state.fontSize = Math.max(100, Math.min(1500, fit.fontSize));
    state.offsetX = Math.max(-400, Math.min(400, fit.offsetX));
    state.offsetY = Math.max(-400, Math.min(400, fit.offsetY));
    fontSize.value = String(state.fontSize);
    fontSizeOut.value = String(state.fontSize);
    offsetX.value = String(state.offsetX);
    offsetXOut.value = String(state.offsetX);
    offsetY.value = String(state.offsetY);
    offsetYOut.value = String(state.offsetY);
    draw();
  }

  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;
    const tile = CANVAS_SIZE / state.gridSize;
    const col = Math.floor(x / tile);
    const row = Math.floor(y / tile);
    state.missingIndex = row * state.gridSize + col;
    draw();
  });

  fontFile.addEventListener("change", async () => {
    const file = fontFile.files?.[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const family = `user-font-${++fontCounter}`;
    const face = new FontFace(family, buf);
    try {
      await face.load();
      (document as any).fonts.add(face);
      state.fontFamily = family;
      const opt = document.createElement("option");
      opt.value = family;
      opt.textContent = `Egyéni: ${file.name}`;
      fontFamilySelect.appendChild(opt);
      fontFamilySelect.value = family;
      fontStatus.textContent = `Betöltve: ${file.name}`;
      applyFit();
    } catch (err) {
      fontStatus.textContent = `Hiba a font betöltésekor: ${err}`;
    }
  });

  fontFamilySelect.addEventListener("change", () => {
    state.fontFamily = fontFamilySelect.value;
    applyFit();
  });

  fitBtn.addEventListener("click", applyFit);

  bgPattern.addEventListener("change", () => {
    state.background = bgPattern.checked ? "pattern" : "plain";
    reroll.disabled = !bgPattern.checked;
    draw();
  });

  reroll.addEventListener("click", () => {
    state.patternSeed = randomSeed();
    draw();
  });

  letterInput.addEventListener("input", () => {
    state.letter = letterInput.value.slice(0, 1) || "A";
    applyFit();
  });

  letterColor.addEventListener("input", () => {
    state.letterColor = letterColor.value;
    draw();
  });

  bgColor.addEventListener("input", () => {
    state.bgColor = bgColor.value;
    draw();
  });

  fontSize.addEventListener("input", () => {
    state.fontSize = Number(fontSize.value);
    fontSizeOut.value = String(state.fontSize);
    draw();
  });

  offsetX.addEventListener("input", () => setOffsetX(Number(offsetX.value)));
  offsetY.addEventListener("input", () => setOffsetY(Number(offsetY.value)));

  gridSize.addEventListener("change", () => {
    state.gridSize = Number(gridSize.value);
    clampMissing();
    draw();
  });

  timerEnabled.addEventListener("change", () => {
    const on = timerEnabled.checked;
    timerMin.disabled = !on;
    timerSec.disabled = !on;
  });

  backBtn.addEventListener("click", () => nav.editor());

  saveBtn.addEventListener("click", () => {
    let timerSeconds: number | null = null;
    if (timerEnabled.checked) {
      const m = Math.max(0, Number(timerMin.value) || 0);
      const s = Math.max(0, Math.min(59, Number(timerSec.value) || 0));
      timerSeconds = m * 60 + s;
      if (timerSeconds <= 0) timerSeconds = null;
    }
    const { tiles, preview, seed } = sliceUnique(toArtwork(state), state.gridSize);
    state.patternSeed = seed;
    const config: PuzzleConfig = {
      fontFamily: state.fontFamily,
      letter: state.letter,
      gridSize: state.gridSize,
      canvasSize: CANVAS_SIZE,
      fontSize: state.fontSize,
      offsetX: state.offsetX,
      offsetY: state.offsetY,
      letterColor: state.letterColor,
      bgColor: state.bgColor,
      missingIndex: state.missingIndex,
      timerSeconds,
      tiles,
      background: state.background,
      patternSeed: seed,
    };
    const ok = editingId
      ? updatePuzzle(editingId, nameInput.value, preview, config)
      : savePuzzle(nameInput.value, preview, config) !== null;
    if (!ok) {
      saveStatus.textContent = "Nem sikerült menteni (megtelt a tárhely?).";
      return;
    }
    nav.editor();
  });

  function isTextInput(el: Element | null): boolean {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === "TEXTAREA" || tag === "SELECT") return true;
    if (tag === "INPUT") {
      const type = (el as HTMLInputElement).type;
      return ["text", "number", "search", "email", "url", "tel", "password"].includes(type);
    }
    return false;
  }

  function onKey(e: KeyboardEvent): void {
    if (isTextInput(document.activeElement)) return;
    const step = e.shiftKey ? 25 : 5;
    switch (e.key) {
      case "ArrowLeft":
        setOffsetX(state.offsetX - step);
        e.preventDefault();
        break;
      case "ArrowRight":
        setOffsetX(state.offsetX + step);
        e.preventDefault();
        break;
      case "ArrowUp":
        setOffsetY(state.offsetY - step);
        e.preventDefault();
        break;
      case "ArrowDown":
        setOffsetY(state.offsetY + step);
        e.preventDefault();
        break;
    }
  }

  document.addEventListener("keydown", onKey);

  // New puzzles start pre-fitted; edited ones keep their saved size/offset.
  if (editingId) {
    draw();
  } else {
    applyFit();
  }

  return () => {
    document.removeEventListener("keydown", onKey);
  };
}
