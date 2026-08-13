export const palette = {
  background: "#f4f1ea",
  surface: "#fffdf8",
  foreground: "#1f2528",
  muted: "#6c7275",
  border: "rgb(31 37 40 / 18%)",
  positive: "#3f7d58",
  negative: "#a6423a",
  warning: "#b27c2a",
  info: "#356e8d"
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64
} as const;

export type PaletteToken = keyof typeof palette;
export type SpacingToken = keyof typeof spacing;

