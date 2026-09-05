import { describe, expect, it } from "vitest";

import {
  createAnonymousUserResultSchema,
  createSessionResultSchema,
  endRoleplayResultSchema,
  errorResultSchema,
  flowResultSchema,
  goalResultSchema,
  goalsResultSchema,
  INSTRUMENTS,
  itemSchema,
  nextItemResultSchema,
  okResultSchema,
  roleplayBundleResultSchema,
  roleplayTurnResultSchema,
  situationClassesResultSchema,
  stateMapResultSchema,
  stateSummaryResultSchema,
  submitResponseResultSchema,
  submitSurveyResultSchema,
} from "./contracts";
import errors from "./mock/fixtures/errors.json";
import items from "./mock/fixtures/items.json";
import roleplay from "./mock/fixtures/roleplay.json";
import session from "./mock/fixtures/session.json";
import surveyKai from "./mock/fixtures/survey-kai.json";
import verdict from "./mock/fixtures/verdict.json";

/**
 * These schemas are a mirror of the service's contract, and a mirror can drift.
 *
 * The fixtures are the service's own recorded answers, copied in. Parsing every
 * one of them here is the alarm: if the contract changes and the files are
 * refreshed without the schemas following, this is what says so.
 */

type Schema = { parse: (input: unknown) => unknown };

const RECORDED: [name: string, schema: Schema, value: unknown][] = [
  [
    "create_anonymous_user",
    createAnonymousUserResultSchema,
    session.create_anonymous_user,
  ],
  ["create_session", createSessionResultSchema, session.create_session],
  ["get_flow_state", flowResultSchema, session.get_flow_state],
  ["attach_identity", okResultSchema, session.attach_identity],

  ["submit_survey", submitSurveyResultSchema, surveyKai.submit_survey],
  ["set_display_name", okResultSchema, surveyKai.set_display_name],
  ["set_mic_permission", okResultSchema, surveyKai.set_mic_permission],
  ["log_kai_turn", okResultSchema, surveyKai.log_kai_turn],
  ["set_situation_class", okResultSchema, surveyKai.set_situation_class],
  ["set_need_future", okResultSchema, surveyKai.set_need_future],
  ["add_interest", okResultSchema, surveyKai.add_interest],
  [
    "get_situation_classes",
    situationClassesResultSchema,
    surveyKai.get_situation_classes,
  ],
  ["create_goal_draft", goalResultSchema, surveyKai.create_goal_draft],
  ["update_goal_draft", goalResultSchema, surveyKai.update_goal_draft],
  ["sign_goal", goalResultSchema, surveyKai.sign_goal],
  ["get_goal", goalsResultSchema, surveyKai.get_goal],
  ["get_state_summary", stateSummaryResultSchema, surveyKai.get_state_summary],

  ["submit_response", submitResponseResultSchema, items.submit_response],

  [
    "get_roleplay_bundle standard",
    roleplayBundleResultSchema,
    roleplay.get_roleplay_bundle.standard,
  ],
  [
    "get_roleplay_bundle code_switching",
    roleplayBundleResultSchema,
    roleplay.get_roleplay_bundle.code_switching,
  ],
  ["roleplay_turn", roleplayTurnResultSchema, roleplay.roleplay_turn],
  ["end_roleplay", endRoleplayResultSchema, roleplay.end_roleplay],

  [
    "get_state_map standard",
    stateMapResultSchema,
    verdict.get_state_map.standard,
  ],
  ["get_state_map zero", stateMapResultSchema, verdict.get_state_map.zero],
];

describe("the recorded answers of the service", () => {
  it.each(RECORDED)("%s parses", (_name, schema, value) => {
    expect(() => schema.parse(value)).not.toThrow();
  });

  it.each(Object.entries(items.get_next_item))(
    "get_next_item %s parses",
    (_name, value) => {
      expect(() => nextItemResultSchema.parse(value)).not.toThrow();
    },
  );

  it.each(Object.entries(errors))("the %s failure parses", (_name, value) => {
    expect(() => errorResultSchema.parse(value)).not.toThrow();
  });
});

describe("the instrument catalog", () => {
  it("has a recorded item for every instrument", () => {
    const recorded = new Set(
      Object.values(items.get_next_item as Record<string, { item?: unknown }>)
        .filter((entry): entry is { item: unknown } => entry.item != null)
        .map((entry) => itemSchema.parse(entry.item).instrument),
    );

    expect([...INSTRUMENTS].filter((name) => !recorded.has(name))).toEqual([]);
  });
});
