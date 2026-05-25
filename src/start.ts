import { Nav } from "./nav";
import { loadSaved } from "./storage";

const LOGO_SVG = `
  <svg class="start-logo" viewBox="0 0 128 128" role="img" aria-label="Font Sliding Puzzle logó" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#6c8cff" />
        <stop offset="1" stop-color="#c86bd6" />
      </linearGradient>
    </defs>
    <rect x="6" y="6" width="116" height="116" rx="26" fill="#252530" stroke="#3a3a48" stroke-width="2" />
    <g font-family="Georgia, serif" font-size="34" font-weight="600" fill="#ffffff" text-anchor="middle">
      <rect x="20" y="20" width="40" height="40" rx="9" fill="url(#logo-grad)" />
      <text x="40" y="41" dominant-baseline="central">A</text>
      <rect x="68" y="20" width="40" height="40" rx="9" fill="url(#logo-grad)" opacity="0.88" />
      <text x="88" y="41" dominant-baseline="central">g</text>
      <rect x="20" y="68" width="40" height="40" rx="9" fill="url(#logo-grad)" opacity="0.72" />
      <text x="40" y="89" dominant-baseline="central">Q</text>
      <rect x="68" y="68" width="40" height="40" rx="9" fill="#1a1a1f" stroke="#3a3a48" stroke-width="2" stroke-dasharray="5 4" />
    </g>
  </svg>
`;

export function renderStart(root: HTMLElement, nav: Nav): void {
  const saved = loadSaved();

  root.innerHTML = `
    <div class="start">
      <button class="gear" id="gear" title="Tervező" aria-label="Tervező megnyitása">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>

      <div class="start-content">
        <div class="start-preview" aria-hidden="true">
          ${LOGO_SVG}
        </div>
        <h1 class="start-title">Font Sliding Puzzle</h1>
        <p class="start-sub">Csúsztasd a helyére a betűt.</p>
        <button class="primary big" id="start-btn">Start ▶</button>
        <p class="start-hint">
          ${saved.length ? `${saved.length} mentett játék a könyvtárban` : "Még nincs mentett játék – tervezz egyet a fogaskerékkel."}
        </p>
      </div>
    </div>
  `;

  root.querySelector<HTMLButtonElement>("#start-btn")!.addEventListener("click", () => {
    nav.library();
  });

  root.querySelector<HTMLButtonElement>("#gear")!.addEventListener("click", () => {
    nav.editor();
  });
}
