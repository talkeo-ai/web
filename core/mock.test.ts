import { beforeEach, describe, expect, it } from "vitest";

import {
  INSTRUMENTS,
  isCoreError,
  type ClientDeclaration,
  type Item,
  type ItemResponse,
  type Step,
} from "./contracts";
import { createMockCore } from "./mock";
import { resetMockStore } from "./mock/session-state";
import type { CorePort } from "./port";

/**
 * The mock has to be walkable, not just well-typed: a screen built against it
 * is only as real as the run it can complete.
 */

const FULL_CLIENT: ClientDeclaration = {
  surface: "web_onboarding",
  locale: "es",
  artefacts: ["text", "audio"],
  supported_instruments: [...INSTRUMENTS],
};

const TEXT_ONLY_AUDIO: ClientDeclaration = {
  ...FULL_CLIENT,
  artefacts: ["text"],
};

/** A plausible answer per instrument, which is also what narrows the union. */
function answerFor(item: Item): ItemResponse {
  switch (item.instrument) {
    case "lexical_yesno":
      return { answer: "yes", latency_ms: 700 };
    case "ctest":
      return {
        answers: item.payload.gaps.map((gap) => ({
          gap_id: gap.gap_id,
          text: `${gap.prefix}own`,
        })),
        duration_ms: 42_000,
      };
    case "writing_prompt":
    case "translate_to_en":
      return {
        artefact: { kind: "text", text: "A short written attempt." },
        duration_ms: 61_000,
      };
    case "recall_typed":
      return {
        artefact: { kind: "text", text: "deadline" },
        latency_ms: 2_400,
      };
    case "listening_choice":
    case "grapheme_audio_choice":
      return { choice_index: 0, latency_ms: 1_800 };
    case "teach_card":
      return { acknowledged: true, dwell_ms: 3_100 };
    case "assemble":
      return { ordered_words: item.payload.word_bank, duration_ms: 12_000 };
    default:
      return { artefact: { kind: "audio", mime: "audio/webm", b64: "" } };
  }
}

async function openRun(core: CorePort, client: ClientDeclaration) {
  const { user_id } = await core.createAnonymousUser();
  const { session_id, flow } = await core.createSession({
    user_id,
    client,
  });

  return { user_id, session_id, flow };
}

/** Answers every exercise the run serves, and reports where it ended up. */
async function answerEveryItem(
  core: CorePort,
  session_id: string,
): Promise<{ served: Item[]; step: Step }> {
  const served: Item[] = [];

  for (;;) {
    const next = await core.getNextItem({ session_id });

    if (!next.item) {
      return { served, step: next.flow!.step };
    }

    served.push(next.item);
    await core.submitResponse({
      session_id,
      item_id: next.item.item_id,
      response: answerFor(next.item),
    });
  }
}

describe("the mock adapter", () => {
  let core: CorePort;

  beforeEach(() => {
    resetMockStore();
    core = createMockCore();
  });

  it("walks a whole run, step by step", async () => {
    const { user_id, session_id, flow } = await openRun(core, FULL_CLIENT);
    expect(flow.step).toBe("survey");

    const survey = await core.submitSurvey({
      session_id,
      self_assessment: "simple_conversations",
      scope_areas: ["conversation", "vocabulary"],
    });
    expect(survey.scope.version).toBe(1);
    expect(survey.flow.step).toBe("survey");

    const named = await core.setDisplayName({ user_id, name: "Caro" });
    expect(named.flow.display_name).toBe("Caro");

    const mic = await core.setMicPermission({ session_id, granted: true });
    expect(mic.flow.step).toBe("kai_interview");

    const draft = await core.createGoalDraft({
      user_id,
      name: "A goal in the user's words",
      focus: "the part that is hard",
    });
    expect(draft.goal.status).toBe("draft");
    expect(draft.goal.version).toBe(0);

    const signed = await core.signGoal({ goal_id: draft.goal.goal_id });
    expect(signed.goal.status).toBe("active");
    expect(signed.goal.version).toBe(1);
    expect(signed.goal.signed_ts).not.toBeNull();

    const goodbye = await core.logKaiTurn({
      session_id,
      speaker: "kai",
      artefact: { kind: "text", text: "See you after the exercises." },
    });
    expect(goodbye.flow.step).toBe("items");

    const { served, step } = await answerEveryItem(core, session_id);
    expect(served.length).toBeGreaterThan(0);
    expect(step).toBe("kai_briefing");

    const summary = await core.getStateSummary({ user_id });
    expect(summary.state_summary.areas.length).toBeGreaterThan(0);

    const bundle = await core.getRoleplayBundle({ session_id });
    expect(bundle.roleplay_bundle.mode).toBe("voice");

    const secondChance = await core.setMicPermission({
      session_id,
      granted: true,
    });
    expect(secondChance.flow.step).toBe("roleplay");

    const turn = await core.roleplayTurn({
      session_id,
      artefact: { kind: "audio", mime: "audio/webm", b64: "" },
    });
    expect(turn.reply.artefact).toBeTruthy();

    const ended = await core.endRoleplay({ session_id });
    expect(ended.flow.step).toBe("verdict");

    const map = await core.getStateMap({ user_id });
    expect(map.state_map.kind).toBe("standard");
    expect(map.state_map.headline).toBeTruthy();

    const email = await core.attachIdentity({
      user_id,
      email: "someone@example.com",
    });
    expect(email.flow.step).toBe("day2");
  });

  it("changes the shape of the run when the opening says so", async () => {
    const { user_id, session_id } = await openRun(core, FULL_CLIENT);

    await core.submitSurvey({
      session_id,
      self_assessment: "just_starting",
      scope_areas: ["all"],
    });
    await core.setMicPermission({ session_id, granted: true });

    const draft = await core.createGoalDraft({ user_id, name: "A first goal" });
    await core.signGoal({ goal_id: draft.goal.goal_id });
    await core.logKaiTurn({
      session_id,
      speaker: "kai",
      artefact: { kind: "text", text: "See you soon." },
    });

    const { step } = await answerEveryItem(core, session_id);

    // The shorter shape ends at the result screen: the exchange is not served
    // below the floor, because there it would only produce silence.
    expect(step).toBe("verdict");

    const flow = await core.getFlowState({ session_id });
    expect(flow.flow.mode).toBe("zero");

    const map = await core.getStateMap({ user_id });
    expect(map.state_map.kind).toBe("zero");
    expect(map.state_map.headline ?? null).toBeNull();
    expect(map.state_map.zero?.known_words_estimate).toBeGreaterThan(0);
  });

  it("never serves an instrument the client did not declare", async () => {
    const client: ClientDeclaration = {
      ...FULL_CLIENT,
      supported_instruments: ["lexical_yesno"],
    };
    const { user_id, session_id } = await openRun(core, client);

    await core.submitSurvey({
      session_id,
      self_assessment: "varied_topics",
      scope_areas: ["reading"],
    });
    await core.setMicPermission({ session_id, granted: false });
    const draft = await core.createGoalDraft({ user_id, name: "A goal" });
    await core.signGoal({ goal_id: draft.goal.goal_id });
    await core.logKaiTurn({
      session_id,
      speaker: "kai",
      artefact: { kind: "text", text: "Bye." },
    });

    const { served } = await answerEveryItem(core, session_id);

    expect(served.length).toBeGreaterThan(0);
    expect(served.every((item) => item.instrument === "lexical_yesno")).toBe(
      true,
    );
  });

  it("never asks for a recording from a client that cannot record", async () => {
    const { user_id, session_id } = await openRun(core, TEXT_ONLY_AUDIO);

    await core.submitSurvey({
      session_id,
      self_assessment: "varied_topics",
      scope_areas: ["writing"],
    });
    await core.setMicPermission({ session_id, granted: false });
    const draft = await core.createGoalDraft({ user_id, name: "A goal" });
    await core.signGoal({ goal_id: draft.goal.goal_id });
    await core.logKaiTurn({
      session_id,
      speaker: "kai",
      artefact: { kind: "text", text: "Bye." },
    });

    const { served } = await answerEveryItem(core, session_id);
    const spoken = served.filter((item) =>
      item.instrument.startsWith("speech_"),
    );

    expect(spoken).toEqual([]);
  });

  it("refuses a call that does not belong to the current step", async () => {
    const { session_id } = await openRun(core, FULL_CLIENT);

    await expect(core.getNextItem({ session_id })).rejects.toSatisfy(
      (error: unknown) => isCoreError(error) && error.code === "FLOW_MISMATCH",
    );
  });

  it("refuses an answer to something it never served", async () => {
    const { user_id, session_id } = await openRun(core, FULL_CLIENT);

    await core.submitSurvey({
      session_id,
      self_assessment: "varied_topics",
      scope_areas: ["reading"],
    });
    await core.setMicPermission({ session_id, granted: true });
    const draft = await core.createGoalDraft({ user_id, name: "A goal" });
    await core.signGoal({ goal_id: draft.goal.goal_id });
    await core.logKaiTurn({
      session_id,
      speaker: "kai",
      artefact: { kind: "text", text: "Bye." },
    });

    await expect(
      core.submitResponse({
        session_id,
        item_id: "it_never_served",
        response: { answer: "yes", latency_ms: 100 },
      }),
    ).rejects.toSatisfy(
      (error: unknown) => isCoreError(error) && error.code === "BAD_ID",
    );
  });
});

describe("the port", () => {
  /**
   * The catalog, spelled out.
   *
   * The point of this list is what is missing from it: nothing writes a level,
   * evidence or an estimate. A method that appears here without being in the
   * service's catalog is a door this surface should not have.
   */
  const CATALOG = [
    "getFlowState",
    "getNextItem",
    "getStateMap",
    "getStateSummary",
    "getSituationClasses",
    "getRoleplayBundle",
    "getGoal",
    "createAnonymousUser",
    "createSession",
    "submitSurvey",
    "setDisplayName",
    "setMicPermission",
    "logKaiTurn",
    "createGoalDraft",
    "updateGoalDraft",
    "signGoal",
    "setSituationClass",
    "setNeedFuture",
    "addInterest",
    "submitResponse",
    "roleplayTurn",
    "endRoleplay",
    "attachIdentity",
  ];

  it("exposes the catalog and nothing else", () => {
    expect(Object.keys(createMockCore()).sort()).toEqual([...CATALOG].sort());
  });

  it("does not report whether an answer was right", async () => {
    resetMockStore();
    const core = createMockCore();
    const { user_id, session_id } = await openRun(core, FULL_CLIENT);

    await core.submitSurvey({
      session_id,
      self_assessment: "varied_topics",
      scope_areas: ["vocabulary"],
    });
    await core.setMicPermission({ session_id, granted: true });
    const draft = await core.createGoalDraft({ user_id, name: "A goal" });
    await core.signGoal({ goal_id: draft.goal.goal_id });
    await core.logKaiTurn({
      session_id,
      speaker: "kai",
      artefact: { kind: "text", text: "Bye." },
    });

    const next = await core.getNextItem({ session_id });
    const result = await core.submitResponse({
      session_id,
      item_id: next.item!.item_id,
      response: answerFor(next.item!),
    });

    expect(Object.keys(result).sort()).toEqual([
      "accepted",
      "flow",
      "schema_version",
    ]);
  });
});
