import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Geist_Mono, Inter, Outfit } from "next/font/google";
import { locale as localeParam } from "next/root-params";

import { routing } from "@/lib/i18n/routing";
import { ThemeKeeper } from "@/components/theme-keeper";
import { themeBootstrapScript } from "@/lib/theme";

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

// Displays only, paired against the neutral face of the interface.
//
// Geometric and drawn broad: a narrow face gains its presence by stretching
// upward, which at display sizes reads as strain, and this one has somewhere
// for the weight to go sideways.
//
// The register lives in the terminals. Rounded ones read friendly and, at any
// weight that gives a display real presence, tip into childish; these are cut
// flat, so the warmth has to come from the round bowls underneath rather than
// from the endings. That is what lets one face address a company and a casual
// learner without picking a side.
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
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
    // The theme is a class on this element, written before hydration by the
    // script below, so React hydrates against a class list it did not render.
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} ${outfit.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Plain inline script, first thing in the body: the parser runs it
            where it stands. `next/script` only promises before hydration,
            which is already after the first paint. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        <NextIntlClientProvider>
          {/* The script above is never re-run on a client navigation, and
              switching language is one. This puts the class back. */}
          <ThemeKeeper />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
