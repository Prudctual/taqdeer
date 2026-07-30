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

function formatMatchDateLabel(utcDate: string): string {
  const dateObj = new Date(utcDate);
  const now = new Date();

  const matchDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((matchDay.getTime() - today.getTime()) / (1000 * 3600 * 24));

  const timeStr = dateObj.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

  if (diffDays === 0) {
    return `اليوم · ${timeStr}`;
  } else if (diffDays === 1) {
    return `غداً · ${timeStr}`;
  } else {
    const dayName = dateObj.toLocaleDateString("ar-EG", { weekday: "short" });
    const dateStr = dateObj.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
    return `${dayName}، ${dateStr} · ${timeStr}`;
  }
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
    WHERE m.utc_date >= date('now', 'start of day')
      AND m.utc_date < date('now', '+1 day', 'start of day')
    ORDER BY m.utc_date ASC;
  `;
  return db.query(query).all() as MatchRow[];
}

function getUpcomingMatches(limit: number = 8): MatchRow[] {
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
    WHERE (m.status = 'TIMED' OR m.status = 'SCHEDULED')
      AND m.utc_date >= datetime('now')
    ORDER BY m.utc_date ASC
    LIMIT ?;
  `;
  return db.query(query).all(limit) as MatchRow[];
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
  const dateLabel = formatMatchDateLabel(m.utc_date);

  let text = `<b>${m.home_team} × ${m.away_team}</b>\n`;
  text += `<i>${m.league_name}</i> · ${dateLabel}\n`;

  if (m.status === "FINISHED" && m.home_goals !== null) {
    text += `النتيجة النهائية: <b>${m.home_goals} - ${m.away_goals}</b>\n`;
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

    text += `التوصية: <b>${pick} (${pickP}%)</b>\n`;
    text += `الاحتمالات: 🏠 ${pH}% | 🤝 ${pD}% | ✈️ ${pA}%\n`;
    if (m.confidence) {
      text += `نسبة الثقة: <b>${Math.round(m.confidence * 100)}%</b>\n`;
    }
  } else {
    text += `التوقع: <i>جاري تحليل البيانات...</i>\n`;
  }

  return text;
}

function getConciseHighlights(): string {
  const upcoming = getUpcomingMatches(4);

  let text = `<b>تحديث «تقدير» الدوري والتحليلات</b>\n\n`;

  if (upcoming.length > 0) {
    text += `أبرز المواجهات القادمة وأعلى الإشارات:\n\n`;
    for (const m of upcoming) {
      const dateLabel = formatMatchDateLabel(m.utc_date);
      const pH = Math.round((m.p_home || 0) * 100);
      const pD = Math.round((m.p_draw || 0) * 100);
      const pA = Math.round((m.p_away || 0) * 100);
      const conf = Math.round((m.confidence || 0) * 100);

      let pick = `فوز ${m.home_team}`;
      if (pA > pH && pA > pD) pick = `فوز ${m.away_team}`;
      if (pD > pH && pD > pA) pick = "التعادل";

      text += `• <b>${m.home_team} × ${m.away_team}</b> (${m.league_name})\n`;
      text += `  الموعد: ${dateLabel} | التوقع: <b>${pick}</b> (${conf}% ثقة)\n`;
      text += `  الاحتمالات: ${pH}% / ${pD}% / ${pA}%\n\n`;
    }
  } else {
    text += `لا تتوفر مباريات مجدولة خلال الساعات القادمة.\nيمكنك متابعة جداول الترتيب والتحليلات عبر المنصة.\n\n`;
  }

  text += `المزيد عبر المنصة: https://taqdeer.app`;
  return text;
}

async function broadcastToAllSubscribers() {
  try {
    const subscribers = db.query(`SELECT chat_id FROM telegram_subscribers`).all() as { chat_id: number }[];
    if (!subscribers.length) return;

    const message = getConciseHighlights();
    const keyboard = {
      inline_keyboard: [
        [{ text: "فتح منصة تقدير", url: "https://taqdeer.app" }],
      ],
    };

    console.log(`🤖 [30-Min Broadcast] Sending update to ${subscribers.length} subscriber(s)...`);
    for (const sub of subscribers) {
      await sendMessage(sub.chat_id, message, keyboard);
      await new Promise((r) => setTimeout(r, 100));
    }
  } catch (err) {
    console.error("Broadcast error:", err);
  }
}

async function sendMessage(chatId: number, text: string, replyMarkup?: unknown) {
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
      { text: "مباريات اليوم", callback_data: "cmd_today" },
      { text: "المباريات القادمة", callback_data: "cmd_upcoming" },
    ],
    [
      { text: "المنهجية الحسابية", callback_data: "cmd_methodology" },
      { text: "منصة «تقدير»", url: "https://taqdeer.app" },
    ],
  ],
};

// Ensure subscribers table exists
db.run(`
  CREATE TABLE IF NOT EXISTS telegram_subscribers (
    chat_id INTEGER PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    created_at TEXT NOT NULL
  );
`);

function saveSubscriber(chatId: number, username?: string, firstName?: string) {
  try {
    const stmt = db.prepare(`
      INSERT INTO telegram_subscribers (chat_id, username, first_name, created_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(chat_id) DO UPDATE SET
        username = excluded.username,
        first_name = excluded.first_name;
    `);
    stmt.run(chatId, username || null, firstName || null);
  } catch (e) {
    console.error("Error saving subscriber:", e);
  }
}

type TelegramUpdate = {
  message?: {
    chat: { id: number };
    from?: { username?: string; first_name?: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    data?: string;
    from?: { username?: string; first_name?: string };
    message?: { chat: { id: number } };
  };
};

async function handleUpdate(update: TelegramUpdate) {
  const user = update.message?.from || update.callback_query?.from;
  const chatId = update.message?.chat?.id || update.callback_query?.message?.chat?.id;

  if (chatId && user) {
    saveSubscriber(chatId, user.username, user.first_name);
  }

  const todayStr = new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "short" });

  if (update.message) {
    const msg = update.message;
    const chatId = msg.chat.id;
    const text = (msg.text || "").trim();

    if (text.startsWith("/start") || text.startsWith("/help")) {
      const welcome = `<b>مرحباً بك في منصة «تقدير» ⚽</b>\n\nتم تفعيل اشتراكك لتلقي التحديثات التلقائية المختصرة كل 30 دقيقة لأبرز المباريات والتوقعات.`;
      await sendMessage(chatId, welcome, MAIN_KEYBOARD);

      const todayMatches = getTodayMatches();
      if (todayMatches.length) {
        let reply = `<b>توقعات مباريات اليوم (${todayStr}):</b>\n\n`;
        reply += todayMatches.map((m) => formatMatchCard(m)).join("\n──────────────\n");
        await sendMessage(chatId, reply, MAIN_KEYBOARD);
      } else {
        const upcoming = getUpcomingMatches(5);
        let reply = `لا تتوفر مباريات رسمية تجري اليوم (${todayStr}).\n\n<b>أقرب المباريات القادمة المجدولة:</b>\n\n`;
        reply += upcoming.map((m) => formatMatchCard(m)).join("\n──────────────\n");
        await sendMessage(chatId, reply, MAIN_KEYBOARD);
      }
      return;
    }

    if (text.startsWith("/today") || text.startsWith("/matches") || text === "المباريات") {
      const todayMatches = getTodayMatches();
      if (!todayMatches.length) {
        const upcoming = getUpcomingMatches(5);
        let reply = `لا تتوفر مباريات رسمية تجري اليوم (${todayStr}).\n\n<b>أقرب المباريات القادمة المجدولة:</b>\n\n`;
        reply += upcoming.map((m) => formatMatchCard(m)).join("\n──────────────\n");
        await sendMessage(chatId, reply, MAIN_KEYBOARD);
        return;
      }
      let reply = `<b>مباريات اليوم (${todayStr}):</b>\n\n`;
      reply += todayMatches.map((m) => formatMatchCard(m)).join("\n──────────────\n");
      await sendMessage(chatId, reply, MAIN_KEYBOARD);
      return;
    }

    if (text.startsWith("/upcoming") || text === "القادمة") {
      const matches = getUpcomingMatches(8);
      if (!matches.length) {
        await sendMessage(chatId, "لا تتوفر مباريات قادمة مسجلة حالياً.", MAIN_KEYBOARD);
        return;
      }
      let reply = `<b>المباريات القادمة المجدولة:</b>\n\n`;
      reply += matches.map((m) => formatMatchCard(m)).join("\n──────────────\n");
      await sendMessage(chatId, reply, MAIN_KEYBOARD);
      return;
    }

    // Direct search if text typed
    if (text && !text.startsWith("/")) {
      const matches = searchMatchesByTeam(text);
      if (!matches.length) {
        await sendMessage(chatId, `لم نجد مباريات مطابقة للبحث: "<b>${text}</b>"`, MAIN_KEYBOARD);
        return;
      }
      let reply = `<b>نتائج البحث عن "${text}":</b>\n\n`;
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
      const todayMatches = getTodayMatches();
      if (todayMatches.length) {
        let reply = `<b>مباريات اليوم (${todayStr}):</b>\n\n`;
        reply += todayMatches.map((m) => formatMatchCard(m)).join("\n──────────────\n");
        await sendMessage(chatId, reply, MAIN_KEYBOARD);
      } else {
        const upcoming = getUpcomingMatches(5);
        let reply = `لا تتوفر مباريات رسمية تجري اليوم (${todayStr}).\n\n<b>أقرب المباريات القادمة المجدولة:</b>\n\n`;
        reply += upcoming.map((m) => formatMatchCard(m)).join("\n──────────────\n");
        await sendMessage(chatId, reply, MAIN_KEYBOARD);
      }
    } else if (data === "cmd_upcoming") {
      const matches = getUpcomingMatches(8);
      let reply = `<b>المباريات القادمة المجدولة:</b>\n\n`;
      reply += matches.length ? matches.map((m) => formatMatchCard(m)).join("\n──────────────\n") : "لا تتوفر مباريات قادمة.";
      await sendMessage(chatId, reply, MAIN_KEYBOARD);
    } else if (data === "cmd_methodology") {
      const text = `<b>منهجية «تقدير» التحليلية:</b>\n\nتعتمد منصتنا على دمج 4 محركات رياضية مستقلة:\n1. <b>Dixon-Coles:</b> لحساب معاملات الهجوم والدفاع وقوة التهديف.\n2. <b>Pi-ratings & Elo:</b> لتقييم الأداء التاريخي والفورم.\n3. <b>De-margined Odds:</b> قراءة الاحتمالات بعد إزالة هامش ربح المراهن.\n4. <b>Temperature Scaling:</b> معايرة الاحتمالات الخالية من التسريب.`;
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

// ⏰ Start 30-minute recurring broadcast loop (1,800,000 ms)
const THIRTY_MINUTES_MS = 30 * 60 * 1000;
setInterval(broadcastToAllSubscribers, THIRTY_MINUTES_MS);

// Start polling
pollUpdates();
