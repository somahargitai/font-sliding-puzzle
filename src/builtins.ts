import { Artwork, CANVAS_SIZE, fitGlyph, sliceUnique } from "./artwork";
import { PuzzleConfig } from "./state";
import { SavedPuzzle } from "./storage";

type BuiltinSpec = {
  id: string;
  name: string;
  letter: string;
  fontFamily: string;
  gridSize: number;
  missingIndex: number;
  timerSeconds: number | null;
  letterColor: string;
  bgColor: string;
  patternSeed: number;
};

const SPECS: BuiltinSpec[] = [
  {
    id: "builtin-roboto-r",
    name: "R — Roboto Slab",
    letter: "R",
    fontFamily: "Roboto Slab",
    gridSize: 4,
    missingIndex: 15,
    timerSeconds: null,
    letterColor: "#10121a",
    bgColor: "#f5f5f0",
    patternSeed: 101,
  },
  {
    id: "builtin-bebas-8",
    name: "8 — Bebas Neue (idő)",
    letter: "8",
    fontFamily: "Bebas Neue",
    gridSize: 3,
    missingIndex: 8,
    timerSeconds: 90,
    letterColor: "#15131c",
    bgColor: "#ede9f2",
    patternSeed: 202,
  },
  {
    id: "builtin-gabriela-g",
    name: "G — Gabriela",
    letter: "G",
    fontFamily: "Gabriela",
    gridSize: 5,
    missingIndex: 24,
    timerSeconds: null,
    letterColor: "#101010",
    bgColor: "#f3efe7",
    patternSeed: 303,
  },
  {
    id: "builtin-fira-a",
    name: "a — Fira Sans",
    letter: "a",
    fontFamily: "Fira Sans",
    gridSize: 4,
    missingIndex: 0,
    timerSeconds: null,
    letterColor: "#0d0d13",
    bgColor: "#eef2f7",
    patternSeed: 404,
  },
];

/** Renders the built-in puzzles (tiles + preview) at runtime, fitting each
 * glyph to fill the play area. Call after the bundled fonts have loaded. */
export function buildBuiltinPuzzles(): SavedPuzzle[] {
  return SPECS.map((spec, i) => {
    const fit = fitGlyph(spec.letter, spec.fontFamily);
    const artwork: Artwork = {
      fontFamily: spec.fontFamily,
      letter: spec.letter,
      fontSize: fit.fontSize,
      offsetX: fit.offsetX,
      offsetY: fit.offsetY,
      letterColor: spec.letterColor,
      bgColor: spec.bgColor,
      background: "pattern",
      patternSeed: spec.patternSeed,
    };
    const { tiles, preview, seed } = sliceUnique(artwork, spec.gridSize);
    const config: PuzzleConfig = {
      fontFamily: spec.fontFamily,
      letter: spec.letter,
      gridSize: spec.gridSize,
      canvasSize: CANVAS_SIZE,
      fontSize: fit.fontSize,
      offsetX: fit.offsetX,
      offsetY: fit.offsetY,
      letterColor: spec.letterColor,
      bgColor: spec.bgColor,
      missingIndex: spec.missingIndex,
      timerSeconds: spec.timerSeconds,
      tiles,
      background: "pattern",
      patternSeed: seed,
    };
    return {
      id: spec.id,
      name: spec.name,
      createdAt: 1_700_000_000_000 + i,
      preview,
      config,
    };
  });
}
