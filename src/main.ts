import { Nav } from "./nav";
import { renderStart } from "./start";
import { renderPlanner } from "./planner";
import { renderGame } from "./game";

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
  planner: () => setView(renderPlanner),
  game: () => setView(renderGame),
};

window.addEventListener("DOMContentLoaded", () => nav.start());
