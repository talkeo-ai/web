import type { z } from "zod";

import { CoreError, errorResultSchema, TOOLS, type ToolName } from "../contracts";
import type { CorePort } from "../port";

type ResultOf<Name extends ToolName> = z.output<(typeof TOOLS)[Name]>;

/**
 * The adapter that talks to the real service.
 *
 * The service mounts its catalog behind one gate: every call is a `POST` to
 * `/v1/tools/<name>` with the request as the JSON body, and the answer is the
 * result object or an error body. The version is in the path, so a breaking
 * change is a new path rather than a surprise on this one.
 *
 * Every response is parsed through the schema the catalog names for it, so a
 * shape change fails here, loudly, instead of three components deep.
 */

const CONTRACT_PATH = "/v1/tools";

export function createHttpCore(baseUrl: string): CorePort {
  async function call<Name extends ToolName>(
    tool: Name,
    request?: unknown,
  ): Promise<ResultOf<Name>> {
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

    return TOOLS[tool].parse(body) as ResultOf<Name>;
  }

  return {
    getFlowState: (request) => call("get_flow_state", request),
    getNextItem: (request) => call("get_next_item", request),
    getStateMap: (request) => call("get_state_map", request),
    getStateSummary: (request) => call("get_state_summary", request),
    getSituationClasses: () => call("get_situation_classes"),
    getRoleplayBundle: (request) => call("get_roleplay_bundle", request),
    getGoal: (request) => call("get_goal", request),
    getDayPlan: (request) => call("get_day_plan", request),
    getDose: (request) => call("get_dose", request),
    getInterviewState: (request) => call("get_interview_state", request),
    getGoalV2: (request) => call("get_goal_v2", request),
    getPlanCard: (request) => call("get_plan_card", request),
    getDelta: (request) => call("get_delta", request),

    createAnonymousUser: () => call("create_anonymous_user"),
    createSession: (request) => call("create_session", request),
    submitSurvey: (request) => call("submit_survey", request),
    setDisplayName: (request) => call("set_display_name", request),
    setMicPermission: (request) => call("set_mic_permission", request),
    logKaiTurn: (request) => call("log_kai_turn", request),
    createGoalDraft: (request) => call("create_goal_draft", request),
    updateGoalDraft: (request) => call("update_goal_draft", request),
    signGoal: (request) => call("sign_goal", request),
    setSituationClass: (request) => call("set_situation_class", request),
    setNeedFuture: (request) => call("set_need_future", request),
    addInterest: (request) => call("add_interest", request),
    submitResponse: (request) => call("submit_response", request),
    roleplayTurn: (request) => call("roleplay_turn", request),
    endRoleplay: (request) => call("end_roleplay", request),
    attachIdentity: (request) => call("attach_identity", request),
    setDoseTarget: (request) => call("set_dose_target", request),
    setGoalOrder: (request) => call("set_goal_order", request),
    talkeoTurn: (request) => call("talkeo_turn", request),
    attachArtefact: (request) => call("attach_artefact", request),
    setScope: (request) => call("set_scope", request),
    reportView: (request) => call("report_view", request),
    editPlanCard: (request) => call("edit_plan_card", request),
  };
}
