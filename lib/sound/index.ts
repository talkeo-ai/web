"use client";

/**
 * The interface's sounds.
 *
 * Two of them, and only the pair whose use is not a design question: a tap
 * lands and a tap comes undone. Which other events deserve a sound is a
 * decision about the surface, so nothing else is wired here — adding one is a
 * file in `public/sounds/` and a line in the table below.
 *
 * Each sound is one element, reused. Building a new `Audio` per press leaks a
 * decoder per tap, and on a fast list the garbage outruns the collector.
 */

const SOURCES = {
  select: "/sounds/select.wav",
  deselect: "/sounds/deselect.wav",
} as const;

export type SoundName = keyof typeof SOURCES;

const elements = new Map<SoundName, HTMLAudioElement>();

function elementFor(name: SoundName): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;

  let element = elements.get(name);
  if (!element) {
    element = new Audio(SOURCES[name]);
    element.preload = "auto";
    elements.set(name, element);
  }
  return element;
}

/**
 * Plays a sound, if the browser lets it.
 *
 * These fire on a press, which is the gesture autoplay policy asks for, so a
 * rejection means the visitor has muted the tab or the file is missing —
 * neither is worth interrupting the interaction over.
 */
export function playSound(name: SoundName): void {
  const element = elementFor(name);
  if (!element) return;

  // Rewound rather than restarted: a second press during the first must be
  // heard, and an element already playing ignores `play()`.
  element.currentTime = 0;

  // `play()` reports refusal two ways — a rejected promise, or a throw where
  // playback is not implemented at all — and neither is worth interrupting an
  // interaction over.
  try {
    void element.play()?.catch(() => {});
  } catch {
    // Nothing to hear here.
  }
}

/** Fetches the files before the first press, so the first one is not silent. */
export function preloadSounds(): void {
  for (const name of Object.keys(SOURCES) as SoundName[]) {
    elementFor(name)?.load();
  }
}
