import { connectDB } from "../db";
import FestivalTheme, { type IFestivalTheme, type FestivalPreset, type ThemeIntensity } from "../../models/FestivalTheme";
import { FESTIVAL_PRESETS_METADATA, getFestivalCssVariables } from "./presets";
import { isWithinSchedule } from "./timezone";

export interface ActiveFestivalThemePayload {
  isActive: boolean;
  preset: FestivalPreset;
  title: string;
  intensity: ThemeIntensity;
  accentColor: string;
  showAnnouncement: boolean;
  announcementText: string;
  enableDecorations: boolean;
  enableAnimations: boolean;
  symbol: string;
  motifName?: string | null;
  cssVariables: Record<string, string>;
  startDateIso?: string;
  endDateIso?: string;
}

export const DEFAULT_THEME_PAYLOAD: ActiveFestivalThemePayload = {
  isActive: false,
  preset: "DEFAULT",
  title: "Default Brand",
  intensity: "balanced",
  accentColor: "#CCFF00",
  showAnnouncement: false,
  announcementText: "",
  enableDecorations: false,
  enableAnimations: false,
  symbol: "▲",
  motifName: null,
  cssVariables: getFestivalCssVariables("DEFAULT"),
};

/**
 * Resolves the currently active festival theme using deterministic scheduling.
 * Fails safely to DEFAULT_THEME_PAYLOAD on any missing/expired config or DB failure.
 */
export async function getActiveFestivalTheme(nowUtc: Date = new Date()): Promise<ActiveFestivalThemePayload> {
  try {
    await connectDB();

    // Query for published and enabled festival themes
    const candidateThemes = await FestivalTheme.find({
      status: "PUBLISHED",
      isEnabled: true,
      preset: { $ne: "DEFAULT" },
    }).lean();

    if (!candidateThemes || candidateThemes.length === 0) {
      return DEFAULT_THEME_PAYLOAD;
    }

    // Filter to only those currently active within their UTC schedule
    const activeCandidates = candidateThemes.filter((theme) =>
      isWithinSchedule(theme.startDate, theme.endDate, nowUtc)
    );

    if (activeCandidates.length === 0) {
      return DEFAULT_THEME_PAYLOAD;
    }

    // Overlapping resolution:
    // 1. Prefer smaller schedule duration (more specific festival period)
    // 2. Break ties by most recently updated
    activeCandidates.sort((a, b) => {
      const durationA = new Date(a.endDate).getTime() - new Date(a.startDate).getTime();
      const durationB = new Date(b.endDate).getTime() - new Date(b.startDate).getTime();
      if (durationA !== durationB) {
        return durationA - durationB;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    const chosen = activeCandidates[0];
    const meta = FESTIVAL_PRESETS_METADATA[chosen.preset] || FESTIVAL_PRESETS_METADATA.DEFAULT;
    const accent = chosen.customAccentColor || meta.primaryAccent;

    return {
      isActive: true,
      preset: chosen.preset,
      title: chosen.title || meta.title,
      intensity: chosen.intensity || "balanced",
      accentColor: accent,
      showAnnouncement: Boolean(chosen.showAnnouncement),
      announcementText: chosen.announcementText?.trim() || meta.defaultAnnouncement,
      enableDecorations: Boolean(chosen.enableDecorations),
      enableAnimations: Boolean(chosen.enableAnimations),
      symbol: meta.symbol,
      motifName: meta.motifName,
      cssVariables: getFestivalCssVariables(chosen.preset, chosen.intensity, chosen.customAccentColor),
      startDateIso: new Date(chosen.startDate).toISOString(),
      endDateIso: new Date(chosen.endDate).toISOString(),
    };
  } catch (error) {
    console.error("Festival Theme Resolver error, safely falling back to Default:", error);
    return DEFAULT_THEME_PAYLOAD;
  }
}
