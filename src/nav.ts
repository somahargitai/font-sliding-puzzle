export type Nav = {
  start: () => void;
  library: () => void;
  editor: () => void;
  planner: (editId?: string | null) => void;
  game: () => void;
};
