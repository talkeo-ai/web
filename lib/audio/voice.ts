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

/** Tests only. */
export function resetVoice(): void {
  player?.close();
  player = null;
  claimed = false;
}
