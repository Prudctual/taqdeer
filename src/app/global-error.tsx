"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="h-full bg-[oklch(0.16_0.011_250)] font-sans antialiased text-[oklch(0.968_0.004_250)]">
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center min-h-screen">
          <h2 className="text-xl font-semibold">حدث خطأ في النظام</h2>
          <p className="text-sm opacity-70 max-w-md">
            نعتذر عن هذا الخطأ. يمكنك المحاولة مرة أخرى.
          </p>
          <button
            onClick={reset}
            className="px-4 py-2 rounded-lg text-sm" style={{ background: 'oklch(0.202 0.013 250)' }}
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  );
}
