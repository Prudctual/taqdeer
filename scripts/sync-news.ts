import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "taqdeer.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

console.log("📰 Starting Taqdeer Real-Time Live Sports News Fetcher with Arabic Auto-Translation...");

db.exec(`
  CREATE TABLE IF NOT EXISTS news (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    source_name TEXT NOT NULL,
    source_url TEXT,
    category TEXT NOT NULL DEFAULT 'أخبار عامة',
    published_at TEXT NOT NULL,
    image_url TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_news_published ON news(published_at DESC);
`);

type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  category: string;
};

const FEEDS = [
  {
    name: "BBC Sport",
    category: "أخبار الدوريات",
    url: "http://feeds.bbci.co.uk/sport/football/rss.xml",
  },
  {
    name: "Sky Sports",
    category: "انتقالات",
    url: "https://www.skysports.com/rss/12040",
  },
];

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>?/gm, "").replace(/\s+/g, " ").trim();
}

async function translateEnToAr(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return text;
  // If already contains Arabic text, return directly
  if (/[\u0600-\u06FF]/.test(text)) return text;

  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(text)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });
    clearTimeout(timer);

    if (!res.ok) return text;
    const json = (await res.json()) as Array<Array<[string, string]>>;
    const translated = json[0]?.map((part) => part[0]).join("") || text;
    return translated.trim();
  } catch {
    return text;
  }
}

async function fetchRssFeed(feedUrl: string, sourceName: string, category: string): Promise<RSSItem[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; TaqdeerNews/1.0)",
      },
    });
    clearTimeout(timer);

    if (!res.ok) return [];
    const xml = await res.text();

    const items: RSSItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1] || "";
      const titleM = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const linkM = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
      const descM = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
      const dateM = itemXml.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i);

      const title = stripHtml(titleM?.[1] || "");
      const link = (linkM?.[1] || "").trim();
      const description = stripHtml(descM?.[1] || title);
      const pubDate = dateM?.[1] ? new Date(dateM[1]).toISOString() : new Date().toISOString();

      if (title && title.length > 5) {
        items.push({
          title,
          link,
          description,
          pubDate,
          source: sourceName,
          category,
        });
      }
    }

    return items.slice(0, 10);
  } catch {
    return [];
  }
}

async function syncNews() {
  let count = 0;

  // Clear older English non-translated entries if any
  db.exec(`DELETE FROM news WHERE title GLOB '*[a-zA-Z]*'`);

  // أخبار مفبركة قديمة كانت تُزرع منسوبة لمصادر حقيقية — تُحذف نهائياً ولا تُنشأ بعد الآن
  db.exec(`DELETE FROM news WHERE id IN ('news-001', 'news-002', 'news-003', 'news-004')`);

  const insertStmt = db.prepare(`
    INSERT INTO news (id, title, summary, source_name, source_url, category, published_at, image_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      summary = excluded.summary,
      source_url = excluded.source_url,
      published_at = excluded.published_at
  `);

  // Fetch live RSS items and translate to Arabic
  for (const feed of FEEDS) {
    const rssItems = await fetchRssFeed(feed.url, feed.name, feed.category);
    for (let i = 0; i < rssItems.length; i++) {
      const item = rssItems[i]!;
      const id = `news-rss-${feed.name.toLowerCase().replace(/\s+/g, "")}-${i}`;

      console.log(`🌐 Translating news [${feed.name}]: "${item.title.slice(0, 40)}..."`);

      const arTitle = await translateEnToAr(item.title);
      const arSummary = await translateEnToAr(item.description || item.title);

      insertStmt.run(
        id,
        arTitle,
        arSummary,
        item.source,
        item.link,
        item.category,
        item.pubDate,
        null,
        new Date().toISOString()
      );
      count++;
    }
  }

  console.log(`✅ Live News sync complete: Translated and stored ${count} real-time Arabic news items.`);
  db.close();
}

syncNews().catch(console.error);
