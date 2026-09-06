import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ChatScreen } from "@/components/onboarding/chat-screen";
import { ModeScreen } from "@/components/onboarding/mode-screen";
import { NameScreen } from "@/components/onboarding/name-screen";
import { NotBuiltScreen } from "@/components/onboarding/not-built-screen";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import { redirect } from "@/lib/i18n/navigation";
import { routing, type Locale } from "@/lib/i18n/routing";
import { readCurrentRun } from "@/lib/onboarding/current-run";
import { entryScreenFor } from "@/lib/onboarding/entry";
import {
  firstScreenOf,
  isOnboardingScreen,
  onboardingHref,
  stepOf,
  type OnboardingScreen,
} from "@/lib/onboarding/screens";
import { readEntryAnswers } from "@/lib/session/entry-answers";

import { currentTalkeoTurn, nextTalkeoTurn, submitMode, submitName } from "../actions";

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
}: PageProps<"/[locale]/onboarding/[screen]">) {
  return (
    <Suspense fallback={<FrameFallback />}>
      <Screen params={params} />
    </Suspense>
  );
}

/** Holds the shape so nothing jumps when the content arrives. */
function FrameFallback() {
  return (
    <div
      aria-hidden
      className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 py-10"
    />
  );
}

async function Screen({
  params,
}: {
  params: PageProps<"/[locale]/onboarding/[screen]">["params"];
}) {
  const { locale, screen } = await params;

  if (!hasLocale(routing.locales, locale)) notFound();
  if (!isOnboardingScreen(screen)) notFound();

  // The first question is the only one that works without a run: answering it
  // is what opens one.
  const current = await readCurrentRun();
  if (!current) {
    return screen === "name" ? (
      <NameScreen action={submitName.bind(null, locale)} />
    ) : (
      redirect({ href: onboardingHref("name"), locale })
    );
  }

  // The service owns the step. A screen belonging to any other one is not an
  // error to show: it is a stale link, and the answer is where the run is.
  if (stepOf(screen) !== current.flow.step) {
    return redirect({
      href: onboardingHref(firstScreenOf(current.flow.step)),
      locale,
    });
  }

  if (current.flow.step === "talkeo_interview") {
    return interviewScreen(screen, locale);
  }

  return (
    <OnboardingFrame screen={screen}>
      <NotBuiltScreen screen={screen} />
    </OnboardingFrame>
  );
}

/** The three screens of the interview, and the guard between them. */
async function interviewScreen(screen: OnboardingScreen, locale: Locale) {
  const answers = await readEntryAnswers();
  const belongs = entryScreenFor(answers);

  if (screen !== belongs) {
    return redirect({ href: onboardingHref(belongs), locale });
  }

  if (screen === "name") {
    return <NameScreen action={submitName.bind(null, locale)} />;
  }

  if (screen === "mode") {
    return (
      <ModeScreen name={answers.name} action={submitMode.bind(null, locale)} />
    );
  }

  return (
    <ChatScreen
      name={answers.name}
      current={currentTalkeoTurn}
      next={nextTalkeoTurn}
    />
  );
}
