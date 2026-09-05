import type {
  AddInterestRequest,
  AttachIdentityRequest,
  CreateAnonymousUserResult,
  CreateGoalDraftRequest,
  CreateSessionRequest,
  CreateSessionResult,
  EndRoleplayRequest,
  EndRoleplayResult,
  FlowResult,
  GetFlowStateRequest,
  GetGoalRequest,
  GetNextItemRequest,
  GetRoleplayBundleRequest,
  GetStateMapRequest,
  GetStateSummaryRequest,
  GoalResult,
  GoalsResult,
  LogKaiTurnRequest,
  NextItemResult,
  OkResult,
  RoleplayBundleResult,
  RoleplayTurnRequest,
  RoleplayTurnResult,
  SetDisplayNameRequest,
  SetMicPermissionRequest,
  SetNeedFutureRequest,
  SetSituationClassRequest,
  SignGoalRequest,
  SituationClassesResult,
  StateMapResult,
  StateSummaryResult,
  SubmitResponseRequest,
  SubmitResponseResult,
  SubmitSurveyRequest,
  SubmitSurveyResult,
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
   * The same call serves every phase of the measuring step. That is the point:
   * how the service is choosing is not something a screen can see.
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

  // --- writes: policy and artifacts only ---

  /** A visitor is a complete user from here on. */
  createAnonymousUser(): Promise<CreateAnonymousUserResult>;

  /** Opens a run and declares what this client can render and capture. */
  createSession(request: CreateSessionRequest): Promise<CreateSessionResult>;

  submitSurvey(request: SubmitSurveyRequest): Promise<SubmitSurveyResult>;

  setDisplayName(request: SetDisplayNameRequest): Promise<OkResult>;

  /** Sent when the run starts, and again when the mic is offered a second time. */
  setMicPermission(request: SetMicPermissionRequest): Promise<OkResult>;

  /** One turn of the interview, either side of it. */
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

  roleplayTurn(request: RoleplayTurnRequest): Promise<RoleplayTurnResult>;

  endRoleplay(request: EndRoleplayRequest): Promise<EndRoleplayResult>;

  /** Attaches an email to the id that already exists. Nothing is migrated. */
  attachIdentity(request: AttachIdentityRequest): Promise<OkResult>;
}
