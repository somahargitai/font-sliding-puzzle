export type Board = number[];

export function solvedBoard(gridSize: number, missingIndex: number): Board {
  const total = gridSize * gridSize;
  const board: Board = [];
  for (let i = 0; i < total; i++) {
    board.push(i === missingIndex ? -1 : i);
  }
  return board;
}

export function findEmpty(board: Board): number {
  return board.indexOf(-1);
}

export function neighbors(index: number, gridSize: number): number[] {
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  const result: number[] = [];
  if (row > 0) result.push(index - gridSize);
  if (row < gridSize - 1) result.push(index + gridSize);
  if (col > 0) result.push(index - 1);
  if (col < gridSize - 1) result.push(index + 1);
  return result;
}

export function canMove(board: Board, tileIndex: number, gridSize: number): boolean {
  const empty = findEmpty(board);
  return neighbors(empty, gridSize).includes(tileIndex);
}

export function move(board: Board, tileIndex: number, gridSize: number): Board {
  if (!canMove(board, tileIndex, gridSize)) return board;
  const empty = findEmpty(board);
  const next = board.slice();
  next[empty] = board[tileIndex];
  next[tileIndex] = -1;
  return next;
}

export function shuffle(
  gridSize: number,
  missingIndex: number,
  steps = 200,
): { board: Board; history: Board[] } {
  let board = solvedBoard(gridSize, missingIndex);
  const history: Board[] = [board.slice()];
  let lastEmpty = -1;
  for (let i = 0; i < steps; i++) {
    const empty = findEmpty(board);
    const candidates = neighbors(empty, gridSize).filter((n) => n !== lastEmpty);
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    lastEmpty = empty;
    board = move(board, pick, gridSize);
    history.push(board.slice());
  }
  if (isSolved(board, missingIndex)) {
    return shuffle(gridSize, missingIndex, steps);
  }
  return { board, history };
}

export function isSolved(board: Board, missingIndex: number): boolean {
  for (let i = 0; i < board.length; i++) {
    if (i === missingIndex) {
      if (board[i] !== -1) return false;
    } else {
      if (board[i] !== i) return false;
    }
  }
  return true;
}

function manhattan(board: Board, gridSize: number): number {
  let sum = 0;
  for (let i = 0; i < board.length; i++) {
    const v = board[i];
    if (v === -1) continue;
    const cr = Math.floor(i / gridSize);
    const cc = i % gridSize;
    const tr = Math.floor(v / gridSize);
    const tc = v % gridSize;
    sum += Math.abs(cr - tr) + Math.abs(cc - tc);
  }
  return sum;
}

export function solveIDAStar(
  start: Board,
  gridSize: number,
  missingIndex: number,
  nodeLimit = 2_000_000,
): number[] | null {
  if (isSolved(start, missingIndex)) return [];

  let bound = manhattan(start, gridSize);
  const path: number[] = [];
  let nodes = 0;
  let exceeded = false;

  function dfs(node: Board, g: number, lastEmpty: number): number {
    if (exceeded) return Infinity;
    nodes++;
    if (nodes > nodeLimit) {
      exceeded = true;
      return Infinity;
    }
    const h = manhattan(node, gridSize);
    const f = g + h;
    if (f > bound) return f;
    if (h === 0 && isSolved(node, missingIndex)) return -1;
    let min = Infinity;
    const empty = findEmpty(node);
    const neigh = neighbors(empty, gridSize);
    for (const n of neigh) {
      if (n === lastEmpty) continue;
      const next = move(node, n, gridSize);
      path.push(n);
      const t = dfs(next, g + 1, empty);
      if (t === -1) return -1;
      path.pop();
      if (t < min) min = t;
    }
    return min;
  }

  while (!exceeded) {
    const t = dfs(start, 0, -1);
    if (t === -1) return path;
    if (!isFinite(t)) return null;
    bound = t;
  }
  return null;
}

export function solveByHistory(history: Board[], gridSize: number): number[] {
  if (history.length < 2) return [];
  const visited = new Map<string, number>();
  const compact: Board[] = [];
  for (const state of history) {
    const key = state.join(",");
    const prev = visited.get(key);
    if (prev !== undefined) {
      for (let i = compact.length - 1; i > prev; i--) {
        visited.delete(compact[i].join(","));
      }
      compact.length = prev + 1;
    } else {
      visited.set(key, compact.length);
      compact.push(state);
    }
  }
  const path: number[] = [];
  for (let i = compact.length - 1; i > 0; i--) {
    const from = compact[i];
    const to = compact[i - 1];
    const clickPos = to.indexOf(-1);
    if (canMove(from, clickPos, gridSize)) {
      path.push(clickPos);
    }
  }
  return path;
}
