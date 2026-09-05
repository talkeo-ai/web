import { z } from "zod";

/**
 * The closed vocabularies of the protocol.
 *
 * These identifiers never change with the interface language: the app ships
 * three locales and the protocol is the same for all of them. Anything the user
 * reads is looked up from `messages/` by these values, never derived from them.
 */

export const areaSchema = z.enum([
  "conversation",
  "pronunciation",
  "vocabulary",
  "grammar",
  "listening",
  "reading",
  "writing",
]);

export const bandSchema = z.enum(["A0", "A1", "A2", "B1", "B2", "C1", "C2"]);

export const selfAssessmentSchema = z.enum([
  "just_starting",
  "words_and_phrases",
  "simple_conversations",
  "varied_topics",
]);

/** The step to render. The service decides it; this client obeys it. */
export const stepSchema = z.enum([
  "survey",
  "kai_interview",
  "items",
  "kai_briefing",
  "roleplay",
  "verdict",
  "email",
  "day2",
]);

export const modeSchema = z.enum(["standard", "zero"]);

export const goalKindSchema = z.enum(["main", "micro"]);
export const goalStatusSchema = z.enum(["draft", "active", "completed"]);

export const summaryStatusSchema = z.enum(["measured", "partial", "gray"]);

export const roleplayModeSchema = z.enum(["voice", "chat"]);
export const roleplayVariantSchema = z.enum(["standard", "code_switching"]);

export const interestKindSchema = z.enum([
  "channel",
  "series",
  "topic",
  "other",
]);

export const speakerSchema = z.enum(["user", "kai"]);

/** The locales the protocol accepts, which are the ones this app ships. */
export const protocolLocaleSchema = z.enum(["es", "en", "pt"]);

export type Area = z.infer<typeof areaSchema>;
export type Band = z.infer<typeof bandSchema>;
export type SelfAssessment = z.infer<typeof selfAssessmentSchema>;
export type Step = z.infer<typeof stepSchema>;
export type Mode = z.infer<typeof modeSchema>;
export type GoalKind = z.infer<typeof goalKindSchema>;
export type GoalStatus = z.infer<typeof goalStatusSchema>;
export type SummaryStatus = z.infer<typeof summaryStatusSchema>;
export type RoleplayMode = z.infer<typeof roleplayModeSchema>;
export type RoleplayVariant = z.infer<typeof roleplayVariantSchema>;
export type InterestKind = z.infer<typeof interestKindSchema>;
export type Speaker = z.infer<typeof speakerSchema>;
export type ProtocolLocale = z.infer<typeof protocolLocaleSchema>;

/** Every area, in the order screens list them. */
export const AREAS = areaSchema.options;

/** Bands from lowest to highest, so a range can be drawn as a track. */
export const BANDS = bandSchema.options;

/** The four positions of the opening question, easiest to hardest. */
export const SELF_ASSESSMENTS = selfAssessmentSchema.options;
