import { z } from "zod";

import { servedAudioSchema } from "./artefacts";
import {
  areaSchema,
  bandSchema,
  cellStatusSchema,
  goalKindSchema,
  goalStatusSchema,
  interviewEventKindSchema,
  markActionSchema,
  modeSchema,
  originSchema,
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
 * A per-turn objective inside the conversation, bound to a cell that was just
 * taught. The conversation declares cells; it never invents them.
 */
export const missionSchema = z.object({
  mission_id: z.string(),
  cell_id: z.string(),
  text: z.string(),
});

/**
 * Everything the roleplay screen needs, assembled upstream.
 *
 * `mission_words` is a kept wire field: `missions` carries the same idea with
 * the cell each one comes from. It defaults to empty rather than being
 * required, so a bundle recorded before missions existed still parses.
 */
export const roleplayBundleSchema = z.object({
  bundle_id: z.string(),
  scenario: roleplayScenarioSchema,
  session_goals: z.array(sessionGoalCheckSchema),
  mode: roleplayModeSchema,
  variant: roleplayVariantSchema,
  mission_words: z.array(z.string()).nullable().optional(),
  missions: z.array(missionSchema).default([]),
});

export const checkOutcomeSchema = z.object({
  check_id: z.string(),
  done: z.boolean(),
});

/** A mission done is a cell used. It never says a sentence was correct. */
export const missionProgressSchema = z.object({
  mission_id: z.string(),
  done: z.boolean(),
});

/**
 * What the user did not know before the lesson and used in the conversation.
 * `used` is always a subset of `taught`. Labels, never internal ids.
 */
export const deltaSchema = z.object({
  taught: z.array(z.string()),
  used: z.array(z.string()),
});

// --- the assistant's turn, what it registers, what this client reports ---

/**
 * Fires when the spoken audio reaches `word_index`. `target` names something
 * this client knows how to point at: an area, a card, a control.
 */
export const markSchema = z.object({
  word_index: z.number().int(),
  action: markActionSchema,
  target: z.string(),
});

export const wordTimingSchema = z.object({
  word_index: z.number().int(),
  start_ms: z.number().int(),
  end_ms: z.number().int(),
});

export const interviewEventSchema = z.object({
  event_id: z.string(),
  kind: interviewEventKindSchema,
  origin: originSchema,
  payload: z.record(z.string(), z.unknown()).default({}),
});

/**
 * One turn of the assistant.
 *
 * `text` is what the screen renders and `audio` is the same text spoken;
 * `marks` and `word_timings` are what lets the screen sync what it shows with
 * what is heard. `events` is what the assistant registered this turn.
 */
export const talkeoTurnSchema = z.object({
  turn_id: z.string(),
  text: z.string(),
  marks: z.array(markSchema).default([]),
  word_timings: z.array(wordTimingSchema).default([]),
  audio: servedAudioSchema.nullable().optional(),
  events: z.array(interviewEventSchema).default([]),
  closing: z.boolean().default(false),
});

/**
 * What the person changed on a card, by hand, on screen.
 *
 * It travels with their next turn rather than through a door of its own, because
 * that is what it is: an edit reaches the assistant as part of the turn, exactly
 * as if they had said it, and is never asked about again.
 *
 * `confirms` is them pressing the card's own confirm, which settles the stage —
 * so the assistant does not ask in words for a yes it already has. It can arrive
 * with `field` and `value` empty: agreeing with what is already on screen is not
 * an edit, and it still settles.
 */
export const cardEditSchema = z.object({
  card: z.string(),
  field: z.string().default(""),
  value: z.string().default(""),
  confirms: z.boolean().default(false),
});

/**
 * One card as it stands right now, rather than as the event that last changed it.
 *
 * `card_updated` is the right shape for drawing a card as it fills and the wrong
 * one for answering "what is on screen": a screen that reloads would have to
 * replay every event of the conversation to find out. `body` is the card's own
 * shape and differs per card.
 */
export const interviewCardSchema = z.object({
  card: z.string(),
  state: z.string(),
  body: z.record(z.string(), z.unknown()).default({}),
});

/** Enough to resume mid-interview and show what was registered. Never the transcript. */
export const interviewStateSchema = z.object({
  turn_count: z.number().int(),
  last_turn: talkeoTurnSchema.nullable().optional(),
  events: z.array(interviewEventSchema).default([]),
  closed: z.boolean().default(false),
  /**
   * Where the conversation is, and how long it is.
   *
   * `stages_total` comes from the service because a screen that hard-codes it
   * keeps drawing 5/7 after the interview grows an eighth stage — and because
   * the first stage never announces itself, so a bar drawn before the first
   * turn has nothing else to go on. Defaulted, so a recording made before the
   * service sent them still parses.
   */
  stage: z.number().int().default(0),
  stages_total: z.number().int().default(0),
  cards: z.array(interviewCardSchema).default([]),
});

// --- the goal after the interview, and the plan card ---

/**
 * One thing the user needs for a milestone. `why` is the one line the
 * assistant can say about it. `cell_id` is opaque: nothing internal travels.
 */
export const goalCellSchema = z.object({
  cell_id: z.string(),
  label: z.string(),
  why: z.string().nullable().optional(),
  origin: originSchema.default("inferred"),
  status: cellStatusSchema.default("predicted"),
});

export const milestoneSchema = z.object({
  index: z.number().int(),
  title: z.string(),
  expected_result: z.string(),
  cells: z.array(goalCellSchema).default([]),
});

export const goalArtefactSchema = z.object({
  artefact_id: z.string(),
  kind: z.enum(["text", "link"]),
  title: z.string(),
});

/**
 * The goal after the interview: what the user said, what was inferred and
 * declared, and the milestones with their cells. Versioned, never mutated.
 */
export const goalV2Schema = z.object({
  goal_id: z.string(),
  version: z.number().int(),
  status: goalStatusSchema,
  name: z.string(),
  focus: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  expected_result: z.string().nullable().optional(),
  target_date: z.iso.date().nullable().optional(),
  situation_class_id: z.string().nullable().optional(),
  milestones: z.array(milestoneSchema).default([]),
  artefacts: z.array(goalArtefactSchema).default([]),
  origin: originSchema.default("declared"),
  signed_ts: z.iso.datetime().nullable().optional(),
});

export const planItemSchema = z.object({
  cell_id: z.string(),
  label: z.string(),
  why: z.string(),
});

export const planPracticeSchema = z.object({
  title: z.string(),
  setup: z.string(),
});

/**
 * What the user sees before the lesson: the goal in their words, the few cells
 * for today with their why, and what the practice will be.
 */
export const planCardSchema = z.object({
  goal: goalV2Schema,
  today: z.array(planItemSchema),
  practice: planPracticeSchema,
});

// --- the day plan and the dose ---

/** One of the selection steps behind a block, so a claim can be checked. */
export const rationaleStepSchema = z.object({
  step: z.string(),
  detail: z.string(),
});

export const planBlockSchema = z.object({
  index: z.number().int(),
  kind: z.string(),
  area: z.string(),
  objective: z.string(),
  surface_id: z.string(),
  minutes: z.number().int(),
  predicted_success: z.number().nullable().optional(),
  is_warmup: z.boolean().default(false),
  rationale: z.string(),
  rationale_steps: z.array(rationaleStepSchema).default([]),
});

export const reviewColumnSchema = z.object({
  due_count: z.number().int(),
  blocks: z.number().int(),
  spilled_to_tomorrow: z.number().int(),
  cap_breached_for_warmup: z.boolean().default(false),
  never_advanced: z.boolean().default(true),
});

/** A floor that could not be met says why; it is never silent. */
export const floorStatusSchema = z.object({
  area: z.string(),
  blocks_this_week: z.number().int(),
  satisfied: z.boolean(),
  remedy: z.string(),
  declared_reason: z.string().nullable().optional(),
});

export const doseSchema = z.object({
  target_session_minutes: z.number().int(),
  produced_minutes_today: z.number(),
  assisted_minutes_today: z.number(),
  streak_minutes: z.number().int(),
  streak_days: z.number().int(),
  deficit_minutes: z.number(),
  weekly_blocks: z.number().int(),
  basis: z.string(),
});

export const rangoSchema = z.object({
  weekly_blocks: z.number().int(),
  active: z.array(z.record(z.string(), z.unknown())).default([]),
  queue: z.array(z.record(z.string(), z.unknown())).default([]),
  line: z.string(),
  basis: z.string(),
});

/**
 * The plan for one day.
 *
 * `declarations` is what this run could not do; `not_in_this_plan` is what the
 * service does not do yet. Two absences, kept apart on purpose.
 */
export const dayPlanSchema = z.object({
  date: z.string(),
  budget_minutes: z.number().int(),
  block_minutes: z.number().int(),
  catalog_slice: z.string(),
  review: reviewColumnSchema,
  blocks: z.array(planBlockSchema),
  bar: z.record(z.string(), z.unknown()),
  stream: z.array(z.string()).default([]),
  dose: doseSchema,
  rango: rangoSchema,
  weekly_floor: z.array(floorStatusSchema).default([]),
  declarations: z.array(z.string()).default([]),
  not_in_this_plan: z.array(z.string()).default([]),
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
export type Mission = z.infer<typeof missionSchema>;
export type RoleplayBundle = z.infer<typeof roleplayBundleSchema>;
export type CheckOutcome = z.infer<typeof checkOutcomeSchema>;
export type MissionProgress = z.infer<typeof missionProgressSchema>;
export type Delta = z.infer<typeof deltaSchema>;
export type Mark = z.infer<typeof markSchema>;
export type WordTiming = z.infer<typeof wordTimingSchema>;
export type InterviewEvent = z.infer<typeof interviewEventSchema>;
export type TalkeoTurn = z.infer<typeof talkeoTurnSchema>;
export type CardEdit = z.infer<typeof cardEditSchema>;
export type InterviewCard = z.infer<typeof interviewCardSchema>;
export type InterviewState = z.infer<typeof interviewStateSchema>;
export type GoalCell = z.infer<typeof goalCellSchema>;
export type Milestone = z.infer<typeof milestoneSchema>;
export type GoalArtefact = z.infer<typeof goalArtefactSchema>;
export type GoalV2 = z.infer<typeof goalV2Schema>;
export type PlanItem = z.infer<typeof planItemSchema>;
export type PlanPractice = z.infer<typeof planPracticeSchema>;
export type PlanCard = z.infer<typeof planCardSchema>;
export type RationaleStep = z.infer<typeof rationaleStepSchema>;
export type PlanBlock = z.infer<typeof planBlockSchema>;
export type ReviewColumn = z.infer<typeof reviewColumnSchema>;
export type FloorStatus = z.infer<typeof floorStatusSchema>;
export type Dose = z.infer<typeof doseSchema>;
export type Rango = z.infer<typeof rangoSchema>;
export type DayPlan = z.infer<typeof dayPlanSchema>;
