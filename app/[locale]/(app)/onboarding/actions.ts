"use server";

import { SUPPORTED_INSTRUMENTS } from "@/components/onboarding/items/registry";
import { core } from "@/core";
import { isCoreError } from "@/core/contracts";
import { redirect } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/routing";
import {
  firstScreenOf,
  onboardingHref,
  type OnboardingScreen,
} from "@/lib/onboarding/screens";
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
