/**
 * Every duration the onboarding animates against, in one place.
 *
 * They were measured against each other, not chosen apart: the panel's
 * contents wait for its edge, a reply waits for the message before it, the
 * chat that floats over the exercise moves on the panel's clock. Spread across
 * the components that use them, tuning the rhythm meant chasing imports
 * between siblings — and two of them were already importing a third to stay in
 * step.
 *
 * The easings stay in `globals.css`, where the rest of the design tokens are.
 * These are timings, and a component reads them as numbers.
 */

/** The track opening: long enough to read as the column giving way. */
export const OPEN_MS = 320;

/**
 * Closing is slower than opening, which is the opposite of the usual rule.
 *
 * The rule is for things that leave: something arriving has to be noticed and
 * something going does not. This is not something leaving — it is the
 * conversation coming back, and the whole column has to re-find its place.
 * Hurried, it reads as the panel being snatched away.
 */
export const CLOSE_MS = 420;

/**
 * The panel's contents settle a beat behind its edge, and leave ahead of it.
 *
 * Arriving with the edge means arriving while the box is still a sliver, so
 * the eye is asked to read something that is mostly clipped. Leaving is faster
 * and starts at once — the room is being taken back, and contents that linger
 * get scraped off by the closing edge.
 */
export const CONTENT_IN_MS = 260;
export const CONTENT_IN_DELAY_MS = 80;
export const CONTENT_OUT_MS = 140;
export const CONTENT_BLUR_PX = 6;

/** A message fading into the transcript. */
export const MESSAGE_IN_MS = 620;

/**
 * How long the entrance leaves a finished question on screen before the
 * control that answers it arrives.
 *
 * The text runs well ahead of the voice, so "finished being written" is not
 * "finished being read" — and swapping on the last word takes the sentence
 * away from somebody who is still on the second line.
 *
 * It scales with the sentence rather than being one number: the beat a
 * four-word question needs is not the beat a thirty-word one needs, and a
 * fixed pause is either a stall on the short one or a snatch on the long one.
 */
export function entryHoldMs(words: number): number {
  return 700 + words * 90;
}

/**
 * A card leaving the deck, and the one under it taking its place.
 *
 * They are one movement and share a clock: the card that has been answered
 * tips away and fades while the one behind rises the last stretch to full
 * size. Run apart, the deck looks like it is dealing itself rather than being
 * played.
 *
 * The card behind starts at 94%. Less and it reads as a second, smaller card;
 * more and there is nothing to see under the top one.
 */
export const CARD_OUT_MS = 380;
export const CARD_IN_MS = 300;
export const CARD_BEHIND_SCALE = 0.94;

/**
 * How far a card has to be dragged before letting go answers with it.
 *
 * Short enough that a flick counts, long enough that a card cannot be answered
 * by brushing past it. Below it the card springs back and nothing was said.
 */
export const CARD_COMMIT_PX = 110;

/** The travel a direction that is not on offer is allowed before it stops. */
export const CARD_RESIST_PX = 56;

/**
 * The floor on how fast an answer may arrive.
 *
 * The fixture answers in no time, so without this the reply lands on top of
 * your own message while that is still fading in — two entrances overlapping
 * from different starting points, which is what reads as inconsistent. It is
 * also just true of anything real: a turn takes a moment to come back.
 */
export const MIN_ANSWER_MS = MESSAGE_IN_MS + 120;
