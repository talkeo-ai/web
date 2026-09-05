import type {
  Instrument,
  ItemOf,
  ResponseByInstrument,
} from "@/core/contracts";

/**
 * One renderer per kind of exercise, and the declaration derived from them.
 *
 * A renderer draws one instrument and produces the one response shape that
 * instrument takes. Both halves are pinned by the types below, so a renderer
 * that builds the wrong answer is a compile error rather than a request the
 * service rejects.
 *
 * **The declaration is derived, never written by hand.** What this client tells
 * the service it can draw is the keys of this map, which is why it can never
 * promise more than exists: adding an exercise is adding a file and an entry,
 * and removing one takes the promise away with it.
 *
 * The map is empty while the exercises are being built. That is the honest
 * answer at this point, not a gap: a client that cannot draw anything says so,
 * and the service serves it nothing.
 */
export type ItemRenderer<I extends Instrument> = (props: {
  item: ItemOf<I>;
  onAnswer: (response: ResponseByInstrument[I]) => void;
}) => React.ReactNode;

type ItemRendererMap = {
  [I in Instrument]?: ItemRenderer<I>;
};

export const ITEM_RENDERERS: ItemRendererMap = {};

/** What this client declares it can draw, when a run opens. */
export const SUPPORTED_INSTRUMENTS = Object.keys(
  ITEM_RENDERERS,
) as Instrument[];
