import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

// عائلة واحدة للواجهة كلها
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "تقدير — تحليلات وتوقع مباريات الدوريات الكبرى",
    template: "%s · تقدير",
  },
  description:
    "احتمالات 1X2 وتوزيع النتائج للدوريات الأوروبية الخمس الكبرى والدوري الكوري، بنماذج Dixon–Coles وElo معايرة على نتائج حقيقية.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${arabic.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans antialiased">
        <SiteHeader />
        <main className="mx-auto w-full max-w-[1080px] flex-1 px-4 py-6 sm:py-8">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
