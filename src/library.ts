import { Nav } from "./nav";
import { setConfig } from "./state";
import { deletePuzzle, loadSaved, SavedPuzzle } from "./storage";

type LibraryMode = "play" | "edit";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function meta(p: SavedPuzzle): string {
  const g = `${p.config.gridSize}×${p.config.gridSize}`;
  if (p.config.timerSeconds) {
    const m = Math.floor(p.config.timerSeconds / 60);
    const s = p.config.timerSeconds % 60;
    return `${g} · ⏱ ${m}:${String(s).padStart(2, "0")}`;
  }
  return g;
}

export function renderLibrary(root: HTMLElement, nav: Nav, mode: LibraryMode): void {
  const editing = mode === "edit";

  function paint(): void {
    const saved = loadSaved();

    const cards = saved
      .map((p) => {
        const verb = editing ? "Szerkesztés" : "Indítás";
        const del = editing
          ? `<button class="puzzle-delete" data-delete="${p.id}" title="Törlés" aria-label="Törlés">✕</button>`
          : "";
        const badge = editing ? `<span class="puzzle-badge">✎</span>` : "";
        return `
        <div class="puzzle-card" data-id="${p.id}" role="button" tabindex="0" title="${verb}: ${escapeHtml(p.name)}">
          <img class="puzzle-thumb" src="${p.preview}" alt="${escapeHtml(p.name)}" />
          ${badge}
          <div class="puzzle-info">
            <span class="puzzle-name">${escapeHtml(p.name)}</span>
            <span class="puzzle-meta">${meta(p)}</span>
          </div>
          ${del}
        </div>`;
      })
      .join("");

    const emptyBtn = editing
      ? `<button class="primary" id="empty-action">Új játék tervezése →</button>`
      : `<button class="primary" id="empty-action">Szerkesztő megnyitása →</button>`;

    const grid = saved.length
      ? `<div class="puzzle-grid">${cards}</div>`
      : `<div class="library-empty">
           <p>Még nincs mentett játék.</p>
           ${emptyBtn}
         </div>`;

    const title = editing ? "Szerkesztő" : "Játékkönyvtár";
    const sub = editing
      ? "Kattints egy játékra a szerkesztéshez, vagy adj hozzá újat."
      : "Válassz egy elkészített játékot és indítsd el.";
    const newBtn = editing ? `<button class="primary" id="library-new">+ Új játék</button>` : "";

    root.innerHTML = `
      <div class="library">
        <header class="library-header">
          <button class="ghost" id="library-back">← Főképernyő</button>
          <div>
            <h1>${title}</h1>
            <p class="muted">${sub}</p>
          </div>
          ${newBtn}
        </header>
        <main class="library-body">
          ${grid}
        </main>
      </div>
    `;

    root.querySelector<HTMLButtonElement>("#library-back")!.addEventListener("click", () => nav.start());
    root.querySelector<HTMLButtonElement>("#library-new")?.addEventListener("click", () => nav.planner());
    root.querySelector<HTMLButtonElement>("#empty-action")?.addEventListener("click", () => {
      if (editing) nav.planner();
      else nav.editor();
    });

    function activate(id: string): void {
      const puzzle = saved.find((p) => p.id === id);
      if (!puzzle) return;
      if (editing) {
        nav.planner(id);
      } else {
        setConfig(puzzle.config);
        nav.game();
      }
    }

    root.querySelectorAll<HTMLElement>(".puzzle-card").forEach((card) => {
      const id = card.dataset.id!;
      card.addEventListener("click", (e) => {
        if ((e.target as HTMLElement).closest(".puzzle-delete")) return;
        activate(id);
      });
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate(id);
        }
      });
    });

    root.querySelectorAll<HTMLButtonElement>(".puzzle-delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        deletePuzzle(btn.dataset.delete!);
        paint();
      });
    });
  }

  paint();
}
