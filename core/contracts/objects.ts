import { z } from "zod";

import {
  areaSchema,
  bandSchema,
  goalKindSchema,
  goalStatusSchema,
  modeSchema,
  roleplayModeSchema,
  roleplayVariantSchema,
  stepSchema,
  summaryStatusSchema,
} from "./enums";

/**
 * The objects the service hands to this surface.
 *
 * Dates travel as ISO strings rather than `Date`. They cross a server/client
 * boundary where a `Date` would be serialised anyway, and every one of them is
 * shown or compared as a whole day.
 */

/**
 * Where the run is.
 *
 * The service owns this and every write returns it, which is what keeps the
 * client from ever computing what comes next. `mode` only picks a renderer; it
 * is decided upstream.
 */
export const flowSchema = z.object({
  step: stepSchema,
  mode: modeSchema,
  mic_granted: z.boolean(),
  display_name: z.string().nullable().optional(),
});

/**
 * The goal card.
 *
 * Signing is the user's OK on the card: that is what moves it to `active` and
 * to version 1. Marking it completed is the user's call too — nothing here is
 * set on their behalf.
 */
export const goalSchema = z.object({
  goal_id: z.string(),
  kind: goalKindSchema,
  status: goalStatusSchema,
  name: z.string(),
  focus: z.string().nullable().optional(),
  target_date: z.iso.date().nullable().optional(),
  version: z.number().int(),
  signed_ts: z.iso.datetime().nullable().optional(),
});

export const scopeSchema = z.object({
  areas: z.union([z.array(areaSchema), z.array(z.literal("all"))]),
  version: z.number().int(),
});

export const situationClassSchema = z.object({
  situation_class_id: z.string(),
  name: z.string(),
});

/**
 * One row of the result screen.
 *
 * `measured_pct` is coverage, not score: how much of the area was looked at.
 * The remainder is drawn unpainted at its real size. `floor` and `ceiling` are
 * null when there is nothing to say yet, which is a state and not a zero.
 */
export const stateMapAreaSchema = z.object({
  area: areaSchema,
  in_scope: z.boolean(),
  refined: z.boolean(),
  floor: bandSchema.nullable().optional(),
  ceiling: bandSchema.nullable().optional(),
  measured_pct: z.number(),
  value_0_1: z.number().nullable().optional(),
});

/** The one-line version: an estimate, and how sure it is. */
export const headlineSchema = z.object({
  level_estimate: bandSchema,
  confidence_pct: z.number().int(),
});

export const zeroVerdictSchema = z.object({
  micro_goal: goalSchema,
  known_words_estimate: z.number().int(),
});

export const stateMapSchema = z.object({
  kind: z.enum(["standard", "zero"]),
  headline: headlineSchema.nullable().optional(),
  areas: z.array(stateMapAreaSchema),
  zero: zeroVerdictSchema.nullable().optional(),
});

/**
 * What the guide narrates, with pointers.
 *
 * The ids make the narration auditable: a claim can be traced back to the rows
 * it came from. Their contents do not travel.
 */
export const summaryAreaSchema = z.object({
  area: areaSchema,
  status: summaryStatusSchema,
  evidence_refs: z.array(z.string()),
});

export const stateSummarySchema = z.object({
  areas: z.array(summaryAreaSchema),
});

export const sessionGoalCheckSchema = z.object({
  check_id: z.string(),
  text: z.string(),
});

export const roleplayScenarioSchema = z.object({
  situation_class_id: z.string(),
  title: z.string(),
  setup: z.string(),
});

/**
 * Everything the roleplay screen needs, assembled upstream.
 *
 * `mission_words` only comes with the `code_switching` variant, which is the
 * declared easier version of the same exercise rather than a different one.
 */
export const roleplayBundleSchema = z.object({
  bundle_id: z.string(),
  scenario: roleplayScenarioSchema,
  session_goals: z.array(sessionGoalCheckSchema),
  mode: roleplayModeSchema,
  variant: roleplayVariantSchema,
  mission_words: z.array(z.string()).nullable().optional(),
});

export const checkOutcomeSchema = z.object({
  check_id: z.string(),
  done: z.boolean(),
});

export type Flow = z.infer<typeof flowSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type Scope = z.infer<typeof scopeSchema>;
export type SituationClass = z.infer<typeof situationClassSchema>;
export type StateMapArea = z.infer<typeof stateMapAreaSchema>;
export type Headline = z.infer<typeof headlineSchema>;
export type ZeroVerdict = z.infer<typeof zeroVerdictSchema>;
export type StateMap = z.infer<typeof stateMapSchema>;
export type SummaryArea = z.infer<typeof summaryAreaSchema>;
export type StateSummary = z.infer<typeof stateSummarySchema>;
export type SessionGoalCheck = z.infer<typeof sessionGoalCheckSchema>;
export type RoleplayScenario = z.infer<typeof roleplayScenarioSchema>;
export type RoleplayBundle = z.infer<typeof roleplayBundleSchema>;
export type CheckOutcome = z.infer<typeof checkOutcomeSchema>;
