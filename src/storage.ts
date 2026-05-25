import { PuzzleConfig } from "./state";

export type SavedPuzzle = {
  id: string;
  name: string;
  createdAt: number;
  preview: string;
  config: PuzzleConfig;
};

const KEY = "font-sliding-puzzle:saved";

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadSaved(): SavedPuzzle[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SavedPuzzle[];
  } catch {
    return [];
  }
}

function persist(list: SavedPuzzle[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export function savePuzzle(name: string, preview: string, config: PuzzleConfig): SavedPuzzle | null {
  const list = loadSaved();
  const puzzle: SavedPuzzle = {
    id: newId(),
    name: name.trim() || config.letter || "Névtelen",
    createdAt: Date.now(),
    preview,
    config,
  };
  list.unshift(puzzle);
  if (!persist(list)) return null;
  return puzzle;
}

export function updatePuzzle(
  id: string,
  name: string,
  preview: string,
  config: PuzzleConfig,
): boolean {
  const list = loadSaved();
  const idx = list.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  list[idx] = {
    ...list[idx],
    name: name.trim() || config.letter || "Névtelen",
    preview,
    config,
  };
  return persist(list);
}

export function deletePuzzle(id: string): void {
  const list = loadSaved().filter((p) => p.id !== id);
  persist(list);
}

export function getPuzzle(id: string): SavedPuzzle | null {
  return loadSaved().find((p) => p.id === id) ?? null;
}

const BUILTIN_PREFIX = "builtin-";

/**
 * Keeps the built-in puzzles in sync with the app version. When `version`
 * changes, it removes the previously-seeded built-ins (any id starting with
 * `builtin-`) and inserts the current set, leaving the user's own puzzles
 * untouched. Runs once per version. A deleted built-in only comes back when
 * the version bumps.
 */
export function syncBuiltins(puzzles: SavedPuzzle[], version: string, versionKey: string): void {
  try {
    if (localStorage.getItem(versionKey) === version) return;
  } catch {
    return;
  }
  const userPuzzles = loadSaved().filter((p) => !p.id.startsWith(BUILTIN_PREFIX));
  persist([...userPuzzles, ...puzzles]);
  try {
    localStorage.setItem(versionKey, version);
  } catch {
    /* ignore quota */
  }
}
