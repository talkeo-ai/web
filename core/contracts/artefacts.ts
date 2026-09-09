import { z } from "zod";

/**
 * What crosses the boundary, in both directions.
 *
 * The asymmetry is deliberate. Audio going up is a per-turn blob, because
 * streaming would be a change of transport and not of these names. Audio coming
 * down is a URL, because the client only has to play it.
 *
 * There is no transcript artefact on purpose: the client uploads audio and the
 * service transcribes it. A surface can never claim to have produced a
 * transcript.
 */

export const textArtefactSchema = z.object({
  kind: z.literal("text"),
  text: z.string(),
});

/** Audio going up: one turn, base64, with its mime type. */
export const audioUploadArtefactSchema = z.object({
  kind: z.literal("audio"),
  mime: z.string(),
  b64: z.string(),
});

/** Audio coming down: item prompts and replies. */
export const servedAudioSchema = z.object({
  kind: z.literal("audio"),
  url: z.string(),
});

export const uploadArtefactSchema = z.union([
  textArtefactSchema,
  audioUploadArtefactSchema,
]);

export const replyArtefactSchema = z.union([
  textArtefactSchema,
  servedAudioSchema,
]);

export type TextArtefact = z.infer<typeof textArtefactSchema>;
export type AudioUploadArtefact = z.infer<typeof audioUploadArtefactSchema>;
export type ServedAudio = z.infer<typeof servedAudioSchema>;
export type UploadArtefact = z.infer<typeof uploadArtefactSchema>;
export type ReplyArtefact = z.infer<typeof replyArtefactSchema>;
