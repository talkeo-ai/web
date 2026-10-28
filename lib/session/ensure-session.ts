"use client";

import type { ErrorCode } from "@/core/contracts";

import { hasSession, startAnonymous } from "./actions";
import { deviceSignals } from "./device";

/**
 * Makes sure this browser holds a session before anything that needs one.
 *
 * Every account call is made for a session, signing in included: the code is
 * bound to the session that asked for it. A browser that has none gathers its
 * device signals and starts anonymous first.
 *
 * One attempt in flight per page, shared: React mounts effects twice, and two
 * screens can ask at once, and each of those starting its own would leave an
 * anonymous user behind with nobody to come back to it.
 */
let starting: Promise<ErrorCode | null> | undefined;

export function ensureSession(): Promise<ErrorCode | null> {
  starting ??= (async () => {
    if (await hasSession()) return null;
    const started = await startAnonymous(await deviceSignals());
    return started.ok ? null : started.code;
  })().then(
    (failed) => {
      // A failure is not remembered: the next action gets to try again.
      if (failed) starting = undefined;
      return failed;
    },
    (error: unknown) => {
      starting = undefined;
      throw error;
    },
  );
  return starting;
}

/** After signing out the session is gone, so the next call has to start one. */
export function forgetSession(): void {
  starting = undefined;
}
