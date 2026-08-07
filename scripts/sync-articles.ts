import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "taqdeer.db");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

console.log("📰 Starting Taqdeer Automated Sports Articles & Analysis Generator...");

// Ensure articles table exists
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
    title: "التصادم التكتيكي: كيف تُفكك أسلوب الضغط العالي مع محاكاة Dixon-Coles؟",
    summary: "تحليل كمّي شامل للمواجهات التكتيكية بين فرق الاستحواذ الكثيف وفرق المرتدات السريعة في الدوريات الأوروبية الخمس الكبرى.",
    category: "تحليل تكتيكي",
    imageUrl: "/crests/pl.svg",
    author: "تـقـديـر",
    readTimeMins: 6,
    viewsCount: 1420,
    isFeatured: 1,
    publishedAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
    contentMd: `
# التصادم التكتيكي: كيف تُفكك أسلوب الضغط العالي مع محاكاة Dixon-Coles؟

في كرة القدم الحديثة، لم يعد التفوق الإحصائي محصوراً في نسبة الاستحواذ التقليدية، بل في **جودة وصناعة الأهداف المتوقعة (xG)** تحت تأثير الضغط العالي والمواجهات التكتيكية المباشرة.

---

### 🧠 1. صراع الأساليب: الاستحواذ ضد الهجمات المرتدة

عندما يواجه فريق يستحوذ بنسبة تزيد عن **62%** فريقاً يتقن التحول السريع، تشير مخرجات محرك \`tactical_matchup.py\` إلى المعادلة التالية:

- **المخاطرة الدفاعية لفريق الاستحواذ:** تترك مساحات شاسعة خلف خط الدفاع العالي، مما يرفع الأهداف المتوقعة للخصم ($\mu_{\\text{away}}$) بمقدار **+5%**.
- **نجاعة المرتدات:** فرق التحول الخاطف تسجل معدل تحويل تسديدات إلى أهداف بنسبة **34%** مقارنة بالمتوسط العام (28%).

> *"الاستحواذ بلا اختراع مساحات هو مجرد تدوير سلبي للكرة يمنح المنافس وقتاً لتنظيم الكتلة الدفاعية."*

---

### 📊 2. نتائج المحاكاة من نموذج Dixon-Coles الهجين

بتحليل **1,000 مباراة** سابقة عبر الدوريات الخمس الكبرى:

1. **المباريات متكافئة التقييم (Tight Contests):** عندما يكون فارق Elo أقل من 55 نقطة، ترتفع احتمالات التعادل المعايرة إلى **31.5%**.
2. **عامل الإرهاق وتتابع المباريات:** الفرق التي تخوض مباراتها الثانية خلال أقل من 84 ساعة تعاني من تراجع في معدل التهديف المتوقع ($\lambda$) بنسبة **6.8%**.

---

### 🎯 3. التوصية التحليلية

متابعة مؤشرات الضغط العالي (PPDA) ومعدل الراحة بين المباريات تمنح المحلل العربي رؤية أعمق من مجرد متابعة نتائج الأسابيع السابقة.
`,
  },
  {
    id: "art-002",
    slug: "value-bets-kelly-criterion-guide",
    title: "هندسة إشارات القيمة (+EV) وحصة كيلي الربعية في الأسواق الرياضية",
    summary: "دليل كمّي وعلمي لاستخراج فرص القيمة وحماية المحفظة المالية باستخدام حاسبة Quarter-Kelly ورفع عائد الاستثمار على المدى الطويل.",
    category: "فرص القيمة +EV",
    imageUrl: "/crests/pd.svg",
    author: "قسم الرياضيات والتحليل الكمي",
    readTimeMins: 5,
    viewsCount: 2100,
    isFeatured: 0,
    publishedAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
    contentMd: `
# هندسة إشارات القيمة (+EV) وحصة كيلي الربعية في الأسواق الرياضية

تعتمد المنصات المالية الكمية على مبدأ أساسي: **لا توجد مراهنة مضمونة، بل توجد فرص ذات قيمة متوقعة إيجابية (+EV)**.

---

### 📐 1. ما هي فرصة القيمة المتوقعة (+EV)؟

تتحقق فرصة القيمة عندما يكون احتمال النموذج المعاير ($P$) أعلى من الاحتمال الضمني الذي تعكسه أسعار السوق ($P_{\\text{market}}$) بعد إزالة هامش ربح المراهن عبر خوارزمية Power Method:

$$\\text{EV} = (P \\times \\text{Odds}) - 1.0$$

عندما يكون $\\text{EV} \\ge +3\\%$, تعتبر الإشارة ذات جودة وقيمة تستحق المتابعة.

---

### 🛡️ 2. حماية المحفظة بحصة كيلي الربعية (Quarter-Kelly)

لحماية رأس المال من التقلبات العشوائية، نطبق معيار كيلي الموزون بنسبة 25%:

$$f^* = 0.25 \\times \\left( \\frac{P \\times b - (1 - P)}{b} \\right)$$

حيث $b = \\text{Odds} - 1.0$.

- **النطاق الموثوق:** يتم قبول الإشارات فقط إذا كانت القيمة المتوقعة بين **3% و 15%**.
- **الاستبعاد التلقائي:** أي إشارة تتجاوز 15% تُستبعد تلقائياً لأنها تشير إلى نقطة عمياء في البيانات (مثل تدوير كامل للتشكيلة أو جولات ميتة).
`,
  },
];

// مقالات قديمة عن ميزات أو دوريات حُذفت (الدوري الكوري، نظام تشكيلات RAPM الوهمي) — تُزال نهائياً
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
    new Date().toISOString()
  );
  inserted++;
}

console.log(`✅ Articles sync complete: Updated ${inserted} exclusive analytical articles.`);
db.close();
