import { getTranslations } from "next-intl/server";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/i18n/navigation";

/**
 * The home: where the onboarding's close control leads, and where a learner
 * lands after it. A starting frame to iterate on (#120, round 2); everything in
 * it is placeholder and nothing reads from the Core yet.
 *
 * The page reads nothing request-dependent, so its shell prerenders. Anything
 * that depends on the visitor goes inside a child behind a `<Suspense>`
 * boundary.
 */
export default async function HomePage() {
  const t = await getTranslations("home");

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="w-full px-4 pt-3">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
          <span className="text-foreground font-heading flex items-center gap-2 text-lg font-semibold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="size-7 rounded-full" />
            Talkeo
          </span>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
        <h1 className="font-heading text-foreground text-3xl font-semibold">
          {t("greeting")}
        </h1>

        <section className="bg-surface-secondary shadow-raised flex flex-col gap-4 rounded-2xl border border-black/[0.06] p-6 dark:border-white/[0.06]">
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-foreground text-xl font-semibold">
              {t("today.title")}
            </h2>
            <p className="text-text-secondary text-[15px]">{t("today.body")}</p>
          </div>
          <Button asChild className="self-start">
            <Link href="/home">{t("today.start")}</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
