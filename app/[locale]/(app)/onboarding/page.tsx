import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { redirect } from "@/lib/i18n/navigation";
import { routing, type Locale } from "@/lib/i18n/routing";
import { readCurrentRun } from "@/lib/onboarding/current-run";
import { firstScreenOf, onboardingHref } from "@/lib/onboarding/screens";

import { startOnboarding } from "./actions";

/**
 * The door into the run.
 *
 * It is a screen with a button rather than a redirect, for two reasons. A page
 * cannot set a cookie, and opening a run has to write two of them before
 * anything renders — so the run starts from an action, and an action needs
 * something to submit it. And the links already pointing here from the public
 * site keep working untouched.
 *
 * The page itself reads nothing about the visitor, so its shell prerenders.
 * Whether there is a run to pick up is decided inside the boundary below.
 */
export default async function OnboardingStartPage() {
  const t = await getTranslations("onboarding.start");
  const locale = await localeParam();

  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-6 py-10">
      <h1 className="font-heading text-3xl font-semibold tracking-[-0.02em]">
        {t("title")}
      </h1>
      <p className="text-muted-foreground">{t("body")}</p>

      <Suspense
        fallback={
          <Button size="lg" className="w-full" disabled>
            {t("cta")}
          </Button>
        }
      >
        <StartButton locale={locale} label={t("cta")} />
      </Suspense>
    </main>
  );
}

/** Picks up a run in progress, or offers to open one. */
async function StartButton({
  locale,
  label,
}: {
  locale: Locale;
  label: string;
}) {
  const current = await readCurrentRun();

  if (current) {
    redirect({
      href: onboardingHref(firstScreenOf(current.flow.step)),
      locale,
    });
  }

  return (
    <form action={startOnboarding.bind(null, locale)}>
      <Button type="submit" size="lg" className="w-full">
        {label}
      </Button>
    </form>
  );
}
