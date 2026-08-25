import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Geist, Geist_Mono } from "next/font/google";
import { locale as localeParam } from "next/root-params";

import { routing } from "@/lib/i18n/routing";

import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app");

  return {
    // Needed to turn the social image path into an absolute URL. Falls back to
    // localhost so a local build stays quiet.
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    ),
    title: t("name"),
    description: t("description"),
    openGraph: {
      title: t("name"),
      description: t("description"),
      images: ["/og.png"],
    },
  };
}

// Required by Cache Components: every root parameter needs at least one value
// at build time, or the build fails.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
}: LayoutProps<"/[locale]">) {
  const locale = await localeParam();

  return (
    // Dark is the theme, not a preference: there is no switch yet. The light
    // tokens stay written and working, so turning this into a real toggle later
    // is adding the control, not redoing the system.
    <html
      lang={locale}
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
