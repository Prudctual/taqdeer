import { Database } from "bun:sqlite";
import path from "path";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8767599696:AAHgX8dlyUfuUmOKRBPwsdfrfm0D3b9cw6U";
const API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

const dbPath = path.resolve(process.cwd(), "data/taqdeer.db");
const db = new Database(dbPath, { readonly: true });

// Parse command line arguments
const args = process.argv.slice(2);
const chatIdArg = args.find((a) => a.startsWith("--chat_id="))?.split("=")[1] || process.env.TELEGRAM_CHAT_ID;
const textArg = args.find((a) => a.startsWith("--text="))?.split("=")[1];

interface TopMatch {
  home_team: string;
  away_team: string;
  league_name: string;
  utc_date: string;
  p_home: number;
  p_draw: number;
  p_away: number;
  confidence: number;
}

function getTopRecommendations(): TopMatch[] {
  const query = `
    SELECT ht.name_ar as home_team, at.name_ar as away_team,
           l.name_ar as league_name, m.utc_date,
           p.p_home, p.p_draw, p.p_away, p.confidence
    FROM matches m
    JOIN leagues l ON l.id = m.league_id
    JOIN teams ht ON ht.id = m.home_team_id
    JOIN teams at ON at.id = m.away_team_id
    JOIN predictions p ON p.match_id = m.id
    WHERE m.utc_date >= date('now')
    ORDER BY p.confidence DESC
    LIMIT 5;
  `;
  return db.query(query).all() as TopMatch[];
}

async function sendNotification(targetChatId: string, customMessage?: string) {
  let messageText = customMessage;

  if (!messageText) {
    const topMatches = getTopRecommendations();
    messageText = `🚀 <b>إشعار تلقائي من منصة «تقدير» ⚽📊</b>\n\n`;
    messageText += `أبرز التوصيات الخوارزمية ذات نسبة الثقة العالية:\n\n`;

    if (topMatches.length) {
      for (const m of topMatches) {
        const pH = Math.round(m.p_home * 100);
        const pD = Math.round(m.p_draw * 100);
        const pA = Math.round(m.p_away * 100);
        const conf = Math.round(m.confidence * 100);

        let rec = `فوز ${m.home_team}`;
        if (pA > pH && pA > pD) rec = `فوز ${m.away_team}`;
        if (pD > pH && pD > pA) rec = "التعادل";

        messageText += `🔹 <b>${m.home_team} × ${m.away_team}</b>\n`;
        messageText += `🏆 ${m.league_name}\n`;
        messageText += `🎯 التوصية: <b>${rec}</b> | الثقة: <b>${conf}%</b>\n`;
        messageText += `📈 الاحتمالات: 🏠 ${pH}% | 🤝 ${pD}% | ✈️ ${pA}%\n\n`;
      }
    } else {
      messageText += `لا تتوفر توقعات جديدة حالياً.\n`;
    }

    messageText += `🌐 للمزيد من التفاصيل والتحليلات: https://taqdeer.app`;
  }

  console.log(`📤 Sending Telegram Notification to Chat ID: ${targetChatId}...`);

  const res = await fetch(`${API_URL}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: targetChatId,
      text: messageText,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🌐 فتح منصة تقدير", url: "https://taqdeer.app" }],
        ],
      },
    }),
  });

  const responseData = await res.json();
  if (responseData.ok) {
    console.log("✅ Notification sent successfully!", responseData.result);
  } else {
    console.error("❌ Failed to send notification:", responseData);
  }
}

function getSubscribedChatIds(): string[] {
  try {
    const rows = db.query(`SELECT chat_id FROM telegram_subscribers`).all() as { chat_id: number }[];
    return rows.map((r) => String(r.chat_id));
  } catch {
    return [];
  }
}

async function main() {
  if (chatIdArg) {
    await sendNotification(chatIdArg, textArg);
  } else {
    const chatIds = getSubscribedChatIds();
    if (!chatIds.length) {
      console.log("⚠️ No active subscribers found in DB yet.");
      console.log("💡 افتح البوت @Taqdeerbot في تليغرام واضغط /start لاشتراك حسابك أوتوماتيكياً!");
      return;
    }

    console.log(`📢 Broadcasting notification to ${chatIds.length} active subscriber(s)...`);
    for (const id of chatIds) {
      await sendNotification(id, textArg);
    }
  }
}

main();
