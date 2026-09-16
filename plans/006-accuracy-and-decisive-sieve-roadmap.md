# 006 — خطة تطوير «تقدير»: دقة أعلى بإشارة أنظف وغربال محسوم

**الحالة:** منفَّذة في المحرك والمنتج · **الأولوية:** عالية · **النطاق:** المحرك + خط البيانات + المنتج + التشغيل
**المرجع:** متطلبات «ما تحتاجه المنصة لدقة توقعات أعلى» (البنود أ–و)
**تاريخ التشخيص:** 2026-09-12 · النسخة الحية `ensemble-v5` (α=0 على كل الدوريات بعد حزام 2022→2026)

---

## 0. لماذا هذه الخطة الآن — تشخيص الواقع بالأرقام

قبل أي تطوير، هذا ما يقوله الكود وقاعدة البيانات اليوم (`data/taqdeer.db`، `model_metrics`، `app_meta`):

### 0.1 السوق يتفوّق على النموذج في 5 من 7 دوريات

| الدوري | Brier النموذج (آخر 100) | Brier «السوق» | الفارق | الحكم |
|---|---|---|---|---|
| pl | 0.6234 | 0.5967 | +0.027 | السوق أفضل بوضوح (T=1.98 = النموذج يقول «لا أعرف») |
| pd | 0.5940 | 0.5731 | +0.021 | السوق أفضل |
| ded | 0.5927 | 0.5772 | +0.016 | السوق أفضل |
| bl1 | 0.6154 | 0.6048 | +0.011 | السوق أفضل |
| ppd | 0.5983 | 0.5852 | +0.013 | السوق أفضل |
| fl1 | 0.6441 | 0.6441 | 0.000 | تعادل |
| sa | 0.5797 | 0.5799 | −0.000 | تعادل |

**والأخطر:** خط «السوق» المقارَن به هنا ليس خط الإغلاق أصلاً (انظر 0.3)، بل سعر بيناكل المبكر. مقابل الإغلاق الحقيقي الفجوة ستكون أوسع.

### 0.2 المعايرة مكسورة تحديداً في شريحة «المحسوم»

من `app_meta.calibration_bins` (n=700 walk-forward):

| الشريحة المعلَنة | متوسط ما قلناه | ما أصبناه فعلاً | الخطأ | n |
|---|---|---|---|---|
| 50–54.9٪ | 52.2٪ | 55.2٪ | +3.0 | 96 |
| 55–59.9٪ | 57.1٪ | **51.7٪** | **−5.4** | 60 |
| 60–69.9٪ | 65.0٪ | **54.8٪** | **−10.2** | 84 |
| 70–79.9٪ | 74.9٪ | 75.9٪ | +1.0 | 54 |
| 80٪+ | 84.8٪ | **71.0٪** | **−13.8** | 31 |

حين نقول 65٪ نصيب 55٪. حين نقول 85٪ نصيب 71٪. هذه هي الشريحة التي يُبنى عليها «المحسوم» اليوم — وهي الأسوأ معايرةً.

### 0.3 خط الإغلاق المخزَّن ليس خط إغلاق (عيب بيانات جوهري)

- `scripts/sync-data.ts` (السطور 673–682) يقرأ `PSH/PSD/PSA` (بيناكل **المبكر**) ويكتبه في **ثلاثة** أعمدة معاً: `odds_open_*` و`odds_sharp_*` و`odds_close_*`.
- النتيجة: `odds_open_home = odds_close_home` في 1930/1930 مباراة بالبريميرليغ (وكذلك بقية الدوريات ~99.9٪).
- ملفات CSV الخام في `data/raw/` تحوي **الإغلاق الحقيقي غير المستخدم**: `PSCH/PSCD/PSCA` (بيناكل إغلاق)، `AvgCH`، `MaxCH`، `B365CH`، وأسواق فوق/تحت وآسيوي إغلاقاً: `PC>2.5`، `PC<2.5`، `AHCh`، `PCAHH/PCAHA`.
- للمباريات القادمة: لا يُلتقط إغلاق عند الصافرة؛ بعد `FINISHED` يُملأ العمود بـ `COALESCE(sharp, current)` (`run_enrichment.py` السطر 182 و`sync-data.ts` السطر 1613) — أي إغلاق مُختلَق.
- **الأثر:** كل CLV و`nll_edge_vs_close` المنشور الآن بلا معنى، وكل مقارنة «مقابل الإغلاق» في المتطلبات غير قابلة للتنفيذ قبل إصلاح هذا.

### 0.4 أوزان الدمج لا تُتعلَّم فعلياً

- `fit_weights` في `ensemble.py` تُدرَّب على **~100 مباراة** لكل دوري (النصف الأول من نافذة تقييم 200) مع ridge نحو الأوزان الافتراضية → تخرج قريبة من الافتراضي دائماً. وزن السوق 0.11–0.13 رغم أنه أفضل إشارة منفردة.
- الفورم **مقفول قسراً عند 20٪** بلا دليل خارج العيّنة — يخالف مبدأ «إن لم يُحسِّن، وزنه صفر».
- `temp_over25` يضرب السقف 4.0 في pl وsa = نموذج فوق/تحت مُسطَّح تماماً (لا إشارة).

### 0.5 طبقة «سياق» ثقيلة غير مُثبتة

`predict_match` يضرب λ بـ **تسعة** مضاعفات متسلسلة (H2H، عشب اصطناعي ×1.05، حارس، مدرب، تكتيك، طقس، غيابات، حكم، «مباراة ضيقة» ×0.94) ويضيف مكافأة ثقة للـsteam، ثم `draw_boost` حتى +8 نقاط **بعد** المعايرة الحرارية — فيكسر المعايرة التي حُسبت قبله. لا واحد منها مرّ باختبار ablation خارج العيّنة.

### 0.6 مؤشرات أخرى

- التعادل هو التوقع الأعلى في **411/2209 = 18.6٪** من التوقعات الحالية (بسبب `draw_boost`) — بينما لا يُختار أبداً كبنكر. تناقض داخلي.
- backtest سياسة +EV: 267 رهاناً، **−0.169 وحدة** على 4.60 مستثمرة (ROI ≈ −3.7٪). سياسة القيمة تخسر.
- `prediction_snapshots` صف واحد لكل مباراة (`UNIQUE match_id`) — لا لقطات إعلان/تشكيلة/إغلاق.
- عتبة المرشح في `model2.py`: p ≥ 0.44 وفجوة ≥ 0.04 — بعيدة جداً عن الـ60٪ المطلوبة.
- لا فحص ديربي، لا فحص «عمود المفضّل»، لا فحص عيّنة بداية موسم في الغربال.

**الخلاصة:** المشكلة ليست نقص نماذج، بل خط أساس مغشوش، وتعقيد غير مُثبت، وعتبة حسم متساهلة. الخطة تعالج هذا بالترتيب.

---

## 1. المبادئ الحاكمة وقرارات التصميم

1. **الإغلاق الحاد هو الحَكَم.** كل مقياس منشور يُقاس مقابل بيناكل إغلاقاً (منزوع الهامش). لا استثناء.
2. **إثبات قبل إضافة.** أي مكوّن (مضاعف λ، إشارة، عامل) يبقى مُطفأً حتى يُحسِّن log-loss خارج العيّنة بفارق ذي دلالة (bootstrap مزدوج 95٪) أو يُحسِّن CLV. الافتراضي = 1.0 / صفر وزن.
3. **السوق ليس مكوّناً بين ستة، بل مرساة.** الدمج يصير `logit-pool` بوزن واحد α لكل دوري يُتعلَّم على walk-forward طويل؛ إن لم يربح النموذج على السوق → α = 0 ويُنشر «السوق وحده» صراحةً.
4. **مقياسان لا يُخلطان:** تغطية كاملة (كل المباريات) ≠ شريحة المحسوم. جدولان، لوحتان، تقريران.
5. **المعايرة تُحسب آخر شيء.** لا تعديل احتمالي بعد الحرارة. أي تعديل تعادل/عشوائية يدخل قبلها أو لا يدخل.
6. **الغربال يُقصي أكثر مما يُرشِّح.** «محسوم» = تقاطع صارم؛ ما دونه أرشيف أو «إشارة ضعيفة»، لا ترشيح ولا بارلي.
7. **لا يقين مزيّف.** يُحذف كل مؤشر اصطناعي للثقة (`selectionScore`، `confidence` التوليفي) ويُعرض الاحتمال المُعاير مع نطاق الخطأ.

---

## 2. المراحل

> التقديرات بالأسابيع بافتراض مطوّر واحد بمساعدة وكلاء. كل مرحلة لها بوابة قبول قابلة للقياس؛ لا تبدأ التالية قبل اجتيازها.

### المرحلة 0 — إيقاف النزيف: خط أساس صادق (أسبوع 1)

الهدف: أن يصبح «مقابل الإغلاق» جملة صحيحة.

| # | المهمّة | الملفات | القبول |
|---|---|---|---|
| 0.1 | قراءة `PSCH/PSCD/PSCA` كـ`odds_close_*`، و`PSH/PSD/PSA` كـ`odds_sharp_*` (مبكر)، و`AvgH` كـ`odds_home`. إضافة أعمدة `close_max_*`, `close_avg_*`, `close_b365_*` للمرجعية. إعادة تعبئة كامل التاريخ (11.6k). | `scripts/sync-data.ts` (~660–690, ~1100–1115), `scripts/enrichment/run_enrichment.py` (~320–390) | `SELECT count(*) WHERE odds_open_home = odds_close_home` أقل من 5٪ من المباريات المنتهية |
| 0.2 | **إزالة** كل `COALESCE(odds_close, odds_sharp, odds_home)` — لا إغلاق مُختلَق. إن لم يوجد إغلاق حقيقي → `NULL` ويُستثنى من مقاييس الإغلاق. | `run_enrichment.py` 171–188, `sync-data.ts` 1604–1619 | لا صفوف مُولّدة اصطناعياً بعد المزامنة |
| 0.3 | قراءة أسواق الإغلاق الإضافية من CSV: `PC>2.5/PC<2.5`, `AHCh`, `PCAHH/PCAHA` → جدول `closing_lines` (§3). | `sync-data.ts` جديد `ingestClosingLines()` | تغطية ≥ 95٪ للمباريات المنتهية منذ 2022/23 |
| 0.4 | التقاط الإغلاق حياً للمباريات القادمة: وظيفة `capture_closing` تُستدعى T−10 دقيقة من الانطلاق: آخر سعر بيناكل من API-Football (`/odds?fixture=`, bookmaker id=4) أو fixtures.csv كبديل؛ تُكتب في `closing_lines(source='live')`. بعد المباراة، `PSCH` من CSV يستبدلها كـ`authoritative`. | `scripts/capture_closing.py` (جديد) + إدخال في `ecosystem.config.js` | كل مباراة لها صف إغلاق قبل الصافرة بـ ≤ 15 دقيقة لـ ≥ 90٪ من مباريات الجولة |
| 0.5 | نزع الهامش: إضافة **Shin** إلى `calibrate.py` بجوار Power؛ اختيار الطريقة لكل دوري بأقل log-loss على التاريخ الكامل مقابل النتائج. | `python/engine/calibrate.py` | جدول مقارنة محفوظ في `app_meta.demargin_method` |
| 0.6 | إعادة حساب `model_metrics` بالإغلاق الحقيقي وتصحيح تسمية «السوق» في `/accuracy` إلى «إغلاق بيناكل». | `scripts/fit-and-predict.py` 1816–1846, `src/app/accuracy/page.tsx` | لوحة الدقة تعرض الفجوة الصادقة |
| 0.7 | تجميد فوري لما يكسر المعايرة: `draw_boost` بعد الحرارة (`ensemble.py` 774–781, 805–810) ← 0. إيقاف تنبيهات +EV في `mlops_pipeline.py` (backtest سالب). | `ensemble.py`, `mlops_pipeline.py` | نسبة «التعادل كأعلى توقع» تهبط إلى ما يفسّره النموذج نفسه (≈ 2–5٪) |

**بوابة القبول:** `/accuracy` يعرض مقاييس النموذج مقابل إغلاق بيناكل الحقيقي لكل دوري، وCLV محسوب من سعرين مختلفين فعلاً.

### المرحلة 1 — منصّة القياس: backtest طويل ولقطات زمنية (أسابيع 2–3)

الهدف: إجابة «هل هذا يُحسِّن؟» تصير سؤالاً آلياً بـ CI، لا رأياً.

| # | المهمّة | الملفات | القبول |
|---|---|---|---|
| 1.1 | استخراج **حزام walk-forward** إلى وحدة مستقلة: rolling-origin على كل المواسم من 2022/23 (≈ 1,200–1,500 مباراة تقييم لكل دوري، ≈ 9k إجمالاً) بدل «آخر 100». إعادة ملاءمة DC كل جولة، Elo/Pi/فورم تتقدّم زمنياً، فاصل زمني بين التدريب والتقييم. | `python/engine/backtest.py` (جديد)؛ `fit-and-predict.py` يستهلكه | تشغيل كامل ≤ 40 دقيقة على جهاز التطوير؛ نتائج JSON قابلة للمقارنة بين نسختين |
| 1.2 | **Ablation harness:** كل مضاعف λ وكل مكوّن خلف علم تشغيل؛ أمر واحد يطبع Δlog-loss وΔBrier وΔCLV مع bootstrap 95٪ لكل علم. | `python/engine/backtest.py`, أعلام في `predict_match` | تقرير `data/reports/ablation-<date>.json` |
| 1.3 | **لقطات زمنية** — جدول `prediction_timeline` (§3) بثلاث أنواع: `announce` (أول ظهور سعر للجولة)، `lineup` (T−60 دقيقة بعد التشكيلة)، `close` (T−10). كل لقطة تحفظ: احتمال النموذج (لبّ)، احتمال السوق منزوع الهامش، الفجوة، الاحتمال النهائي المدموج، السعر ومصدره، هل هو محسوم ولماذا. | `fit-and-predict.py` (كتابة)، `run_enrichment.py` (طبقة جديدة T−60)، `capture_closing.py` | ≥ 90٪ من مباريات الجولة لها اللقطات الثلاث |
| 1.4 | **مقياسان منفصلان:** جدول `daily_metrics` بنطاق `coverage` و`banker` لكل (يوم، دوري، نوع لقطة): Brier، log-loss، RPS، accuracy، مقابلها للإغلاق، CLV، skill score = 1 − Brier/Brier_close. | `scripts/evaluate_daily.py` (جديد، يعمل ليلياً في PM2) | صفوف يومية منذ إطلاق المرحلة؛ لا دمج بين النطاقين في أي واجهة |
| 1.5 | **منحنى معايرة حقيقي** بفواصل ثقة (Wilson) لكل شريحة، لكل دوري، ولكل نوع لقطة؛ يُحسب من الحزام الطويل لا من 700 مباراة. | `evaluate.py` (`calibration_bins` + CI), `CalibrationBinsWidget.tsx` | الشرائح ≥ 60٪ لها n ≥ 300 تاريخياً |

**بوابة القبول:** تقرير ablation أوّل يُصنّف كل مكوّن حالي: يُحسِّن / بلا أثر / يُضِر.

### المرحلة 2 — تنظيف المحرك ولصقه بالسوق (أسابيع 3–5)

الهدف: نموذج أصغر وأدق من نموذج أكبر وأضعف.

| # | المهمّة | التفاصيل | القبول |
|---|---|---|---|
| 2.1 | **تطبيق نتائج ablation:** كل مكوّن في خانة «بلا أثر / يُضِر» يُطفأ افتراضياً (يبقى في الكود كخيار). المرشّحون المتوقَّعون للإطفاء: عشب ×1.05، تخفيض «المباراة الضيقة»، H2H، مضاعف الحكم، مضاعف المدرب، مضاعف التكتيك، steam bonus، `confidence` التوليفي. | `ensemble.py` | log-loss التغطية الكاملة يتحسّن أو يثبت مع مكوّنات أقل |
| 2.2 | **دمج مرساة السوق (`logit-pool`):** `log p_final ∝ α·log p_model + (1−α)·log p_sharp`، α ∈ [0,1] لكل دوري ولكل نوع لقطة، يُتعلَّم على الحزام الطويل بتقسيم متداخل. إن كان `LL(α*) − LL(0)` غير ذي دلالة → **α = 0** ويُعرض «السوق وحده» في `/accuracy`. يحلّ محل نظام الأوزان الستة + قفل الفورم 20٪. | `ensemble.py`, `fit-and-predict.py` `load/save_fit_params` | α منشور لكل دوري؛ الفورم بلا حصة ثابتة |
| 2.3 | **انكماش بداية الموسم (Elo/Pi):** التقييم المستعمل للتوقع = `w·prior + (1−w)·current` حيث `w = max(0, 1 − n_season/8)`، prior = نهاية الموسم السابق بعد الارتداد 33٪ (موجود) أو بذرة الصاعدين (موجودة). يُستبدل `early_season_boost` (K×1.35 — يزيد التقلّب بدل خفضه) بهذا. | `elo.py`, `pi_ratings.py`, `fit-and-predict.py` | Δlog-loss موجب على مباريات الجولات 1–8 في الحزام |
| 2.4 | **DC بانكماش موسمي واندثار مُعاير لكل دوري:** (أ) الـridge يشدّ هجوم/دفاع الفريق نحو تقديره في الموسم السابق لا نحو الصفر عند `n_season` صغيرة؛ (ب) بحث شبكي `half_life ∈ {90,120,150,200,270}` لكل دوري بأقل log-loss walk-forward، يُحفظ في `fit_params`. | `dixon_coles.py`, `fit-and-predict.py` (`HALF_LIFE` ثابت 140 حالياً) | half-life مختلف لكل دوري ومُبرَّر بالرقم |
| 2.5 | **محرك قوة أحدث من الأهداف:** (أ) الإبقاء على DC-xG (Understat) للخمس الكبرى وتجربة وزنه داخل `_blend_lambdas` بالتعلّم لا بالثوابت 0.40/0.16/…؛ (ب) توسيع xG التتبّعي إلى ppd/ded عبر FotMob `matchDetails` للمباريات المنتهية (الكاش موجود، 9/187 ملفاً يحوي xG — يحتاج التحقق من التغطية)؛ (ج) تجربة Elo على هامش xG بدل هامش الأهداف كإشارة إضافية — تُقبل فقط إن ربحت في ablation. | `_blend_lambdas`, `understat_client.py`, `fotmob_client.py`, `elo.py` | كل تغيير له سطر في تقرير ablation |
| 2.6 | **طبقة الأحداث كتعديل على λ لا استبدال:** تبقى فقط: غياب/تشكيلة مؤكدة (`player_impact`), ازدحام 7 أيام، إيقاف/طرد سابق، تغيير مدرب (كتعديل انكماش نحو المتوسط لا كـ«bounce»)، طقس قاسٍ (أمطار/ريح فوق عتبة). كل واحدة بمعامل واحد يُتعلَّم أو يُثبَّت من الأدب ويُختبر. | `player_impact.py`, `logistics_engine.py`, `weather_engine.py` | ما لا يمرّ يُطفأ |
| 2.7 | **معالجة انحياز التعادل:** (أ) لا تعديل تعادل بعد الحرارة؛ (ب) رأس ثنائي مستقل للتعادل (logistic على |λh−λa|، λh+λa، الدوري) مُعاير ويُستعمل **للإقصاء** في الغربال لا للترشيح؛ (ج) نشر «نسبة التعادل كأعلى توقع» مقابل نسبة التعادل الفعلية (~25٪) في `/accuracy`. | `ensemble.py`, `evaluate.py` | التعادل لا يُختار بنكراً أبداً، ويُقصي المباراة إذا `p_draw ≥ 0.30` |
| 2.8 | **فوق/تحت وآسيوي من λ مقابل بيناكل:** معايرة O/U 2.5 وAH المشتقة من مصفوفة DC مقابل `PC>2.5`, `PCAHH` تاريخياً؛ استبدال حرارة O2.5 الضاربة للسقف بمعايرة على الحزام الطويل. | `python/engine/markets.py` (جديد), `dixon_coles.markets_from_matrix` | Brier ثنائي ≤ السوق + 0.005 أو يُعرض السوق وحده |

**بوابة القبول:** على الحزام الطويل ولكل دوري: `Brier_model ≤ Brier_close + 0.005` **أو** α = 0 معلَن. لا دوري يُنشر بمزيج يخسر أمام إغلاقه.

### المرحلة 3 — غربال المحسوم v2 (أسابيع 5–6)

الهدف: تعريف تشغيلي واحد، صارم، مكتوب في الكود لا في الواجهة.

| # | المهمّة | التفاصيل |
|---|---|---|
| 3.1 | **وحدة `sieve.py`** — دالة نقية `evaluate_banker(match_ctx) → {is_banker, reasons_passed[], reasons_failed[], tier}` تُستدعى عند كل لقطة زمنية وتُحفظ في `prediction_timeline`. القواعد في §5. | `python/engine/sieve.py` (جديد) |
| 3.2 | **قائمة الديربي** لكل دوري في `scripts/data/derbies.json` (أزواج معرّفات فرق). أمثلة: pl: Arsenal–Tottenham, Liverpool–Everton, Man City–Man United, Liverpool–Man United · pd: Real Madrid–Barcelona, Real Madrid–Atlético, Sevilla–Betis, Athletic–Real Sociedad · sa: Inter–Milan, Roma–Lazio, Juventus–Torino · bl1: Bayern–Dortmund, Köln–Gladbach, Hamburg–Bremen · fl1: PSG–Marseille, Nice–Monaco · ppd: Benfica–Porto, Benfica–Sporting, Porto–Sporting · ded: Ajax–Feyenoord, Ajax–PSV, Feyenoord–PSV. | `scripts/data/derbies.json` (جديد) |
| 3.3 | **«عمود المفضّل»:** الأعمدة = الحارس الأساسي + أعلى لاعبَين بـ`player_strength.strength`. أي غياب مؤكَّد (`player_availability` طبقة C، أو غيابه من `lineup_json` في لقطة T−60) يُقصي المباراة من المحسوم. | `sieve.py`, يقرأ `player_availability`, `player_strength`, `match_enrichment.lineup_json` |
| 3.4 | **صدمة عيّنة بداية الموسم:** المفضّل صاعد → مُقصى في الجولات 1–8؛ أي فريق `n_season < 6` → مُقصى؛ `days_into_season < 45` → العتبة θ تُرفع +0.05 تلقائياً. | `sieve.py` |
| 3.5 | **معايرة الدوري كبوابة:** جدول `league_calibration` (§3): لكل دوري، على نافذة متحرّكة (آخر 150 محسوم أو 2 مواسم تاريخياً): `slice_hit − slice_stated`، Brier الشريحة مقابل الإغلاق، α. الحالة: `active` (خطأ ≤ 5 نقاط وBrier ≤ الإغلاق) / `watch` / `off`. الدوريات في `watch/off` تظهر رمادية بلا ترشيح. بذرة أولية من الحزام التاريخي. | `evaluate_daily.py`, `sieve.py` |
| 3.6 | **العتبة θ:** ابدأ 0.60 لكل دوري. قاعدة الرفع فقط: إن كانت `slice_hit < slice_stated − 5` على آخر 150 محسوم → θ += 0.02. لا خفض آلي. تُنشر θ الحالية لكل دوري. | `league_calibration.theta` |
| 3.7 | **قائمة «تكرر الفوز»:** جدول `team_streaks`: سلسلة فوز الفريق حين كان مفضّلاً محسوماً؛ تُكسر آلياً عند: خسارة/تعادل كمفضّل، أو `p_sharp(team) < 0.50` في مباراته القادمة، أو انغلاق الفجوة (`p_model − p_sharp < 0`), أو غياب عمود. تُحدَّث ليلياً وتُعرض كمعلومة لا كإشارة مستقلة. | `scripts/evaluate_daily.py`, `team_streaks` |
| 3.8 | **أسواق أذكى عند صخب 1X2:** إذا فشلت المباراة في الغربال بسبب `p_draw ≥ 0.30` فقط، تُقيَّم بديلاً على 1X/X2 أو AH −0.5/+0.5 أو O/U من §2.8 بالعتبة نفسها (≥ θ وموافقة السوق). تُعرض في تبويب منفصل «بديل» لا مع المحسوم. | `markets.py`, `sieve.py` |
| 3.9 | **مصير Model 2 (30 عاملاً):** يبقى كتفكيك تفسيري في صفحة المباراة فقط. ترتيب المرشحين يصير بالاحتمال المُعاير النهائي؛ «الموثوقية» تُحذف من الترتيب إلا إن أثبت الحزام أنها تتنبأ بالإصابة بعد ضبط p (اختبار واحد في المرحلة 1). | `model2.py`, `queries.ts getBankerPicks` |

**بوابة القبول (تاريخي):** على الحزام الطويل، الشريحة التي يمرّرها `sieve.py` تحقق `hit ≥ stated − 3` لكل دوري `active`، وBrier ثنائي للاختيار ≤ الإغلاق. **بوابة القبول (حي):** تُراجَع بعد 150 محسوماً فعلياً (≈ 8–12 أسبوعاً بسعة 10–20 محسوم/أسبوع).

### المرحلة 4 — التغذية الراجعة والمنتج (أسابيع 6–8)

| # | المهمّة | التفاصيل |
|---|---|---|
| 4.1 | **تحقيق آلي عند فشل شريحة ≥ 70٪:** عند أي محسوم مُعلَن ≥ 70٪ يخسر، يُكتب صف في `banker_incidents` يحوي: p عند اللقطات الثلاث، p السوق عند الإغلاق، هل تغيّرت التشكيلة بين T−60 والإغلاق، الغيابات، الأحداث (طرد مبكر، ركلة جزاء)، وحكم أولي: `variance` (السوق أيضاً كان ≥ 65٪) / `signal` (النموذج وحده كان مرتفعاً) / `news` (تغيّر بين اللقطات). ملخص Telegram للمشرف. | `scripts/evaluate_daily.py`, `banker_incidents` |
| 4.2 | **تقرير يومي وأسبوعي:** يومياً: Brier/LL/RPS للتغطية والمحسوم مقابل الإغلاق، CLV بحسب اللقطة، عدد المحسوم/الإصابات، الحوادث. أسبوعياً: منحنى المعايرة، θ وα لكل دوري، حالة الدوريات، قائمة تكرار الفوز. | Telegram (المشرف فقط) + `data/reports/` |
| 4.3 | **`/hasr` → «المحسوم»:** الجولة الحالية فقط (`keepCurrentRound` موجود)؛ لكل محسوم: الاختيار، p النهائي، p السوق، الفجوة، θ الدوري، القواعد التي مرّ بها؛ تبويب «إشارة ضعيفة» للأرشيف؛ تبويب «بديل» لأسواق §3.8. **إزالة** البارلي والاستراتيجيات الأربع (`safety/value/balanced/traps`) من الصفحة؛ يبقى «مختبر البارلي» صفحة تجريبية مستقلة بوسم واضح وبلا ترويج. | `src/app/hasr/page.tsx`, `HasrTerminalView.tsx`, `queries.ts getConfinedPlatformData` |
| 4.4 | **`/accuracy`:** لوحتان جنباً إلى جنب (تغطية / محسوم) لا تُدمَجان؛ منحنى معايرة بفواصل ثقة؛ α وθ وحالة كل دوري؛ CLV بحسب اللقطة؛ نسبة التعادل كأعلى توقع مقابل الفعلي؛ skill score مقابل الإغلاق. | `src/app/accuracy/page.tsx`, مكوّنات الرسوم |
| 4.5 | **`/value` و+EV:** تُخفى من التنقّل أو تُوسم «تجريبي — backtest سالب» حتى يتحقق ROI > 0 على ≥ 500 رهان walk-forward. | `SiteSidebar.tsx`, `src/app/value/page.tsx` |
| 4.6 | **`/match/[id]`:** شريط اللقطات الثلاث (إعلان/تشكيلة/إغلاق) مع p النموذج وp السوق والفجوة؛ إشارة «محسوم/ضعيف/مُقصى» مع السبب. | `src/app/match/[id]/page.tsx` |
| 4.7 | **Telegram العام:** بث المحسوم فقط مع p والفجوة وθ؛ لا EV ولا كيلي ولا بارلي. | `scripts/telegram-bot.ts` |
| 4.8 | **`/methodology` وREADME:** تحديث لوصف المرساة السوقية، α، θ، اللقطات، وتعريف المحسوم بالحرف. | `methodology/page.tsx`, `README.md` |

**بوابة القبول:** مستخدم يفتح `/hasr` يرى ≤ 10 مباريات في الجولة، لكل واحدة سبب صريح، ورقم يطابق ما سيُقاس به لاحقاً.

### المرحلة 5 — الحوكمة المستمرة (بعد الأسبوع 8)

- **دورة أسبوعية ثابتة:** إعادة تعلّم α وhalf-life وT على الحزام الطويل؛ مراجعة حالة الدوريات؛ رفع θ حيث يلزم.
- **قاعدة الإضافة الوحيدة:** لا يُدمج أي مكوّن جديد إلا مع سطر في تقرير ablation يُظهر تحسّناً ذا دلالة.
- **مراجعة فصلية:** هل ما زال α > 0 في أي دوري؟ إن لا، المنتج يصير «قراءة السوق بلغة عربية شفافة» — وهو منتج مشروع ومفيد.

---

## 3. مخطط البيانات الجديد

```sql
-- لقطات زمنية متعددة (تحلّ محل صف prediction_snapshots الوحيد تدريجياً)
CREATE TABLE prediction_timeline (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id),
  snapshot_kind TEXT NOT NULL CHECK (snapshot_kind IN ('announce','lineup','close')),
  snapshot_at TEXT NOT NULL,
  -- لبّ النموذج بلا سوق
  pm_home REAL, pm_draw REAL, pm_away REAL,
  -- السوق الحاد منزوع الهامش وقت اللقطة
  ps_home REAL, ps_draw REAL, ps_away REAL,
  odds_home REAL, odds_draw REAL, odds_away REAL, odds_source TEXT,
  -- النهائي بعد logit-pool
  pf_home REAL, pf_draw REAL, pf_away REAL, alpha REAL,
  pick TEXT, p_pick REAL, gap_pick REAL,           -- pm(pick) − ps(pick)
  is_banker INTEGER NOT NULL DEFAULT 0,
  banker_tier TEXT,                                 -- 'banker' | 'weak' | 'excluded' | 'alt-market'
  sieve_json TEXT,                                  -- القواعد التي مرّت/فشلت
  model_version TEXT NOT NULL,
  UNIQUE(match_id, snapshot_kind)
);

-- خطوط الإغلاق (مصدر واحد للحقيقة)
CREATE TABLE closing_lines (
  match_id TEXT NOT NULL REFERENCES matches(id),
  source TEXT NOT NULL,                             -- 'pinnacle-csv' | 'pinnacle-live' | 'avg-csv' | 'betfair'
  is_authoritative INTEGER NOT NULL DEFAULT 0,      -- PSCH من CSV = 1
  oh REAL, od REAL, oa REAL,
  ou_line REAL, ou_over REAL, ou_under REAL,
  ah_line REAL, ah_home REAL, ah_away REAL,
  captured_at TEXT NOT NULL,
  PRIMARY KEY (match_id, source)
);

-- مقياسان منفصلان يومياً
CREATE TABLE daily_metrics (
  date TEXT NOT NULL, league_id TEXT,               -- NULL = كل الدوريات
  scope TEXT NOT NULL CHECK (scope IN ('coverage','banker')),
  snapshot_kind TEXT NOT NULL,
  n INTEGER NOT NULL,
  brier REAL, log_loss REAL, rps REAL, accuracy REAL,
  close_brier REAL, close_log_loss REAL, close_rps REAL,
  skill_vs_close REAL,                              -- 1 − brier/close_brier
  clv_mean REAL, clv_n INTEGER,
  hit_rate REAL, stated_mean REAL,                  -- للمحسوم
  PRIMARY KEY (date, league_id, scope, snapshot_kind)
);

-- حالة كل دوري (بوابة الغربال)
CREATE TABLE league_calibration (
  league_id TEXT PRIMARY KEY,
  theta REAL NOT NULL DEFAULT 0.60,
  alpha_announce REAL, alpha_lineup REAL, alpha_close REAL,
  dc_half_life REAL, demargin_method TEXT,
  slice_n INTEGER, slice_hit REAL, slice_stated REAL, slice_brier REAL, slice_close_brier REAL,
  status TEXT NOT NULL CHECK (status IN ('active','watch','off')),
  updated_at TEXT NOT NULL
);

-- تحقيق آلي
CREATE TABLE banker_incidents (
  id TEXT PRIMARY KEY, match_id TEXT NOT NULL, league_id TEXT NOT NULL, date TEXT NOT NULL,
  stated_p REAL NOT NULL, close_market_p REAL, outcome TEXT NOT NULL,
  verdict TEXT CHECK (verdict IN ('variance','signal','news','unknown')),
  evidence_json TEXT NOT NULL, created_at TEXT NOT NULL
);

-- تكرار الفوز
CREATE TABLE team_streaks (
  team_id TEXT PRIMARY KEY, league_id TEXT NOT NULL,
  streak_len INTEGER NOT NULL DEFAULT 0,
  last_win_at TEXT, last_break_at TEXT, break_reason TEXT,
  updated_at TEXT NOT NULL
);
```

الأعمدة الجديدة في `matches`: `close_max_home/draw/away`, `close_avg_home/draw/away`, `close_b365_home/draw/away` (مرجعية فقط). تبقى `odds_close_*` = بيناكل إغلاقاً حصراً.

---

## 4. تعريفات المقاييس (ثابتة، تُكتب مرة وتُستعمل في كل مكان)

| المقياس | التعريف | أين يُحسب |
|---|---|---|
| Brier (3 فئات) | `Σ (p_k − y_k)²` متوسطاً | `evaluate.brier_score` (موجود) |
| log-loss | `−log p_outcome` | `evaluate.log_loss` (موجود) |
| RPS | ترتيب H<D<A | `evaluate.rps` (موجود) |
| Brier/LL الإغلاق | نفس الصيغ على `closing_lines` منزوعة الهامش (بيناكل authoritative) | `evaluate.summarize_with_closing` (يُصحَّح ليقرأ الجدول الجديد) |
| skill vs close | `1 − Brier_model / Brier_close` (سالب = أسوأ من السوق) | `evaluate_daily.py` |
| CLV | `pf(pick, at snapshot) − p_close_fair(pick)` لكل لقطة | `sharp_market.closing_line_value` (موجود، يُطعَم بإغلاق حقيقي) |
| معايرة الشريحة | لكل شريحة: `hit − stated` مع فاصل Wilson 95٪ | `evaluate.calibration_bins` + CI |
| ECE | متوسط موزون لخطأ الشرائح | موجود |
| نسبة التعادل كأعلى توقع | `count(argmax = D) / n` مقابل `count(outcome = D) / n` | جديد |
| دلالة التحسّن | bootstrap مزدوج (paired) على فرق log-loss، 2,000 عيّنة، 95٪ | `backtest.py` |

**قاعدة النشر:** أي رقم يظهر في الواجهة يخرج من `daily_metrics` أو من تقرير الحزام — لا يُحسب داخل `queries.ts`.

---

## 5. التعريف التشغيلي لـ«محسوم فوز»

```python
def evaluate_banker(ctx) -> SieveResult:
    """يُستدعى عند كل لقطة؛ الحكم النهائي لقطة 'close'."""
    rules = []
    lc = ctx.league_calibration                      # league_calibration row

    # 0. بوابة الدوري
    rules += [("league_active", lc.status == "active")]

    # 1. اتفاق الجهة: النموذج (لبّ) والسوق الحاد منزوع الهامش على نفس الجهة، وليست تعادلاً
    pick_m = argmax(ctx.pm); pick_s = argmax(ctx.ps)
    rules += [("same_side", pick_m == pick_s and pick_m != "D")]

    # 2. العتبة المُعايرة على الاحتمال النهائي المدموج
    theta = lc.theta + (0.05 if ctx.days_into_season < 45 else 0.0)
    rules += [("p_final_ge_theta", ctx.pf[pick_m] >= theta)]

    # 3. لصق بالسوق: لا خلاف كبير في الحجم، والسوق نفسه يرى مفضّلاً واضحاً
    rules += [("gap_bounded", abs(ctx.pm[pick_m] - ctx.ps[pick_m]) <= 0.08)]
    rules += [("market_favourite", ctx.ps[pick_m] >= 0.55)]

    # 4. ليست 50–50 ولا مصيدة تعادل
    p_sorted = sorted(ctx.pf, reverse=True)
    rules += [("not_coin_flip", p_sorted[0] - p_sorted[1] >= 0.20)]
    rules += [("draw_head_low", ctx.p_draw_head < 0.30)]

    # 5. ليست ديربي
    rules += [("not_derby", (ctx.home_id, ctx.away_id) not in ctx.derbies)]

    # 6. عمود المفضّل حاضر (حارس أساسي + أعلى لاعبَين قوةً)
    rules += [("pillars_available", not ctx.favourite_pillar_missing)]

    # 7. لا صدمة عيّنة أول الموسم
    rules += [("not_promoted_early", not (ctx.fav_is_promoted and ctx.fav_round <= 8))]
    rules += [("season_sample_ok", ctx.fav_n_season >= 6 and ctx.opp_n_season >= 6)]

    passed = all(ok for _, ok in rules)
    if passed:                              tier = "banker"
    elif only_failed(rules, {"draw_head_low", "not_coin_flip"}):
                                            tier = "alt-market"   # يُقيَّم على 1X/X2/AH/OU
    elif failed(rules, "league_active") or failed(rules, "same_side"):
                                            tier = "excluded"
    else:                                   tier = "weak"
    return SieveResult(tier=tier, rules=rules, theta=theta)
```

**ثوابت البداية** (تُراجَع بعد الحزام التاريخي، لا تُغيَّر يدوياً بعده): `theta=0.60`, `gap_max=0.08`, `market_fav_min=0.55`, `coin_flip_gap=0.20`, `draw_head_max=0.30`, `promoted_rounds=8`, `min_season_n=6`.

**ما يُعرض للمستخدم:** الاختيار، `pf`، `ps`، الفجوة، θ الدوري، والقواعد الثماني بعلامة مرّ/فشل. لا «درجة موثوقية»، لا «Selection Score»، لا نسب مئوية غير الاحتمال المُعاير.

---

## 6. التشغيل والبنية

| العنصر | اليوم | بعد الخطة |
|---|---|---|
| PM2 | web, auto-sync (ساعياً: sync+fit كامل), telegram, enrich, live-poll | + `taqdeer-evaluate` (ليلي 03:00 UTC) · `capture_closing` كطبقة داخل `taqdeer-enrich` تعمل T−60 وT−10 لكل مباراة قادمة · `fit` الكامل يصير يومياً لا ساعياً (إعادة ملاءمة DC ساعياً بلا نتائج جديدة عبث)، وساعياً فقط `--refresh-live` + لقطات |
| المفاتيح | API-Football (خطة مجانية 100 طلب/يوم) | ≈ 70 مباراة/أسبوع × 2 لقطة = 140 طلب/أسبوع — ضمن الحد. Betfair Exchange اختياري (مفتاح متأخر مجاني) كمصدر ثانٍ للإغلاق في مرحلة لاحقة |
| الحزام الطويل | — | يعمل على جهاز التطوير (الخادم 1GB لـNode)؛ نتائجه JSON تُرفع مع النشر |
| الفحوص | `bun run check` (TS + selftest + eslint) | + `selftest` يغطي: نزع الهامش Shin/Power، `evaluate_banker` على حالات حدّية، مطابقة `PSCH` ≠ `PSH` في عيّنة، عدم وجود COALESCE إغلاق |
| هيكلة الكود (ممكِّن لا هدف) | `fit-and-predict.py` 2,203 سطراً، `queries.ts` 3,095 | استخراج `backtest.py`, `sieve.py`, `markets.py`, `evaluate_daily.py`, `capture_closing.py`؛ لا إعادة كتابة، الاستخراج يحدث حيث تحتاجه المهام أعلاه |
| نظافة | `__pycache__` يحوي وحدات محذوفة (`season`, `rapidapi_feeds`, `understat_provider`, …) | يُحذف من المستودع ويُضاف لـ`.gitignore` إن لم يكن |

---

## 7. ما لا يُطلب (وما يُزال أو يُجمَّد صراحةً)

- **لا** مطاردة 80٪ على كل مباريات الجولة. الهدف المُعلَن: تغطية كاملة ≈ Brier الإغلاق، ومحسوم ≈ ما نقوله (±3 نقاط).
- **لا** نماذج ML إضافية قبل أن يربح النموذج الحالي المُنظَّف أمام الإغلاق في دوري واحد على الأقل.
- **لا** نسب يقينية، ولا «موثوقية 87٪»، ولا «Selection Score 94».
- **يُزال من الواجهة/البث:** توصيات البارلي النصية، الأودز الأمريكية، حصة كيلي، «مصيدة القيمة» كوسم ترويجي، الاستراتيجيات الأربع.
- **يُجمَّد افتراضياً حتى الإثبات:** كل مضاعف λ في §0.5، `draw_boost`، `steam_confidence_bonus`، `confidence` التوليفي، قفل الفورم 20٪.
- **لا** إغلاق مُختلَق بأي `COALESCE`.

---

## 8. المخاطر والافتراضات

| الخطر | الأثر | التخفيف |
|---|---|---|
| بعد الإصلاح، α = 0 في أغلب الدوريات | «النموذج» يصير عرضاً للسوق | هذا نتيجة صادقة لا فشل؛ القيمة عندها في الغربال واللقطات والشفافية العربية. الأدب يقول السقف ~50–55٪ والسوق الحاد غالباً الأفضل |
| بطء تراكم المحسوم (10–20/أسبوع) | حكم «الاستقرار» يحتاج 2–3 أشهر | البذرة من الحزام التاريخي (≈ 9k مباراة) تعطي θ وα أوّليين موثوقين قبل الإطلاق |
| حدود API المجانية / تغيّر FotMob | فقدان لقطة إغلاق أو تشكيلة | fixtures.csv كبديل للإعلان؛ `PSCH` من CSV يصلح الإغلاق بعدياً؛ اللقطة الناقصة تُسجَّل `NULL` ولا تُختلق |
| تغطية xG خارج الخمس الكبرى | ppd/ded على وكلاء التسديد | التحقق من تغطية FotMob أولاً (مهمة 2.5-ب) قبل الاعتماد؛ وإلا يبقى الوكيل مع الإعلان عنه |
| نحن في الجولة ~4 (بداية موسم) | الغربال في وضع «مراقبة» حتى منتصف أكتوبر بحكم قاعدة 6–8 جولات | يُعلَن ذلك في الواجهة صراحةً؛ المرحلتان 0–1 لا تحتاجان محسوماً حياً |
| كسر التوافق مع `prediction_snapshots` الحالي | صفحات الأرشيف | يُبقى الجدول القديم للقراءة حتى نهاية المرحلة 4 ثم يُهجَر بعد ترحيل `close` منه |

---

## 9. ترتيب التنفيذ المختصر

1. **أسبوع 1:** 0.1 → 0.7 (إغلاق حقيقي، أسواق CSV، التقاط حي، Shin، تجميد `draw_boost`، إيقاف EV).
2. **أسبوعان 2–3:** 1.1 حزام طويل → 1.2 ablation → 1.3 لقطات → 1.4 مقياسان → 1.5 منحنى معايرة. **تقرير ablation الأول.**
3. **أسابيع 3–5:** 2.1 تطبيق الإطفاء → 2.2 logit-pool α → 2.3/2.4 انكماش واندثار → 2.7 تعادل → 2.5/2.6/2.8 بالتوازي وفق نتائج ablation.
4. **أسبوعان 5–6:** 3.1 `sieve.py` → 3.2–3.4 ديربي/عمود/عيّنة → 3.5/3.6 بوابة الدوري وθ → 3.7 تكرار الفوز → 3.8 بديل → 3.9 مصير Model 2.
5. **أسبوعان 6–8:** 4.1 تحقيق آلي → 4.2 تقارير → 4.3–4.7 واجهة وبث → 4.8 توثيق.
6. **بعدها:** حوكمة §المرحلة 5.

**تعريف النجاح بعد 3 أشهر من الإطلاق الحي:** لكل دوري `active`، شريحة المحسوم (n ≥ 150) تصيب ضمن ±3 نقاط من متوسطها المُعلَن، وBrier الشريحة ≤ Brier إغلاق بيناكل على نفس المباريات؛ والتغطية الكاملة لا تخسر أمام الإغلاق بأكثر من 0.005 Brier في أي دوري مُدمَج (α > 0).
