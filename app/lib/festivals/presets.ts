import type { FestivalPreset, ThemeIntensity } from "../../models/FestivalTheme";

export interface PresetMetadata {
  preset: FestivalPreset;
  title: string;
  tagline: string;
  symbol: string;
  primaryAccent: string;
  secondaryAccent: string;
  borderAccent: string;
  borderHoverAccent: string;
  surfaceTint: string;
  buttonBg: string;
  buttonText: string;
  buttonHoverBg: string;
  badgeBg: string;
  badgeText: string;
  glowAccent: string;
  defaultAnnouncement: string;
  motifName: string | null;
  featuresSummary: string[];
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
    borderHoverAccent: "rgba(24, 24, 27, 0.22)",
    surfaceTint: "transparent",
    buttonBg: "#CCFF00",
    buttonText: "#111827",
    buttonHoverBg: "#b8e600",
    badgeBg: "#CCFF00",
    badgeText: "#111827",
    glowAccent: "rgba(204, 255, 0, 0.3)",
    defaultAnnouncement: "",
    motifName: null,
    featuresSummary: [
      "Original warm ivory & deep charcoal surfaces",
      "Signature electric lime buttons and badges",
      "Minimal sacred pyramid emblem",
      "Pan-India delivery contact announcement bar",
    ],
  },
  DIWALI: {
    preset: "DIWALI",
    title: "Diwali (Festival of Lights)",
    tagline: "Warm gold, deep amber glows & diya decorative motifs",
    symbol: "🪔",
    primaryAccent: "#D97706",
    secondaryAccent: "#F59E0B",
    borderAccent: "rgba(217, 119, 6, 0.35)",
    borderHoverAccent: "rgba(217, 119, 6, 0.65)",
    surfaceTint: "rgba(254, 243, 199, 0.22)",
    buttonBg: "#D97706",
    buttonText: "#FFFFFF",
    buttonHoverBg: "#B45309",
    badgeBg: "#D97706",
    badgeText: "#FFFFFF",
    glowAccent: "rgba(217, 119, 6, 0.3)",
    defaultAnnouncement: "✦ Shubh Deepavali — 3D printed diyas, idols & festive gifts made to order",
    motifName: "diya",
    featuresSummary: [
      "Amber gold CTA buttons with warm golden hover glows",
      "Real Diya lamp vector motifs on badges and headings",
      "Subtle warm ivory surface tint on cards and product details",
      "Golden border accents and Diya announcement bar greeting",
    ],
  },
  HOLI: {
    preset: "HOLI",
    title: "Holi (Festival of Colours)",
    tagline: "Vibrant gulal accents & celebratory festive highlights",
    symbol: "🎨",
    primaryAccent: "#E11D48",
    secondaryAccent: "#7C3AED",
    borderAccent: "rgba(225, 29, 72, 0.32)",
    borderHoverAccent: "rgba(225, 29, 72, 0.6)",
    surfaceTint: "rgba(255, 228, 230, 0.22)",
    buttonBg: "#E11D48",
    buttonText: "#FFFFFF",
    buttonHoverBg: "#BE123C",
    badgeBg: "#E11D48",
    badgeText: "#FFFFFF",
    glowAccent: "rgba(225, 29, 72, 0.25)",
    defaultAnnouncement: "✦ Happy Holi — Celebrate with vibrant custom 3D printed creations",
    motifName: "gulal",
    featuresSummary: [
      "Gulal rose-crimson CTA buttons with celebratory hover states",
      "Artistic color-splash vector ornaments on badges and headings",
      "Soft petal surface tint on product cards and details",
      "Vibrant festive borders and Holi greeting announcement bar",
    ],
  },
  EID: {
    preset: "EID",
    title: "Eid (Celebration & Grace)",
    tagline: "Emerald jewel tones, crescent accents & twilight details",
    symbol: "🌙",
    primaryAccent: "#059669",
    secondaryAccent: "#0D9488",
    borderAccent: "rgba(5, 150, 105, 0.32)",
    borderHoverAccent: "rgba(5, 150, 105, 0.6)",
    surfaceTint: "rgba(209, 250, 229, 0.22)",
    buttonBg: "#059669",
    buttonText: "#FFFFFF",
    buttonHoverBg: "#047857",
    badgeBg: "#059669",
    badgeText: "#FFFFFF",
    glowAccent: "rgba(5, 150, 105, 0.25)",
    defaultAnnouncement: "✦ Eid Mubarak — Handcrafted 3D keepsakes, calligraphy & festive specials",
    motifName: "crescent",
    featuresSummary: [
      "Jewel emerald CTA buttons with elegant hover depth",
      "Crescent moon & star vector motifs on badges and headings",
      "Gentle twilight emerald surface tint on product containers",
      "Refined emerald border highlights and Eid Mubarak greeting",
    ],
  },
  RAKSHA_BANDHAN: {
    preset: "RAKSHA_BANDHAN",
    title: "Raksha Bandhan",
    tagline: "Ceremonial crimson & golden thread-inspired details",
    symbol: "✨",
    primaryAccent: "#DC2626",
    secondaryAccent: "#F59E0B",
    borderAccent: "rgba(220, 38, 38, 0.32)",
    borderHoverAccent: "rgba(220, 38, 38, 0.6)",
    surfaceTint: "rgba(254, 226, 226, 0.22)",
    buttonBg: "#DC2626",
    buttonText: "#FFFFFF",
    buttonHoverBg: "#B91C1C",
    badgeBg: "#DC2626",
    badgeText: "#FFFFFF",
    glowAccent: "rgba(220, 38, 38, 0.25)",
    defaultAnnouncement: "✦ Happy Raksha Bandhan — Personalised name rakhis & made-to-order gifts",
    motifName: "rakhi",
    featuresSummary: [
      "Ceremonial crimson CTA buttons with golden-amber accents",
      "Intricate circular Rakhi medallion vector motifs on cards",
      "Warm saffron-tinted surfaces on product information panels",
      "Golden-thread border details and Raksha Bandhan greeting",
    ],
  },
  CHRISTMAS: {
    preset: "CHRISTMAS",
    title: "Christmas & New Year",
    tagline: "Evergreen, berry red & warm festive light details",
    symbol: "🎄",
    primaryAccent: "#15803D",
    secondaryAccent: "#B91C1C",
    borderAccent: "rgba(21, 128, 61, 0.32)",
    borderHoverAccent: "rgba(21, 128, 61, 0.6)",
    surfaceTint: "rgba(220, 252, 231, 0.22)",
    buttonBg: "#15803D",
    buttonText: "#FFFFFF",
    buttonHoverBg: "#166534",
    badgeBg: "#15803D",
    badgeText: "#FFFFFF",
    glowAccent: "rgba(21, 128, 61, 0.25)",
    defaultAnnouncement: "✦ Merry Christmas — Custom 3D printed ornaments, trees & winter gifts",
    motifName: "snow_ornament",
    featuresSummary: [
      "Evergreen pine CTA buttons with berry red secondary accents",
      "Crystalline snowflake and pine vector motifs on cards",
      "Crisp winter frost surface tint on product sections",
      "Evergreen border highlights and Merry Christmas greeting",
    ],
  },
};

/**
 * Returns comprehensive CSS variable map for the given preset and intensity.
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
      "--festival-border-hover": "rgba(24, 24, 27, 0.22)",
      "--festival-surface-tint": "transparent",
      "--festival-button-bg": "#CCFF00",
      "--festival-button-text": "#111827",
      "--festival-button-hover-bg": "#b8e600",
      "--festival-badge-bg": "#CCFF00",
      "--festival-badge-text": "#111827",
      "--festival-glow": "none",
      "--festival-intensity-factor": "1.0",
    };
  }

  // Intensity multipliers
  const opacityMultiplier = intensity === "subtle" ? 0.5 : intensity === "strong" ? 1.35 : 1.0;

  // Compute dynamic button colors when user sets a custom accent color
  const buttonBg = customAccentColor ? customAccentColor : meta.buttonBg;
  const buttonHoverBg = customAccentColor ? customAccentColor : meta.buttonHoverBg;
  const badgeBg = customAccentColor ? customAccentColor : meta.badgeBg;

  // Scale borders and glows by intensity
  const glow = intensity === "subtle"
    ? "none"
    : intensity === "strong"
    ? `0 8px 24px ${meta.glowAccent}`
    : `0 4px 16px ${meta.glowAccent}`;

  return {
    "--festival-accent": accent,
    "--festival-accent-secondary": meta.secondaryAccent,
    "--festival-border": meta.borderAccent,
    "--festival-border-hover": meta.borderHoverAccent,
    "--festival-surface-tint": meta.surfaceTint,
    "--festival-button-bg": buttonBg,
    "--festival-button-text": meta.buttonText,
    "--festival-button-hover-bg": buttonHoverBg,
    "--festival-badge-bg": badgeBg,
    "--festival-badge-text": meta.badgeText,
    "--festival-glow": glow,
    "--festival-intensity-factor": String(opacityMultiplier),
  };
}
