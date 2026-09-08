import { describe, expect, it } from "vitest";

import {
  errorResultSchema,
  INSTRUMENTS,
  itemSchema,
  meaningCardResponseSchema,
  nextItemResultSchema,
  submitResponseResultSchema,
  TOOL_NAMES,
  TOOLS,
  type ToolName,
} from "./contracts";
import errors from "./mock/fixtures/errors.json";
import goalV2 from "./mock/fixtures/goal-v2.json";
import items from "./mock/fixtures/items.json";
import planCard from "./mock/fixtures/plan-card.json";
import plan from "./mock/fixtures/plan.json";
import roleplay from "./mock/fixtures/roleplay.json";
import session from "./mock/fixtures/session.json";
import surveyKai from "./mock/fixtures/survey-kai.json";
import talkeo from "./mock/fixtures/talkeo.json";
import verdict from "./mock/fixtures/verdict.json";

/**
 * These schemas are a mirror of the service's contract, and a mirror can drift.
 *
 * The fixtures are the service's own recorded answers, copied in. Parsing every
 * one of them here, through the schema the catalog names for its tool, is the
 * alarm: if the contract changes and the files are refreshed without the
 * schemas following, this is what says so.
 */

/** Every recorded answer, by the tool it answers. */
const RECORDED: [tool: ToolName, variant: string, value: unknown][] = [
  ["create_anonymous_user", "", session.create_anonymous_user],
  ["create_session", "", session.create_session],
  ["get_flow_state", "", session.get_flow_state],
  ["attach_identity", "", session.attach_identity],

  ["submit_survey", "", surveyKai.submit_survey],
  ["set_display_name", "", surveyKai.set_display_name],
  ["set_mic_permission", "", surveyKai.set_mic_permission],
  ["log_kai_turn", "", surveyKai.log_kai_turn],
  ["set_situation_class", "", surveyKai.set_situation_class],
  ["set_need_future", "", surveyKai.set_need_future],
  ["add_interest", "", surveyKai.add_interest],
  ["get_situation_classes", "", surveyKai.get_situation_classes],
  ["create_goal_draft", "", surveyKai.create_goal_draft],
  ["update_goal_draft", "", surveyKai.update_goal_draft],
  ["sign_goal", "", surveyKai.sign_goal],
  ["get_goal", "", surveyKai.get_goal],
  ["get_state_summary", "", surveyKai.get_state_summary],

  ...Object.entries(items.get_next_item).map(
    ([variant, value]): [ToolName, string, unknown] => [
      "get_next_item",
      variant,
      value,
    ],
  ),
  ["submit_response", "", items.submit_response],

  ["get_roleplay_bundle", "standard", roleplay.get_roleplay_bundle.standard],
  [
    "get_roleplay_bundle",
    "code_switching",
    roleplay.get_roleplay_bundle.code_switching,
  ],
  ["roleplay_turn", "", roleplay.roleplay_turn],
  ["end_roleplay", "", roleplay.end_roleplay],

  ["get_state_map", "standard", verdict.get_state_map.standard],
  ["get_state_map", "zero", verdict.get_state_map.zero],
  ["get_delta", "", verdict.get_delta],

  ["get_day_plan", "standard", plan.get_day_plan.standard],
  ["get_day_plan", "floor_breach", plan.get_day_plan.floor_breach],
  ["get_dose", "", plan.get_dose],
  ["set_dose_target", "", plan.set_dose_target],
  ["set_goal_order", "", plan.set_goal_order],

  ...Object.entries(talkeo.talkeo_turn).map(
    ([variant, value]): [ToolName, string, unknown] => [
      "talkeo_turn",
      variant,
      value,
    ],
  ),
  ["get_interview_state", "", talkeo.get_interview_state],
  ["attach_artefact", "", talkeo.attach_artefact],
  ["set_scope", "", talkeo.set_scope],
  ["report_view", "", talkeo.report_view],

  ["get_goal_v2", "", goalV2.get_goal_v2],
  ["get_plan_card", "", planCard.get_plan_card],
  ["edit_plan_card", "", planCard.edit_plan_card],
];

describe("the recorded answers of the service", () => {
  it.each(RECORDED)("%s %s parses", (tool, _variant, value) => {
    expect(() => TOOLS[tool].parse(value)).not.toThrow();
  });

  it.each(Object.entries(errors))("the %s failure parses", (_name, value) => {
    expect(() => errorResultSchema.parse(value)).not.toThrow();
  });

  it("covers every step a recorded flow can report", () => {
    // The fixtures were recorded across the whole run, so every step the mock
    // walks appears in at least one of them. Cheap to hold and loud if a step
    // is renamed on one side only.
    const steps = new Set<string>();
    for (const [, , value] of RECORDED) {
      const flow = (value as { flow?: { step?: string } }).flow;
      if (flow?.step) steps.add(flow.step);
    }

    for (const step of [
      "talkeo_interview",
      "items",
      "verification",
      "plan",
      "roleplay",
      "delta",
    ]) {
      expect(steps).toContain(step);
    }
  });
});

describe("the catalog", () => {
  it("names every call the service catalogs, and no more", () => {
    expect(TOOL_NAMES).toHaveLength(36);
    expect(new Set(TOOL_NAMES).size).toBe(36);
  });

  it("has a recorded answer for every call", () => {
    const recorded = new Set(RECORDED.map(([tool]) => tool));
    expect(TOOL_NAMES.filter((tool) => !recorded.has(tool))).toEqual([]);
  });

  it("never reports whether an answer was right", () => {
    const parsed = submitResponseResultSchema.parse(items.submit_response);
    expect(Object.keys(parsed).sort()).toEqual([
      "accepted",
      "flow",
      "schema_version",
    ]);
  });
});

describe("the instrument catalog", () => {
  it("defines seventeen instruments", () => {
    expect(INSTRUMENTS).toHaveLength(17);
  });

  it("has a recorded item for every instrument", () => {
    const recorded = new Set(
      Object.values(items.get_next_item as Record<string, { item?: unknown }>)
        .filter((entry): entry is { item: unknown } => entry.item != null)
        .map((entry) => itemSchema.parse(entry.item).instrument),
    );

    expect([...INSTRUMENTS].filter((name) => !recorded.has(name))).toEqual([]);
  });

  it("reads a null item as the step moving on", () => {
    const parsed = nextItemResultSchema.parse(items.get_next_item.step_done);
    expect(parsed.item).toBeNull();
    expect(parsed.flow?.step).toBe("verification");
  });

  it("refuses a meaning card that is neither answered nor swiped", () => {
    expect(
      meaningCardResponseSchema.safeParse({ latency_ms: 900 }).success,
    ).toBe(false);
    expect(
      meaningCardResponseSchema.safeParse({ dont_know: true, latency_ms: 900 })
        .success,
    ).toBe(true);
    expect(
      meaningCardResponseSchema.safeParse({
        artefact: { kind: "text", text: "a date something is due" },
        latency_ms: 900,
      }).success,
    ).toBe(true);
  });
});
