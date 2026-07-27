import { Database } from "bun:sqlite";
import path from "path";

import fs from "fs";

// Load environment variables
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8767599696:AAHgX8dlyUfuUmOKRBPwsdfrfm0D3b9cw6U";
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

const possiblePaths = [
  path.resolve(process.cwd(), "data/taqdeer.db"),
  path.resolve(process.cwd(), "data/pitchlab.db"),
];
const dbPath = possiblePaths.find((p) => fs.existsSync(p)) || possiblePaths[0];

if (!fs.existsSync(path.dirname(dbPath))) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new Database(dbPath);

console.log(`🤖 Starting Taqdeer Telegram Bot (@Taqdeerbot)...`);
console.log(`📁 Connected to Database: ${dbPath}`);

interface MatchRow {
  id: string;
  utc_date: string;
  status: string;
  home_team: string;
  away_team: string;
  home_goals: number | null;
  away_goals: number | null;
  league_name: string;
  p_home: number | null;
  p_draw: number | null;
  p_away: number | null;
  confidence: number | null;
  lambda_home: number | null;
  lambda_away: number | null;
  odds_home: number | null;
  odds_draw: number | null;
  odds_away: number | null;
}

function getTodayMatches(): MatchRow[] {
  const query = `
    SELECT m.id, m.utc_date, m.status,
           ht.name_ar as home_team, at.name_ar as away_team,
           m.home_goals, m.away_goals,
           l.name_ar as league_name,
           p.p_home, p.p_draw, p.p_away, p.confidence,
           p.lambda_home, p.lambda_away,
           m.odds_home, m.odds_draw, m.odds_away
    FROM matches m
    JOIN leagues l ON l.id = m.league_id
    JOIN teams ht ON ht.id = m.home_team_id
    JOIN teams at ON at.id = m.away_team_id
    LEFT JOIN predictions p ON p.match_id = m.id
    WHERE m.utc_date >= date('now', '-1 day') AND m.utc_date <= date('now', '+2 days')
    ORDER BY m.utc_date ASC
    LIMIT 15;
  `;
  return db.query(query).all() as MatchRow[];
}

function getUpcomingMatches(): MatchRow[] {
  const query = `
    SELECT m.id, m.utc_date, m.status,
           ht.name_ar as home_team, at.name_ar as away_team,
           m.home_goals, m.away_goals,
           l.name_ar as league_name,
           p.p_home, p.p_draw, p.p_away, p.confidence,
           p.lambda_home, p.lambda_away,
           m.odds_home, m.odds_draw, m.odds_away
    FROM matches m
    JOIN leagues l ON l.id = m.league_id
    JOIN teams ht ON ht.id = m.home_team_id
    JOIN teams at ON at.id = m.away_team_id
    LEFT JOIN predictions p ON p.match_id = m.id
    WHERE m.status = 'TIMED' OR m.status = 'SCHEDULED'
    ORDER BY m.utc_date ASC
    LIMIT 10;
  `;
  return db.query(query).all() as MatchRow[];
}

function searchMatchesByTeam(term: string): MatchRow[] {
  const query = `
    SELECT m.id, m.utc_date, m.status,
           ht.name_ar as home_team, at.name_ar as away_team,
           m.home_goals, m.away_goals,
           l.name_ar as league_name,
           p.p_home, p.p_draw, p.p_away, p.confidence,
           p.lambda_home, p.lambda_away,
           m.odds_home, m.odds_draw, m.odds_away
    FROM matches m
    JOIN leagues l ON l.id = m.league_id
    JOIN teams ht ON ht.id = m.home_team_id
    JOIN teams at ON at.id = m.away_team_id
    LEFT JOIN predictions p ON p.match_id = m.id
    WHERE ht.name_ar LIKE ? OR at.name_ar LIKE ? OR ht.name_en LIKE ? OR at.name_en LIKE ?
    ORDER BY m.utc_date DESC
    LIMIT 8;
  `;
  const pattern = `%${term}%`;
  return db.query(query).all(pattern, pattern, pattern, pattern) as MatchRow[];
}

function formatMatchCard(m: MatchRow): string {
  const dateObj = new Date(m.utc_date);
  const timeStr = dateObj.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  const dateStr = dateObj.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });

  let text = `⚽ <b>${m.home_team} × ${m.away_team}</b>\n`;
  text += `🏆 <i>${m.league_name}</i> · ⏰ ${dateStr} ${timeStr}\n`;

  if (m.status === "FINISHED" && m.home_goals !== null) {
    text += `📊 النتيجة النهائية: <b>${m.home_goals} - ${m.away_goals}</b>\n`;
  }

  if (m.p_home != null && m.p_draw != null && m.p_away != null) {
    const pH = Math.round(m.p_home * 100);
    const pD = Math.round(m.p_draw * 100);
    const pA = Math.round(m.p_away * 100);

    let pick = "تعادل";
    let pickP = pD;
    if (pH >= pD && pH >= pA) {
      pick = `فوز ${m.home_team}`;
      pickP = pH;
    } else if (pA >= pH && pA >= pD) {
      pick = `فوز ${m.away_team}`;
      pickP = pA;
    }

    text += `🎯 التوصية: <b>${pick} (${pickP}%)</b>\n`;
    text += `📈 الاحتمالات: 🏠 ${pH}% | 🤝 ${pD}% | ✈️ ${pA}%\n`;
    if (m.confidence) {
      text += `💡 الثقة: <b>${Math.round(m.confidence * 100)}%</b>\n`;
    }
  } else {
    text += `⏳ التوقع: <i>جاري تحليل البيانات...</i>\n`;
  }

  return text;
}

async function sendMessage(chatId: number, text: string, replyMarkup?: any) {
  try {
    const res = await fetch(`${API_URL}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup: replyMarkup,
      }),
    });
    return await res.json();
  } catch (err) {
    console.error("Error sending message:", err);
  }
}

const MAIN_KEYBOARD = {
  inline_keyboard: [
    [
      { text: "⚽ مباريات اليوم", callback_data: "cmd_today" },
      { text: "🔮 المباريات القادمة", callback_data: "cmd_upcoming" },
    ],
    [
      { text: "📊 من نحن والمنهجية", callback_data: "cmd_methodology" },
      { text: "🌐 زيارة منصة «تقدير»", url: "https://taqdeer.app" },
    ],
  ],
};

async function handleUpdate(update: any) {
  if (update.message) {
    const msg = update.message;
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();

    if (text.startsWith("/start") || text.startsWith("/help")) {
      const welcome = `<b>مرحباً بك في بوت منصة «تقدير» ⚽📊</b>\n\nنظام التحليل الرياضي والتنبؤ الخوارزمي المتقدم لمباريات كرة القدم بالاعتماد على نماذج <i>Dixon-Coles</i>، <i>Pi-ratings</i>، وتتبع حركة أسعار المحترفين.\n\nاختر من القائمة أدناه أو اكتب اسم أي فريق لبدء التحليل:`;
      await sendMessage(chatId, welcome, MAIN_KEYBOARD);
      return;
    }

    if (text.startsWith("/today") || text.startsWith("/matches") || text === "المباريات") {
      const matches = getTodayMatches();
      if (!matches.length) {
        await sendMessage(chatId, "📋 لا تتوفر مباريات مسجلة لهذا اليوم حالياً.", MAIN_KEYBOARD);
        return;
      }
      let reply = `📋 <b>مباريات اليوم والتوقعات الخوارزمية:</b>\n\n`;
      reply += matches.map((m) => formatMatchCard(m)).join("\n──────────────\n");
      await sendMessage(chatId, reply, MAIN_KEYBOARD);
      return;
    }

    if (text.startsWith("/upcoming") || text === "القادمة") {
      const matches = getUpcomingMatches();
      if (!matches.length) {
        await sendMessage(chatId, "🔮 لا تتوفر مباريات قادمة مسجلة.", MAIN_KEYBOARD);
        return;
      }
      let reply = `🔮 <b>المباريات القادمة المجدولة:</b>\n\n`;
      reply += matches.map((m) => formatMatchCard(m)).join("\n──────────────\n");
      await sendMessage(chatId, reply, MAIN_KEYBOARD);
      return;
    }

    // Direct search if text typed
    if (text && !text.startsWith("/")) {
      const matches = searchMatchesByTeam(text);
      if (!matches.length) {
        await sendMessage(chatId, `🔍 لم نجد مباريات مطابقة للبحث: "<b>${text}</b>"`, MAIN_KEYBOARD);
        return;
      }
      let reply = `🔍 <b>نتائج البحث عن "${text}":</b>\n\n`;
      reply += matches.map((m) => formatMatchCard(m)).join("\n──────────────\n");
      await sendMessage(chatId, reply, MAIN_KEYBOARD);
      return;
    }
  }

  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = cb.message.chat.id;
    const data = cb.data;

    if (data === "cmd_today") {
      const matches = getTodayMatches();
      let reply = `📋 <b>مباريات اليوم والتوقعات:</b>\n\n`;
      reply += matches.length ? matches.map((m) => formatMatchCard(m)).join("\n──────────────\n") : "لا تتوفر مباريات اليوم حالياً.";
      await sendMessage(chatId, reply, MAIN_KEYBOARD);
    } else if (data === "cmd_upcoming") {
      const matches = getUpcomingMatches();
      let reply = `🔮 <b>المباريات القادمة المجدولة:</b>\n\n`;
      reply += matches.length ? matches.map((m) => formatMatchCard(m)).join("\n──────────────\n") : "لا تتوفر مباريات قادمة.";
      await sendMessage(chatId, reply, MAIN_KEYBOARD);
    } else if (data === "cmd_methodology") {
      const text = `📊 <b>منهجية «تقدير» في تحليل المباريات:</b>\n\nتعتمد منصتنا على دمج 4 محركات رياضية مستقلة:\n1. <b>Dixon-Coles:</b> لحساب معاملات الهجوم والدفاع وقوة التهديف.\n2. <b>Pi-ratings & Elo:</b> لتقييم وتتبع الأداء التاريخي والفورم.\n3. <b>Sharp Money Flow:</b> رصد حركة السيولة بأسواق المحترفين.\n4. <b>Temperature Scaling:</b> معايرة الاحتمالات الخالية من التسريب.`;
      await sendMessage(chatId, text, MAIN_KEYBOARD);
    }
  }
}

let offset = 0;
async function pollUpdates() {
  while (true) {
    try {
      const res = await fetch(`${API_URL}/getUpdates?offset=${offset}&timeout=25`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          await handleUpdate(update);
        }
      }
    } catch (err) {
      console.error("Polling error:", err);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

pollUpdates();
