/** RGB for primary — used only to build rgba() variants */
const PRIMARY_RGB = { r: 171, g: 138, b: 72 };

/**
 * Color tokens only. Spacing, layout, and component styles belong in page files.
 */
export const colors = {
  primary: "#ab8a48",
  text: "#000000",
  background: "#ffffff",
  buttonBackground: "#ab8a48",
  buttonText: "#ffffff",
  borderSubtle: "rgba(0, 0, 0, 0.4)",
  borderStrong: "rgba(0, 0, 0, 0.7)",
  label: "rgba(0, 0, 0, 0.75)",
  mutedSurface: "rgba(0, 0, 0, 0.06)",
  disabledOverlay: "rgba(0, 0, 0, 0.28)",
  inactiveBar: "rgba(0, 0, 0, 0.2)",
  disabledText: "rgba(0, 0, 0, 0.35)",
  onPrimary: "#ffffff",
};

export function primaryAlpha(a) {
  return `rgba(${PRIMARY_RGB.r}, ${PRIMARY_RGB.g}, ${PRIMARY_RGB.b}, ${a})`;
}

export function blackAlpha(a) {
  return `rgba(0, 0, 0, ${a})`;
}

export function whiteAlpha(a) {
  return `rgba(255, 255, 255, ${a})`;
}
