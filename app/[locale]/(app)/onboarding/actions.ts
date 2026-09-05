"use server";

import { SUPPORTED_INSTRUMENTS } from "@/components/onboarding/items/registry";
import { core } from "@/core";
import {
  areaSchema,
  isCoreError,
  selfAssessmentSchema,
  type Flow,
  type SubmitSurveyRequest,
} from "@/core/contracts";
import { redirect } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import {
  firstScreenOf,
  onboardingHref,
  nextScreenWithinStep,
  stepOf,
  type OnboardingScreen,
} from "@/lib/onboarding/screens";
import {
  readOnboardingRun,
  writeOnboardingRun,
  type OnboardingRun,
} from "@/lib/session/onboarding-session";

/**
 * Everything that writes during the opening screens.
 *
 * These run on the server and are the only place a cookie can be set before a
 * redirect, which is why the run starts here rather than in a page.
 *
 * The locale is passed in rather than read: root params are not available
 * inside an action, so every one of these is bound to it at the call site.
 */

/**
 * Where to go after a write.
 *
 * The service decides the step, so when it says the step changed, that wins.
 * While it stays put, this app advances its own screen — the opening step is
 * three questions and the service reports it as one.
 */
function nextHref(from: OnboardingScreen, flow: Flow): string {
  if (stepOf(from) !== flow.step) {
    return onboardingHref(firstScreenOf(flow.step));
  }

  return onboardingHref(nextScreenWithinStep(from) ?? from);
}

/**
 * The run this write belongs to.
 *
 * `redirect` is returned rather than called on its own line: it comes from a
 * destructured factory, and TypeScript only narrows on a never-returning call
 * when the callee carries an explicit annotation.
 */
async function requireRun(locale: Locale): Promise<OnboardingRun> {
  const run = await readOnboardingRun();
  if (!run) return redirect({ href: "/onboarding", locale });

  return run;
}

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

  const { user_id } = await core().createAnonymousUser();
  const { session_id, flow } = await core().createSession({
    user_id,
    client: {
      surface: "web_onboarding",
      locale,
      // What this client is able to capture, which is not the same as what the
      // visitor has allowed. Permission is its own question, asked on the last
      // opening screen and reported separately.
      artefacts: ["text", "audio"],
      supported_instruments: SUPPORTED_INSTRUMENTS,
    },
  });

  await writeOnboardingRun({ userId: user_id, sessionId: session_id });
  return redirect({ href: onboardingHref(firstScreenOf(flow.step)), locale });
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

export async function submitSurvey(
  locale: Locale,
  formData: FormData,
): Promise<never> {
  const run = await requireRun(locale);

  const selfAssessment = selfAssessmentSchema.parse(
    formData.get("selfAssessment"),
  );

  const chosen = formData.getAll("areas").map(String);
  const scopeAreas: SubmitSurveyRequest["scope_areas"] = chosen.includes("all")
    ? ["all"]
    : chosen.map((value) => areaSchema.parse(value));

  const { flow } = await core().submitSurvey({
    session_id: run.sessionId,
    self_assessment: selfAssessment,
    scope_areas: scopeAreas,
  });

  return redirect({ href: nextHref("areas", flow), locale });
}

/**
 * The last opening screen: what to call the visitor, and the microphone.
 *
 * The name is typed rather than spoken because a name is the worst kind of word
 * for speech recognition, and getting it wrong here is expensive.
 */
export async function finishOpeningScreens(
  locale: Locale,
  formData: FormData,
): Promise<never> {
  const run = await requireRun(locale);

  const name = String(formData.get("displayName") ?? "").trim();
  if (name) {
    await core().setDisplayName({ user_id: run.userId, name });
  }

  const { flow } = await core().setMicPermission({
    session_id: run.sessionId,
    granted: formData.get("granted") === "true",
  });

  return redirect({ href: nextHref("meet-kai", flow), locale });
}
