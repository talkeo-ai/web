/**
 * The times the onboarding moves to.
 *
 * They live together because they only mean anything relative to each other: a
 * message fades in over the same span its box takes to open, and the surface
 * waits out the end of a turn rather than a fixed delay. Split across the files
 * that use them, the relationship stops being readable and the next person to
 * change one changes it alone.
 *
 * Every one is a duration in milliseconds and every one is bound by the global
 * `prefers-reduced-motion` rule in `globals.css` — except where a component runs
 * its own clock in JavaScript, which the CSS cannot reach and which therefore
 * checks for itself.
 */

/** A message fading into the thread. */
export const MESSAGE_IN_MS = 620;

/**
 * How long after a turn has been WRITTEN the surface comes up under it.
 *
 * Not zero, but barely: on the same frame as the last word the two arrive as
 * one event. Any longer reads as a wait (Joaquin, 17/oct: "al toque").
 */
export const SURFACE_AFTER_MS = 120;
