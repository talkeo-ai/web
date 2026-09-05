import { z } from "zod";

import { replyArtefactSchema, uploadArtefactSchema } from "./artefacts";
import {
  areaSchema,
  goalKindSchema,
  interestKindSchema,
  originSchema,
  protocolLocaleSchema,
  selfAssessmentSchema,
  speakerSchema,
  viewEventSchema,
} from "./enums";
import { instrumentSchema, itemResponseSchema, itemSchema } from "./items";
import {
  checkOutcomeSchema,
  dayPlanSchema,
  deltaSchema,
  doseSchema,
  flowSchema,
  goalArtefactSchema,
  goalSchema,
  goalV2Schema,
  interviewStateSchema,
  missionProgressSchema,
  planCardSchema,
  rangoSchema,
  roleplayBundleSchema,
  scopeSchema,
  situationClassSchema,
  stateMapSchema,
  stateSummarySchema,
  talkeoTurnSchema,
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

// --- the day plan and the dose ---

export const getDayPlanRequestSchema = z.object({
  user_id: z.string(),
  budget_minutes: z.number().int().optional(),
});

export const dayPlanResultSchema = z.object({
  ...versioned,
  plan: dayPlanSchema,
});

export const getDoseRequestSchema = z.object({ user_id: z.string() });

export const doseResultSchema = z.object({ ...versioned, dose: doseSchema });

export const setDoseTargetRequestSchema = z.object({
  user_id: z.string(),
  target_session_minutes: z.number().int(),
});

/** Reordering goals is one of the two levers over the split; the other is scope. */
export const setGoalOrderRequestSchema = z.object({
  user_id: z.string(),
  goal_ids: z.array(z.string()),
});

export const goalOrderResultSchema = z.object({
  ...versioned,
  order: z.array(z.string()),
  rango: rangoSchema,
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

/**
 * The reply, and which missions the turn completed. A mission done is a cell
 * used; nothing here says a sentence was correct.
 */
export const roleplayTurnResultSchema = z.object({
  ...versioned,
  reply: z.object({ artefact: replyArtefactSchema }),
  flow: flowSchema,
  mission_progress: z.array(missionProgressSchema).default([]),
});

export const endRoleplayRequestSchema = z.object({ session_id: z.string() });

/** The checks, and the delta of the first win, computed here and shown at the close. */
export const endRoleplayResultSchema = z.object({
  ...versioned,
  checks: z.array(checkOutcomeSchema),
  flow: flowSchema,
  delta: deltaSchema.nullable().optional(),
});

// --- the assistant's interview, the plan card, the delta ---

/**
 * The user's turn in. No artefact asks for the assistant's opening or its next
 * turn: the assistant talks first, and this client never scripts it.
 */
export const talkeoTurnRequestSchema = z.object({
  session_id: z.string(),
  artefact: uploadArtefactSchema.nullable().optional(),
});

export const talkeoTurnResultSchema = z.object({
  ...versioned,
  turn: talkeoTurnSchema,
  flow: flowSchema,
});

export const getInterviewStateRequestSchema = z.object({
  session_id: z.string(),
});

export const interviewStateResultSchema = z.object({
  ...versioned,
  state: interviewStateSchema,
  flow: flowSchema,
});

/** Text pasted or a link, to materialise the goal. Files come later. */
export const attachArtefactRequestSchema = z.object({
  session_id: z.string(),
  kind: z.enum(["text", "link"]),
  title: z.string().optional(),
  text: z.string().optional(),
  url: z.string().optional(),
});

export const attachArtefactResultSchema = z.object({
  ...versioned,
  artefact: goalArtefactSchema,
  flow: flowSchema,
});

/**
 * The areas the user wants to improve, chosen on screen or marked by the
 * assistant from what the user said. Left out, `origin` means declared.
 */
export const setScopeRequestSchema = z.object({
  session_id: z.string(),
  areas: z.union([z.array(areaSchema), z.array(z.literal("all"))]),
  origin: originSchema.optional(),
});

export const setScopeResultSchema = z.object({
  ...versioned,
  scope: scopeSchema,
  flow: flowSchema,
});

/**
 * What is on screen right now. Reporting a view never writes evidence; it
 * timestamps the card so latency is measured from when it was actually seen.
 */
export const reportViewRequestSchema = z.object({
  session_id: z.string(),
  event: viewEventSchema,
  item_id: z.string().optional(),
  instrument: z.string().optional(),
});

export const getGoalV2RequestSchema = z.object({ user_id: z.string() });

export const goalV2ResultSchema = z.object({
  ...versioned,
  goal: goalV2Schema,
});

export const getPlanCardRequestSchema = z.object({ session_id: z.string() });

export const planCardResultSchema = z.object({
  ...versioned,
  plan: planCardSchema,
  flow: flowSchema,
});

/**
 * One tap: drop a cell, or add one the user feels is missing. An added one
 * enters as declared and is verified before anything is taught on it.
 */
export const editPlanCardRequestSchema = z.object({
  session_id: z.string(),
  remove_cell_ids: z.array(z.string()).optional(),
  add_labels: z.array(z.string()).optional(),
});

export const getDeltaRequestSchema = z.object({ session_id: z.string() });

export const deltaResultSchema = z.object({
  ...versioned,
  delta: deltaSchema,
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

/**
 * The catalog: one entry per call, with the schema its answer is parsed by.
 *
 * This list is the whole API surface of the service as this client knows it.
 * The adapters read it, and a test holds the port to it, so a call cannot
 * exist on one side without the other noticing.
 */
export const TOOLS = {
  get_flow_state: flowResultSchema,
  get_next_item: nextItemResultSchema,
  get_state_map: stateMapResultSchema,
  get_state_summary: stateSummaryResultSchema,
  get_situation_classes: situationClassesResultSchema,
  get_roleplay_bundle: roleplayBundleResultSchema,
  get_goal: goalsResultSchema,
  get_day_plan: dayPlanResultSchema,
  get_dose: doseResultSchema,
  create_anonymous_user: createAnonymousUserResultSchema,
  create_session: createSessionResultSchema,
  submit_survey: submitSurveyResultSchema,
  set_display_name: okResultSchema,
  set_mic_permission: okResultSchema,
  log_kai_turn: okResultSchema,
  create_goal_draft: goalResultSchema,
  update_goal_draft: goalResultSchema,
  sign_goal: goalResultSchema,
  set_situation_class: okResultSchema,
  set_need_future: okResultSchema,
  add_interest: okResultSchema,
  submit_response: submitResponseResultSchema,
  roleplay_turn: roleplayTurnResultSchema,
  end_roleplay: endRoleplayResultSchema,
  attach_identity: okResultSchema,
  set_dose_target: doseResultSchema,
  set_goal_order: goalOrderResultSchema,
  get_interview_state: interviewStateResultSchema,
  get_goal_v2: goalV2ResultSchema,
  get_plan_card: planCardResultSchema,
  get_delta: deltaResultSchema,
  talkeo_turn: talkeoTurnResultSchema,
  attach_artefact: attachArtefactResultSchema,
  set_scope: setScopeResultSchema,
  report_view: okResultSchema,
  edit_plan_card: planCardResultSchema,
} as const;

export type ToolName = keyof typeof TOOLS;

/** Every call the service catalogs, by wire name. */
export const TOOL_NAMES = Object.keys(TOOLS) as ToolName[];

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
export type GetDayPlanRequest = z.infer<typeof getDayPlanRequestSchema>;
export type DayPlanResult = z.infer<typeof dayPlanResultSchema>;
export type GetDoseRequest = z.infer<typeof getDoseRequestSchema>;
export type DoseResult = z.infer<typeof doseResultSchema>;
export type SetDoseTargetRequest = z.infer<typeof setDoseTargetRequestSchema>;
export type SetGoalOrderRequest = z.infer<typeof setGoalOrderRequestSchema>;
export type GoalOrderResult = z.infer<typeof goalOrderResultSchema>;
export type TalkeoTurnRequest = z.infer<typeof talkeoTurnRequestSchema>;
export type TalkeoTurnResult = z.infer<typeof talkeoTurnResultSchema>;
export type GetInterviewStateRequest = z.infer<
  typeof getInterviewStateRequestSchema
>;
export type InterviewStateResult = z.infer<typeof interviewStateResultSchema>;
export type AttachArtefactRequest = z.infer<typeof attachArtefactRequestSchema>;
export type AttachArtefactResult = z.infer<typeof attachArtefactResultSchema>;
export type SetScopeRequest = z.infer<typeof setScopeRequestSchema>;
export type SetScopeResult = z.infer<typeof setScopeResultSchema>;
export type ReportViewRequest = z.infer<typeof reportViewRequestSchema>;
export type GetGoalV2Request = z.infer<typeof getGoalV2RequestSchema>;
export type GoalV2Result = z.infer<typeof goalV2ResultSchema>;
export type GetPlanCardRequest = z.infer<typeof getPlanCardRequestSchema>;
export type PlanCardResult = z.infer<typeof planCardResultSchema>;
export type EditPlanCardRequest = z.infer<typeof editPlanCardRequestSchema>;
export type GetDeltaRequest = z.infer<typeof getDeltaRequestSchema>;
export type DeltaResult = z.infer<typeof deltaResultSchema>;
