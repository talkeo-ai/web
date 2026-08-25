import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Fredoka, Geist_Mono, Inter } from "next/font/google";
import { locale as localeParam } from "next/root-params";

import { routing } from "@/lib/i18n/routing";

import "../globals.css";

// One family for the whole surface, headings included. Variable, so the 400 of
// body text and the 600 of a display come out of a single file instead of two
// downloads. Self-hosted by `next/font` — served from our own origin, with the
// fallback metrics generated so swapping in the real face causes no reflow.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Displays only, paired against the neutral face of the interface so the
// headline reads warm and the body reads plain.
//
// Rounded and wide rather than rounded and tall: a narrow face gains its
// presence by stretching upward, which at display sizes reads as strain. This
// one is drawn broad, so the weight has somewhere to go sideways.
const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  display: "swap",
  // Ships the width axis as well as weight. Without asking for it the file
  // only carries 100%, and `font-stretch` further down silently does nothing.
  axes: ["wdth"],
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
      className={`dark ${inter.variable} ${fredoka.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
