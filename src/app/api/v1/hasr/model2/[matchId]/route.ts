import { NextResponse } from "next/server";
import { getModel2Report } from "@/lib/queries";

export const revalidate = 20;

/**
 * عوامل النموذج 2 الثلاثون لمباراة واحدة.
 * لائحة الحصر تغطي كامل الجدول القادم، وشحن هذه العوامل لكل مباراة فيه يضيف
 * ميغابايتات لا تُقرأ؛ فتُطلب من هنا عند فتح بطاقة المباراة فقط.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const model2 = getModel2Report(matchId);

    if (!model2) {
      return NextResponse.json(
        { status: "error", message: "لم يُحسب النموذج 2 لهذه المباراة" },
        { status: 404 }
      );
    }

    return NextResponse.json({ status: "ok", matchId, model2 });
  } catch (error) {
    console.error("Error in /api/v1/hasr/model2 route:", error);
    return NextResponse.json(
      { status: "error", message: "Failed to load Model 2 report" },
      { status: 500 }
    );
  }
}
