/** فحوص سريعة للمنطق غير البديهي — `bun run check` */
import assert from "node:assert";
import { parseUkDate } from "./sync-data";
import { historicalSeasons, latestSeasonStartYear } from "../src/lib/leagues";
import {
  calendarDayOffset,
  crestInitials,
  dayKey,
  formatMatchTime,
} from "../src/lib/format";

// أعمدة football-data.co.uk بتوقيت المملكة المتحدة لا UTC
assert.equal(parseUkDate("15/08/2025", "20:00"), "2025-08-15T19:00:00.000Z"); // BST
assert.equal(parseUkDate("26/12/2025", "15:00"), "2025-12-26T15:00:00.000Z"); // GMT
assert.equal(parseUkDate("26/12/2025"), "2025-12-26T15:00:00.000Z"); // بلا عمود Time
assert.equal(parseUkDate("01/02/24", "12:30"), "2024-02-01T12:30:00.000Z"); // سنة بخانتين
assert.equal(parseUkDate("bad"), null);

// حدود الموسم: يوليو ما زال الموسم السابق، أغسطس يفتح موسماً جديداً
assert.equal(latestSeasonStartYear(new Date("2026-07-26T00:00:00Z")), 2025);
assert.equal(latestSeasonStartYear(new Date("2026-08-01T00:00:00Z")), 2026);
assert.deepEqual(historicalSeasons(new Date("2026-07-26T00:00:00Z")), [
  2021, 2022, 2023, 2024, 2025,
]);

// منطقة العرض مثبّتة — لا تتبع توقيت الخادم (شغّل بـ TZ مختلفة للتأكد)
assert.equal(dayKey("2025-08-15T19:00:00.000Z"), "2025-08-15");
assert.equal(dayKey("2025-08-15T23:30:00.000Z"), "2025-08-16"); // 02:30 بالرياض
assert.equal(
  calendarDayOffset(
    "2025-08-16T10:00:00.000Z",
    new Date("2025-08-15T10:00:00.000Z"),
  ),
  1,
);
assert.match(formatMatchTime("2025-08-15T19:00:00.000Z"), /10:00/); // 22:00 بالرياض

// بديل الشعار يعرّف الفريق: يتخطّى الأرقام ويصمد على اسم فارغ
assert.equal(crestInitials("غانغوون"), "غا");
assert.equal(crestInitials("بوتشيون 1995"), "بو");
assert.equal(crestInitials("1995 بوتشيون"), "بو"); // الرقم ليس حرفاً
assert.equal(crestInitials("  "), "•");

console.log("selfcheck ok");
