"use client";

export default function TeamError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <h2 className="type-page text-ink">تعذر تحميل بيانات الفريق</h2>
      <p className="text-muted text-sm max-w-md">
        قد يكون الفريق غير متاح أو حدث خطأ أثناء جلب البيانات.
      </p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-surface text-ink text-sm hover:bg-panel transition-colors"
        >
          إعادة المحاولة
        </button>
        <a
          href="/"
          className="px-4 py-2 rounded-lg bg-accent/10 text-accent text-sm hover:bg-accent/20 transition-colors"
        >
          الصفحة الرئيسية
        </a>
      </div>
    </div>
  );
}
