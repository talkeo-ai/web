import { getTranslations } from "next-intl/server";

/**
 * Blank slate. The landing gets rebuilt from here.
 *
 * The page reads nothing that depends on the request, so it prerenders whole —
 * `next build` reports it as static. Keep it that way: anything
 * visitor-specific belongs behind a `<Suspense>` boundary.
 */
export default async function LandingPage() {
  const t = await getTranslations();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
      <h1 className="text-4xl font-semibold tracking-tight">{t("app.name")}</h1>
      <p className="text-muted-foreground">{t("landing.tagline")}</p>
    </main>
  );
}
