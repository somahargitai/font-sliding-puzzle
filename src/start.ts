import { Nav } from "./nav";
import { getConfig, setConfig, PuzzleConfig } from "./state";

const CANVAS_SIZE = 600;

function buildDefaultConfig(): PuzzleConfig {
  const gridSize = 4;
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext("2d")!;
  const bg = "#f5f5f0";
  const fg = "#111111";
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.fillStyle = fg;
  ctx.font = `480px "serif"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("A", CANVAS_SIZE / 2, CANVAS_SIZE / 2);

  const tileSize = CANVAS_SIZE / gridSize;
  const tiles: string[] = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const t = document.createElement("canvas");
      t.width = tileSize;
      t.height = tileSize;
      const tctx = t.getContext("2d")!;
      tctx.drawImage(canvas, c * tileSize, r * tileSize, tileSize, tileSize, 0, 0, tileSize, tileSize);
      tiles.push(t.toDataURL("image/png"));
    }
  }

  return {
    fontFamily: "serif",
    letter: "A",
    gridSize,
    canvasSize: CANVAS_SIZE,
    fontSize: 480,
    offsetX: 0,
    offsetY: 0,
    letterColor: fg,
    bgColor: bg,
    missingIndex: gridSize * gridSize - 1,
    timerSeconds: null,
    tiles,
  };
}

export function renderStart(root: HTMLElement, nav: Nav): void {
  const config = getConfig();
  const letter = config?.letter ?? "A";
  const fontFamily = config?.fontFamily ?? "serif";

  root.innerHTML = `
    <div class="start">
      <button class="gear" id="gear" title="Tervező" aria-label="Tervező megnyitása">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>

      <div class="start-content">
        <div class="start-preview" aria-hidden="true">
          <span class="start-glyph" style="font-family: '${fontFamily}', serif">${letter}</span>
        </div>
        <h1 class="start-title">Font Sliding Puzzle</h1>
        <p class="start-sub">Csúsztasd a helyére a betűt.</p>
        <button class="primary big" id="start-btn">Start ▶</button>
        <p class="start-hint">
          ${config ? `Aktuális: <strong>${letter}</strong> · ${config.gridSize}×${config.gridSize}${config.timerSeconds ? ` · ${Math.floor(config.timerSeconds / 60)}:${String(config.timerSeconds % 60).padStart(2, "0")}` : ""}` : "Alapértelmezett konfiguráció (A betű, 4×4)"}
        </p>
      </div>
    </div>
  `;

  root.querySelector<HTMLButtonElement>("#start-btn")!.addEventListener("click", () => {
    if (!getConfig()) {
      setConfig(buildDefaultConfig());
    }
    nav.game();
  });

  root.querySelector<HTMLButtonElement>("#gear")!.addEventListener("click", () => {
    nav.planner();
  });
}
