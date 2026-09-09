import { z } from "zod";

import { errorBodySchema } from "./errors";
import {
  cardEditSchema,
  interviewEventSchema,
  wordTimingSchema,
} from "./objects";
import { talkeoTurnResultSchema } from "./tools";

/**
 * The interview as a stream.
 *
 * A turn arrives in pieces so it can be shown as it is being said instead of as
 * one body once it is over, and so the person's audio has somewhere to go while
 * they are still talking.
 *
 * The rule that keeps this additive: **the stream is the progressive disclosure
 * of a `TalkeoTurn`, and the last message is that turn.** Ignore every other kind
 * and wait for `turn_done` and this behaves exactly as the request/response call
 * does. Nothing in `tools.ts` changed shape.
 *
 * ⚠ Two things about this channel that are not visible from the types:
 *
 * - **Audio is binary frames on the same socket**, not a field. A reader that
 *   only parses JSON trips over the first one. They belong to the turn named by
 *   the last `audio_format`.
 * - **Some turns carry no `text` at all.** The entrance is fixed copy and a
 *   resumed turn is a replay, so neither streams fragments: they arrive as
 *   `turn_started` then `turn_done`, and the words are only in the result. A
 *   screen that appends deltas and never renders `turn_done` shows two blank
 *   screens at the start of every interview.
 */

// --- Talkeo -> the screen ---------------------------------------------------

export const turnStartedSchema = z.object({
  kind: z.literal("turn_started"),
  turn_id: z.string(),
  stage: z.number().int(),
  stage_name: z.string(),
  /**
   * Whether this turn is going to be heard, said before it is generated. Read
   * off the turn that just finished it would set the microphone up one turn
   * late, which is the whole first spoken turn of the interview.
   */
  mode: z.string().default(""),
  /** How many stages there are, so nothing here has to hard-code seven. */
  stages_total: z.number().int().default(0),
});

export const turnTextSchema = z.object({
  kind: z.literal("text"),
  turn_id: z.string(),
  delta: z.string(),
});

/**
 * What was already sent is not what they end up reading.
 *
 * Two guards cut a turn AFTER it has been said, so a screen that only appended
 * would leave a sentence up that the record does not contain. It carries the
 * whole text and never a diff. An empty `text` mid-turn means the turn broke
 * off: throw away what is drawn, it is being said again.
 */
export const turnTextAmendedSchema = z.object({
  kind: z.literal("text_amended"),
  turn_id: z.string(),
  text: z.string(),
});

export const turnEventSchema = z.object({
  kind: z.literal("event"),
  turn_id: z.string(),
  event: interviewEventSchema,
});

/**
 * What the binary frames that follow are. Audio is binary rather than base64
 * because a third more bytes on the one thing a person is waiting for is not
 * free.
 */
export const turnAudioFormatSchema = z.object({
  kind: z.literal("audio_format"),
  turn_id: z.string(),
  mime: z.string(),
  sample_rate: z.number().int(),
});

/**
 * Where each word is heard, as the voice produces them.
 *
 * Marks are NOT here: they bind to word indexes over the finished text, so they
 * are only true once the text is, and they ride on `turn_done` with it.
 */
export const turnWordTimingsSchema = z.object({
  kind: z.literal("word_timings"),
  turn_id: z.string(),
  timings: z.array(wordTimingSchema).default([]),
});

/**
 * What the person is saying, while they say it. `is_final` marks text that will
 * not change; the end of their turn is decided by the transcription, not by this.
 */
export const turnTranscriptSchema = z.object({
  kind: z.literal("transcript"),
  delta: z.string(),
  is_final: z.boolean().default(false),
});

/**
 * They were listened to and nothing came back. Whose turn it is does not change.
 *
 * It has to be said rather than left as silence: no turn is generated for an
 * empty one, so a screen waiting for that turn waits for ever, and it has no
 * other way to tell "they said nothing" from "the turn is still being written".
 * `reason` is set only when the listening itself failed — telling somebody "I
 * did not hear you" when the transcription errored is a lie.
 */
export const nothingHeardSchema = z.object({
  kind: z.literal("nothing_heard"),
  reason: z.string().default(""),
});

export const turnDoneSchema = z.object({
  kind: z.literal("turn_done"),
  result: talkeoTurnResultSchema,
});

export const streamErrorSchema = z.object({
  kind: z.literal("stream_error"),
  error: errorBodySchema,
});

export const talkeoStreamOutSchema = z.discriminatedUnion("kind", [
  turnStartedSchema,
  turnTextSchema,
  turnTextAmendedSchema,
  turnEventSchema,
  turnAudioFormatSchema,
  turnWordTimingsSchema,
  turnTranscriptSchema,
  nothingHeardSchema,
  turnDoneSchema,
  streamErrorSchema,
]);

// --- the screen -> Talkeo ---------------------------------------------------

export const saySchema = z.object({
  kind: z.literal("say"),
  text: z.string(),
});

/** The same edit the request carries, on its way up. It may arrive on its own or
 * be followed by a `say` in the same breath. */
export const cardEditedSchema = z.object({
  kind: z.literal("card_edited"),
  edit: cardEditSchema,
});

/**
 * The screen has heard voice and is about to send frames, starting with the ones
 * it buffered just before: without that head start the first word is gone.
 */
export const listenStartSchema = z.object({
  kind: z.literal("listen_start"),
  mime: z.string(),
  sample_rate: z.number().int(),
});

/**
 * The screen gave up on the turn. Normally the transcription decides a turn is
 * over and this never arrives.
 */
export const listenStopSchema = z.object({ kind: z.literal("listen_stop") });

/** Give me whatever turn I should be looking at. It starts, restarts and re-reads. */
export const resumeSchema = z.object({ kind: z.literal("resume") });

/**
 * They picked speaking or writing on screen.
 *
 * The choice has always existed — the entrance asks for it in words — but the
 * only way to register it was to type an answer a keyword match could read. Two
 * buttons have nothing to type, and posting a Spanish word for a regex would tie
 * this screen to the wording of a question it does not own.
 */
export const choseModeSchema = z.object({
  kind: z.literal("chose_mode"),
  mode: z.enum(["speak", "text"]),
});

/**
 * Whether to speak the turns at all.
 *
 * It stops the synthesis and not just the speaker: silencing only the output
 * would still be paying for every word of every turn that is never played.
 * Frames already in flight arrive after it, and are dropped.
 */
export const setVoiceSchema = z.object({
  kind: z.literal("set_voice"),
  on: z.boolean(),
});

export const talkeoStreamInSchema = z.discriminatedUnion("kind", [
  saySchema,
  cardEditedSchema,
  listenStartSchema,
  listenStopSchema,
  resumeSchema,
  choseModeSchema,
  setVoiceSchema,
]);

export type TurnStarted = z.infer<typeof turnStartedSchema>;
export type TurnText = z.infer<typeof turnTextSchema>;
export type TurnTextAmended = z.infer<typeof turnTextAmendedSchema>;
export type TurnEvent = z.infer<typeof turnEventSchema>;
export type TurnAudioFormat = z.infer<typeof turnAudioFormatSchema>;
export type TurnWordTimings = z.infer<typeof turnWordTimingsSchema>;
export type TurnTranscript = z.infer<typeof turnTranscriptSchema>;
export type NothingHeard = z.infer<typeof nothingHeardSchema>;
export type TurnDone = z.infer<typeof turnDoneSchema>;
export type StreamError = z.infer<typeof streamErrorSchema>;
export type TalkeoStreamOut = z.infer<typeof talkeoStreamOutSchema>;
export type TalkeoStreamIn = z.infer<typeof talkeoStreamInSchema>;
