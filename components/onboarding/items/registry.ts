import type { CardExit } from "@/components/onboarding/items/swipe-card";
import type {
  Instrument,
  ItemOf,
  ResponseByInstrument,
} from "@/core/contracts";

/**
 * What this client tells the service it can draw.
 *
 * A renderer draws one instrument and produces the one response shape that
 * instrument takes; both halves are pinned by `ItemRenderer`, so a renderer
 * that builds the wrong answer is a compile error rather than a request the
 * service rejects.
 *
 * **The list lives here and the renderers live next to it, in a client
 * module.** It cannot be derived from them: this file is read on the server
 * when a run opens, and a client module's exports are references from there,
 * not objects to take the keys of. What keeps the two honest is the type —
 * `renderers.tsx` is keyed by exactly this list, so promising an instrument
 * without drawing it does not compile.
 *
 * An instrument that is not on the list is not served. That is not a gap to
 * handle at render time; it is the whole reason the list is sent.
 */
export const SUPPORTED_INSTRUMENTS = [
  "lexical_yesno",
  "meaning_card",
] as const satisfies readonly Instrument[];

export type SupportedInstrument = (typeof SUPPORTED_INSTRUMENTS)[number];

export function isSupported(
  instrument: Instrument,
): instrument is SupportedInstrument {
  return (SUPPORTED_INSTRUMENTS as readonly Instrument[]).includes(instrument);
}

export type ItemRenderer<I extends Instrument> = (props: {
  item: ItemOf<I>;
  /**
   * The attempt, and where the card was when it was made.
   *
   * The second half is not about the answer: the deck animates the card off
   * the stack and needs to start where the hand left it, and only the renderer
   * knows whether that was a drag or a press.
   */
  onAnswer: (response: ResponseByInstrument[I], exit: CardExit) => void;
}) => React.ReactNode;
