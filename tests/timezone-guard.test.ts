import { describe, expect, it } from "bun:test";
import {
  normalizeArgentinaLocalTime,
  normalizeFotmobTime,
  normalizeSourceTimestamp,
  toIraqTimeString,
} from "../src/lib/timezone-normalizer";

describe("Timezone Normalizer & Guard Tests", () => {
  it("correctly converts FotMob CEST time (UTC+2) to UTC and Iraq local time", () => {
    // 21:45 CEST on 03.08.2026 -> 19:45 UTC -> 22:45 Iraq time (Monday 3 August)
    const rawFotmob = "03.08.2026 21:45";
    const utcIso = normalizeFotmobTime(rawFotmob);
    expect(utcIso).toBe("2026-08-03T19:45:00.000Z");

    const iraqFormatted = toIraqTimeString(utcIso);
    expect(iraqFormatted).toContain("الاثنين");
    expect(iraqFormatted).toContain("3 أغسطس");
    expect(iraqFormatted).toContain("10:45");
  });

  it("correctly converts Argentina ART time (UTC-3) to UTC and Iraq local time", () => {
    // 16:45 ART on 2026-08-03 -> 19:45 UTC -> 22:45 Iraq time (Monday 3 August)
    const rawArt = "2026-08-03 16:45";
    const utcIso = normalizeArgentinaLocalTime(rawArt);
    expect(utcIso).toBe("2026-08-03T19:45:00.000Z");
  });

  it("correctly converts midnight CEST (00:00) to previous day 22:00 UTC", () => {
    // 00:00 CEST on 04.08.2026 -> 22:00 UTC on 03.08.2026 -> 01:00 AM Iraq time on 04.08.2026
    const rawFotmob = "04.08.2026 00:00";
    const utcIso = normalizeFotmobTime(rawFotmob);
    expect(utcIso).toBe("2026-08-03T22:00:00.000Z");

    const iraqFormatted = toIraqTimeString(utcIso);
    expect(iraqFormatted).toContain("الثلاثاء");
    expect(iraqFormatted).toContain("4 أغسطس");
    expect(iraqFormatted).toContain("01:00");
  });

  it("correctly converts explicit UTC string", () => {
    const rawUtc = "2026-08-03T19:45:00Z";
    const utcIso = normalizeSourceTimestamp(rawUtc, "UTC");
    expect(utcIso).toBe("2026-08-03T19:45:00.000Z");
  });
});
