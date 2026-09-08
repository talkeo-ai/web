import "server-only";

import { core } from "@/core";
import { isCoreError, type Flow } from "@/core/contracts";
import {
  readOnboardingRun,
  type OnboardingRun,
} from "@/lib/session/onboarding-session";

/**
 * The run in progress and where the service says it is.
 *
 * A stored run that the service does not know about is not an error worth
 * showing: against the fixture adapter nothing survives a restart, and a stale
 * cookie just means starting over. Both the entry screen and the step guard
 * treat that the same way as having no run at all.
 *
 * ⚠ Reads cookies. Call from a Server Action, or from a component behind a
 * `<Suspense>` boundary.
 */
export type CurrentRun = {
  run: OnboardingRun;
  flow: Flow;
};

export async function readCurrentRun(): Promise<CurrentRun | null> {
  const run = await readOnboardingRun();
  if (!run) return null;

  try {
    const { flow } = await core().getFlowState({ session_id: run.sessionId });
    return { run, flow };
  } catch (error) {
    if (isCoreError(error) && error.code === "NOT_FOUND") return null;
    throw error;
  }
}
