import { redirect } from "next/navigation";

/**
 * صفحة «فرص القيمة (+EV)» أُوقفت (خطة 006 §و): المنصة لا تنشر تنبيهات رهان
 * ولا حصص كيلي؛ الحافة مقابل السوق تُحسب للتشخيص فقط. الروابط القديمة تُحوَّل
 * إلى غربال «المحسوم».
 */
export default function ValueMatchesPage() {
  redirect("/hasr");
}
