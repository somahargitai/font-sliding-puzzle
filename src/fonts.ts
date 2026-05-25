export type FontOption = { value: string; label: string };

/** Bundled free fonts (declared via @font-face in styles.css). */
export const BUNDLED_FONTS: FontOption[] = [
  { value: "Roboto Slab", label: "Roboto Slab" },
  { value: "Bebas Neue", label: "Bebas Neue" },
  { value: "Fira Sans", label: "Fira Sans (dőlt)" },
  { value: "Gabriela", label: "Gabriela" },
];

/** Generic / commonly-installed families, no file needed. */
export const SYSTEM_FONTS: FontOption[] = [
  { value: "serif", label: "Serif" },
  { value: "sans-serif", label: "Sans-serif" },
  { value: "monospace", label: "Monospace" },
  { value: "Georgia", label: "Georgia" },
  { value: "'Times New Roman'", label: "Times New Roman" },
  { value: "'Courier New'", label: "Courier New" },
  { value: "cursive", label: "Kézírás" },
];

export const FONT_OPTIONS: FontOption[] = [...BUNDLED_FONTS, ...SYSTEM_FONTS];

/** Forces the bundled @font-face files to load so <canvas> can render them. */
export async function loadBundledFonts(): Promise<void> {
  const set: any = (document as any).fonts;
  if (!set || typeof set.load !== "function") return;
  await Promise.all(
    BUNDLED_FONTS.map((f) => set.load(`16px "${f.value}"`).catch(() => undefined)),
  );
}
