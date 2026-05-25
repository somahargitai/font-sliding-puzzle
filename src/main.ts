import { Nav } from "./nav";
import { renderStart } from "./start";
import { renderLibrary } from "./library";
import { renderPlanner } from "./planner";
import { renderGame } from "./game";
import { syncBuiltins } from "./storage";
import { buildBuiltinPuzzles } from "./builtins";
import { loadBundledFonts } from "./fonts";

const root = document.querySelector<HTMLDivElement>("#app")!;

type Cleanup = (() => void) | void;
type Renderer = (root: HTMLElement, nav: Nav) => Cleanup;

let currentCleanup: Cleanup = undefined;

function setView(render: Renderer): void {
  if (typeof currentCleanup === "function") currentCleanup();
  currentCleanup = render(root, nav);
}

const nav: Nav = {
  start: () => setView(renderStart),
  library: () => setView((r, n) => renderLibrary(r, n, "play")),
  editor: () => setView((r, n) => renderLibrary(r, n, "edit")),
  planner: (editId?: string | null) => setView((r, n) => renderPlanner(r, n, editId)),
  game: () => setView(renderGame),
};

window.addEventListener("DOMContentLoaded", async () => {
  // Built-ins are rendered from the bundled fonts, so load those first.
  await loadBundledFonts();
  syncBuiltins(buildBuiltinPuzzles(), "2", "font-sliding-puzzle:builtins-version");
  nav.start();
});
