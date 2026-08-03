/**
 * Timezone Normalizer Module for Taqdeer
 * 
 * Ensures all raw dates from any external provider (FotMob CEST, Argentina ART, UTC)
 * are cleanly and deterministically converted into standard UTC ISO-8601 strings
 * before saving to SQLite database, eliminating timezone misalignment errors forever.
 */

export type SourceTimezone = "UTC" | "CEST" | "ART";

/**
 * Normalizes a raw date string from a specific source timezone into a UTC ISO string.
 *
 * Examples:
 * - FotMob (CEST = UTC+2): "03.08.2026 21:45", "CEST" -> "2026-08-03T19:45:00.000Z"
 * - Argentina Local (ART = UTC-3): "2026-08-03 16:45", "ART" -> "2026-08-03T19:45:00.000Z"
 * - UTC: "2026-08-03T19:45:00Z", "UTC" -> "2026-08-03T19:45:00.000Z"
 */
export function normalizeSourceTimestamp(rawDate: string, sourceTz: SourceTimezone): string {
  if (!rawDate) {
    throw new Error("Cannot normalize empty date string");
  }

  const clean = rawDate.trim();

  // 1. FotMob / RapidAPI format: "DD.MM.YYYY HH:mm"
  if (clean.includes(".")) {
    const [dPart, tPart] = clean.split(" ");
    if (dPart && tPart) {
      const [day, month, year] = dPart.split(".").map(Number);
      const [hour, min] = tPart.split(":").map(Number);

      if (!day || !month || !year || hour === undefined || min === undefined) {
        throw new Error(`Invalid FotMob date format: "${rawDate}"`);
      }

      // Offset for CEST is +2 hours (subtract 2 to get UTC)
      // If source is UTC, subtract 0
      const offset = sourceTz === "CEST" ? 2 : sourceTz === "ART" ? -3 : 0;
      const utcHour = hour - offset;

      const dateObj = new Date(Date.UTC(year, month - 1, day, utcHour, min));
      return dateObj.toISOString();
    }
  }

  // 2. Standard ISO or Space separated format: "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DDTHH:mm:ssZ"
  if (clean.includes("-")) {
    // If it already ends with 'Z' and sourceTz is UTC, trust it directly
    if (clean.endsWith("Z") && sourceTz === "UTC") {
      const parsed = new Date(clean);
      if (!isNaN(parsed.getTime())) return parsed.toISOString();
    }

    // Parse YYYY-MM-DD [T] HH:mm[:ss]
    const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (match) {
      const [, y, m, d, h, min, s] = match;
      const year = Number(y);
      const month = Number(m);
      const day = Number(d);
      const hour = Number(h);
      const minute = Number(min);
      const second = Number(s || 0);

      const offset = sourceTz === "CEST" ? 2 : sourceTz === "ART" ? -3 : 0;
      const utcHour = hour - offset;

      const dateObj = new Date(Date.UTC(year, month - 1, day, utcHour, minute, second));
      return dateObj.toISOString();
    }
  }

  // Fallback fallback: try standard JS Date parsing
  const fallbackDate = new Date(clean);
  if (isNaN(fallbackDate.getTime())) {
    throw new Error(`Unparseable date string: "${rawDate}" for timezone ${sourceTz}`);
  }

  return fallbackDate.toISOString();
}

/**
 * Dedicated helper for FotMob / RapidAPI feed (which uses CEST / UTC+2)
 */
export function normalizeFotmobTime(fotmobTimeStr: string): string {
  return normalizeSourceTimestamp(fotmobTimeStr, "CEST");
}

/**
 * Dedicated helper for Argentine Local Liga Profesional schedule (ART / UTC-3)
 */
export function normalizeArgentinaLocalTime(artTimeStr: string): string {
  return normalizeSourceTimestamp(artTimeStr, "ART");
}

/**
 * Converts a UTC ISO string to formatted Iraq Local Time (Asia/Baghdad GMT+3) for diagnostics
 */
export function toIraqTimeString(utcIsoStr: string): string {
  const date = new Date(utcIsoStr);
  return new Intl.DateTimeFormat("ar", {
    timeZone: "Asia/Baghdad",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
