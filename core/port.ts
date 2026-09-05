import type {
  AddInterestRequest,
  AttachArtefactRequest,
  AttachArtefactResult,
  AttachIdentityRequest,
  CreateAnonymousUserResult,
  CreateGoalDraftRequest,
  CreateSessionRequest,
  CreateSessionResult,
  DayPlanResult,
  DeltaResult,
  DoseResult,
  EditPlanCardRequest,
  EndRoleplayRequest,
  EndRoleplayResult,
  FlowResult,
  GetDayPlanRequest,
  GetDeltaRequest,
  GetDoseRequest,
  GetFlowStateRequest,
  GetGoalRequest,
  GetGoalV2Request,
  GetInterviewStateRequest,
  GetNextItemRequest,
  GetPlanCardRequest,
  GetRoleplayBundleRequest,
  GetStateMapRequest,
  GetStateSummaryRequest,
  GoalOrderResult,
  GoalResult,
  GoalV2Result,
  GoalsResult,
  InterviewStateResult,
  LogKaiTurnRequest,
  NextItemResult,
  OkResult,
  PlanCardResult,
  ReportViewRequest,
  RoleplayBundleResult,
  RoleplayTurnRequest,
  RoleplayTurnResult,
  SetDisplayNameRequest,
  SetDoseTargetRequest,
  SetGoalOrderRequest,
  SetMicPermissionRequest,
  SetNeedFutureRequest,
  SetScopeRequest,
  SetScopeResult,
  SetSituationClassRequest,
  SignGoalRequest,
  SituationClassesResult,
  StateMapResult,
  StateSummaryResult,
  SubmitResponseRequest,
  SubmitResponseResult,
  SubmitSurveyRequest,
  SubmitSurveyResult,
  TalkeoTurnRequest,
  TalkeoTurnResult,
  UpdateGoalDraftRequest,
} from "./contracts";

/**
 * The only door to the measurement service.
 *
 * Nothing above this line knows whether that service is running or whether a
 * fixture is answering. Swapping one for the other is configuration, not
 * components.
 *
 * The shape is a catalog of calls rather than a set of resources, and each one
 * mirrors the service's own catalog. Two properties of that catalog are worth
 * naming here because they are what this interface is for, and a test holds
 * them:
 *
 * - **No call writes state.** A surface submits artifacts and attempts; what
 *   those mean is derived on the other side. There is no method that sets a
 *   level, and none gets added.
 * - **Nothing is read out of a database.** Every read below is a named call
 *   with a defined result, so the shape of what a screen can know is fixed
 *   here and not by whatever a query happens to return.
 *
 * Failures throw `CoreError`. A caller forced to unwrap every call stops
 * checking, and the failures that exist are bugs in this client rather than
 * states to render.
 */
export interface CorePort {
  // --- reads ---

  /** Where the run is. Every write also returns this. */
  getFlowState(request: GetFlowStateRequest): Promise<FlowResult>;

  /**
   * The next exercise, or `item: null` with the flow when the step is over.
   *
   * The same call serves every phase of the measuring step, the verification
   * and the lesson. That is the point: how the service is choosing is not
   * something a screen can see.
   */
  getNextItem(request: GetNextItemRequest): Promise<NextItemResult>;

  /** Coverage and bands per area, for the result screen. Read-only. */
  getStateMap(request: GetStateMapRequest): Promise<StateMapResult>;

  /** The same state in the form the guide narrates, with pointers. */
  getStateSummary(request: GetStateSummaryRequest): Promise<StateSummaryResult>;

  /** The catalog of situation classes, with names in the run's locale. */
  getSituationClasses(): Promise<SituationClassesResult>;

  /** Everything the roleplay screen needs, assembled upstream. */
  getRoleplayBundle(
    request: GetRoleplayBundleRequest,
  ): Promise<RoleplayBundleResult>;

  /** The goal cards, for re-rendering after an edit. */
  getGoal(request: GetGoalRequest): Promise<GoalsResult>;

  /** The plan for one day, with the reasoning behind every block. */
  getDayPlan(request: GetDayPlanRequest): Promise<DayPlanResult>;

  /** How much was done today against the target, and the streak. */
  getDose(request: GetDoseRequest): Promise<DoseResult>;

  /** Enough to resume the interview and show what it registered. Never the transcript. */
  getInterviewState(
    request: GetInterviewStateRequest,
  ): Promise<InterviewStateResult>;

  /** The goal after the interview, with its milestones and cells. */
  getGoalV2(request: GetGoalV2Request): Promise<GoalV2Result>;

  /** What the user sees before the lesson. */
  getPlanCard(request: GetPlanCardRequest): Promise<PlanCardResult>;

  /** What was taught and what was used, at the close. */
  getDelta(request: GetDeltaRequest): Promise<DeltaResult>;

  // --- writes: policy, artefacts and annotations only ---

  /** A visitor is a complete user from here on. */
  createAnonymousUser(): Promise<CreateAnonymousUserResult>;

  /** Opens a run and declares what this client can render and capture. */
  createSession(request: CreateSessionRequest): Promise<CreateSessionResult>;

  /** Kept for runs that opened with the survey; new runs never call it. */
  submitSurvey(request: SubmitSurveyRequest): Promise<SubmitSurveyResult>;

  setDisplayName(request: SetDisplayNameRequest): Promise<OkResult>;

  /** Sent whenever the microphone is asked for, and answered either way. */
  setMicPermission(request: SetMicPermissionRequest): Promise<OkResult>;

  /** Kept for runs that opened with the survey; new runs never call it. */
  logKaiTurn(request: LogKaiTurnRequest): Promise<OkResult>;

  createGoalDraft(request: CreateGoalDraftRequest): Promise<GoalResult>;

  updateGoalDraft(request: UpdateGoalDraftRequest): Promise<GoalResult>;

  /** The user's OK on the card. Only the user signs. */
  signGoal(request: SignGoalRequest): Promise<GoalResult>;

  setSituationClass(request: SetSituationClassRequest): Promise<OkResult>;

  setNeedFuture(request: SetNeedFutureRequest): Promise<OkResult>;

  addInterest(request: AddInterestRequest): Promise<OkResult>;

  /** An attempt. The result never says whether it was right. */
  submitResponse(request: SubmitResponseRequest): Promise<SubmitResponseResult>;

  /** A turn of the conversation, and which missions it completed. */
  roleplayTurn(request: RoleplayTurnRequest): Promise<RoleplayTurnResult>;

  endRoleplay(request: EndRoleplayRequest): Promise<EndRoleplayResult>;

  /** Attaches an email to the id that already exists. Nothing is migrated. */
  attachIdentity(request: AttachIdentityRequest): Promise<OkResult>;

  /** The one lever over session length the user holds. */
  setDoseTarget(request: SetDoseTargetRequest): Promise<DoseResult>;

  /** The one lever over which goals get time: their order. */
  setGoalOrder(request: SetGoalOrderRequest): Promise<GoalOrderResult>;

  /**
   * The user's turn in, or nothing to ask for the assistant's next one.
   *
   * The assistant talks first. This client renders what comes back and never
   * scripts what it says.
   */
  talkeoTurn(request: TalkeoTurnRequest): Promise<TalkeoTurnResult>;

  /** Text pasted or a link, to materialise the goal. */
  attachArtefact(request: AttachArtefactRequest): Promise<AttachArtefactResult>;

  /** The areas to improve, whether chosen on screen or heard by the assistant. */
  setScope(request: SetScopeRequest): Promise<SetScopeResult>;

  /** What is on screen right now. Accepted at any step; never evidence. */
  reportView(request: ReportViewRequest): Promise<OkResult>;

  /** One tap: drop a cell, or add one the user feels is missing. */
  editPlanCard(request: EditPlanCardRequest): Promise<PlanCardResult>;
}
