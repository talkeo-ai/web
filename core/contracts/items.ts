import { z } from "zod";

import {
  audioUploadArtefactSchema,
  servedAudioSchema,
  textArtefactSchema,
  uploadArtefactSchema,
} from "./artefacts";

/**
 * The exercises: what the service sends down, and what goes back.
 *
 * Two properties hold across every instrument, and they are what make the list
 * safe to grow:
 *
 * - A payload carries only what a renderer needs in order to draw. Nothing in
 *   it says how hard the item is or what it is aimed at.
 * - A response carries the attempt and how long it took, measured from the
 *   moment the item appeared. Only the client can see that, which is why it is
 *   measured here.
 *
 * Adding an instrument means adding it here and declaring it when the run
 * starts, which is why an older client is never handed one it cannot draw.
 */

// --- payloads: service to client ---

export const lexicalYesNoPayloadSchema = z.object({ word: z.string() });

export const elicitedImitationPayloadSchema = z.object({
  audio: servedAudioSchema,
  max_seconds: z.number().int(),
});

export const cTestGapSchema = z.object({
  gap_id: z.string(),
  /** The letters left visible before the gap. */
  prefix: z.string(),
});

export const cTestPayloadSchema = z.object({
  text: z.string(),
  gaps: z.array(cTestGapSchema),
});

export const writingPromptPayloadSchema = z.object({
  prompt: z.string(),
  min_words: z.number().int(),
  max_words: z.number().int(),
});

export const listeningChoicePayloadSchema = z.object({
  audio: servedAudioSchema,
  question: z.string().nullable().optional(),
  options: z.array(z.string()),
});

export const speechReadAloudPayloadSchema = z.object({
  text: z.string(),
  max_seconds: z.number().int(),
});

export const speechTimedQaPayloadSchema = z.object({
  question_text: z.string(),
  question_audio: servedAudioSchema.nullable().optional(),
  seconds_to_answer: z.number().int(),
});

export const speechDescriptionPayloadSchema = z.object({
  prompt: z.string(),
  image_url: z.string().nullable().optional(),
  max_seconds: z.number().int(),
});

export const recallTypedPayloadSchema = z.object({
  prompt: z.string(),
  context_sentence: z.string().nullable().optional(),
});

export const translateToEnPayloadSchema = z.object({
  source_text: z.string(),
});

export const teachCardPayloadSchema = z.object({
  front_text: z.string(),
  example: z.string().nullable().optional(),
  audio: servedAudioSchema.nullable().optional(),
});

export const assemblePayloadSchema = z.object({
  target_text: z.string(),
  word_bank: z.array(z.string()),
});

export const graphemeAudioChoicePayloadSchema = z.object({
  audio: servedAudioSchema,
  options: z.array(z.string()),
});

/**
 * The user says what a word means. Swiping left is "I don't know", and it is
 * always allowed: passing without answering is what is not.
 */
export const meaningCardPayloadSchema = z.object({
  word: z.string(),
  example: z.string().nullable().optional(),
  audio: servedAudioSchema.nullable().optional(),
  swipe_left_allowed: z.literal(true),
});

/** Build the sentence from a bank; the prompt is in the user's language. */
export const wordBankPayloadSchema = z.object({
  prompt_l1: z.string(),
  word_bank: z.array(z.string()),
});

/** A short contrastive explanation in the user's language, with examples. */
export const contrastiveCardPayloadSchema = z.object({
  title: z.string(),
  rule_l1: z.string(),
  examples: z.array(z.string()),
  audio: servedAudioSchema.nullable().optional(),
});

/** Retrieve the word from a prompt in the user's language, against the clock. */
export const timedRecallPayloadSchema = z.object({
  prompt_l1: z.string(),
  seconds: z.number().int(),
  context_sentence: z.string().nullable().optional(),
});

// --- the envelope, discriminated by instrument ---

function envelope<Name extends string, Payload extends z.ZodTypeAny>(
  instrument: Name,
  payload: Payload,
) {
  return z.object({
    item_id: z.string(),
    instrument: z.literal(instrument),
    payload,
  });
}

export const lexicalYesNoItemSchema = envelope(
  "lexical_yesno",
  lexicalYesNoPayloadSchema,
);
export const elicitedImitationItemSchema = envelope(
  "elicited_imitation",
  elicitedImitationPayloadSchema,
);
export const cTestItemSchema = envelope("ctest", cTestPayloadSchema);
export const writingPromptItemSchema = envelope(
  "writing_prompt",
  writingPromptPayloadSchema,
);
export const listeningChoiceItemSchema = envelope(
  "listening_choice",
  listeningChoicePayloadSchema,
);
export const speechReadAloudItemSchema = envelope(
  "speech_read_aloud",
  speechReadAloudPayloadSchema,
);
export const speechTimedQaItemSchema = envelope(
  "speech_timed_qa",
  speechTimedQaPayloadSchema,
);
export const speechDescriptionItemSchema = envelope(
  "speech_description",
  speechDescriptionPayloadSchema,
);
export const recallTypedItemSchema = envelope(
  "recall_typed",
  recallTypedPayloadSchema,
);
export const translateToEnItemSchema = envelope(
  "translate_to_en",
  translateToEnPayloadSchema,
);
export const teachCardItemSchema = envelope(
  "teach_card",
  teachCardPayloadSchema,
);
export const assembleItemSchema = envelope("assemble", assemblePayloadSchema);
export const graphemeAudioChoiceItemSchema = envelope(
  "grapheme_audio_choice",
  graphemeAudioChoicePayloadSchema,
);
export const meaningCardItemSchema = envelope(
  "meaning_card",
  meaningCardPayloadSchema,
);
export const wordBankItemSchema = envelope("word_bank", wordBankPayloadSchema);
export const contrastiveCardItemSchema = envelope(
  "contrastive_card",
  contrastiveCardPayloadSchema,
);
export const timedRecallItemSchema = envelope(
  "timed_recall",
  timedRecallPayloadSchema,
);

export const itemSchema = z.discriminatedUnion("instrument", [
  lexicalYesNoItemSchema,
  elicitedImitationItemSchema,
  cTestItemSchema,
  writingPromptItemSchema,
  listeningChoiceItemSchema,
  speechReadAloudItemSchema,
  speechTimedQaItemSchema,
  speechDescriptionItemSchema,
  recallTypedItemSchema,
  translateToEnItemSchema,
  teachCardItemSchema,
  assembleItemSchema,
  graphemeAudioChoiceItemSchema,
  meaningCardItemSchema,
  wordBankItemSchema,
  contrastiveCardItemSchema,
  timedRecallItemSchema,
]);

export const instrumentSchema = z.enum([
  "lexical_yesno",
  "elicited_imitation",
  "ctest",
  "writing_prompt",
  "listening_choice",
  "speech_read_aloud",
  "speech_timed_qa",
  "speech_description",
  "recall_typed",
  "translate_to_en",
  "teach_card",
  "assemble",
  "grapheme_audio_choice",
  "meaning_card",
  "word_bank",
  "contrastive_card",
  "timed_recall",
]);

/** Every instrument the protocol defines. What this client draws is fewer. */
export const INSTRUMENTS = instrumentSchema.options;

// --- responses: client to service ---

export const lexicalYesNoResponseSchema = z.object({
  answer: z.enum(["yes", "no"]),
  latency_ms: z.number().int(),
  /**
   * Whatever the user said or typed about the word while answering. Never
   * required and never confirmed back: it is a declared belief, not evidence.
   */
  belief: z.string().nullable().optional(),
  /**
   * True when the assistant spoke, or was spoken to, while the card was on
   * screen: the latency is then not a hesitation.
   */
  interrupted: z.boolean().optional(),
});

/** The spoken instruments: the attempt is the recording itself. */
export const audioAttemptResponseSchema = z.object({
  artefact: audioUploadArtefactSchema,
});

export const cTestAnswerSchema = z.object({
  gap_id: z.string(),
  text: z.string(),
});

export const cTestResponseSchema = z.object({
  answers: z.array(cTestAnswerSchema),
  duration_ms: z.number().int(),
});

export const writtenAttemptResponseSchema = z.object({
  artefact: textArtefactSchema,
  duration_ms: z.number().int(),
});

export const recallTypedResponseSchema = z.object({
  artefact: textArtefactSchema,
  latency_ms: z.number().int(),
});

export const choiceResponseSchema = z.object({
  choice_index: z.number().int(),
  latency_ms: z.number().int(),
});

export const teachCardResponseSchema = z.object({
  acknowledged: z.literal(true),
  /** How long the card stayed on screen. Nothing here is right or wrong. */
  dwell_ms: z.number().int(),
});

export const assembleResponseSchema = z.object({
  ordered_words: z.array(z.string()),
  duration_ms: z.number().int(),
});

/**
 * Either the user said what it means, in text or audio, or swiped left. A
 * response with neither is refused: there is no passing without answering.
 */
export const meaningCardResponseSchema = z
  .object({
    dont_know: z.boolean().optional(),
    artefact: uploadArtefactSchema.nullable().optional(),
    latency_ms: z.number().int(),
  })
  .refine((value) => value.dont_know === true || value.artefact != null, {
    message: "a meaning card is answered or swiped left, never passed",
  });

export const itemResponseSchema = z.union([
  lexicalYesNoResponseSchema,
  audioAttemptResponseSchema,
  cTestResponseSchema,
  writtenAttemptResponseSchema,
  recallTypedResponseSchema,
  choiceResponseSchema,
  teachCardResponseSchema,
  assembleResponseSchema,
  meaningCardResponseSchema,
]);

export type Instrument = z.infer<typeof instrumentSchema>;
export type Item = z.infer<typeof itemSchema>;
export type ItemResponse = z.infer<typeof itemResponseSchema>;

export type LexicalYesNoResponse = z.infer<typeof lexicalYesNoResponseSchema>;
export type AudioAttemptResponse = z.infer<typeof audioAttemptResponseSchema>;
export type CTestResponse = z.infer<typeof cTestResponseSchema>;
export type WrittenAttemptResponse = z.infer<
  typeof writtenAttemptResponseSchema
>;
export type RecallTypedResponse = z.infer<typeof recallTypedResponseSchema>;
export type ChoiceResponse = z.infer<typeof choiceResponseSchema>;
export type TeachCardResponse = z.infer<typeof teachCardResponseSchema>;
export type AssembleResponse = z.infer<typeof assembleResponseSchema>;
export type MeaningCardResponse = z.infer<typeof meaningCardResponseSchema>;

/**
 * Which response belongs to which instrument.
 *
 * On the wire the response is a plain union, because nothing in it identifies
 * the instrument it answers. This map is the client-side half: a renderer for
 * one instrument gets the exact type it has to produce, so a mismatch is a
 * compile error instead of a rejected request.
 *
 * The three lesson instruments reuse existing shapes: a word bank is answered
 * like an assemble, a contrastive card is acknowledged like a teach card, and a
 * timed recall is typed like a recall.
 */
export type ResponseByInstrument = {
  lexical_yesno: LexicalYesNoResponse;
  elicited_imitation: AudioAttemptResponse;
  ctest: CTestResponse;
  writing_prompt: WrittenAttemptResponse;
  listening_choice: ChoiceResponse;
  speech_read_aloud: AudioAttemptResponse;
  speech_timed_qa: AudioAttemptResponse;
  speech_description: AudioAttemptResponse;
  recall_typed: RecallTypedResponse;
  translate_to_en: WrittenAttemptResponse;
  teach_card: TeachCardResponse;
  assemble: AssembleResponse;
  grapheme_audio_choice: ChoiceResponse;
  meaning_card: MeaningCardResponse;
  word_bank: AssembleResponse;
  contrastive_card: TeachCardResponse;
  timed_recall: RecallTypedResponse;
};

/** The item of one instrument, for renderers that handle exactly one. */
export type ItemOf<I extends Instrument> = Extract<Item, { instrument: I }>;
