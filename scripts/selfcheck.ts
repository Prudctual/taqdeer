/** فحوص سريعة للمنطق غير البديهي — `bun run check` */
import assert from "node:assert";
import { parseUkDate } from "./sync-data";
import { historicalSeasons, latestSeasonStartYear, LEAGUES } from "../src/lib/leagues";
import {
  calendarDayOffset,
  crestInitials,
  DATA_TZ,
  dayKey,
  formatKickoffAbsolute,
  formatMatchTime,
} from "../src/lib/format";
import {
  calculateInPlayProbs,
  remainingIntensityFraction,
  scoreStateMult,
} from "../src/lib/in-play-probs";

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

// منطقة العرض: أونتاريو · ختم البيانات: العراق
assert.equal(dayKey("2025-08-15T19:00:00.000Z"), "2025-08-15");
assert.equal(dayKey("2025-08-15T23:30:00.000Z"), "2025-08-15"); // 19:30 تورونتو
assert.equal(
  calendarDayOffset(
    "2025-08-16T10:00:00.000Z",
    new Date("2025-08-15T10:00:00.000Z"),
  ),
  1,
);
assert.match(formatMatchTime("2025-08-15T19:00:00.000Z"), /15:00/); // أونتاريو EDT
assert.match(formatMatchTime("2025-08-15T19:00:00.000Z", DATA_TZ), /22:00/); // العراق
{
  const abs = formatKickoffAbsolute("2025-08-15T19:00:00.000Z");
  assert.match(abs, /15:00/);
  assert.match(abs, /22:00/);
  assert.match(abs, /أونتاريو/);
  assert.match(abs, /العراق/);
}
// منتصف الليل بين أونتاريو والعراق: 03:00 UTC = 23:00 أونتاريو 15 أغسطس، 06:00 العراق 16 أغسطس
assert.equal(dayKey("2025-08-16T03:00:00.000Z"), "2025-08-15");
{
  const split = formatKickoffAbsolute("2025-08-16T03:00:00.000Z");
  assert.match(split, /23:00/);
  assert.match(split, /06:00/);
  assert.match(split, /15 أغسطس/);
  assert.match(split, /16 أغسطس/);
}

// بديل الشعار يعرّف الفريق: يتخطّى الأرقام ويصمد على اسم فارغ
assert.equal(crestInitials("غانغوون"), "غا");
assert.equal(crestInitials("بوتشيون 1995"), "بو");
assert.equal(crestInitials("1995 بوتشيون"), "بو"); // الرقم ليس حرفاً
assert.equal(crestInitials("  "), "•");

assert.ok(remainingIntensityFraction(0) > remainingIntensityFraction(70));
assert.ok(scoreStateMult(0, 2).homeAtk > 1);
const liveBase = calculateInPlayProbs(1.4, 1.1, 60, 1, 0);
const liveAwayRed = calculateInPlayProbs(1.4, 1.1, 60, 1, 0, {
  homeReds: 0,
  awayReds: 1,
});
assert.ok(liveAwayRed.pHome + liveAwayRed.pDraw + liveAwayRed.pAway > 0.99);
assert.ok(liveAwayRed.pAway < liveBase.pAway);

// التحقق من الدوريات السبعة المعتمدة واستبعاد tur1 و no1 تماماً
assert.equal(LEAGUES.length, 7);
assert.deepEqual(
  LEAGUES.map((l) => l.id),
  ["pl", "pd", "bl1", "sa", "fl1", "ppd", "ded"],
);
assert.ok(!LEAGUES.some((l) => l.id === "tur1" || l.id === "no1"));

console.log("selfcheck ok");

