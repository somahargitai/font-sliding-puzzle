import { Nav } from "./nav";
import { getConfig } from "./state";
import {
  Board,
  canMove,
  isSolved,
  move,
  shuffle,
  solveByHistory,
  solveIDAStar,
} from "./puzzle";

type GameStatus = "playing" | "solving" | "won" | "timeout";

type GameState = {
  board: Board;
  history: Board[];
  moves: number;
  startTime: number;
  status: GameStatus;
  timerId: number | null;
  solveTimerId: number | null;
  solveSpeed: number;
};

export function renderGame(root: HTMLElement, nav: Nav): () => void {
  const loaded = getConfig();
  if (!loaded) {
    root.innerHTML = `<div class="empty">Nincs betöltött konfiguráció. <button id="back">Vissza</button></div>`;
    root.querySelector<HTMLButtonElement>("#back")!.addEventListener("click", () => nav.start());
    return () => {};
  }
  const config = loaded;

  const shuffled = shuffle(config.gridSize, config.missingIndex);

  const gs: GameState = {
    board: shuffled.board,
    history: shuffled.history,
    moves: 0,
    startTime: Date.now(),
    status: "playing",
    timerId: null,
    solveTimerId: null,
    solveSpeed: 2,
  };

  root.innerHTML = `
    <div class="game">
      <header class="game-header">
        <button class="ghost" id="back-btn">← Főképernyő</button>
        <div class="stats">
          <div class="stat"><span class="label">Idő</span><span id="time" class="value">--:--</span></div>
          <div class="stat"><span class="label">Lépés</span><span id="moves" class="value">0</span></div>
        </div>
        <div class="solve-controls">
          <label class="speed-field">
            <span>Tempó</span>
            <select id="solve-speed">
              <option value="1">1 / s</option>
              <option value="2" selected>2 / s</option>
              <option value="4">4 / s</option>
              <option value="8">8 / s</option>
              <option value="16">16 / s</option>
            </select>
          </label>
          <button class="ghost" id="solve-btn" title="Játssza le a megoldást">Megoldás ▶</button>
        </div>
      </header>

      <main class="board-wrap">
        <div class="board" id="board"></div>
        <div class="overlay hidden" id="overlay">
          <div class="overlay-card">
            <h2 id="overlay-title"></h2>
            <p id="overlay-msg"></p>
            <div class="row-inline">
              <button class="primary" id="play-again">Új játék</button>
              <button class="ghost" id="overlay-back">Főképernyő</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;

  const boardEl = root.querySelector<HTMLDivElement>("#board")!;
  const timeEl = root.querySelector<HTMLElement>("#time")!;
  const movesEl = root.querySelector<HTMLElement>("#moves")!;
  const overlay = root.querySelector<HTMLDivElement>("#overlay")!;
  const overlayTitle = root.querySelector<HTMLElement>("#overlay-title")!;
  const overlayMsg = root.querySelector<HTMLElement>("#overlay-msg")!;
  const solveBtn = root.querySelector<HTMLButtonElement>("#solve-btn")!;
  const speedSelect = root.querySelector<HTMLSelectElement>("#solve-speed")!;

  boardEl.style.setProperty("--grid-size", String(config.gridSize));

  function renderBoard(): void {
    boardEl.innerHTML = "";
    const tileFraction = 100 / config.gridSize;
    gs.board.forEach((value, position) => {
      if (value === -1) return;
      const tile = document.createElement("button");
      tile.className = "tile";
      tile.style.backgroundImage = `url(${config.tiles[value]})`;
      const row = Math.floor(position / config.gridSize);
      const col = position % config.gridSize;
      tile.style.left = `${col * tileFraction}%`;
      tile.style.top = `${row * tileFraction}%`;
      tile.style.width = `${tileFraction}%`;
      tile.style.height = `${tileFraction}%`;
      tile.addEventListener("click", () => handleTileClick(position));
      boardEl.appendChild(tile);
    });
  }

  function applyMove(position: number): boolean {
    if (!canMove(gs.board, position, config.gridSize)) return false;
    gs.board = move(gs.board, position, config.gridSize);
    gs.history.push(gs.board.slice());
    gs.moves++;
    movesEl.textContent = String(gs.moves);
    renderBoard();
    return true;
  }

  function handleTileClick(position: number): void {
    if (gs.status !== "playing") return;
    if (!applyMove(position)) return;
    if (isSolved(gs.board, config.missingIndex)) {
      finish("won");
    }
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function updateTimer(): void {
    if (gs.status !== "playing" && gs.status !== "solving") return;
    const elapsedSec = Math.floor((Date.now() - gs.startTime) / 1000);
    if (config.timerSeconds !== null && gs.status === "playing") {
      const left = config.timerSeconds - elapsedSec;
      if (left <= 0) {
        timeEl.textContent = "00:00";
        finish("timeout");
        return;
      }
      timeEl.textContent = formatTime(left);
    } else {
      timeEl.textContent = formatTime(elapsedSec);
    }
  }

  function finish(status: "won" | "timeout"): void {
    gs.status = status;
    if (gs.timerId !== null) window.clearInterval(gs.timerId);
    if (gs.solveTimerId !== null) window.clearInterval(gs.solveTimerId);
    if (status === "won") {
      const elapsed = Math.floor((Date.now() - gs.startTime) / 1000);
      overlayTitle.textContent = "Megoldva! 🎉";
      overlayMsg.textContent = `${formatTime(elapsed)} • ${gs.moves} lépés`;
    } else {
      overlayTitle.textContent = "Lejárt az idő";
      overlayMsg.textContent = `${gs.moves} lépés — próbáld újra!`;
    }
    overlay.classList.remove("hidden");
  }

  function startSolve(): void {
    if (gs.status !== "playing") return;
    if (isSolved(gs.board, config.missingIndex)) return;

    const nodeLimit = config.gridSize <= 4 ? 3_000_000 : 200_000;
    solveBtn.disabled = true;
    solveBtn.textContent = "Számolás…";

    setTimeout(() => {
      let path = solveIDAStar(gs.board, config.gridSize, config.missingIndex, nodeLimit);
      if (!path) {
        path = solveByHistory(gs.history, config.gridSize);
      }
      if (path.length === 0) {
        solveBtn.disabled = false;
        solveBtn.textContent = "Megoldás ▶";
        return;
      }
      gs.status = "solving";
      solveBtn.textContent = `Megoldás (${path.length})`;
      let i = 0;
      const interval = 1000 / gs.solveSpeed;
      gs.solveTimerId = window.setInterval(() => {
        if (i >= path!.length) {
          if (gs.solveTimerId !== null) window.clearInterval(gs.solveTimerId);
          gs.solveTimerId = null;
          if (isSolved(gs.board, config.missingIndex)) {
            finish("won");
          } else {
            solveBtn.disabled = false;
            solveBtn.textContent = "Megoldás ▶";
            gs.status = "playing";
          }
          return;
        }
        applyMove(path![i]);
        i++;
      }, interval);
    }, 0);
  }

  speedSelect.addEventListener("change", () => {
    gs.solveSpeed = Number(speedSelect.value);
    if (gs.solveTimerId !== null) {
      window.clearInterval(gs.solveTimerId);
      gs.solveTimerId = null;
      solveBtn.disabled = false;
      solveBtn.textContent = "Megoldás ▶";
      gs.status = "playing";
      startSolve();
    }
  });

  solveBtn.addEventListener("click", startSolve);

  root.querySelector<HTMLButtonElement>("#back-btn")!.addEventListener("click", () => {
    nav.start();
  });
  root.querySelector<HTMLButtonElement>("#overlay-back")!.addEventListener("click", () => {
    nav.start();
  });
  root.querySelector<HTMLButtonElement>("#play-again")!.addEventListener("click", () => {
    nav.game();
  });

  renderBoard();
  updateTimer();
  gs.timerId = window.setInterval(updateTimer, 250);

  return () => {
    if (gs.timerId !== null) window.clearInterval(gs.timerId);
    if (gs.solveTimerId !== null) window.clearInterval(gs.solveTimerId);
  };
}
