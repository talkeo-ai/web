import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { locale as localeParam } from "next/root-params";
import { Suspense } from "react";

import { redirect } from "@/lib/i18n/navigation";
import { routing, type Locale } from "@/lib/i18n/routing";
import { OpenRun } from "@/components/onboarding/open-run";
import { readCurrentRun } from "@/lib/onboarding/current-run";
import { worksBesideChat } from "@/lib/onboarding/entry";
import { firstScreenOf, onboardingHref } from "@/lib/onboarding/screens";

import { startOnboarding } from "./actions";

/**
 * The way in, and nothing more than that.
 *
 * There is no screen here any more: the first thing anyone sees should be the
 * first question, not a page whose only content is a button that gets to it.
 * The run opens on that first answer instead, which is also the gesture that
 * claims audio playback.
 *
 * This route stays because the public site already links to it, and because
 * coming back to it later is how someone picks up where they left off.
 */
export default async function OnboardingIndexPage() {
  const locale = await localeParam();
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <Suspense fallback={null}>
      <WhereverTheRunIs locale={locale} />
    </Suspense>
  );
}

async function WhereverTheRunIs({ locale }: { locale: Locale }) {
  const current = await readCurrentRun();

  // No run yet: the conversation cannot start without one, and a page cannot
  // write the cookies that open it. An action can, and it navigates on its own
  // once it has.
  if (!current) return <OpenRun start={startOnboarding.bind(null, locale)} />;

  const screen =
    current.flow.step === "talkeo_interview"
      ? "chat"
      : // The steps that happen beside the conversation come back to it, not
        // to a screen of their own.
        worksBesideChat(current.flow.step)
        ? "chat"
        : firstScreenOf(current.flow.step);

  // Returned rather than called on its own line: it comes from a destructured
  // factory, and TypeScript only narrows on a never-returning call when the
  // callee carries an explicit annotation.
  return redirect({ href: onboardingHref(screen), locale });
}
