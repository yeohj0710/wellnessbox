import type { StylePreset } from "@/lib/b2b/export/layout-types";

export const STYLE_PRESET_CANDIDATES: StylePreset[] = ["fresh", "calm", "focus"];

export type LayoutStyleColorTokens = {
  accent: string;
  accentSoft: string;
  text: string;
  muted: string;
  card: string;
  cardBorder: string;
  danger: string;
};

export const STYLE_COLORS: Record<StylePreset, LayoutStyleColorTokens> = {
  fresh: {
    accent: "1D4ED8",
    accentSoft: "EAF2FF",
    text: "0F172A",
    muted: "475569",
    card: "F8FAFC",
    cardBorder: "D8E5FF",
    danger: "B91C1C",
  },
  calm: {
    accent: "0F766E",
    accentSoft: "E6F6F4",
    text: "0F172A",
    muted: "475569",
    card: "F8FAFC",
    cardBorder: "BEE7DF",
    danger: "B91C1C",
  },
  focus: {
    accent: "9A3412",
    accentSoft: "FFF3E8",
    text: "0F172A",
    muted: "475569",
    card: "FFFBF5",
    cardBorder: "F7D7B5",
    danger: "B91C1C",
  },
};

export function pickStylePreset(variantIndex: number) {
  return STYLE_PRESET_CANDIDATES[Math.abs(variantIndex) % STYLE_PRESET_CANDIDATES.length];
}
