import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteSidebar } from "@/components/SiteSidebar";
import { ThemeProvider } from "@/components/ThemeContext";
import { AdvancedModeProvider } from "@/components/AdvancedModeContext";
import { CommandMenu } from "@/components/CommandMenu";
import "./globals.css";

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "تقدير — منصة وتوقعات كرة القدم العالمية",
    template: "%s · تقدير",
  },
  description:
    "احتمالات 1X2 وتوزيع النتائج للدوريات الأوروبية الخمس الكبرى بنماذج Dixon–Coles وElo معايرة على نتائج حقيقية.",
  metadataBase: new URL("https://taqdeer.app"),
  openGraph: {
    type: "website",
    locale: "ar_SA",
    url: "https://taqdeer.app",
    siteName: "تقدير",
    title: "تقدير — منصة وتوقعات كرة القدم العالمية",
    description:
      "احتمالات 1X2 وتوزيع النتائج للدوريات الأوروبية الخمس الكبرى بنماذج Dixon–Coles وElo معايرة على نتائج حقيقية.",
  },
  twitter: {
    card: "summary_large_image",
    title: "تقدير — منصة وتوقعات كرة القدم العالمية",
    description:
      "احتمالات 1X2 وتوزيع النتائج للدوريات الأوروبية الخمس الكبرى بنماذج Dixon–Coles وElo معايرة على نتائج حقيقية.",
  },
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
      <body className="h-full bg-bg font-sans antialiased">
        <ThemeProvider>
          <AdvancedModeProvider>
            {/* Command Menu Modal (Cmd+K) */}
            <CommandMenu />

            {/* Dashboard Shell */}
            <div className="flex h-full">
              {/* Sidebar — Desktop only */}
              <SiteSidebar />

              {/* Content Area — scrollable */}
              <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
                <SiteHeader />
                <main className="mx-auto w-full max-w-[var(--content-max)] flex-1 px-4 py-6 sm:px-6 sm:py-8">
                  {children}
                </main>
                <SiteFooter />
              </div>
            </div>
          </AdvancedModeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
