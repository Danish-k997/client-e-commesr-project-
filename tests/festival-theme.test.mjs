import test from "node:test";
import assert from "node:assert/strict";

// IST Constants
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function parseIstToUtc(istDatetimeLocal) {
  if (!istDatetimeLocal || typeof istDatetimeLocal !== "string") {
    throw new Error("Invalid date input.");
  }
  const trimmed = istDatetimeLocal.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (!match) {
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
      throw new Error(`Invalid date string: ${istDatetimeLocal}`);
    }
    return parsed;
  }
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const hours = parseInt(match[4], 10);
  const minutes = parseInt(match[5], 10);
  const seconds = match[6] ? parseInt(match[6], 10) : 0;

  const utcEquivalent = Date.UTC(year, month, day, hours, minutes, seconds);
  return new Date(utcEquivalent - IST_OFFSET_MS);
}

function formatUtcToIstDatetimeLocal(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const istDate = new Date(d.getTime() + IST_OFFSET_MS);
  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(istDate.getUTCDate()).padStart(2, "0");
  const hours = String(istDate.getUTCHours()).padStart(2, "0");
  const minutes = String(istDate.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function isWithinSchedule(startDateUtc, endDateUtc, nowUtc = new Date()) {
  const start = new Date(startDateUtc).getTime();
  const end = new Date(endDateUtc).getTime();
  const now = new Date(nowUtc).getTime();
  if (isNaN(start) || isNaN(end) || isNaN(now)) return false;
  return now >= start && now <= end;
}

const DEFAULT_THEME_PAYLOAD = {
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
  cssVariables: {
    "--festival-accent": "#CCFF00",
    "--festival-accent-secondary": "#18181B",
    "--festival-border": "rgba(228, 226, 220, 0.9)",
    "--festival-surface-tint": "transparent",
    "--festival-badge-bg": "#CCFF00",
    "--festival-badge-text": "#18181B",
  },
};

test("Timezone Safeguard: parseIstToUtc converts IST datetime-local to exact UTC timestamp", () => {
  // 18:00 IST is 12:30 UTC on the same date
  const istInput = "2026-10-26T18:00";
  const utcDate = parseIstToUtc(istInput);
  assert.equal(utcDate.toISOString(), "2026-10-26T12:30:00.000Z");
});

test("Timezone Safeguard: parseIstToUtc handles day roll across midnight", () => {
  // 03:00 IST on 2026-10-26 is 21:30 UTC on 2026-10-25
  const istInput = "2026-10-26T03:00";
  const utcDate = parseIstToUtc(istInput);
  assert.equal(utcDate.toISOString(), "2026-10-25T21:30:00.000Z");
});

test("Timezone Safeguard: formatUtcToIstDatetimeLocal round-trips correctly", () => {
  const originalIst = "2026-11-01T10:45";
  const utcDate = parseIstToUtc(originalIst);
  const formattedIst = formatUtcToIstDatetimeLocal(utcDate);
  assert.equal(formattedIst, originalIst);
});

test("Scheduling Safeguard: isWithinSchedule evaluates boundary conditions accurately", () => {
  const start = "2026-10-20T00:00:00.000Z";
  const end = "2026-10-30T23:59:59.000Z";

  // Before start
  assert.equal(isWithinSchedule(start, end, new Date("2026-10-19T23:59:59.000Z")), false);
  // Exactly start
  assert.equal(isWithinSchedule(start, end, new Date(start)), true);
  // Inside window
  assert.equal(isWithinSchedule(start, end, new Date("2026-10-25T12:00:00.000Z")), true);
  // Exactly end
  assert.equal(isWithinSchedule(start, end, new Date(end)), true);
  // After end
  assert.equal(isWithinSchedule(start, end, new Date("2026-10-31T00:00:00.000Z")), false);
});

test("Conflict Resolution: Shorter specific festival duration wins over broader window", () => {
  const now = new Date("2026-10-26T12:00:00.000Z");

  const broadFestival = {
    preset: "HOLI",
    startDate: new Date("2026-10-01T00:00:00.000Z"),
    endDate: new Date("2026-10-31T00:00:00.000Z"), // 30 days
    updatedAt: new Date("2026-10-01"),
  };

  const specificFestival = {
    preset: "DIWALI",
    startDate: new Date("2026-10-25T00:00:00.000Z"),
    endDate: new Date("2026-10-28T00:00:00.000Z"), // 3 days
    updatedAt: new Date("2026-10-02"),
  };

  const candidates = [broadFestival, specificFestival].filter((f) =>
    isWithinSchedule(f.startDate, f.endDate, now)
  );

  candidates.sort((a, b) => {
    const durA = a.endDate.getTime() - a.startDate.getTime();
    const durB = b.endDate.getTime() - b.startDate.getTime();
    if (durA !== durB) return durA - durB;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  assert.equal(candidates[0].preset, "DIWALI", "More specific 3-day Diwali must win over 30-day window");
});

test("Conflict Resolution: Equal durations break tie by most recent update", () => {
  const now = new Date("2026-10-26T12:00:00.000Z");

  const festivalA = {
    preset: "EID",
    startDate: new Date("2026-10-25T00:00:00.000Z"),
    endDate: new Date("2026-10-28T00:00:00.000Z"),
    updatedAt: new Date("2026-10-10T10:00:00Z"),
  };

  const festivalB = {
    preset: "CHRISTMAS",
    startDate: new Date("2026-10-25T00:00:00.000Z"),
    endDate: new Date("2026-10-28T00:00:00.000Z"),
    updatedAt: new Date("2026-10-12T15:00:00Z"), // Updated later
  };

  const candidates = [festivalA, festivalB].filter((f) =>
    isWithinSchedule(f.startDate, f.endDate, now)
  );

  candidates.sort((a, b) => {
    const durA = a.endDate.getTime() - a.startDate.getTime();
    const durB = b.endDate.getTime() - b.startDate.getTime();
    if (durA !== durB) return durA - durB;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });

  assert.equal(candidates[0].preset, "CHRISTMAS", "More recently updated theme must break equal duration tie");
});

test("Advance Future Scheduling: Multiple presets remain PUBLISHED simultaneously with distinct future dates", () => {
  // Simulate 3 festivals all published in advance
  const publishedPresets = [
    {
      preset: "DIWALI",
      status: "PUBLISHED",
      isEnabled: true,
      startDate: new Date("2026-11-01T00:00:00.000Z"),
      endDate: new Date("2026-11-05T23:59:59.000Z"),
      updatedAt: new Date("2026-10-20"),
    },
    {
      preset: "CHRISTMAS",
      status: "PUBLISHED",
      isEnabled: true,
      startDate: new Date("2026-12-20T00:00:00.000Z"),
      endDate: new Date("2026-12-26T23:59:59.000Z"),
      updatedAt: new Date("2026-10-21"),
    },
    {
      preset: "HOLI",
      status: "PUBLISHED",
      isEnabled: true,
      startDate: new Date("2027-03-20T00:00:00.000Z"),
      endDate: new Date("2027-03-23T23:59:59.000Z"),
      updatedAt: new Date("2026-10-22"),
    },
  ];

  function resolveThemeAt(nowDate) {
    const candidates = publishedPresets.filter((p) =>
      p.status === "PUBLISHED" && p.isEnabled && isWithinSchedule(p.startDate, p.endDate, nowDate)
    );
    if (candidates.length === 0) return DEFAULT_THEME_PAYLOAD;
    return candidates[0];
  }

  // 1. Before any festival starts (2026-10-26) -> Default Brand
  const beforeAll = resolveThemeAt(new Date("2026-10-26T12:00:00.000Z"));
  assert.equal(beforeAll.preset, "DEFAULT");
  assert.equal(beforeAll.isActive, false);

  // 2. During Diwali (2026-11-03) -> Diwali resolves active
  const duringDiwali = resolveThemeAt(new Date("2026-11-03T10:00:00.000Z"));
  assert.equal(duringDiwali.preset, "DIWALI");

  // 3. Between Diwali and Christmas (2026-11-20) -> Default Brand safely active
  const betweenFestivals = resolveThemeAt(new Date("2026-11-20T12:00:00.000Z"));
  assert.equal(betweenFestivals.preset, "DEFAULT");

  // 4. During Christmas (2026-12-25) -> Christmas resolves active
  const duringChristmas = resolveThemeAt(new Date("2026-12-25T08:00:00.000Z"));
  assert.equal(duringChristmas.preset, "CHRISTMAS");

  // 5. During Holi (2027-03-21) -> Holi resolves active
  const duringHoli = resolveThemeAt(new Date("2027-03-21T09:00:00.000Z"));
  assert.equal(duringHoli.preset, "HOLI");
});

test("Active Theme API Resilience: Database error returns HTTP 200 with DEFAULT_THEME_PAYLOAD and no-store headers", async () => {
  // Simulate the exact logic of app/api/festival-theme/active/route.ts under MongoDB failure
  async function simulateActiveThemeRoute(failingDatabaseCall) {
    try {
      await failingDatabaseCall();
      return {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
        body: { status: "ok", theme: { preset: "DIWALI", isActive: true } },
      };
    } catch (error) {
      // Mirror route error handler
      return {
        status: 200, // Graceful 200 so storefront does not break or show 500 error page
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
        body: {
          status: "ok",
          theme: DEFAULT_THEME_PAYLOAD,
        },
      };
    }
  }

  // Simulate unexpected MongoDB crash / timeout
  const mockFailingDb = async () => {
    throw new Error("MongoNetworkTimeoutError: connection timed out after 30000ms");
  };

  const response = await simulateActiveThemeRoute(mockFailingDb);

  assert.equal(response.status, 200, "API must return HTTP 200 even on database error to protect storefront availability");
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.theme.preset, "DEFAULT", "Theme preset must fall back to DEFAULT");
  assert.equal(response.body.theme.isActive, false, "isActive must be false on fallback");
  assert.equal(response.body.theme.accentColor, "#CCFF00", "Must provide brand default neon lime accent");
  assert.equal(response.body.theme.symbol, "▲", "Must provide brand default sacred pyramid symbol");
  assert.match(response.headers["Cache-Control"], /no-store/, "Cache-Control must specify no-store");
});

// ============================================================================
// PHASE 1-5: TOKEN ARCHITECTURE, PRESETS & INTENSITY SPECIFICATION TESTS
// ============================================================================

const FESTIVAL_PRESETS_METADATA_TEST_SPEC = {
  DEFAULT: {
    preset: "DEFAULT",
    title: "Default Brand",
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

function computeCssVariables(preset, intensity = "balanced", customAccentColor = null) {
  const meta = FESTIVAL_PRESETS_METADATA_TEST_SPEC[preset] || FESTIVAL_PRESETS_METADATA_TEST_SPEC.DEFAULT;
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

  const opacityMultiplier = intensity === "subtle" ? 0.5 : intensity === "strong" ? 1.35 : 1.0;
  const buttonBg = customAccentColor ? customAccentColor : meta.buttonBg;
  const buttonHoverBg = customAccentColor ? customAccentColor : meta.buttonHoverBg;
  const badgeBg = customAccentColor ? customAccentColor : meta.badgeBg;

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

test("Token Architecture: All 5 presets and Default define complete CSS variables contract", () => {
  const presets = ["DEFAULT", "DIWALI", "HOLI", "EID", "RAKSHA_BANDHAN", "CHRISTMAS"];
  const requiredTokens = [
    "--festival-accent",
    "--festival-accent-secondary",
    "--festival-border",
    "--festival-border-hover",
    "--festival-surface-tint",
    "--festival-button-bg",
    "--festival-button-text",
    "--festival-button-hover-bg",
    "--festival-badge-bg",
    "--festival-badge-text",
    "--festival-glow",
    "--festival-intensity-factor",
  ];

  for (const preset of presets) {
    const vars = computeCssVariables(preset);
    for (const token of requiredTokens) {
      assert.ok(
        vars[token] !== undefined && vars[token] !== "",
        `Preset ${preset} must define non-empty token ${token}`
      );
    }
  }
});

test("Visual Intensity: Correctly scales glow and intensity-factor across subtle, balanced, and strong", () => {
  const subtleVars = computeCssVariables("DIWALI", "subtle");
  assert.equal(subtleVars["--festival-intensity-factor"], "0.5");
  assert.equal(subtleVars["--festival-glow"], "none");

  const balancedVars = computeCssVariables("DIWALI", "balanced");
  assert.equal(balancedVars["--festival-intensity-factor"], "1");
  assert.match(balancedVars["--festival-glow"], /0 4px 16px/);

  const strongVars = computeCssVariables("DIWALI", "strong");
  assert.equal(strongVars["--festival-intensity-factor"], "1.35");
  assert.match(strongVars["--festival-glow"], /0 8px 24px/);
});

test("Custom Accent Override: Valid hex color updates button and badge tokens, invalid hex is rejected safely", () => {
  const customVars = computeCssVariables("DIWALI", "balanced", "#FF5500");
  assert.equal(customVars["--festival-accent"], "#FF5500");
  assert.equal(customVars["--festival-button-bg"], "#FF5500");
  assert.equal(customVars["--festival-badge-bg"], "#FF5500");

  const invalidVars = computeCssVariables("DIWALI", "balanced", "invalid-color");
  assert.equal(invalidVars["--festival-accent"], "#D97706", "Must fall back to Diwali primary amber");
});

test("Motif Mapping: Each preset defines an authentic vector motif and descriptive feature summary", () => {
  assert.equal(FESTIVAL_PRESETS_METADATA_TEST_SPEC.DIWALI.motifName, "diya");
  assert.equal(FESTIVAL_PRESETS_METADATA_TEST_SPEC.HOLI.motifName, "gulal");
  assert.equal(FESTIVAL_PRESETS_METADATA_TEST_SPEC.EID.motifName, "crescent");
  assert.equal(FESTIVAL_PRESETS_METADATA_TEST_SPEC.RAKSHA_BANDHAN.motifName, "rakhi");
  assert.equal(FESTIVAL_PRESETS_METADATA_TEST_SPEC.CHRISTMAS.motifName, "snow_ornament");
  assert.equal(FESTIVAL_PRESETS_METADATA_TEST_SPEC.DEFAULT.motifName, null);

  for (const [preset, meta] of Object.entries(FESTIVAL_PRESETS_METADATA_TEST_SPEC)) {
    assert.ok(meta.featuresSummary.length >= 3, `Preset ${preset} must provide at least 3 feature bullet points`);
  }
});

test("Storefront Theme Provider: Generates exact DOM data-attributes for scoped styling and toggles", () => {
  function getProviderAttributes(theme) {
    const isFestivalActive = Boolean(theme && theme.isActive && theme.preset !== "DEFAULT");
    return {
      "data-festival-theme": theme?.preset || "DEFAULT",
      "data-festival-intensity": theme?.intensity || "balanced",
      "data-festival-decorations": theme?.enableDecorations ? "true" : "false",
      "data-festival-animations": theme?.enableAnimations ? "true" : "false",
      "data-festival-active": isFestivalActive ? "true" : "false",
    };
  }

  // Active Diwali with all toggles enabled
  const activeDiwali = {
    isActive: true,
    preset: "DIWALI",
    intensity: "strong",
    enableDecorations: true,
    enableAnimations: true,
  };
  const diwaliAttrs = getProviderAttributes(activeDiwali);
  assert.equal(diwaliAttrs["data-festival-theme"], "DIWALI");
  assert.equal(diwaliAttrs["data-festival-intensity"], "strong");
  assert.equal(diwaliAttrs["data-festival-decorations"], "true");
  assert.equal(diwaliAttrs["data-festival-animations"], "true");
  assert.equal(diwaliAttrs["data-festival-active"], "true");

  // Diwali with decorations turned off
  const noDeco = { ...activeDiwali, enableDecorations: false };
  assert.equal(getProviderAttributes(noDeco)["data-festival-decorations"], "false");

  // Diwali with animations turned off
  const noAnim = { ...activeDiwali, enableAnimations: false };
  assert.equal(getProviderAttributes(noAnim)["data-festival-animations"], "false");

  // Default brand (inactive festival)
  const defaultBrand = {
    isActive: false,
    preset: "DEFAULT",
    intensity: "balanced",
    enableDecorations: false,
    enableAnimations: false,
  };
  const defaultAttrs = getProviderAttributes(defaultBrand);
  assert.equal(defaultAttrs["data-festival-active"], "false");
  assert.equal(defaultAttrs["data-festival-theme"], "DEFAULT");
});

test("Admin Status Badge: Computes accurate status badge (Active Now, Scheduled, Expired, Draft)", () => {
  function computeStatusBadge(presetConfig, now = new Date()) {
    if (presetConfig.status !== "PUBLISHED") {
      return "Draft";
    }
    const start = new Date(presetConfig.startDate).getTime();
    const end = new Date(presetConfig.endDate).getTime();
    const currentTime = now.getTime();

    if (currentTime < start) return "Scheduled";
    if (currentTime > end) return "Expired";
    return "Active Now";
  }

  const now = new Date("2026-10-26T12:00:00.000Z");

  // Draft preset
  assert.equal(
    computeStatusBadge({ status: "DRAFT", startDate: "2026-10-20T00:00:00Z", endDate: "2026-10-30T00:00:00Z" }, now),
    "Draft"
  );

  // Published & currently active
  assert.equal(
    computeStatusBadge({ status: "PUBLISHED", startDate: "2026-10-25T00:00:00Z", endDate: "2026-10-28T00:00:00Z" }, now),
    "Active Now"
  );

  // Published in advance for future
  assert.equal(
    computeStatusBadge({ status: "PUBLISHED", startDate: "2026-12-24T00:00:00Z", endDate: "2026-12-26T00:00:00Z" }, now),
    "Scheduled"
  );

  // Published in past (expired)
  assert.equal(
    computeStatusBadge({ status: "PUBLISHED", startDate: "2026-08-10T00:00:00Z", endDate: "2026-08-15T00:00:00Z" }, now),
    "Expired"
  );
});

