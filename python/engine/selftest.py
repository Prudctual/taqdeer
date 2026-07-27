"""فحص ذاتي سريع لمنطق v3 — يفشل بصوت عالٍ إن انكسر المنطق."""

from .ensemble import DEFAULT_WEIGHTS, blend_components, fit_weights, value_signal
from .evaluate import rps
from .form import FormMatch, TeamForm, form_lambda_adjust, rolling_form


def main() -> None:
    # قطبية الفورم: ga/sot_against مستقبَلة، ودفاع الخصم المنهار يرفع λ لا يخفضه
    f = rolling_form([FormMatch("H", "A", 3, 0, sot_home=8, sot_away=1)])
    assert (f["H"].gf, f["H"].ga, f["H"].sot_against) == (3.0, 0.0, 1.0), f["H"]
    assert (f["A"].gf, f["A"].ga, f["A"].sot_against) == (0.0, 3.0, 8.0), f["A"]

    def tf(gf, ga, sf, sa):
        return TeamForm(pts=1.0, gd=gf - ga, gf=gf, ga=ga, sot_for=sf, sot_against=sa, n=5)

    avg = tf(1.3, 1.3, 3.5, 3.5)
    leaky = tf(1.3, 3.0, 3.5, 7.0)
    tight = tf(1.3, 0.2, 3.5, 1.5)
    assert form_lambda_adjust(avg, leaky)[0] > form_lambda_adjust(avg, tight)[0]
    assert form_lambda_adjust(leaky, avg)[1] > form_lambda_adjust(tight, avg)[1]

    # RPS: توقع مؤكد صحيح = 0، والتوزيع المنتظم قيمة معروفة مغلقة الصيغة
    assert rps([(1.0, 0.0, 0.0)], ["H"]) == 0.0
    expected = ((2 / 3) ** 2 + (1 / 3) ** 2) / 2
    assert abs(rps([(1 / 3, 1 / 3, 1 / 3)], ["H"]) - expected) < 1e-12

    # المزج: مجموع 1 مع تجاهل مكوّن غائب (سوق بلا أسعار)
    u = (1 / 3, 1 / 3, 1 / 3)
    p = blend_components(
        {"dc": (0.5, 0.3, 0.2), "pi": u, "elo": u, "form": u, "market": None},
        DEFAULT_WEIGHTS,
    )
    assert abs(sum(p) - 1.0) < 1e-9

    # تعلّم الأوزان: مكوّن صادق دوماً يكسب وزناً فوق الافتراضي
    comps, outs = [], []
    for i in range(120):
        o = "H" if i % 2 == 0 else "A"
        truth = (0.8, 0.1, 0.1) if o == "H" else (0.1, 0.1, 0.8)
        comps.append({"dc": truth, "pi": u, "elo": u, "form": u, "market": None})
        outs.append(o)
    w = fit_weights(comps, outs)
    assert abs(sum(w.values()) - 1.0) < 1e-9
    assert w["dc"] > DEFAULT_WEIGHTS["dc"], w

    # كيلي: أفضلية ضمن النطاق الموثوق → رهان بحصة ربعية
    v = value_signal((0.6, 0.2, 0.2), (1.75, 4.0, 6.0))
    assert v is not None and v["side"] == "home" and v["bet"], v
    assert 0 < v["stake"] <= v["kelly"]
    # سعر عادل → لا رهان؛ وأفضلية متطرفة (نقطة عمياء) → لا رهان أيضاً
    v2 = value_signal((0.5, 0.25, 0.25), (2.0, 4.0, 4.0))
    assert v2 is not None and not v2["bet"]
    v3 = value_signal((0.6, 0.2, 0.2), (3.0, 4.0, 6.0))
    assert v3 is not None and v3["ev"] > 0.15 and not v3["bet"]

    print("selftest ok")


if __name__ == "__main__":
    main()
