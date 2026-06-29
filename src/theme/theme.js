/**
 * Shree Gallary — editorial-luxury design tokens.
 *
 * Only customer-facing pages and components import from this file.
 * Admin pages do not import from theme/* and use MUI defaults via
 * createAppMuiTheme() in muiTheme.js.
 */

const INK_RGB = { r: 17, g: 17, b: 17 };
const WINE_RGB = { r: 107, g: 31, b: 42 };

export const colors = {
  ivory: "#FAF7F2",
  paper: "#FFFFFF",
  ink: "#111111",
  ink2: "#2A2A2A",
  muted: "#6B6B6B",
  line: "#E5DFD3",
  stone: "#E8E2D6",
  wine: "#6B1F2A",
  wineSoft: "#F4E8EA",
  success: "#2F6B3F",
  danger: "#A23A3A",

  // backward-compatible aliases used across existing customer components
  primary: "#111111",
  text: "#111111",
  background: "#FAF7F2",
  buttonBackground: "#111111",
  buttonText: "#FAF7F2",
  onPrimary: "#FAF7F2",
  label: "rgba(17, 17, 17, 0.72)",
  borderSubtle: "rgba(17, 17, 17, 0.12)",
  borderStrong: "rgba(17, 17, 17, 0.4)",
  mutedSurface: "rgba(17, 17, 17, 0.04)",
  disabledOverlay: "rgba(17, 17, 17, 0.28)",
  inactiveBar: "rgba(17, 17, 17, 0.18)",
  disabledText: "rgba(17, 17, 17, 0.32)",
};

export const fonts = {
  display: 'Cormorant Garamond, "Times New Roman", serif',
  body: 'Inter, -apple-system, "Segoe UI", Roboto, sans-serif',
};

export const radii = {
  sharp: 0,
  soft: 2,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
  xxl: 64,
  xxxl: 96,
};

export const shadows = {
  none: "none",
  soft: "0 1px 2px rgba(17,17,17,0.04), 0 8px 24px rgba(17,17,17,0.04)",
  lift: "0 2px 4px rgba(17,17,17,0.06), 0 16px 40px rgba(17,17,17,0.08)",
};

export const ease = "cubic-bezier(0.2, 0.7, 0.2, 1)";

export function inkAlpha(a) {
  return `rgba(${INK_RGB.r}, ${INK_RGB.g}, ${INK_RGB.b}, ${a})`;
}

export function wineAlpha(a) {
  return `rgba(${WINE_RGB.r}, ${WINE_RGB.g}, ${WINE_RGB.b}, ${a})`;
}

export function primaryAlpha(a) {
  return inkAlpha(a);
}

export function blackAlpha(a) {
  return `rgba(0, 0, 0, ${a})`;
}

export function whiteAlpha(a) {
  return `rgba(255, 255, 255, ${a})`;
}
