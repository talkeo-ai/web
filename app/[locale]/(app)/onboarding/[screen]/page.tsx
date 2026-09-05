import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AreasScreen } from "@/components/onboarding/areas-screen";
import { MeetKaiScreen } from "@/components/onboarding/meet-kai-screen";
import { NotBuiltScreen } from "@/components/onboarding/not-built-screen";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import { SelfAssessmentScreen } from "@/components/onboarding/self-assessment-screen";
import { selfAssessmentSchema } from "@/core/contracts";
import { redirect } from "@/lib/i18n/navigation";
import { routing } from "@/lib/i18n/routing";
import { readCurrentRun } from "@/lib/onboarding/current-run";
import {
  firstScreenOf,
  isOnboardingScreen,
  onboardingHref,
  stepOf,
} from "@/lib/onboarding/screens";

import { finishOpeningScreens, submitSurvey } from "../actions";

/**
 * One screen of the run.
 *
 * The page reads nothing request-dependent, so its shell prerenders; the flow
 * and the visitor are read inside the boundary. `params` travels down as a
 * promise for the same reason — resolving it up here would drop the shell for
 * the whole route.
 */
export default function OnboardingScreenPage({
  params,
  searchParams,
}: PageProps<"/[locale]/onboarding/[screen]">) {
  return (
    <Suspense fallback={<FrameFallback />}>
      <Screen params={params} searchParams={searchParams} />
    </Suspense>
  );
}

/** Holds the frame's shape so nothing jumps when the content arrives. */
function FrameFallback() {
  return (
    <div
      aria-hidden
      className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-10 px-6 py-10"
    >
      <div className="bg-surface-tertiary h-1.5 w-full rounded-full" />
    </div>
  );
}

async function Screen({
  params,
  searchParams,
}: {
  params: PageProps<"/[locale]/onboarding/[screen]">["params"];
  searchParams: PageProps<"/[locale]/onboarding/[screen]">["searchParams"];
}) {
  const { locale, screen } = await params;

  if (!hasLocale(routing.locales, locale)) notFound();
  if (!isOnboardingScreen(screen)) notFound();

  // `redirect` is returned rather than called on its own line: it comes from a
  // destructured factory, and TypeScript only narrows on a never-returning call
  // when the callee carries an explicit annotation.
  const current = await readCurrentRun();
  if (!current) return redirect({ href: "/onboarding", locale });

  // The service owns the step. A screen belonging to any other one is not an
  // error to show: it is a stale link, and the answer is where the run is.
  if (stepOf(screen) !== current.flow.step) {
    return redirect({
      href: onboardingHref(firstScreenOf(current.flow.step)),
      locale,
    });
  }

  if (screen === "areas") {
    const answer = selfAssessmentSchema.safeParse((await searchParams).level);

    // Landing here without the first answer means the URL was reached out of
    // order. Both answers go up in one call, so there is nothing to submit yet.
    if (!answer.success) {
      return redirect({ href: onboardingHref("self-assessment"), locale });
    }

    return (
      <OnboardingFrame screen={screen}>
        <AreasScreen
          selfAssessment={answer.data}
          action={submitSurvey.bind(null, locale)}
        />
      </OnboardingFrame>
    );
  }

  return (
    <OnboardingFrame screen={screen}>
      {screen === "self-assessment" ? (
        <SelfAssessmentScreen />
      ) : screen === "meet-kai" ? (
        <MeetKaiScreen
          defaultName={current.flow.display_name ?? ""}
          action={finishOpeningScreens.bind(null, locale)}
        />
      ) : screen === "interview" ? (
        <NotBuiltScreen namespace="interview" />
      ) : (
        <NotBuiltScreen namespace="notBuilt" />
      )}
    </OnboardingFrame>
  );
}
