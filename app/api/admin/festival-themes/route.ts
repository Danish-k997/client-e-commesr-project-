import { type NextRequest } from "next/server";
import { requireAdmin } from "../../../lib/authorization";
import { connectDB } from "../../../lib/db";
import FestivalTheme, {
  FESTIVAL_PRESETS,
  THEME_INTENSITIES,
  THEME_STATUSES,
  type FestivalPreset,
  type ThemeIntensity,
  type ThemeStatus,
} from "../../../models/FestivalTheme";
import { FESTIVAL_PRESETS_METADATA } from "../../../lib/festivals/presets";
import {
  parseIstToUtc,
  formatUtcToIstDatetimeLocal,
  formatIstHuman,
} from "../../../lib/festivals/timezone";
import {
  getActiveFestivalTheme,
  DEFAULT_THEME_PAYLOAD,
} from "../../../lib/festivals/resolver";
import {
  ApiError,
  handleApiError,
  ok,
  parseJsonBody,
  serializeDocument,
} from "../../_utils/responses";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    await connectDB();

    const storedThemes = await FestivalTheme.find().lean();
    const storedMap = new Map(storedThemes.map((doc) => [doc.preset, doc]));

    const presetsData = FESTIVAL_PRESETS.map((preset) => {
      const meta = FESTIVAL_PRESETS_METADATA[preset] || FESTIVAL_PRESETS_METADATA.DEFAULT;
      const stored = storedMap.get(preset);

      if (stored) {
        return {
          _id: stored._id.toString(),
          preset: stored.preset,
          title: stored.title,
          status: stored.status,
          isEnabled: stored.isEnabled,
          startDate: stored.startDate.toISOString(),
          endDate: stored.endDate.toISOString(),
          startDateIst: formatUtcToIstDatetimeLocal(stored.startDate),
          endDateIst: formatUtcToIstDatetimeLocal(stored.endDate),
          startDateHuman: formatIstHuman(stored.startDate),
          endDateHuman: formatIstHuman(stored.endDate),
          timezone: stored.timezone || "Asia/Kolkata",
          intensity: stored.intensity,
          customAccentColor: stored.customAccentColor || null,
          showAnnouncement: stored.showAnnouncement,
          announcementText: stored.announcementText || "",
          enableDecorations: stored.enableDecorations,
          enableAnimations: stored.enableAnimations,
          metadata: meta,
          updatedAt: stored.updatedAt?.toISOString(),
          updatedBy: stored.updatedBy || null,
        };
      }

      // Default representation when unconfigured
      const now = new Date();
      const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      return {
        _id: null,
        preset,
        title: meta.title,
        status: "DRAFT" as ThemeStatus,
        isEnabled: false,
        startDate: now.toISOString(),
        endDate: inOneWeek.toISOString(),
        startDateIst: formatUtcToIstDatetimeLocal(now),
        endDateIst: formatUtcToIstDatetimeLocal(inOneWeek),
        startDateHuman: formatIstHuman(now),
        endDateHuman: formatIstHuman(inOneWeek),
        timezone: "Asia/Kolkata",
        intensity: "balanced" as ThemeIntensity,
        customAccentColor: null,
        showAnnouncement: true,
        announcementText: meta.defaultAnnouncement,
        enableDecorations: true,
        enableAnimations: true,
        metadata: meta,
        updatedAt: null,
        updatedBy: null,
      };
    });

    const activeTheme = await getActiveFestivalTheme();

    return ok({
      presets: presetsData,
      activeTheme,
    });
  } catch (error) {
    return handleApiError(error, "Admin Festival Themes GET error:");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    await connectDB();

    const body = await parseJsonBody(request);
    const action = String(body.action || "").trim();

    // 1. Revert to default action
    if (action === "REVERT_DEFAULT") {
      await FestivalTheme.updateMany(
        { preset: { $ne: "DEFAULT" } },
        { $set: { status: "DRAFT", isEnabled: false } }
      );

      const activeTheme = await getActiveFestivalTheme();
      return ok({
        message: "Reverted to Default Brand Theme.",
        activeTheme,
      });
    }

    // 2. Preset configuration save / publish
    const preset = String(body.preset || "").trim() as FestivalPreset;
    if (!FESTIVAL_PRESETS.includes(preset)) {
      throw new ApiError(400, `Invalid preset '${preset}'. Must be one of: ${FESTIVAL_PRESETS.join(", ")}`);
    }

    if (preset === "DEFAULT") {
      // Reverting to default brand
      await FestivalTheme.updateMany(
        { preset: { $ne: "DEFAULT" } },
        { $set: { status: "DRAFT", isEnabled: false } }
      );
      const activeTheme = await getActiveFestivalTheme();
      return ok({
        message: "Default Brand Theme is active.",
        activeTheme,
      });
    }

    const meta = FESTIVAL_PRESETS_METADATA[preset];
    const title = typeof body.title === "string" && body.title.trim().length > 0
      ? body.title.trim()
      : meta.title;

    const status: ThemeStatus = body.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT";
    const isEnabled = Boolean(body.isEnabled ?? (status === "PUBLISHED"));

    // Parse dates (strictly in Asia/Kolkata)
    let startDateUtc: Date;
    let endDateUtc: Date;

    if (body.startDateIst && typeof body.startDateIst === "string") {
      startDateUtc = parseIstToUtc(body.startDateIst);
    } else if (body.startDate && typeof body.startDate === "string") {
      startDateUtc = new Date(body.startDate);
    } else {
      throw new ApiError(400, "Start date is required.");
    }

    if (body.endDateIst && typeof body.endDateIst === "string") {
      endDateUtc = parseIstToUtc(body.endDateIst);
    } else if (body.endDate && typeof body.endDate === "string") {
      endDateUtc = new Date(body.endDate);
    } else {
      throw new ApiError(400, "End date is required.");
    }

    if (isNaN(startDateUtc.getTime()) || isNaN(endDateUtc.getTime())) {
      throw new ApiError(400, "Invalid start or end date.");
    }

    if (endDateUtc.getTime() <= startDateUtc.getTime()) {
      throw new ApiError(400, "End date must be after start date.");
    }

    // Validate intensity
    const intensity: ThemeIntensity = THEME_INTENSITIES.includes(body.intensity as ThemeIntensity)
      ? (body.intensity as ThemeIntensity)
      : "balanced";

    // Validate custom accent color if provided
    let customAccentColor: string | null = null;
    if (typeof body.customAccentColor === "string" && body.customAccentColor.trim().length > 0) {
      const trimmedColor = body.customAccentColor.trim();
      if (!/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(trimmedColor)) {
        throw new ApiError(400, "Accent color must be a valid hex color code (e.g. #D97706).");
      }
      customAccentColor = trimmedColor;
    }

    // Validate announcement text
    const showAnnouncement = Boolean(body.showAnnouncement ?? true);
    const announcementText = typeof body.announcementText === "string"
      ? body.announcementText.trim().slice(0, 120)
      : meta.defaultAnnouncement;

    const enableDecorations = Boolean(body.enableDecorations ?? true);
    const enableAnimations = Boolean(body.enableAnimations ?? true);

    const userIdentifier = session.user.email || session.user.name || "Admin";

    const updated = await FestivalTheme.findOneAndUpdate(
      { preset },
      {
        $set: {
          preset,
          title,
          status,
          isEnabled,
          startDate: startDateUtc,
          endDate: endDateUtc,
          timezone: "Asia/Kolkata",
          intensity,
          customAccentColor,
          showAnnouncement,
          announcementText,
          enableDecorations,
          enableAnimations,
          updatedBy: userIdentifier,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
      }
    );

    const activeTheme = await getActiveFestivalTheme();

    return ok({
      theme: serializeDocument(updated),
      activeTheme,
    });
  } catch (error) {
    return handleApiError(error, "Admin Festival Themes POST error:");
  }
}
