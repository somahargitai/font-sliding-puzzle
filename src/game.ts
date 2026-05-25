import { Nav } from "./nav";
import { getConfig } from "./state";
import {
  Board,
  canMove,
  findEmpty,
  isSolved,
  move,
  shuffle,
  solveByHistory,
  solveIDAStar,
} from "./puzzle";

type GameStatus = "playing" | "solving" | "won" | "timeout" | "review";

type GameState = {
  board: Board;
  history: Board[];
  playerHistory: Board[];
  reviewIndex: number;
  moves: number;
  startTime: number;
  status: GameStatus;
  timerId: number | null;
  solveTimerId: number | null;
  solveSpeed: number;
};

const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

export function renderGame(root: HTMLElement, nav: Nav): () => void {
  const loaded = getConfig();
  if (!loaded) {
    root.innerHTML = `<div class="empty">Nincs betöltött konfiguráció. <button id="back">Vissza</button></div>`;
    root.querySelector<HTMLButtonElement>("#back")!.addEventListener("click", () => nav.library());
    return () => {};
  }
  const config = loaded;
  const total = config.gridSize * config.gridSize;

  const shuffled = shuffle(config.gridSize, config.missingIndex);

  const gs: GameState = {
    board: shuffled.board,
    history: shuffled.history,
    playerHistory: [shuffled.board.slice()],
    reviewIndex: 0,
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
        <button class="ghost" id="back-btn">← Könyvtár</button>
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
        <p class="play-hint" id="play-hint">Nyilakkal vagy kattintással csúsztass.</p>

        <div class="review-bar hidden" id="review-bar">
          <button class="ghost" id="review-prev" title="Előző lépés (←)">←</button>
          <span class="review-step" id="review-step">Lépés 0 / 0</span>
          <button class="ghost" id="review-next" title="Következő lépés (→)">→</button>
          <button class="ghost" id="review-exit">Könyvtár</button>
        </div>

        <div class="overlay hidden" id="overlay">
          <div class="overlay-card">
            <h2 id="overlay-title"></h2>
            <p id="overlay-msg"></p>
            <div class="row-inline">
              <button class="primary" id="play-again">Új játék</button>
              <button class="ghost" id="review-btn">Visszajátszás ⏪</button>
              <button class="ghost" id="overlay-back">Könyvtár</button>
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
  const playHint = root.querySelector<HTMLElement>("#play-hint")!;
  const reviewBar = root.querySelector<HTMLDivElement>("#review-bar")!;
  const reviewStep = root.querySelector<HTMLElement>("#review-step")!;
  const reviewPrev = root.querySelector<HTMLButtonElement>("#review-prev")!;
  const reviewNext = root.querySelector<HTMLButtonElement>("#review-next")!;

  boardEl.style.setProperty("--grid-size", String(config.gridSize));

  function displayBoard(): Board {
    return gs.status === "review" ? gs.playerHistory[gs.reviewIndex] : gs.board;
  }

  function renderBoard(): void {
    const board = displayBoard();
    boardEl.innerHTML = "";
    const tileFraction = 100 / config.gridSize;
    board.forEach((value, position) => {
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
    gs.playerHistory.push(gs.board.slice());
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

  function moveByArrow(key: string): void {
    const empty = findEmpty(gs.board);
    let target = -1;
    switch (key) {
      case "ArrowUp":
        target = empty + config.gridSize; // tile below slides up
        break;
      case "ArrowDown":
        target = empty - config.gridSize; // tile above slides down
        break;
      case "ArrowLeft":
        target = empty + 1; // tile to the right slides left
        break;
      case "ArrowRight":
        target = empty - 1; // tile to the left slides right
        break;
    }
    if (target < 0 || target >= total) return;
    handleTileClick(target);
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

  function enterReview(): void {
    gs.status = "review";
    gs.reviewIndex = gs.playerHistory.length - 1;
    overlay.classList.add("hidden");
    playHint.classList.add("hidden");
    reviewBar.classList.remove("hidden");
    renderReview();
  }

  function stepReview(delta: number): void {
    const max = gs.playerHistory.length - 1;
    gs.reviewIndex = Math.max(0, Math.min(max, gs.reviewIndex + delta));
    renderReview();
  }

  function renderReview(): void {
    renderBoard();
    const max = gs.playerHistory.length - 1;
    reviewStep.textContent = `Lépés ${gs.reviewIndex} / ${max}`;
    reviewPrev.disabled = gs.reviewIndex <= 0;
    reviewNext.disabled = gs.reviewIndex >= max;
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

  function onKey(e: KeyboardEvent): void {
    const el = document.activeElement;
    if (el && (el.tagName === "SELECT" || el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      return;
    }
    if (gs.status === "playing" && ARROW_KEYS.includes(e.key)) {
      e.preventDefault();
      moveByArrow(e.key);
    } else if (gs.status === "review") {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepReview(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        stepReview(1);
      }
    }
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
    nav.library();
  });
  root.querySelector<HTMLButtonElement>("#overlay-back")!.addEventListener("click", () => {
    nav.library();
  });
  root.querySelector<HTMLButtonElement>("#play-again")!.addEventListener("click", () => {
    nav.game();
  });
  root.querySelector<HTMLButtonElement>("#review-btn")!.addEventListener("click", enterReview);
  root.querySelector<HTMLButtonElement>("#review-exit")!.addEventListener("click", () => {
    nav.library();
  });
  reviewPrev.addEventListener("click", () => stepReview(-1));
  reviewNext.addEventListener("click", () => stepReview(1));

  document.addEventListener("keydown", onKey);

  renderBoard();
  updateTimer();
  gs.timerId = window.setInterval(updateTimer, 250);

  return () => {
    document.removeEventListener("keydown", onKey);
    if (gs.timerId !== null) window.clearInterval(gs.timerId);
    if (gs.solveTimerId !== null) window.clearInterval(gs.solveTimerId);
  };
}
