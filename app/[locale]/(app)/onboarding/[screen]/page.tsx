import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ChatWorkspace } from "@/components/onboarding/chat-workspace";
import { NotBuiltScreen } from "@/components/onboarding/not-built-screen";
import { OnboardingFrame } from "@/components/onboarding/onboarding-frame";
import { redirect } from "@/lib/i18n/navigation";
import { routing } from "@/lib/i18n/routing";
import { readCurrentRun } from "@/lib/onboarding/current-run";
import { chatHolds, entryAsks, worksBesideChat } from "@/lib/onboarding/entry";
import {
  firstScreenOf,
  isOnboardingScreen,
  onboardingHref,
  stepOf,
} from "@/lib/onboarding/screens";
import { readEntryAnswers } from "@/lib/session/entry-answers";

import { currentTalkeoTurn, nextTalkeoTurn } from "../actions";

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

  // The conversation is where a run starts now, so reaching it without one is
  // a trip through the door, which is what opens it.
  const current = await readCurrentRun();
  if (!current) return redirect({ href: "/onboarding", locale });

  const step = current.flow.step;

  // `chat` is the exception to the table: it holds every step the assistant
  // can still be spoken to in, because those happen in the panel beside the
  // conversation rather than on a screen of their own.
  if (screen === "chat" && chatHolds(step)) {
    return conversation();
  }

  // The service owns the step. A screen belonging to any other one is not an
  // error to show: it is a stale link, and the answer is where the run is.
  if (stepOf(screen) !== step) {
    return redirect({
      href: onboardingHref(worksBesideChat(step) ? "chat" : firstScreenOf(step)),
      locale,
    });
  }

  if (step === "talkeo_interview") {
    return conversation();
  }

  return (
    <OnboardingFrame screen={screen}>
      <NotBuiltScreen screen={screen} />
    </OnboardingFrame>
  );
}

/**
 * The conversation, and everything that happens beside it.
 *
 * There are no screens inside the interview any more: the name and how they
 * want to answer are turns like the rest, and what is still unanswered decides
 * which control the panel shows, not which URL they are on.
 */
async function conversation() {
  const answers = await readEntryAnswers();

  return (
    <ChatWorkspace
      name={answers.name}
      mode={answers.mode}
      asks={entryAsks(answers)}
      current={currentTalkeoTurn}
      next={nextTalkeoTurn}
    />
  );
}
