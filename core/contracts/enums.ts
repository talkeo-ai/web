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

/**
 * The step to render. The service decides it; this client obeys it.
 *
 * `survey`, `kai_interview`, `kai_briefing` and `day2` are kept as wire values
 * so nothing old breaks, but no new run enters them: the run now opens with
 * the assistant talking, and the closing steps are `delta` and `home`.
 */
export const stepSchema = z.enum([
  "survey",
  "kai_interview",
  "items",
  "kai_briefing",
  "roleplay",
  "verdict",
  "email",
  "day2",
  "talkeo_interview",
  "verification",
  "plan",
  "lesson",
  "delta",
  "home",
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

/** `kai` is a kept wire value; the assistant speaks as `talkeo`. */
export const speakerSchema = z.enum(["user", "kai", "talkeo"]);

/** Where a fact about the user came from. The two are never mixed. */
export const originSchema = z.enum(["declared", "inferred"]);

/** What the screen does when the spoken audio reaches a marked word. */
export const markActionSchema = z.enum(["highlight", "flip", "point", "reveal"]);

/**
 * What the assistant registered during a turn.
 *
 * Every kind is an annotation or a policy: none of them is evidence, and none
 * of them carries a level.
 */
export const interviewEventKindSchema = z.enum([
  "name_heard",
  "scope_set",
  "goal_noted",
  "situation_noted",
  "history_noted",
  "interest_noted",
  "obstacle_noted",
  "artefact_attached",
  "belief_noted",
  "doubt_noted",
  "comment_noted",
  "deadline_noted",
]);

/** What this client reports about what is on screen. */
export const viewEventSchema = z.enum(["card_shown", "card_left"]);

/** A goal cell over its life inside the run. Only the service writes it. */
export const cellStatusSchema = z.enum([
  "predicted",
  "verified_unknown",
  "known",
  "taught",
  "used",
]);

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
export type Origin = z.infer<typeof originSchema>;
export type MarkAction = z.infer<typeof markActionSchema>;
export type InterviewEventKind = z.infer<typeof interviewEventKindSchema>;
export type ViewEvent = z.infer<typeof viewEventSchema>;
export type CellStatus = z.infer<typeof cellStatusSchema>;
export type ProtocolLocale = z.infer<typeof protocolLocaleSchema>;

/** Every area, in the order screens list them. */
export const AREAS = areaSchema.options;

/** Bands from lowest to highest, so a range can be drawn as a track. */
export const BANDS = bandSchema.options;

/** The four positions of the opening question, easiest to hardest. */
export const SELF_ASSESSMENTS = selfAssessmentSchema.options;
