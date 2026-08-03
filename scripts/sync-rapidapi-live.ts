import http from "http";
import https from "https";
import { getDb } from "../src/lib/db";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "eba270730cmsh926c754a32cb815p1ec397jsnf771a5ebb722";
const RAPIDAPI_HOST = "free-api-live-football-data.p.rapidapi.com";

export async function fetchMatchesByDate(dateStr: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      hostname: RAPIDAPI_HOST,
      path: `/football-get-matches-by-date?date=${dateStr}`,
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let chunks: any[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        try {
          const body = Buffer.concat(chunks).toString();
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", (e) => reject(e));
    req.end();
  });
}

export async function syncLiveMatchesFromRapidAPI() {
  const db = getDb();
  console.log("📡 Syncing live matches from RapidAPI (free-api-live-football-data)...");

  const today = new Date();
  const dateStrs = [];

  for (let i = -1; i <= 3; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    dateStrs.push(`${yyyy}${mm}${dd}`);
  }

  let totalUpdated = 0;

  for (const dateStr of dateStrs) {
    try {
      const data = await fetchMatchesByDate(dateStr);
      const matches = data?.response?.matches || [];
      console.log(`  Date ${dateStr}: ${matches.length} total matches retrieved`);

      for (const m of matches) {
        // We match Argentina matches (League 916957) or other leagues by team names
        if (m.leagueId === 916957) {
          const homeName = m.home?.name;
          const awayName = m.away?.name;
          const homeScore = m.home?.score;
          const awayScore = m.away?.score;
          const timeStr = m.time; // Format: "03.08.2026 21:45"
          const statusId = m.statusId; // 1 = Scheduled, 6 = Finished

          if (homeName && awayName && timeStr) {
            // Convert "DD.MM.YYYY HH:mm" to ISO string
            const [dPart, tPart] = timeStr.split(" ");
            if (dPart && tPart) {
              const [day, month, year] = dPart.split(".");
              const [hour, min] = tPart.split(":");
              const utcDate = `${year}-${month}-${day}T${hour}:${min}:00Z`;

              const status = statusId === 6 ? "FINISHED" : "SCHEDULED";

              // Find matching match in taqdeer.db
              const row = db.prepare(`
                SELECT m.id FROM matches m
                JOIN teams h ON m.home_team_id = h.id
                JOIN teams a ON m.away_team_id = a.id
                WHERE m.league_id = 'arg1'
                  AND (h.name_en LIKE ? OR h.name_ar LIKE ?)
                  AND (a.name_en LIKE ? OR a.name_ar LIKE ?)
              `).get(`%${homeName}%`, `%${homeName}%`, `%${awayName}%`, `%${awayName}%`) as { id: string } | undefined;

              if (row) {
                db.prepare(`
                  UPDATE matches
                  SET utc_date = ?, status = ?,
                      home_goals = COALESCE(?, home_goals),
                      away_goals = COALESCE(?, away_goals)
                  WHERE id = ?
                `).run(utcDate, status, statusId === 6 ? homeScore : null, statusId === 6 ? awayScore : null, row.id);
                totalUpdated++;
              }
            }
          }
        }
      }
    } catch (e) {
      console.error(`  Error syncing date ${dateStr}:`, e);
    }
  }

  console.log(`✅ Live RapidAPI sync complete! (${totalUpdated} database matches updated with live API status & times)`);
}

if (require.main === module) {
  syncLiveMatchesFromRapidAPI().catch(console.error);
}
