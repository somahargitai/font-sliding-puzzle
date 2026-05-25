export const CANVAS_SIZE = 600;

export type Background = "plain" | "pattern";

export type Artwork = {
  fontFamily: string;
  letter: string;
  fontSize: number;
  offsetX: number;
  offsetY: number;
  letterColor: string;
  bgColor: string;
  background: Background;
  patternSeed: number;
};

const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
]);

/**
 * Builds a canvas `font` family stack. Generic keywords (sans-serif, monospace…)
 * and already-quoted names are passed through; bare custom names get quoted —
 * otherwise the canvas treats a generic keyword as a missing named font.
 */
function fontStack(family: string): string {
  const f = family.trim();
  if (f.startsWith("'") || f.startsWith('"') || GENERIC_FAMILIES.has(f)) {
    return `${f}, serif`;
  }
  return `"${f}", serif`;
}

/** Small deterministic PRNG so a given seed always yields the same pattern. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Background texture that varies across the whole canvas, so that every tile
 * region differs even where the letter does not reach. Built from a handful of
 * soft, seeded colour blobs (regional colour identity) plus a faint dot grid
 * for texture. Combined with `sliceUnique`, this guarantees distinct tiles.
 */
function paintPattern(ctx: CanvasRenderingContext2D, size: number, seed: number): void {
  const rng = mulberry32(seed);
  const blobCount = 6;
  for (let i = 0; i < blobCount; i++) {
    const cx = rng() * size;
    const cy = rng() * size;
    const r = size * (0.35 + rng() * 0.4);
    const hue = Math.floor(rng() * 360);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `hsla(${hue}, 65%, 58%, 0.5)`);
    grad.addColorStop(1, `hsla(${hue}, 65%, 58%, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  const step = size / 24;
  const dot = Math.max(1, size * 0.004);
  ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
  for (let y = step / 2; y < size; y += step) {
    for (let x = step / 2; x < size; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, dot, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Draws the full artwork (background + optional pattern + letter) at any size. */
export function paintArtwork(ctx: CanvasRenderingContext2D, size: number, a: Artwork): void {
  const k = size / CANVAS_SIZE;
  ctx.fillStyle = a.bgColor;
  ctx.fillRect(0, 0, size, size);
  if (a.background === "pattern") {
    paintPattern(ctx, size, a.patternSeed >>> 0);
  }
  ctx.fillStyle = a.letterColor;
  ctx.font = `${a.fontSize * k}px ${fontStack(a.fontFamily)}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(a.letter, size / 2 + a.offsetX * k, size / 2 + a.offsetY * k);
}

/**
 * Computes a font size and offset so the glyph's actual ink (its "black part",
 * not the em-box) fills the canvas as much as possible, centred, leaving only
 * `margin` px around it. Measured with the same align/baseline that
 * `paintArtwork` draws with, so the result lines up exactly.
 *
 * The font must already be loaded, or metrics reflect the fallback font.
 */
export function fitGlyph(
  letter: string,
  fontFamily: string,
  margin = 16,
): { fontSize: number; offsetX: number; offsetY: number } {
  const ref = 200;
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.font = `${ref}px ${fontStack(fontFamily)}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const m = ctx.measureText(letter || " ");
  const left = m.actualBoundingBoxLeft ?? m.width / 2;
  const right = m.actualBoundingBoxRight ?? m.width / 2;
  const ascent = m.actualBoundingBoxAscent ?? ref * 0.7;
  const descent = m.actualBoundingBoxDescent ?? ref * 0.2;
  const inkW = Math.max(1, left + right);
  const inkH = Math.max(1, ascent + descent);
  const target = CANVAS_SIZE - 2 * margin;
  const scale = target / Math.max(inkW, inkH);
  return {
    fontSize: Math.round(ref * scale),
    offsetX: Math.round((-(right - left) / 2) * scale),
    offsetY: Math.round((-(descent - ascent) / 2) * scale),
  };
}

function buildPreview(a: Artwork, size = 240): string {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  paintArtwork(c.getContext("2d")!, size, a);
  return c.toDataURL("image/png");
}

function slice(a: Artwork, gridSize: number): string[] {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  paintArtwork(canvas.getContext("2d")!, CANVAS_SIZE, a);
  const tileSize = CANVAS_SIZE / gridSize;
  const tiles: string[] = [];
  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const tile = document.createElement("canvas");
      tile.width = tileSize;
      tile.height = tileSize;
      tile
        .getContext("2d")!
        .drawImage(canvas, col * tileSize, row * tileSize, tileSize, tileSize, 0, 0, tileSize, tileSize);
      tiles.push(tile.toDataURL("image/png"));
    }
  }
  return tiles;
}

function allDistinct(tiles: string[]): boolean {
  return new Set(tiles).size === tiles.length;
}

/**
 * Slices the artwork into tiles and a preview. For pattern backgrounds it
 * verifies every tile is distinct, re-rolling the seed if a collision is found
 * (effectively never needed, but makes the guarantee hard). Returns the seed
 * actually used so callers can persist a reproducible result.
 */
export function sliceUnique(
  a: Artwork,
  gridSize: number,
): { tiles: string[]; preview: string; seed: number } {
  let seed = a.patternSeed >>> 0;
  let tiles = slice({ ...a, patternSeed: seed }, gridSize);
  if (a.background === "pattern") {
    for (let i = 0; i < 8 && !allDistinct(tiles); i++) {
      seed = (seed + 0x9e3779b9) >>> 0;
      tiles = slice({ ...a, patternSeed: seed }, gridSize);
    }
  }
  return { tiles, preview: buildPreview({ ...a, patternSeed: seed }), seed };
}
