import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "taqdeer.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

console.log("📰 Starting Taqdeer articles sync...");

db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    content_md TEXT NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT,
    author TEXT NOT NULL DEFAULT 'تـقـديـر',
    read_time_mins INTEGER NOT NULL DEFAULT 4,
    views_count INTEGER NOT NULL DEFAULT 0,
    is_featured INTEGER NOT NULL DEFAULT 0,
    published_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

const INITIAL_ARTICLES = [
  {
    id: "art-001",
    slug: "tactical-breakdown-possession-vs-counter",
    title: "التصادم التكتيكي: استحواذ مقابل مرتدات داخل ensemble-v3",
    summary:
      "كيف يترجم محرك التكتيك أنماط اللعب وPPDA التقريبي إلى مضاعفات λ مقيدة — بلا ادعاء xG تتبّعي.",
    category: "تحليل تكتيكي",
    imageUrl: "/crests/pl.svg",
    author: "تـقـديـر",
    readTimeMins: 5,
    viewsCount: 1420,
    isFeatured: 1,
    publishedAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    contentMd: `
# التصادم التكتيكي داخل تقدير

في تقدير لا ندّعي xG تتبّعي (Opta/StatsBomb). نعتمد على **مؤشر تسديدات موزون** و**PPDA تقريبي** من الإحصاءات الرسمية المجانية، مع مضاعفات تكتيكية **مقيّدة** حتى لا تطغى السردية على الإشارة الإحصائية.

---

### 1. صراع الأساليب

عندما يواجه فريق استحواذ فريقاً يتقن المرتدات، يحسب \`tactical_matchup.py\` مضاعفات أولية ثم يقيّدها إلى النطاق \`[0.97, 1.03]\` — ولا تُطبَّق أصلاً إلا إذا كان لكل فريق ≥8 مباريات بـPPDA تقريبي.

- فريق الاستحواذ قد يترك مساحات خلف الخط العالي.
- فرق التحول تستفيد من الاسترداد السريع — ضمن سقف صغير حتى لا نبالغ.

### 2. ما يدخل التقييم المنشور؟

مقاييس \`/accuracy\` تقيس اللبّ (DC + Pi + Elo + فورم + سوق + سياق إحصائي) **بلا** طقس/إصابات حية. صفحات المباريات قد تضيف الإثراء بعد \`fit\` أو إعادة التوقع عند تأكيد التشكيلة.

### 3. التوصية

اقرأ PPDA التقريبي ومؤشر التسديدات كـ**وكلاء**، لا كحقيقة تتبّعية — وراجع دائماً أوزان المكوّنات في صفحة المباراة.
`,
  },
  {
    id: "art-002",
    slug: "value-bets-kelly-criterion-guide",
    title: "غربال المحسوم والإرساء على إغلاق السوق الحاد",
    summary:
      "لماذا لا تُوصف مباراة بالمحسومة إلا باتفاق اللبّ والسوق، وكيف يُقاس كل توقع مقابل إغلاق بيناكل لا مقابل سعر أول.",
    category: "المحسوم والغربال",
    imageUrl: "/crests/pd.svg",
    author: "قسم الرياضيات والتحليل الكمي",
    readTimeMins: 5,
    viewsCount: 2100,
    isFeatured: 0,
    publishedAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    contentMd: `
# غربال المحسوم والإرساء على إغلاق السوق الحاد

تعتمد تقدير على مبدأ: **لا يقين مزيّف، ولا تنبيهات رهان**. سقف 1X2 الواقعي نحو 50–55٪. الدقة تأتي من إشارة أنظف وغربال صارم، لا من نموذج أعقد.

---

### 1. السوق الحاد بعد اللبّ لا داخله

اللبّ الإحصائي ($p_m$) يُعاير بحرارة مُتعلَّمة ثم يُدمج مع بيناكل/Betfair منزوع الهامش بوزن $\\alpha$. إن لم يتفوّق الدمج على الإغلاق في bootstrap مقترن يكون $\\alpha = 0$: الاحتمال المنشور هو السوق نفسه.

### 2. متى تُوصف المباراة بالمحسومة؟

اتفاق الجهة بين اللبّ والسوق، احتمال نهائي $\\ge \\theta$ المعايرة (تُرفع فقط)، فجوة محدودة، لا ديربي ولا غياب ركيزة ولا صاعد في أول 8 جولات، وعيّنة موسم $\\ge 6$ لكل طرف. كل ما عداه أرشيف «إشارة ضعيفة». الحافة مقابل السوق تُحسب للتشخيص فقط — بلا +EV ولا حصص كيلي.
`,
  },
];

const REMOVED_ARTICLE_IDS = ["art-003", "art-004"];
const insertStmt = db.prepare(`
  INSERT INTO articles (
    id, slug, title, summary, content_md, category, image_url,
    author, read_time_mins, views_count, is_featured, published_at, updated_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  )
  ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title,
    summary = excluded.summary,
    content_md = excluded.content_md,
    category = excluded.category,
    image_url = excluded.image_url,
    read_time_mins = excluded.read_time_mins,
    updated_at = excluded.updated_at;
`);

for (const removedId of REMOVED_ARTICLE_IDS) {
  db.prepare(`DELETE FROM articles WHERE id = ?`).run(removedId);
}

let inserted = 0;
for (const art of INITIAL_ARTICLES) {
  insertStmt.run(
    art.id,
    art.slug,
    art.title,
    art.summary,
    art.contentMd,
    art.category,
    art.imageUrl,
    art.author,
    art.readTimeMins,
    art.viewsCount,
    art.isFeatured,
    art.publishedAt,
    new Date().toISOString(),
  );
  inserted++;
}

/** Metrics-driven weekly note from local model_metrics / value_backtest / upcoming picks */
function upsertMetricsArticle() {
  type MetricRow = {
    window_label: string;
    n_matches: number;
    accuracy: number | null;
    brier: number | null;
    rps: number | null;
    model_version: string | null;
  };

  let overall: MetricRow | undefined;
  try {
    overall = db
      .prepare(
        `SELECT window_label, n_matches, accuracy, brier, rps, model_version
         FROM model_metrics
         WHERE league_id IS NULL
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get() as MetricRow | undefined;
  } catch {
    return;
  }

  const valueMeta = db
    .prepare(`SELECT value FROM app_meta WHERE key = 'value_backtest'`)
    .get() as { value: string } | undefined;
  let sieveCounts: Array<{ tier: string; n: number }> = [];
  try {
    sieveCounts = db
      .prepare(
        `SELECT p.sieve_tier AS tier, COUNT(*) AS n
         FROM predictions p
         JOIN matches m ON m.id = p.match_id
         WHERE m.status IN ('SCHEDULED','TIMED') AND p.sieve_tier IS NOT NULL
         GROUP BY p.sieve_tier`,
      )
      .all() as Array<{ tier: string; n: number }>;
  } catch {
    sieveCounts = [];
  }

  type PickRow = {
    home: string;
    away: string;
    league: string;
    p_home: number;
    p_draw: number;
    p_away: number;
    confidence: number;
  };
  let picks: PickRow[] = [];
  try {
    picks = db
      .prepare(
        `SELECT t1.name_en AS home, t2.name_en AS away, l.name_ar AS league,
                p.p_home, p.p_draw, p.p_away, p.confidence
         FROM predictions p
         JOIN matches m ON m.id = p.match_id
         JOIN teams t1 ON t1.id = m.home_team_id
         JOIN teams t2 ON t2.id = m.away_team_id
         JOIN leagues l ON l.id = m.league_id
         WHERE m.status IN ('SCHEDULED','TIMED')
           AND p.sieve_tier = 'banker'
           AND datetime(m.utc_date) BETWEEN datetime('now') AND datetime('now', '+7 days')
         ORDER BY MAX(COALESCE(p.p_home, 0), COALESCE(p.p_away, 0)) DESC
         LIMIT 5`,
      )
      .all() as PickRow[];
  } catch {
    picks = [];
  }

  if (!overall && picks.length === 0) return;

  const acc = overall?.accuracy != null ? (overall.accuracy * 100).toFixed(1) : "—";
  const brier = overall?.brier != null ? overall.brier.toFixed(3) : "—";
  const rps = overall?.rps != null ? overall.rps.toFixed(4) : "—";
  const n = overall?.n_matches ?? 0;
  const ver = overall?.model_version ?? "ensemble-v3";

  const sieveBlock =
    sieveCounts.length === 0
      ? "لا غربال منشور بعد آخر تدريب."
      : sieveCounts
          .map((r) => `- ${r.tier}: ${r.n}`)
          .join("\n");
  let valueBlock = "سياسة +EV أُوقفت؛ الحافة تُحسب للتشخيص فقط.";
  if (valueMeta?.value) {
    try {
      const vb = JSON.parse(valueMeta.value) as {
        total?: { n_bets?: number; pnl?: number; staked?: number };
        policy?: string;
      };
      const t = vb.total ?? {};
      valueBlock = `أرشيف قديم (${vb.policy ?? "—"}) — ${t.n_bets ?? 0} رهاناً تاريخياً، ليست تنبيهات حية.`;
    } catch {
      /* keep default */
    }
  }

  const pickLines =
    picks.length === 0
      ? "- لا مباراة اجتازت غربال المحسوم في الأيام السبعة القادمة."
      : picks
          .map((p) => {
            const side =
              p.p_home >= p.p_draw && p.p_home >= p.p_away
                ? `مضيف ${(p.p_home * 100).toFixed(0)}%`
                : p.p_away >= p.p_draw
                  ? `ضيف ${(p.p_away * 100).toFixed(0)}%`
                  : `تعادل ${(p.p_draw * 100).toFixed(0)}%`;
            return `- **${p.home} × ${p.away}** (${p.league}): ${side} · ثقة ${(p.confidence * 100).toFixed(0)}%`;
          })
          .join("\n");

  const weekKey = new Date().toISOString().slice(0, 10);
  const contentMd = `
# نشرة المقاييس الأسبوعية

مولَّدة تلقائياً من قاعدة \`data/taqdeer.db\` — ليست مقالاً صحفياً بشرياً.

## أداء walk-forward (${ver})

- النافذة: ${overall?.window_label ?? "—"}
- عدد المباريات: ${n}
- الدقة: ${acc}%
- Brier: ${brier}
- RPS: ${rps}

> هذه الأرقام تقيس اللبّ الإحصائي بلا إثراء حي (طقس/إصابات).

## غربال المحسوم على الجدول الحالي

${sieveBlock}

## ملاحظة عن سياسة القيمة

${valueBlock}

## محسوم خلال 7 أيام

${pickLines}
`;

  insertStmt.run(
    "art-metrics-weekly",
    "weekly-model-metrics",
    `نشرة المقاييس · ${weekKey}`,
    `ملخص تلقائي لدقة ${ver} وشرائح الغربال من القاعدة المحلية.`,
    contentMd,
    "مقاييس النموذج",
    "/crests/bl1.svg",
    "تـقـديـر · مولّد المقاييس",
    3,
    0,
    0,
    new Date().toISOString(),
    new Date().toISOString(),
  );
  inserted++;
  console.log("  ↳ metrics article upserted");
}

upsertMetricsArticle();

console.log(`✅ Articles sync complete: ${inserted} articles upserted.`);
db.close();
