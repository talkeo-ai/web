"use client";

/**
 * One element for every turn the assistant speaks.
 *
 * What a gesture unlocks is an element, not the page. An element that was
 * played once during a press stays playable afterwards with a different `src`,
 * so every turn goes through this one rather than mounting its own — which
 * also means the assistant can open the conversation, which is the whole shape
 * of the entrance.
 *
 * A `AudioContext` would not help here: it governs synthesised and decoded
 * audio, and none of this goes through one. The turn is a file.
 */

// Ten milliseconds of 8 kHz silence. Inline, because a request that has to
// come back before the element is unlocked is a race against the gesture that
// unlocked it — and 8-bit PCM silence is 0x80, not zero.
const SILENCE =
  "data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==";

let element: HTMLAudioElement | null = null;
let unlocked = false;

/** The shared element, or null where there is no audio to speak of. */
export function voiceElement(): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;

  if (!element) {
    element = new Audio();
    element.preload = "auto";
  }
  return element;
}

/**
 * Claims the right to speak later. Call it from a press — any press.
 *
 * Cheap and idempotent, so wiring it to more than one entrance costs nothing.
 * A refusal leaves it unclaimed rather than remembered, so the next press
 * tries again.
 */
export function unlockVoice(): void {
  if (unlocked) return;

  const audio = voiceElement();
  if (!audio) return;

  audio.src = SILENCE;
  try {
    void audio
      .play()
      ?.then(() => {
        unlocked = true;
        audio.pause();
        audio.currentTime = 0;
      })
      .catch(() => {});
  } catch {
    // No playback in this environment at all.
  }
}

/** Whether a gesture has claimed it. The turn plays either way, silently. */
export function voiceUnlocked(): boolean {
  return unlocked;
}

/** Tests only. */
export function resetVoice(): void {
  element = null;
  unlocked = false;
}
