import { pct, pctCss } from "@/lib/format";
import { RevealOnView } from "./RevealOnView";

type Comp = {
  p: [number, number, number];
  label: string;
};

const TONE = ["var(--home)", "var(--draw)", "var(--away)"] as const;

function rowPick(p: [number, number, number]): "H" | "D" | "A" {
  if (p[0] >= p[1] && p[0] >= p[2]) return "H";
  if (p[2] >= p[0] && p[2] >= p[1]) return "A";
  return "D";
}

/** مقياس صغير — الأرجح صريح والباقي خافت */
function MiniBar({ p }: { p: [number, number, number] }) {
  const max = Math.max(p[0], p[1], p[2]);
  return (
    <div className="prob-track h-1.5" aria-hidden>
      {p.map((value, i) => (
        <div
          key={i}
          className={`prob-fill ${value === max ? "" : "prob-fill-dim"}`}
          style={{ width: pctCss(value), background: TONE[i] }}
        />
      ))}
    </div>
  );
}

export function SignalBreakdown({
  components,
  pickKey,
}: {
  components: Record<string, { p?: [number, number, number] | null }>;
  /** قراءة المزيج — تمييز الاتفاق / الخلاف */
  pickKey?: "H" | "D" | "A";
}) {
  const rows: Comp[] = [
    { label: "Dixon–Coles", p: components.dixon_coles?.p ?? null },
    { label: "Pi-ratings", p: components.pi_ratings?.p ?? null },
    { label: "Elo", p: components.elo?.p ?? null },
    { label: "الفورم", p: components.form?.p ?? null },
    { label: "السوق", p: components.market?.p ?? null },
  ].filter((r): r is Comp => r.p != null);

  if (!rows.length) return null;

  const agreeCount =
    pickKey != null
      ? rows.filter((r) => rowPick(r.p) === pickKey).length
      : null;

  return (
    <RevealOnView>
      {agreeCount != null ? (
        <p className="border-b border-line px-4 py-2.5 text-[11px] text-muted sm:px-5">
          <span className="font-medium tabular text-ink">
            {agreeCount}/{rows.length}
          </span>{" "}
          إشارات متفقة مع المزيج
          <span className="mx-1.5 text-line" aria-hidden>
            ·
          </span>
          <span className="text-accent">متفق</span>
          <span className="mx-1 text-line" aria-hidden>
            /
          </span>
          <span className="text-faint">خالف</span>
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <caption className="sr-only">
            توزيع كل إشارة على 1X2 قبل المزج
          </caption>
          <thead>
            <tr className="border-b border-line bg-panel">
              <th scope="col" className="type-label px-4 py-2 text-start sm:px-5">
                الإشارة
              </th>
              <th scope="col" className="type-label w-[34%] px-3 py-2 text-start">
                التوزيع
              </th>
              <th
                scope="col"
                className="type-label w-[4.5rem] px-2 py-2 text-center whitespace-nowrap"
              >
                <span className="tabular">1</span> مضيف
              </th>
              <th
                scope="col"
                className="type-label w-[4.5rem] px-2 py-2 text-center whitespace-nowrap"
              >
                <span className="tabular">X</span> تعادل
              </th>
              <th
                scope="col"
                className="type-label w-[4.5rem] px-2 py-2 pe-4 text-center whitespace-nowrap sm:pe-5"
              >
                <span className="tabular">2</span> ضيف
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const max = Math.max(r.p[0], r.p[1], r.p[2]);
              const agrees = pickKey != null && rowPick(r.p) === pickKey;
              const disagrees = pickKey != null && !agrees;
              return (
                <tr
                  key={r.label}
                  className="motion-colors border-b border-line last:border-b-0 hover:bg-panel"
                >
                  <th
                    scope="row"
                    className="px-4 py-2.5 text-start text-sm font-medium text-ink sm:px-5"
                  >
                    {r.label}
                    {agrees ? (
                      <span className="ms-2 text-[10px] font-medium text-accent">
                        متفق
                      </span>
                    ) : disagrees ? (
                      <span className="ms-2 text-[10px] font-medium text-faint">
                        خالف
                      </span>
                    ) : null}
                  </th>
                  <td className="px-3 py-2.5">
                    <MiniBar p={r.p} />
                  </td>
                  {r.p.map((value, i) => (
                    <td
                      key={i}
                      className={`px-2 py-2.5 text-center tabular ${
                        i === 2 ? "pe-4 sm:pe-5" : ""
                      } ${value === max ? "font-semibold" : "text-muted"}`}
                      style={value === max ? { color: TONE[i] } : undefined}
                    >
                      {pct(value)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </RevealOnView>
  );
}
