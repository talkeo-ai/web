"use client";

import { createPlayback, type Playback } from "./playback";

/**
 * The one voice, for the whole run.
 *
 * One because what a gesture claims is an audio context, not a page: a context
 * resumed during a press stays resumed afterwards, and every turn that follows
 * goes through it. Building one per turn would put the first turn's silence back
 * on every turn.
 *
 * It survives the navigation into the onboarding because that navigation is
 * client-side — the module and its context are the same ones. So the press on
 * the landing is what lets Talkeo speak first, which is the only reason it can.
 */

let player: Playback | null = null;
let claimed = false;

export function voice(): Playback {
  player ??= createPlayback();
  return player;
}

/**
 * Claim it. Call from inside a gesture handler and nowhere else.
 *
 * Idempotent, and a refusal leaves it unclaimed so the next press tries again —
 * a browser that says no once will say yes to a later, more deliberate press,
 * and giving up after the first would leave the run permanently silent.
 */
export async function unlockVoice(): Promise<void> {
  try {
    await voice().unlock();
    claimed = true;
  } catch {
    claimed = false;
  }
}

export function voiceUnlocked(): boolean {
  return claimed;
}

/**
 * Claim it on the first gesture anywhere, and stop listening once it is claimed.
 *
 * ⚠ The press on the landing is not the only way in. Somebody who reloads the
 * onboarding, or opens its URL directly, arrives with no gesture behind them —
 * and a context built there starts suspended and stays suspended, so the whole
 * conversation is silent with nothing on screen to say why. That is what
 * happened the first time this was run for real.
 *
 * `pointerdown` and `keydown` both count, and the listener removes itself, so
 * this costs one event.
 */
export function claimVoiceOnFirstGesture(): () => void {
  if (typeof window === "undefined") return () => {};
  const claim = () => {
    void unlockVoice();
    stop();
  };
  const stop = () => {
    window.removeEventListener("pointerdown", claim);
    window.removeEventListener("keydown", claim);
  };
  window.addEventListener("pointerdown", claim, { once: true });
  window.addEventListener("keydown", claim, { once: true });
  return stop;
}

/** Tests only. */
export function resetVoice(): void {
  player?.close();
  player = null;
  claimed = false;
}
