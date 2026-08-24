import { getTranslations } from "next-intl/server";

/**
 * Placeholder. The landing is built next, on top of this.
 *
 * It reads nothing request-dependent, so it prerenders whole — `next build`
 * should report it as static.
 */
export default async function LandingPage() {
  const t = await getTranslations("landing");

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <p className="text-muted-foreground text-sm">{t("placeholder")}</p>
    </main>
  );
}
