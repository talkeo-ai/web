import { z } from "zod";

import { replyArtefactSchema, uploadArtefactSchema } from "./artefacts";
import {
  areaSchema,
  goalKindSchema,
  interestKindSchema,
  protocolLocaleSchema,
  selfAssessmentSchema,
  speakerSchema,
} from "./enums";
import { instrumentSchema, itemResponseSchema, itemSchema } from "./items";
import {
  checkOutcomeSchema,
  flowSchema,
  goalSchema,
  roleplayBundleSchema,
  scopeSchema,
  situationClassSchema,
  stateMapSchema,
  stateSummarySchema,
} from "./objects";

/**
 * What goes in and what comes out of every call.
 *
 * `schema_version` rides on every result. It is not sent on requests, and it is
 * parsed but never branched on: a bump is a signal to go look, not something
 * this client handles two ways.
 *
 * Every write returns the flow next to its own result, which is what keeps the
 * client from ever deciding what screen comes next.
 */

/** The contract version this client was written against. */
export const SCHEMA_VERSION = 1;

const versioned = { schema_version: z.number().int() };

/** The result of a write that reports nothing except that it happened. */
export const okResultSchema = z.object({
  ...versioned,
  ok: z.literal(true),
  flow: flowSchema,
});

// --- session and identity ---

export const createAnonymousUserResultSchema = z.object({
  ...versioned,
  user_id: z.string(),
});

/**
 * What this client can do, declared once when the run starts.
 *
 * Two things hang off it. Without `audio` in `artefacts` the service adapts
 * what it serves and says later what could not be measured. And
 * `supported_instruments` is why an older client never receives an exercise it
 * has no renderer for.
 */
export const clientDeclarationSchema = z.object({
  surface: z.string(),
  locale: protocolLocaleSchema,
  artefacts: z.array(z.enum(["text", "audio"])),
  supported_instruments: z.array(instrumentSchema),
});

export const createSessionRequestSchema = z.object({
  user_id: z.string(),
  client: clientDeclarationSchema,
});

export const createSessionResultSchema = z.object({
  ...versioned,
  session_id: z.string(),
  flow: flowSchema,
});

export const flowResultSchema = z.object({ ...versioned, flow: flowSchema });

// --- survey ---

export const submitSurveyRequestSchema = z.object({
  session_id: z.string(),
  self_assessment: selfAssessmentSchema,
  scope_areas: z.union([z.array(areaSchema), z.array(z.literal("all"))]),
});

export const submitSurveyResultSchema = z.object({
  ...versioned,
  scope: scopeSchema,
  flow: flowSchema,
});

export const setDisplayNameRequestSchema = z.object({
  user_id: z.string(),
  name: z.string(),
});

export const setMicPermissionRequestSchema = z.object({
  session_id: z.string(),
  granted: z.boolean(),
});

// --- the interview ---

export const logKaiTurnRequestSchema = z.object({
  session_id: z.string(),
  speaker: speakerSchema,
  artefact: uploadArtefactSchema,
});

export const createGoalDraftRequestSchema = z.object({
  user_id: z.string(),
  name: z.string(),
  focus: z.string().optional(),
  situation_class_id: z.string().optional(),
  /** Left out means the main card; the service applies that default. */
  kind: goalKindSchema.optional(),
});

export const updateGoalDraftRequestSchema = z.object({
  goal_id: z.string(),
  name: z.string().optional(),
  focus: z.string().optional(),
  target_date: z.iso.date().optional(),
});

export const signGoalRequestSchema = z.object({ goal_id: z.string() });

export const goalResultSchema = z.object({
  ...versioned,
  goal: goalSchema,
  flow: flowSchema,
});

export const getGoalRequestSchema = z.object({ user_id: z.string() });

export const goalsResultSchema = z.object({
  ...versioned,
  goals: z.array(goalSchema),
});

export const situationClassesResultSchema = z.object({
  ...versioned,
  classes: z.array(situationClassSchema),
});

export const setSituationClassRequestSchema = z.object({
  user_id: z.string(),
  situation_class_id: z.string(),
});

export const setNeedFutureRequestSchema = z.object({
  user_id: z.string(),
  date: z.iso.date(),
  situation_class_id: z.string().optional(),
  note: z.string().optional(),
});

export const addInterestRequestSchema = z.object({
  user_id: z.string(),
  name: z.string(),
  kind: interestKindSchema,
  note: z.string().optional(),
});

export const getStateSummaryRequestSchema = z.object({ user_id: z.string() });

export const stateSummaryResultSchema = z.object({
  ...versioned,
  state_summary: stateSummarySchema,
});

// --- items ---

export const getNextItemRequestSchema = z.object({ session_id: z.string() });

/**
 * The next exercise, or the news that the step is over.
 *
 * A null item is neither an error nor an empty queue: the run moved on, and
 * `flow` says where to. The same pair of calls serves every phase of the
 * measuring step, which is what keeps those phases invisible from here.
 */
export const nextItemResultSchema = z.object({
  ...versioned,
  item: itemSchema.nullable().optional(),
  flow: flowSchema.nullable().optional(),
});

export const submitResponseRequestSchema = z.object({
  session_id: z.string(),
  item_id: z.string(),
  response: itemResponseSchema,
});

/**
 * An acknowledgement and the flow, and nothing else.
 *
 * There is deliberately no field saying whether the answer was right: a running
 * score during measurement is not something this product shows.
 */
export const submitResponseResultSchema = z.object({
  ...versioned,
  accepted: z.literal(true),
  flow: flowSchema,
});

// --- roleplay ---

export const getRoleplayBundleRequestSchema = z.object({
  session_id: z.string(),
});

export const roleplayBundleResultSchema = z.object({
  ...versioned,
  roleplay_bundle: roleplayBundleSchema,
});

export const roleplayTurnRequestSchema = z.object({
  session_id: z.string(),
  artefact: uploadArtefactSchema,
});

export const roleplayTurnResultSchema = z.object({
  ...versioned,
  reply: z.object({ artefact: replyArtefactSchema }),
  flow: flowSchema,
});

export const endRoleplayRequestSchema = z.object({ session_id: z.string() });

export const endRoleplayResultSchema = z.object({
  ...versioned,
  checks: z.array(checkOutcomeSchema),
  flow: flowSchema,
});

// --- result screen and identity ---

export const getStateMapRequestSchema = z.object({ user_id: z.string() });

export const stateMapResultSchema = z.object({
  ...versioned,
  state_map: stateMapSchema,
});

export const getFlowStateRequestSchema = z.object({ session_id: z.string() });

export const attachIdentityRequestSchema = z.object({
  user_id: z.string(),
  email: z.string(),
});

export type OkResult = z.infer<typeof okResultSchema>;
export type CreateAnonymousUserResult = z.infer<
  typeof createAnonymousUserResultSchema
>;
export type ClientDeclaration = z.infer<typeof clientDeclarationSchema>;
export type CreateSessionRequest = z.infer<typeof createSessionRequestSchema>;
export type CreateSessionResult = z.infer<typeof createSessionResultSchema>;
export type FlowResult = z.infer<typeof flowResultSchema>;
export type GetFlowStateRequest = z.infer<typeof getFlowStateRequestSchema>;
export type SubmitSurveyRequest = z.infer<typeof submitSurveyRequestSchema>;
export type SubmitSurveyResult = z.infer<typeof submitSurveyResultSchema>;
export type SetDisplayNameRequest = z.infer<typeof setDisplayNameRequestSchema>;
export type SetMicPermissionRequest = z.infer<
  typeof setMicPermissionRequestSchema
>;
export type LogKaiTurnRequest = z.infer<typeof logKaiTurnRequestSchema>;
export type CreateGoalDraftRequest = z.infer<
  typeof createGoalDraftRequestSchema
>;
export type UpdateGoalDraftRequest = z.infer<
  typeof updateGoalDraftRequestSchema
>;
export type SignGoalRequest = z.infer<typeof signGoalRequestSchema>;
export type GoalResult = z.infer<typeof goalResultSchema>;
export type GetGoalRequest = z.infer<typeof getGoalRequestSchema>;
export type GoalsResult = z.infer<typeof goalsResultSchema>;
export type SituationClassesResult = z.infer<
  typeof situationClassesResultSchema
>;
export type SetSituationClassRequest = z.infer<
  typeof setSituationClassRequestSchema
>;
export type SetNeedFutureRequest = z.infer<typeof setNeedFutureRequestSchema>;
export type AddInterestRequest = z.infer<typeof addInterestRequestSchema>;
export type GetStateSummaryRequest = z.infer<
  typeof getStateSummaryRequestSchema
>;
export type StateSummaryResult = z.infer<typeof stateSummaryResultSchema>;
export type GetNextItemRequest = z.infer<typeof getNextItemRequestSchema>;
export type NextItemResult = z.infer<typeof nextItemResultSchema>;
export type SubmitResponseRequest = z.infer<typeof submitResponseRequestSchema>;
export type SubmitResponseResult = z.infer<typeof submitResponseResultSchema>;
export type GetRoleplayBundleRequest = z.infer<
  typeof getRoleplayBundleRequestSchema
>;
export type RoleplayBundleResult = z.infer<typeof roleplayBundleResultSchema>;
export type RoleplayTurnRequest = z.infer<typeof roleplayTurnRequestSchema>;
export type RoleplayTurnResult = z.infer<typeof roleplayTurnResultSchema>;
export type EndRoleplayRequest = z.infer<typeof endRoleplayRequestSchema>;
export type EndRoleplayResult = z.infer<typeof endRoleplayResultSchema>;
export type GetStateMapRequest = z.infer<typeof getStateMapRequestSchema>;
export type StateMapResult = z.infer<typeof stateMapResultSchema>;
export type AttachIdentityRequest = z.infer<typeof attachIdentityRequestSchema>;
