import "server-only";

import { cookies } from "next/headers";

import { ANONYMOUS_ID_COOKIE, SESSION_COOKIE_OPTIONS } from "./anonymous-id";

/**
 * The two ids a run needs, and where they are kept.
 *
 * The visitor id is minted by `proxy.ts` so the cookie exists from the very
 * first request. It is provisional: as soon as a run opens, the service issues
 * the real one and it is written over the same cookie. Keeping two would mean
 * two answers to who this is.
 *
 * ⚠ Reading these makes the calling scope request-dependent. Call from a Server
 * Action, or from a component behind a `<Suspense>` boundary — never at the top
 * of a `page.tsx` or `layout.tsx`.
 */
export const ONBOARDING_SESSION_COOKIE = "talkeo_sid";

export type OnboardingRun = {
  userId: string;
  sessionId: string;
};

/** The run in progress, or null when there is none to pick up. */
export async function readOnboardingRun(): Promise<OnboardingRun | null> {
  const store = await cookies();
  const userId = store.get(ANONYMOUS_ID_COOKIE)?.value;
  const sessionId = store.get(ONBOARDING_SESSION_COOKIE)?.value;

  if (!userId || !sessionId) return null;

  return { userId, sessionId };
}

/** Writable only from a Server Action; a component cannot set a cookie. */
export async function writeOnboardingRun(run: OnboardingRun): Promise<void> {
  const store = await cookies();

  store.set(ANONYMOUS_ID_COOKIE, run.userId, SESSION_COOKIE_OPTIONS);
  store.set(ONBOARDING_SESSION_COOKIE, run.sessionId, SESSION_COOKIE_OPTIONS);
}
