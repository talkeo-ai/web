import type { Instrument, Item } from "../contracts";

import { ITEM_BY_INSTRUMENT } from "./fixtures";

/**
 * The order the mock serves exercises in.
 *
 * The recorded fixtures hold one item per instrument, which is enough to draw
 * each renderer but not enough to walk a run. These sequences repeat the
 * opening instrument a few times so the run has a beginning, and then go
 * through the rest once. The order is plausible, not meaningful: the real
 * service picks the next item from what it has seen so far, and nothing about
 * how it picks is visible from this side.
 *
 * Two sequences, because the run has two shapes. Which one is in play is
 * decided by the service and reaches a screen only as `flow.mode`.
 */

/** Filler for the repeated opening items. Synthetic, like every fixture. */
const OPENING_WORDS = ["improve", "deadline", "brief", "handover"];

function clone(instrument: Instrument, index: number): Item {
  return { ...ITEM_BY_INSTRUMENT[instrument], item_id: `it_mock_${index}` };
}

function opening(): Item[] {
  return OPENING_WORDS.map((word, index) => {
    const item = clone("lexical_yesno", index + 1);
    return { ...item, payload: { word } } as Item;
  });
}

/**
 * How many opening items decide whether the run changes shape.
 *
 * The client never learns this number from the service, and nothing in a
 * payload marks these items as different from the ones after them.
 */
export const OPENING_ITEM_COUNT = 3;

const STANDARD_TAIL: Instrument[] = [
  "elicited_imitation",
  "ctest",
  "listening_choice",
  "writing_prompt",
  "speech_read_aloud",
  "speech_timed_qa",
  "speech_description",
  "recall_typed",
  "translate_to_en",
];

const ZERO_TAIL: Instrument[] = [
  "teach_card",
  "grapheme_audio_choice",
  "assemble",
  "listening_choice",
];

export function standardSequence(): Item[] {
  return [
    ...opening(),
    ...STANDARD_TAIL.map((instrument, index) =>
      clone(instrument, OPENING_WORDS.length + index + 1),
    ),
  ];
}

/** What replaces the rest of the run when it changes shape. */
export function zeroSequence(): Item[] {
  return ZERO_TAIL.map((instrument, index) => clone(instrument, 100 + index));
}
