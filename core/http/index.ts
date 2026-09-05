import {
  CoreError,
  createAnonymousUserResultSchema,
  createSessionResultSchema,
  endRoleplayResultSchema,
  errorResultSchema,
  flowResultSchema,
  goalResultSchema,
  goalsResultSchema,
  nextItemResultSchema,
  okResultSchema,
  roleplayBundleResultSchema,
  roleplayTurnResultSchema,
  situationClassesResultSchema,
  stateMapResultSchema,
  stateSummaryResultSchema,
  submitResponseResultSchema,
  submitSurveyResultSchema,
} from "../contracts";
import type { CorePort } from "../port";

/**
 * The adapter that talks to the real service.
 *
 * ⚠ **The HTTP shape below is provisional.** What is frozen between the two
 * sides is the catalog — the names, parameters and results of each call — not
 * how they ride over the wire; the gate that serves them does not exist yet.
 * Until it does, this uses the plainest mapping a catalog allows: one path per
 * call, the request as the body. When the real shape lands, `call` is the only
 * function that changes.
 *
 * Every response is parsed through its schema at the boundary, so a shape
 * change fails here, loudly, instead of three components deep.
 */

const CONTRACT_PATH = "/v1/tools";

export function createHttpCore(baseUrl: string): CorePort {
  async function call<T>(
    tool: string,
    schema: { parse: (input: unknown) => T },
    request?: unknown,
  ): Promise<T> {
    const response = await fetch(`${baseUrl}${CONTRACT_PATH}/${tool}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request ?? {}),
    });

    const body: unknown = await response.json().catch(() => null);

    // A declared failure arrives as a body with a code, and that is what a
    // caller has to see: the status alone does not say which one it was.
    const failure = errorResultSchema.safeParse(body);
    if (failure.success) {
      throw new CoreError(failure.data.error.code, failure.data.error.message);
    }

    if (!response.ok) {
      throw new Error(`Core responded ${response.status} for ${tool}`);
    }

    return schema.parse(body);
  }

  return {
    getFlowState: (request) =>
      call("get_flow_state", flowResultSchema, request),
    getNextItem: (request) =>
      call("get_next_item", nextItemResultSchema, request),
    getStateMap: (request) =>
      call("get_state_map", stateMapResultSchema, request),
    getStateSummary: (request) =>
      call("get_state_summary", stateSummaryResultSchema, request),
    getSituationClasses: () =>
      call("get_situation_classes", situationClassesResultSchema),
    getRoleplayBundle: (request) =>
      call("get_roleplay_bundle", roleplayBundleResultSchema, request),
    getGoal: (request) => call("get_goal", goalsResultSchema, request),

    createAnonymousUser: () =>
      call("create_anonymous_user", createAnonymousUserResultSchema),
    createSession: (request) =>
      call("create_session", createSessionResultSchema, request),
    submitSurvey: (request) =>
      call("submit_survey", submitSurveyResultSchema, request),
    setDisplayName: (request) =>
      call("set_display_name", okResultSchema, request),
    setMicPermission: (request) =>
      call("set_mic_permission", okResultSchema, request),
    logKaiTurn: (request) => call("log_kai_turn", okResultSchema, request),
    createGoalDraft: (request) =>
      call("create_goal_draft", goalResultSchema, request),
    updateGoalDraft: (request) =>
      call("update_goal_draft", goalResultSchema, request),
    signGoal: (request) => call("sign_goal", goalResultSchema, request),
    setSituationClass: (request) =>
      call("set_situation_class", okResultSchema, request),
    setNeedFuture: (request) =>
      call("set_need_future", okResultSchema, request),
    addInterest: (request) => call("add_interest", okResultSchema, request),
    submitResponse: (request) =>
      call("submit_response", submitResponseResultSchema, request),
    roleplayTurn: (request) =>
      call("roleplay_turn", roleplayTurnResultSchema, request),
    endRoleplay: (request) =>
      call("end_roleplay", endRoleplayResultSchema, request),
    attachIdentity: (request) =>
      call("attach_identity", okResultSchema, request),
  };
}
