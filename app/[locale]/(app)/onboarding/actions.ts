"use server";

import { SUPPORTED_INSTRUMENTS } from "@/components/onboarding/items/registry";
import { core } from "@/core";
import { isCoreError, type Step, type TalkeoTurn } from "@/core/contracts";
import { redirect } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import { NAME_MAX } from "@/lib/onboarding/entry";
import {
  firstScreenOf,
  onboardingHref,
  type OnboardingScreen,
} from "@/lib/onboarding/screens";
import {
  writeEntryMode,
  writeEntryName,
  type EntryMode,
} from "@/lib/session/entry-answers";
import {
  readOnboardingRun,
  writeOnboardingRun,
  type OnboardingRun,
} from "@/lib/session/onboarding-session";

/**
 * Everything that writes to open a run.
 *
 * These run on the server and are the only place a cookie can be set before a
 * redirect, which is why the run starts here rather than in a page.
 *
 * The locale is passed in rather than read: root params are not available
 * inside an action, so every one of these is bound to it at the call site.
 */

/**
 * Opens a run, or picks up the one already in progress.
 *
 * The id the service issues replaces the provisional one in the cookie, so
 * there is one answer to who this is and it is the service's.
 */
export async function startOnboarding(locale: Locale): Promise<never> {
  const existing = await readOnboardingRun();

  if (existing) {
    const resumed = await resumeRun(existing);
    if (resumed) return redirect({ href: onboardingHref(resumed), locale });
  }

  const flow = await openRun(locale);
  return redirect({ href: onboardingHref(firstScreenOf(flow.step)), locale });
}

/** Mints the ids and stores them. Does not navigate; the caller decides. */
async function openRun(locale: Locale) {
  const { user_id } = await core().createAnonymousUser();
  const { session_id, flow } = await core().createSession({
    user_id,
    client: {
      surface: "web_onboarding",
      locale,
      // What this client is able to capture, which is not the same as what the
      // visitor has allowed. Permission is its own question, asked by the
      // assistant and reported separately.
      artefacts: ["text", "audio"],
      supported_instruments: SUPPORTED_INSTRUMENTS,
    },
  });

  await writeOnboardingRun({ userId: user_id, sessionId: session_id });
  return flow;
}

/**
 * Takes the name and opens the run.
 *
 * The run has to start here rather than on the door, because a page cannot set
 * a cookie and opening one writes two. Doing it on the first answer instead of
 * on a button press ahead of it is what removes the screen that only said
 * "press to begin".
 */
export async function submitName(
  locale: Locale,
  formData: FormData,
): Promise<void> {
  const name = String(formData.get("name") ?? "")
    .trim()
    .slice(0, NAME_MAX);
  if (!name) return;

  await writeEntryName(name);

  const existing = await readOnboardingRun();
  if (!existing) await openRun(locale);

  redirect({ href: onboardingHref("mode"), locale });
}

/** Takes how they want to answer, and hands them to the conversation. */
export async function submitMode(
  locale: Locale,
  mode: EntryMode,
): Promise<void> {
  await writeEntryMode(mode);
  redirect({ href: onboardingHref("chat"), locale });
}

export type TalkeoTurnOnScreen = { turn: TalkeoTurn; step: Step };

/**
 * The turn that is on screen, which after a reload is the one already said.
 *
 * Asking for a turn is asking the assistant to take one — it is not a read,
 * and doing it on mount would spend a turn every time the page loads. So a
 * screen coming back reads the interview instead, and only a conversation
 * that has not started yet asks for the opening.
 */
export async function currentTalkeoTurn(): Promise<TalkeoTurnOnScreen | null> {
  const run = await readOnboardingRun();
  if (!run) return null;

  try {
    const { state, flow } = await core().getInterviewState({
      session_id: run.sessionId,
    });
    if (state.last_turn) return { turn: state.last_turn, step: flow.step };
  } catch (error) {
    if (isCoreError(error) && error.code === "NOT_FOUND") return null;
    throw error;
  }

  return nextTalkeoTurn();
}

/**
 * Asks the assistant for its next turn.
 *
 * Nothing is sent up: the assistant opens the conversation and decides what
 * comes next, and this client never scripts it. Sending what the visitor said
 * is the other half of the interview and is not built yet, so what is typed
 * into the composer is shown and then dropped.
 *
 * The step comes back with the turn because a closing turn moves the run on,
 * and the screen has to know to go and look.
 */
export async function nextTalkeoTurn(): Promise<TalkeoTurnOnScreen | null> {
  const run = await readOnboardingRun();
  if (!run) return null;

  try {
    const { turn, flow } = await core().talkeoTurn({
      session_id: run.sessionId,
    });
    return { turn, step: flow.step };
  } catch (error) {
    if (isCoreError(error) && error.code === "NOT_FOUND") return null;
    throw error;
  }
}

/**
 * The screen a stored run is on, or null if the service has never heard of it.
 *
 * Losing a run is normal against the fixture adapter, which keeps nothing past
 * a restart. A stale cookie is not an error to show; it just means starting
 * over.
 */
async function resumeRun(run: OnboardingRun): Promise<OnboardingScreen | null> {
  try {
    const { flow } = await core().getFlowState({ session_id: run.sessionId });
    return firstScreenOf(flow.step);
  } catch (error) {
    if (isCoreError(error) && error.code === "NOT_FOUND") return null;
    throw error;
  }
}
