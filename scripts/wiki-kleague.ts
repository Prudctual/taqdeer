/**
 * Parse K League 1 fixtures/results from English Wikipedia football-box templates.
 * football-data.org / football-data.co.uk do not cover South Korea.
 */

export type WikiFixture = {
  utcDate: string;
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
  status: "FINISHED" | "SCHEDULED";
};

const UA = "pitchlab/0.1 (analytics; educational; local-dev)";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function wikiJson<T>(url: string, retries = 6): Promise<T> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (res.status === 429) {
      await sleep(2500 * (i + 1));
      continue;
    }
    if (!res.ok) throw new Error(`Wikipedia ${res.status} for ${url}`);
    return (await res.json()) as T;
  }
  throw new Error(`Wikipedia rate-limited: ${url}`);
}

function wikiLinkText(raw: string): string {
  const s = raw.trim();
  if (!s || s.startsWith("|")) return "";
  const m = s.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
  if (m) return (m[2] ?? m[1]!).trim();
  // رفض بقايا قوالب ويكيبيديا غير المكتملة
  if (/^[|=]/.test(s) || /\{\{|\[\[]/.test(s)) return "";
  return s.replace(/\[\[|\]\]/g, "").trim();
}

function extractTemplate(text: string, start: number): string | null {
  let depth = 0;
  let j = start;
  while (j < text.length - 1) {
    if (text.slice(j, j + 2) === "{{") {
      depth++;
      j += 2;
      continue;
    }
    if (text.slice(j, j + 2) === "}}") {
      depth--;
      j += 2;
      if (depth === 0) return text.slice(start, j);
      continue;
    }
    j++;
  }
  return null;
}

function field(box: string, key: string): string {
  const m = box.match(new RegExp(`\\|\\s*${key}\\s*=\\s*([^\\n]*)`, "i"));
  return m?.[1]?.trim() ?? "";
}

function parseLocalDate(dateField: string): string | null {
  const m = dateField.match(
    /\{\{Start date\|(\d{4})\|(\d{1,2})\|(\d{1,2})/i,
  );
  if (!m) return null;
  const day = Number(m[3]);
  if (!Number.isFinite(day) || day < 1 || day > 31) return null;
  const y = m[1]!;
  const mo = m[2]!.padStart(2, "0");
  const d = m[3]!.padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

/** {{UTZ|14:00|9}} → local HH:MM and UTC offset hours (Korea = +9) */
function parseUtz(timeField: string): { hhmm: string; offset: number } {
  const m = timeField.match(/\{\{UTZ\|(\d{1,2}:\d{2})\|(-?\d+)/i);
  if (m) return { hhmm: m[1]!, offset: Number(m[2]) };
  const plain = timeField.match(/(\d{1,2}:\d{2})/);
  return { hhmm: plain?.[1] ?? "15:00", offset: 9 };
}

function toUtcIso(localDate: string, hhmm: string, offsetHours: number): string {
  const [hh, mm] = hhmm.split(":").map(Number);
  const [y, mo, d] = localDate.split("-").map(Number);
  const utcMs = Date.UTC(y!, mo! - 1, d!, hh! - offsetHours, mm!, 0);
  return new Date(utcMs).toISOString();
}

function parseScore(scoreField: string): {
  home: number | null;
  away: number | null;
} {
  const m = scoreField.match(/(\d+)\s*[–\-:]\s*(\d+)/);
  if (!m) return { home: null, away: null };
  return { home: Number(m[1]), away: Number(m[2]) };
}

function parseFootballBoxes(wikitext: string): WikiFixture[] {
  const starts = [...wikitext.matchAll(/\{\{football box/gi)].map((m) => m.index!);
  const out: WikiFixture[] = [];
  for (const start of starts) {
    const box = extractTemplate(wikitext, start);
    if (!box) continue;
    const localDate = parseLocalDate(field(box, "date"));
    if (!localDate) continue;
    const home = wikiLinkText(field(box, "team1"));
    const away = wikiLinkText(field(box, "team2"));
    if (!home || !away) continue;
    const { hhmm, offset } = parseUtz(field(box, "time"));
    const { home: hg, away: ag } = parseScore(field(box, "score"));
    const finished = hg !== null && ag !== null;
    out.push({
      utcDate: toUtcIso(localDate, hhmm, offset),
      home,
      away,
      homeGoals: hg,
      awayGoals: ag,
      status: finished ? "FINISHED" : "SCHEDULED",
    });
  }
  return out;
}

type RevisionsResp = {
  query?: {
    pages?: Record<
      string,
      {
        missing?: string;
        revisions?: Array<{
          slots?: { main?: { ["*"]?: string } };
          ["*"]?: string;
        }>;
      }
    >;
  };
};

export async function fetchKleagueSeason(
  year: number,
  titleForYear: (y: number) => string,
): Promise<WikiFixture[]> {
  const title = encodeURIComponent(titleForYear(year));
  // revisions يعيد الويكي كامل دون قصّ parse API
  const wtUrl =
    `https://en.wikipedia.org/w/api.php?action=query&prop=revisions` +
    `&rvprop=content&rvslots=main&format=json&titles=${title}`;
  const json = await wikiJson<RevisionsResp>(wtUrl);
  const page = Object.values(json.query?.pages ?? {})[0];
  if (!page || page.missing !== undefined) return [];
  const rev = page.revisions?.[0];
  const wt =
    rev?.slots?.main?.["*"] ??
    (typeof rev?.["*"] === "string" ? rev["*"] : "") ??
    "";
  const all = parseFootballBoxes(wt);

  const seen = new Set<string>();
  const unique: WikiFixture[] = [];
  for (const m of all) {
    const key = `${m.utcDate.slice(0, 10)}|${m.home}|${m.away}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(m);
  }
  unique.sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  return unique;
}
