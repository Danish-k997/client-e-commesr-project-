import type { FestivalPreset, ThemeIntensity } from "../../models/FestivalTheme";

export interface PresetMetadata {
  preset: FestivalPreset;
  title: string;
  tagline: string;
  symbol: string;
  primaryAccent: string;
  secondaryAccent: string;
  borderAccent: string;
  surfaceTint: string;
  defaultAnnouncement: string;
  motifName: string | null;
}

export const FESTIVAL_PRESETS_METADATA: Record<FestivalPreset, PresetMetadata> = {
  DEFAULT: {
    preset: "DEFAULT",
    title: "Default Brand",
    tagline: "Clean, editorial KASAR DIMENSIONS design system",
    symbol: "▲",
    primaryAccent: "#CCFF00",
    secondaryAccent: "#18181B",
    borderAccent: "rgba(228, 226, 220, 0.9)",
    surfaceTint: "transparent",
    defaultAnnouncement: "",
    motifName: null,
  },
  DIWALI: {
    preset: "DIWALI",
    title: "Diwali (Festival of Lights)",
    tagline: "Warm gold, deep amber glows & diya decorative motifs",
    symbol: "🪔",
    primaryAccent: "#D97706",
    secondaryAccent: "#F59E0B",
    borderAccent: "rgba(217, 119, 6, 0.4)",
    surfaceTint: "rgba(254, 243, 199, 0.2)",
    defaultAnnouncement: "✦ Shubh Deepavali — 3D printed diyas, idols & festive gifts made to order",
    motifName: "diya",
  },
  HOLI: {
    preset: "HOLI",
    title: "Holi (Festival of Colours)",
    tagline: "Vibrant gulal accents & celebratory festive highlights",
    symbol: "🎨",
    primaryAccent: "#E11D48",
    secondaryAccent: "#7C3AED",
    borderAccent: "rgba(225, 29, 72, 0.35)",
    surfaceTint: "rgba(255, 228, 230, 0.2)",
    defaultAnnouncement: "✦ Happy Holi — Celebrate with vibrant custom 3D printed creations",
    motifName: "gulal",
  },
  EID: {
    preset: "EID",
    title: "Eid (Celebration & Grace)",
    tagline: "Emerald jewel tones, crescent accents & twilight details",
    symbol: "🌙",
    primaryAccent: "#059669",
    secondaryAccent: "#0D9488",
    borderAccent: "rgba(5, 150, 105, 0.35)",
    surfaceTint: "rgba(209, 250, 229, 0.2)",
    defaultAnnouncement: "✦ Eid Mubarak — Handcrafted 3D keepsakes, calligraphy & festive specials",
    motifName: "crescent",
  },
  RAKSHA_BANDHAN: {
    preset: "RAKSHA_BANDHAN",
    title: "Raksha Bandhan",
    tagline: "Ceremonial crimson & golden thread-inspired details",
    symbol: "✨",
    primaryAccent: "#DC2626",
    secondaryAccent: "#F59E0B",
    borderAccent: "rgba(220, 38, 38, 0.35)",
    surfaceTint: "rgba(254, 226, 226, 0.2)",
    defaultAnnouncement: "✦ Happy Raksha Bandhan — Personalised name rakhis & made-to-order gifts",
    motifName: "rakhi",
  },
  CHRISTMAS: {
    preset: "CHRISTMAS",
    title: "Christmas & New Year",
    tagline: "Evergreen, berry red & warm festive light details",
    symbol: "🎄",
    primaryAccent: "#15803D",
    secondaryAccent: "#B91C1C",
    borderAccent: "rgba(21, 128, 61, 0.35)",
    surfaceTint: "rgba(220, 252, 231, 0.2)",
    defaultAnnouncement: "✦ Merry Christmas — Custom 3D printed ornaments, trees & winter gifts",
    motifName: "snow_ornament",
  },
};

/**
 * Returns CSS variable map for the given preset and intensity.
 */
export function getFestivalCssVariables(
  preset: FestivalPreset,
  intensity: ThemeIntensity = "balanced",
  customAccentColor?: string | null
): Record<string, string> {
  const meta = FESTIVAL_PRESETS_METADATA[preset] || FESTIVAL_PRESETS_METADATA.DEFAULT;
  const accent = customAccentColor && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(customAccentColor)
    ? customAccentColor
    : meta.primaryAccent;

  if (preset === "DEFAULT") {
    return {
      "--festival-accent": "#CCFF00",
      "--festival-accent-secondary": "#18181B",
      "--festival-border": "rgba(228, 226, 220, 0.9)",
      "--festival-surface-tint": "transparent",
      "--festival-badge-bg": "#CCFF00",
      "--festival-badge-text": "#18181B",
    };
  }

  // Multiplier for intensities
  const opacityMultiplier = intensity === "subtle" ? 0.6 : intensity === "strong" ? 1.3 : 1.0;

  return {
    "--festival-accent": accent,
    "--festival-accent-secondary": meta.secondaryAccent,
    "--festival-border": meta.borderAccent,
    "--festival-surface-tint": meta.surfaceTint,
    "--festival-badge-bg": accent,
    "--festival-badge-text": "#FFFFFF",
    "--festival-intensity-factor": String(opacityMultiplier),
  };
}
