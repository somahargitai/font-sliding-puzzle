export type PuzzleConfig = {
  fontFamily: string;
  letter: string;
  gridSize: number;
  canvasSize: number;
  fontSize: number;
  offsetX: number;
  offsetY: number;
  letterColor: string;
  bgColor: string;
  missingIndex: number;
  timerSeconds: number | null;
  tiles: string[];
  // Optional; absent on puzzles saved before backgrounds existed (treated as "plain").
  background?: "plain" | "pattern";
  patternSeed?: number;
};

let currentConfig: PuzzleConfig | null = null;

export function setConfig(config: PuzzleConfig): void {
  currentConfig = config;
}

export function getConfig(): PuzzleConfig | null {
  return currentConfig;
}
