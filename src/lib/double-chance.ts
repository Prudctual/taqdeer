/** حساب وعرض توصيات الفرصة المزدوجة من نسب 1X2 */

export type DcCode = "1X" | "X2" | "12";

export type DoubleChanceOption = {
  code: DcCode;
  p: number;
  /** عنوان قصير للواجهة */
  title: string;
  /** شرح مبسّط بالعربية */
  explain: string;
  /** متى تفوز هذه الفرصة */
  winsIf: string;
};

export type DoubleChanceBundle = {
  options: DoubleChanceOption[];
  /** الأعلى احتمالاً */
  best: DoubleChanceOption;
  p1x: number;
  px2: number;
  p12: number;
};

export function buildDoubleChance(
  pHome: number,
  pDraw: number,
  pAway: number,
  homeName = "المضيف",
  awayName = "الضيف",
): DoubleChanceBundle {
  const p1x = pHome + pDraw;
  const px2 = pDraw + pAway;
  const p12 = pHome + pAway;

  const options: DoubleChanceOption[] = (
    [
      {
        code: "1X" as const,
        p: p1x,
        title: "مضيف أو تعادل",
        explain: `${homeName} يفوز أو يتعادل`,
        winsIf: `يفوز ${homeName} أو تنتهي بالتعادل — تخسر فقط إذا فاز ${awayName}`,
      },
      {
        code: "X2" as const,
        p: px2,
        title: "تعادل أو ضيف",
        explain: `${awayName} يفوز أو يتعادل`,
        winsIf: `يفوز ${awayName} أو تنتهي بالتعادل — تخسر فقط إذا فاز ${homeName}`,
      },
      {
        code: "12" as const,
        p: p12,
        title: "فوز أحد الطرفين",
        explain: `أحد الفريقين يفوز (بدون تعادل)`,
        winsIf: `يفوز ${homeName} أو ${awayName} — تخسر فقط عند التعادل`,
      },
    ] satisfies DoubleChanceOption[]
  ).sort((a, b) => b.p - a.p);

  return {
    options,
    best: options[0]!,
    p1x,
    px2,
    p12,
  };
}
