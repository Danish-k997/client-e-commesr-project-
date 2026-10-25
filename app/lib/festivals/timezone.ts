/**
 * Timezone utilities for Festival Theme scheduling.
 * All user inputs are interpreted as Asia/Kolkata (Indian Standard Time: UTC+05:30).
 * All persistence is in standard UTC Dates.
 */

export const IST_TIMEZONE = "Asia/Kolkata";
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds

/**
 * Converts a `datetime-local` input string (e.g. "2026-10-26T18:00")
 * entered by a user assuming Asia/Kolkata time into a precise UTC Date.
 */
export function parseIstToUtc(istDatetimeLocal: string): Date {
  if (!istDatetimeLocal || typeof istDatetimeLocal !== "string") {
    throw new Error("Invalid date input.");
  }

  const trimmed = istDatetimeLocal.trim();
  // Format: YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (!match) {
    // If it's already an ISO string with timezone, parse directly
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
      throw new Error(`Invalid date string: ${istDatetimeLocal}`);
    }
    return parsed;
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // 0-indexed
  const day = parseInt(match[3], 10);
  const hours = parseInt(match[4], 10);
  const minutes = parseInt(match[5], 10);
  const seconds = match[6] ? parseInt(match[6], 10) : 0;

  // Create UTC date assuming those components were in UTC, then subtract 5.5 hours to get true UTC
  const utcEquivalent = Date.UTC(year, month, day, hours, minutes, seconds);
  const trueUtcMs = utcEquivalent - IST_OFFSET_MS;

  return new Date(trueUtcMs);
}

/**
 * Converts a UTC Date into an Asia/Kolkata `datetime-local` string (YYYY-MM-DDTHH:mm).
 */
export function formatUtcToIstDatetimeLocal(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return "";
  }

  // Shift UTC time by +05:30 to extract IST components via UTC getters
  const istDate = new Date(d.getTime() + IST_OFFSET_MS);

  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(istDate.getUTCDate()).padStart(2, "0");
  const hours = String(istDate.getUTCHours()).padStart(2, "0");
  const minutes = String(istDate.getUTCMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Formats a Date in a human-readable Indian Standard Time format.
 * e.g. "26 Oct 2026, 06:00 PM IST"
 */
export function formatIstHuman(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: IST_TIMEZONE,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d) + " IST";
  } catch {
    return d.toISOString();
  }
}

/**
 * Checks if a given timestamp falls within the schedule window.
 */
export function isWithinSchedule(
  startDateUtc: Date | string,
  endDateUtc: Date | string,
  nowUtc: Date = new Date()
): boolean {
  const start = new Date(startDateUtc).getTime();
  const end = new Date(endDateUtc).getTime();
  const now = nowUtc.getTime();

  if (isNaN(start) || isNaN(end) || isNaN(now)) {
    return false;
  }

  return now >= start && now <= end;
}
