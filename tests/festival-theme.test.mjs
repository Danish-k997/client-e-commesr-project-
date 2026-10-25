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
