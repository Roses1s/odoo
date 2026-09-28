// Stage colours are deliberately the same in both themes: the reference Odoo
// dark mode does not repaint them either.
export const STAGE_COLORS: Record<string, string> = {
  slate: "#6C757D",
  purple: "#714B67",
  blue: "#17A2B8",
  green: "#28A745",
  red: "#DC3545",
  orange: "#FD7E14",
  yellow: "#FFC107",
};

export function stageColor(c: string) {
  return STAGE_COLORS[c] || STAGE_COLORS.purple;
}
