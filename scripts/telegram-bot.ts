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

const TIMEZONE = "Asia/Baghdad";

function formatMatchDateLabel(utcDate: string): string {
  const dateObj = new Date(utcDate);
  const now = new Date();

  const getDayStr = (d: Date) =>
    d.toLocaleDateString("en-CA", { timeZone: TIMEZONE });

  const matchDayStr = getDayStr(dateObj);
  const todayStr = getDayStr(now);

  const tomorrowObj = new Date(now.getTime() + 24 * 3600 * 1000);
  const tomorrowStr = getDayStr(tomorrowObj);

  const timeStr = dateObj.toLocaleTimeString("ar-EG", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });

  if (matchDayStr === todayStr) {
    return `اليوم · ${timeStr}`;
  } else if (matchDayStr === tomorrowStr) {
    return `غداً · ${timeStr}`;
  } else {
    const dayName = dateObj.toLocaleDateString("ar-EG", {
      timeZone: TIMEZONE,
      weekday: "short",
    });
    const dateStr = dateObj.toLocaleDateString("ar-EG", {
      timeZone: TIMEZONE,
      day: "numeric",
      month: "short",
    });
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

  text += `المزيد عبر المنصة: http://13.53.56.196`;
  return text;
}

async function broadcastToAllSubscribers() {
  try {
    const subscribers = db.query(`SELECT chat_id FROM telegram_subscribers`).all() as { chat_id: number }[];
    if (!subscribers.length) return;

    const message = getConciseHighlights();
    const keyboard = {
      inline_keyboard: [
        [{ text: "فتح منصة تقدير", url: "http://13.53.56.196" }],
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

async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  try {
    await fetch(`${API_URL}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
  } catch (err) {
    console.error("Error answering callback query:", err);
  }
}

const MAIN_KEYBOARD = {
  inline_keyboard: [
    [
      { text: "⚽ مباريات اليوم", callback_data: "cmd_today" },
      { text: "📅 المباريات القادمة", callback_data: "cmd_upcoming" },
    ],
    [
      { text: "💎 فرص القيمة (+EV)", callback_data: "cmd_value" },
      { text: "🛡️ أأمن التوقعات (Bankers)", callback_data: "cmd_bankers" },
    ],
    [
      { text: "🏆 ترتيب الدوريات الـ 6", callback_data: "cmd_leagues" },
      { text: "📊 سجل الدقة والأداء", callback_data: "cmd_accuracy" },
    ],
    [
      { text: "🧠 المنهجية الحسابية", callback_data: "cmd_methodology" },
      { text: "🌐 منصة «تقدير» الحية", url: "http://13.53.56.196" },
    ],
  ],
};

const LEAGUES_KEYBOARD = {
  inline_keyboard: [
    [
      { text: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 الدوري الإنجليزي", callback_data: "cmd_league_pl" },
      { text: "🇪🇸 الدوري الإسباني", callback_data: "cmd_league_pd" },
    ],
    [
      { text: "🇩🇪 الدوري الألماني", callback_data: "cmd_league_bl1" },
      { text: "🇮🇹 الدوري الإيطالي", callback_data: "cmd_league_sa" },
    ],
    [
      { text: "🇫🇷 الدوري الفرنسي", callback_data: "cmd_league_fl1" },
      { text: "🇰🇷 الدوري الكوري", callback_data: "cmd_league_kl1" },
    ],
    [
      { text: "🔙 القائمة الرئيسية", callback_data: "cmd_main_menu" },
    ],
  ],
};

function getLeagueStandings(leagueId: string) {
  const leagueQuery = `SELECT name_ar FROM leagues WHERE id = ?`;
  const league = db.query(leagueQuery).get(leagueId) as { name_ar: string } | undefined;

  const standingsQuery = `
    SELECT s.position, t.name_ar, s.played, s.won, s.drawn, s.lost, s.points, s.goal_difference
    FROM standings s
    JOIN teams t ON t.id = s.team_id
    WHERE s.league_id = ?
      AND s.season = (SELECT MAX(season) FROM standings WHERE league_id = ?)
    ORDER BY s.position ASC
    LIMIT 8;
  `;
  const rows = db.query(standingsQuery).all(leagueId, leagueId) as Array<{
    position: number;
    name_ar: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    points: number;
    goal_difference: number;
  }>;

  return { leagueName: league?.name_ar || leagueId, rows };
}

function getValueBets(): MatchRow[] {
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
    JOIN predictions p ON p.match_id = m.id
    WHERE (m.status = 'TIMED' OR m.status = 'SCHEDULED')
      AND m.utc_date >= datetime('now')
    ORDER BY p.confidence DESC
    LIMIT 6;
  `;
  return db.query(query).all() as MatchRow[];
}

function getBankerPicks(limit: number = 4): MatchRow[] {
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
    JOIN predictions p ON p.match_id = m.id
    WHERE (m.status IN ('SCHEDULED', 'TIMED') OR m.utc_date >= date('now'))
      AND (p.p_home IS NOT NULL OR p.p_away IS NOT NULL)
    ORDER BY m.utc_date ASC, MAX(COALESCE(p.p_home, 0), COALESCE(p.p_away, 0)) DESC
    LIMIT ?;
  `;
  const rows = db.query(query).all(limit) as MatchRow[];
  if (rows.length > 0) return rows;

  const fallbackQuery = `
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
    JOIN predictions p ON p.match_id = m.id
    ORDER BY p.confidence DESC
    LIMIT ?;
  `;
  return db.query(fallbackQuery).all(limit) as MatchRow[];
}

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
      const welcome = `<b>مرحباً بك في منصة «تقدير» ⚽</b>\n\nمنصة التحليل الرياضي والتوقعات الخوارزمية المتقدمة للدوريات العالمية.\n\nاستخدم القائمة أدناه للتنقل السريع بين أقسام المنصة:`;
      await sendMessage(chatId, welcome, MAIN_KEYBOARD);
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

    if (text.startsWith("/bankers") || text === "أأمن التوقعات") {
      const matches = getBankerPicks();
      let reply = `<b>🛡️ أأمن التوقعات للجولة الحالية (Banker Picks):</b>\n\n`;
      reply += matches.map((m) => formatMatchCard(m)).join("\n──────────────\n");
      await sendMessage(chatId, reply, MAIN_KEYBOARD);
      return;
    }

    if (text.startsWith("/value") || text === "فرص القيمة") {
      const matches = getValueBets();
      let reply = `<b>💎 أبرز فرص القيمة والأعلى ثقة (+EV):</b>\n\n`;
      reply += matches.map((m) => formatMatchCard(m)).join("\n──────────────\n");
      reply += `\n\nاستعرض جميع الفرص والتفاصيل المالية عبر المنصة:`;
      const kb = {
        inline_keyboard: [[{ text: "🌐 فتح صفحة فرص القيمة", url: "http://13.53.56.196/value" }]],
      };
      await sendMessage(chatId, reply, kb);
      return;
    }

    if (text.startsWith("/leagues") || text === "الدوريات") {
      const reply = `<b>🏆 اختر الدوري لاستعراض جدول الترتيب والأرقام الحالية:</b>`;
      await sendMessage(chatId, reply, LEAGUES_KEYBOARD);
      return;
    }

    if (text.startsWith("/accuracy") || text === "الدقة") {
      const reply = `<b>📊 سجل الدقة والتحقق الرياضي:</b>\n\n• <b>نسبة التوقع الصحيح (Out-of-sample):</b> 47.3%\n• <b>نطاق الاختبار:</b> 582 مباراة موثقة على نماذج Dixon-Coles و Elo.\n• <b>معايرة الاحتمالات:</b> Temperature Scaling بدون تسريب بيانات.\n\nاستعرض السجل الكامل والتحليل المتقدم:`;
      const kb = {
        inline_keyboard: [[{ text: "🌐 فتح صفحة سجل الدقة", url: "http://13.53.56.196/accuracy" }]],
      };
      await sendMessage(chatId, reply, kb);
      return;
    }

    if (text.startsWith("/methodology") || text === "المنهجية") {
      const reply = `<b>🧠 المنهجية الحسابية لمنصة «تقدير»:</b>\n\nتعتمد منصتنا على دمج 4 محركات رياضية مستقلة:\n1. <b>Dixon-Coles:</b> حساب قوة التهديف والهجوم والدفاع.\n2. <b>Pi-ratings & Elo:</b> تقييم الفورم والأداء التاريخي.\n3. <b>De-margined Odds:</b> قراءة الاحتمالات بعد إزالة هامش ربح المراهن.\n4. <b>Temperature Scaling:</b> معايرة الاحتمالات الرياضية.`;
      const kb = {
        inline_keyboard: [[{ text: "🌐 قراءة المنهجية الكاملة بالمنصة", url: "http://13.53.56.196/methodology" }]],
      };
      await sendMessage(chatId, reply, kb);
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

    await answerCallbackQuery(cb.id);

    if (data === "cmd_main_menu") {
      await sendMessage(chatId, "<b>القائمة الرئيسية لمنصة «تقدير»:</b>", MAIN_KEYBOARD);
    } else if (data === "cmd_today") {
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
    } else if (data === "cmd_bankers") {
      const matches = getBankerPicks();
      let reply = `<b>🛡️ أأمن التوقعات للجولة الحالية (Banker Picks):</b>\n\n`;
      reply += matches.map((m) => formatMatchCard(m)).join("\n──────────────\n");
      await sendMessage(chatId, reply, MAIN_KEYBOARD);
    } else if (data === "cmd_value") {
      const matches = getValueBets();
      let reply = `<b>💎 أبرز فرص القيمة والأعلى ثقة (+EV):</b>\n\n`;
      reply += matches.map((m) => formatMatchCard(m)).join("\n──────────────\n");
      const kb = {
        inline_keyboard: [
          [{ text: "🌐 استعراض كافة فرص القيمة بالمنصة", url: "http://13.53.56.196/value" }],
          [{ text: "🔙 القائمة الرئيسية", callback_data: "cmd_main_menu" }],
        ],
      };
      await sendMessage(chatId, reply, kb);
    } else if (data === "cmd_leagues") {
      const reply = `<b>🏆 اختر الدوري لاستعراض جدول الترتيب الحالي:</b>`;
      await sendMessage(chatId, reply, LEAGUES_KEYBOARD);
    } else if (data?.startsWith("cmd_league_")) {
      const leagueId = data.replace("cmd_league_", "");
      const standings = getLeagueStandings(leagueId);
      let reply = `<b>🏆 جدول ترتيب ${standings.leagueName}:</b>\n\n`;
      if (standings.rows.length > 0) {
        reply += `<code>المركز  الفريق          لعب  نقاط  فارق</code>\n`;
        for (const r of standings.rows) {
          const pos = String(r.position).padStart(2, " ");
          const name = r.name_ar.padEnd(14, " ");
          const gd = (r.goal_difference > 0 ? `+${r.goal_difference}` : String(r.goal_difference)).padStart(3, " ");
          reply += `<code>${pos}. ${name}  ${r.played}    ${r.points}   ${gd}</code>\n`;
        }
      } else {
        reply += `لا تتوفر بيانات جدول حالياً.\n`;
      }
      const kb = {
        inline_keyboard: [
          [{ text: `🌐 فتح صفحة ${standings.leagueName} بالمنصة`, url: `http://13.53.56.196/leagues/${leagueId}` }],
          [{ text: "🔙 قائمة الدوريات", callback_data: "cmd_leagues" }],
        ],
      };
      await sendMessage(chatId, reply, kb);
    } else if (data === "cmd_accuracy") {
      const text = `<b>📊 سجل الدقة والتحقق الرياضي:</b>\n\n• <b>نسبة التوقع الصحيح (Out-of-sample):</b> 47.3%\n• <b>نطاق الاختبار:</b> 582 مباراة موثقة على نماذج Dixon-Coles و Elo.\n• <b>معايرة الاحتمالات:</b> Temperature Scaling بدون تسريب بيانات.`;
      const kb = {
        inline_keyboard: [
          [{ text: "🌐 استعراض سجل الدقة بالمنصة", url: "http://13.53.56.196/accuracy" }],
          [{ text: "🔙 القائمة الرئيسية", callback_data: "cmd_main_menu" }],
        ],
      };
      await sendMessage(chatId, text, kb);
    } else if (data === "cmd_methodology") {
      const text = `<b>🧠 المنهجية الحسابية لمنصة «تقدير»:</b>\n\nتعتمد منصتنا على دمج 4 محركات رياضية مستقلة:\n1. <b>Dixon-Coles:</b> لحساب معاملات الهجوم والدفاع وقوة التهديف.\n2. <b>Pi-ratings & Elo:</b> لتقييم الأداء التاريخي والفورم.\n3. <b>De-margined Odds:</b> قراءة الاحتمالات بعد إزالة هامش ربح المراهن.\n4. <b>Temperature Scaling:</b> معايرة الاحتمالات الخالية من التسريب.`;
      const kb = {
        inline_keyboard: [
          [{ text: "🌐 قراءة المنهجية الكاملة بالمنصة", url: "http://13.53.56.196/methodology" }],
          [{ text: "🔙 القائمة الرئيسية", callback_data: "cmd_main_menu" }],
        ],
      };
      await sendMessage(chatId, text, kb);
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

// ⏰ Start 1-hour recurring broadcast loop (3,600,000 ms)
const ONE_HOUR_MS = 60 * 60 * 1000;
setInterval(broadcastToAllSubscribers, ONE_HOUR_MS);

// Start polling
pollUpdates();
