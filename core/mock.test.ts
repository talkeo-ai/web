import { beforeEach, describe, expect, it } from "vitest";

import {
  INSTRUMENTS,
  isCoreError,
  TOOL_NAMES,
  type ClientDeclaration,
  type Item,
  type ItemResponse,
  type Step,
} from "./contracts";
import { createMockCore } from "./mock";
import { INTERVIEW_STAGES, TALKEO_INTERVIEW_TURNS } from "./mock/fixtures";
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

const SPOKEN = { kind: "audio", mime: "audio/webm", b64: "" } as const;

/** A plausible answer per instrument, which is also what narrows the union. */
function answerFor(item: Item, yesNo: "yes" | "no" = "yes"): ItemResponse {
  switch (item.instrument) {
    case "lexical_yesno":
      return { answer: yesNo, latency_ms: 700 };
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
    case "timed_recall":
      return {
        artefact: { kind: "text", text: "deadline" },
        latency_ms: 2_400,
      };
    case "listening_choice":
    case "grapheme_audio_choice":
      return { choice_index: 0, latency_ms: 1_800 };
    case "teach_card":
    case "contrastive_card":
      return { acknowledged: true, dwell_ms: 3_100 };
    case "assemble":
    case "word_bank":
      return { ordered_words: item.payload.word_bank, duration_ms: 12_000 };
    case "meaning_card":
      return { dont_know: true, latency_ms: 1_200 };
    default:
      return { artefact: SPOKEN };
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

/** Lets the assistant talk until it closes the interview. */
async function sitThroughTheInterview(core: CorePort, session_id: string) {
  for (;;) {
    const { turn, flow } = await core.talkeoTurn({ session_id });
    if (turn.closing) return flow;
  }
}

/** Answers every exercise the run serves, and reports where it ended up. */
async function answerEveryItem(
  core: CorePort,
  session_id: string,
  yesNo: "yes" | "no" = "yes",
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
      response: answerFor(next.item, yesNo),
    });
  }
}

/** A run brought to the step that serves the plan card. */
async function reachThePlan(core: CorePort, client = FULL_CLIENT) {
  const run = await openRun(core, client);
  await sitThroughTheInterview(core, run.session_id);
  await answerEveryItem(core, run.session_id);
  const { step } = await answerEveryItem(core, run.session_id);
  expect(step).toBe("plan");
  return run;
}

describe("the mock adapter", () => {
  let core: CorePort;

  beforeEach(() => {
    resetMockStore();
    core = createMockCore();
  });

  it("walks a whole run, step by step", async () => {
    const { user_id, session_id, flow } = await openRun(core, FULL_CLIENT);
    expect(flow.step).toBe("talkeo_interview");

    // The assistant talks first, and this side never scripts it.
    const opening = await core.talkeoTurn({ session_id });
    expect(opening.turn.closing).toBe(false);
    expect(opening.turn.audio?.url).toMatch(/^\/mock-audio\/tt-/);
    expect(opening.flow.step).toBe("talkeo_interview");

    const scope = await core.setScope({
      session_id,
      areas: ["conversation", "vocabulary"],
    });
    expect(scope.scope.version).toBe(1);

    const attached = await core.attachArtefact({
      session_id,
      kind: "text",
      title: "The job description",
      text: "We are looking for a designer...",
    });
    expect(attached.artefact.kind).toBe("text");

    const mic = await core.setMicPermission({ session_id, granted: true });
    expect(mic.flow.step).toBe("talkeo_interview");

    // The name is a screen's answer, not something the assistant hears: it is
    // asked before the conversation starts, so the run is told outright.
    const named = await core.setDisplayName({ user_id, name: "Ana" });
    expect(named.flow.display_name).toBe("Ana");

    const closed = await sitThroughTheInterview(core, session_id);
    expect(closed.step).toBe("items");
    expect(closed.display_name).toBeTruthy();

    // Resuming reads what the interview registered, never the transcript.
    const resumed = await core.getInterviewState({ session_id });
    expect(resumed.state.closed).toBe(true);
    // Every recorded turn, counted against the recording rather than a number
    // typed here: the script grew from seven turns to nine when the entrance
    // became two of its own, and a literal would have gone quietly stale.
    expect(resumed.state.turn_count).toBe(TALKEO_INTERVIEW_TURNS.length);
    // And it says where it got to, so a screen that reloads can draw progress
    // without inventing a total.
    expect(resumed.state.stages_total).toBe(INTERVIEW_STAGES);
    expect(resumed.state.stage).toBe(INTERVIEW_STAGES);
    expect(resumed.state.events.map((event) => event.kind)).toEqual(
      expect.arrayContaining([
        "stage_entered",
        "scope_set",
        "goal_noted",
        "artefact_attached",
      ]),
    );

    const goal = await core.getGoalV2({ user_id });
    expect(goal.goal.artefacts).toHaveLength(1);
    expect(goal.goal.milestones.length).toBeGreaterThan(0);

    const measured = await answerEveryItem(core, session_id);
    expect(measured.served.length).toBeGreaterThan(0);
    expect(measured.step).toBe("verification");

    const verified = await answerEveryItem(core, session_id);
    expect(verified.served.length).toBeGreaterThan(1);
    expect(
      verified.served.every((item) => item.instrument === "meaning_card"),
    ).toBe(true);
    expect(verified.step).toBe("plan");

    const card = await core.getPlanCard({ session_id });
    expect(card.plan.today.length).toBeGreaterThan(0);
    expect(card.plan.practice.title).toBeTruthy();

    const edited = await core.editPlanCard({
      session_id,
      remove_cell_ids: [card.plan.today[0]!.cell_id],
      add_labels: ["portfolio"],
    });
    expect(edited.plan.goal.version).toBe(card.plan.goal.version + 1);
    expect(edited.plan.today.map((cell) => cell.label)).not.toContain(
      card.plan.today[0]!.label,
    );
    expect(edited.plan.today.map((cell) => cell.label)).toContain("portfolio");

    const lesson = await answerEveryItem(core, session_id);
    expect(lesson.served.map((item) => item.instrument)).toEqual([
      "contrastive_card",
      "word_bank",
      "timed_recall",
      "teach_card",
      "assemble",
    ]);
    expect(lesson.step).toBe("roleplay");

    const bundle = await core.getRoleplayBundle({ session_id });
    expect(bundle.roleplay_bundle.mode).toBe("voice");
    expect(bundle.roleplay_bundle.missions.length).toBeGreaterThan(0);
    // A cell dropped from the plan is not a mission of the conversation.
    expect(
      bundle.roleplay_bundle.missions.some(
        (mission) => mission.cell_id === card.plan.today[0]!.cell_id,
      ),
    ).toBe(false);

    const turn = await core.roleplayTurn({ session_id, artefact: SPOKEN });
    expect(turn.reply.artefact).toBeTruthy();
    expect(turn.mission_progress).toHaveLength(
      bundle.roleplay_bundle.missions.length,
    );
    expect(turn.mission_progress.filter((m) => m.done)).toHaveLength(1);

    const ended = await core.endRoleplay({ session_id });
    expect(ended.flow.step).toBe("delta");
    expect(ended.delta?.taught.length).toBeGreaterThan(0);
    expect(ended.delta?.used).toHaveLength(1);

    const delta = await core.getDelta({ session_id });
    expect(delta.delta).toEqual(ended.delta);
    for (const label of delta.delta.used) {
      expect(delta.delta.taught).toContain(label);
    }

    const leftDelta = await core.reportView({ session_id, event: "card_left" });
    expect(leftDelta.flow.step).toBe("verdict");

    const map = await core.getStateMap({ user_id });
    expect(map.state_map.kind).toBe("standard");
    expect(map.state_map.headline).toBeTruthy();

    const leftVerdict = await core.reportView({
      session_id,
      event: "card_left",
    });
    expect(leftVerdict.flow.step).toBe("email");

    const email = await core.attachIdentity({
      user_id,
      email: "someone@example.com",
    });
    expect(email.flow.step).toBe("home");

    const plan = await core.getDayPlan({ user_id });
    expect(plan.plan.blocks.length).toBeGreaterThan(0);

    const dose = await core.setDoseTarget({
      user_id,
      target_session_minutes: 25,
    });
    expect(dose.dose.target_session_minutes).toBe(25);
  });

  it("changes the shape of the run when the opening says so", async () => {
    const { user_id, session_id } = await openRun(core, FULL_CLIENT);
    await sitThroughTheInterview(core, session_id);

    const { step } = await answerEveryItem(core, session_id, "no");

    // The shorter shape ends at the result screen: nothing is verified,
    // taught or practised below the floor, because there it would only
    // produce silence.
    expect(step).toBe("verdict");

    const flow = await core.getFlowState({ session_id });
    expect(flow.flow.mode).toBe("zero");

    const map = await core.getStateMap({ user_id });
    expect(map.state_map.kind).toBe("zero");
    expect(map.state_map.headline ?? null).toBeNull();
    expect(map.state_map.zero?.known_words_estimate).toBeGreaterThan(0);

    const left = await core.reportView({ session_id, event: "card_left" });
    expect(left.flow.step).toBe("email");
  });

  it("answers the assistant after the interview without moving the run", async () => {
    const { session_id } = await openRun(core, FULL_CLIENT);
    await sitThroughTheInterview(core, session_id);

    const aside = await core.talkeoTurn({
      session_id,
      artefact: { kind: "text", text: "creo que es mejorar" },
    });
    expect(aside.flow.step).toBe("items");
    expect(aside.turn.closing).toBe(false);
  });

  it("accepts a view report at any step and writes nothing", async () => {
    const { session_id } = await openRun(core, FULL_CLIENT);

    const shown = await core.reportView({
      session_id,
      event: "card_shown",
      item_id: "it_mock_1",
      instrument: "lexical_yesno",
    });
    expect(shown.ok).toBe(true);
    expect(shown.flow.step).toBe("talkeo_interview");
    expect(Object.keys(shown).sort()).toEqual(["flow", "ok", "schema_version"]);
  });

  it("refuses a meaning card that is neither answered nor swiped", async () => {
    const { session_id } = await openRun(core, FULL_CLIENT);
    await sitThroughTheInterview(core, session_id);
    await answerEveryItem(core, session_id);

    const next = await core.getNextItem({ session_id });
    expect(next.item?.instrument).toBe("meaning_card");

    await expect(
      core.submitResponse({
        session_id,
        item_id: next.item!.item_id,
        response: { latency_ms: 400 } as ItemResponse,
      }),
    ).rejects.toSatisfy(
      (error: unknown) =>
        isCoreError(error) && error.code === "INVALID_INPUT",
    );
  });

  it("never serves an instrument the client did not declare", async () => {
    const client: ClientDeclaration = {
      ...FULL_CLIENT,
      supported_instruments: ["lexical_yesno"],
    };
    const { session_id } = await openRun(core, client);
    await sitThroughTheInterview(core, session_id);

    const { served } = await answerEveryItem(core, session_id);

    expect(served.length).toBeGreaterThan(0);
    expect(served.every((item) => item.instrument === "lexical_yesno")).toBe(
      true,
    );
  });

  it("never asks for a recording from a client that cannot record", async () => {
    const { session_id } = await openRun(core, TEXT_ONLY_AUDIO);
    await sitThroughTheInterview(core, session_id);

    const { served } = await answerEveryItem(core, session_id);
    const spoken = served.filter((item) =>
      item.instrument.startsWith("speech_"),
    );

    expect(spoken).toEqual([]);
  });

  it("moves the exchange to text when the microphone was denied", async () => {
    const { session_id } = await reachThePlan(core);
    await core.setMicPermission({ session_id, granted: false });
    await answerEveryItem(core, session_id);

    const bundle = await core.getRoleplayBundle({ session_id });
    expect(bundle.roleplay_bundle.mode).toBe("chat");

    const turn = await core.roleplayTurn({
      session_id,
      artefact: { kind: "text", text: "I was in charge of the design." },
    });
    expect(turn.reply.artefact.kind).toBe("text");
  });

  it("refuses a call that does not belong to the current step", async () => {
    const { session_id } = await openRun(core, FULL_CLIENT);

    await expect(core.getNextItem({ session_id })).rejects.toSatisfy(
      (error: unknown) => isCoreError(error) && error.code === "FLOW_MISMATCH",
    );
    await expect(core.getPlanCard({ session_id })).rejects.toSatisfy(
      (error: unknown) => isCoreError(error) && error.code === "FLOW_MISMATCH",
    );
    await expect(core.endRoleplay({ session_id })).rejects.toSatisfy(
      (error: unknown) => isCoreError(error) && error.code === "FLOW_MISMATCH",
    );
  });

  it("refuses an answer to something it never served", async () => {
    const { session_id } = await openRun(core, FULL_CLIENT);
    await sitThroughTheInterview(core, session_id);

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

  it("has no goal to show before the interview notes one", async () => {
    const { user_id } = await openRun(core, FULL_CLIENT);

    await expect(core.getGoalV2({ user_id })).rejects.toSatisfy(
      (error: unknown) => isCoreError(error) && error.code === "NOT_FOUND",
    );
  });

  it("still answers the calls of the earlier opening", async () => {
    const { user_id, session_id } = await openRun(core, FULL_CLIENT);

    const survey = await core.submitSurvey({
      session_id,
      self_assessment: "simple_conversations",
      scope_areas: ["reading"],
    });
    expect(survey.flow.step).toBe("talkeo_interview");

    const logged = await core.logKaiTurn({
      session_id,
      speaker: "user",
      artefact: { kind: "text", text: "Hi." },
    });
    expect(logged.flow.step).toBe("talkeo_interview");

    const draft = await core.createGoalDraft({ user_id, name: "A goal" });
    const signed = await core.signGoal({ goal_id: draft.goal.goal_id });
    expect(signed.goal.status).toBe("active");
  });
});

describe("the port", () => {
  /**
   * The catalog, spelled out in this client's names.
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
    "getDayPlan",
    "getDose",
    "getInterviewState",
    "getGoalV2",
    "getPlanCard",
    "getDelta",
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
    "setDoseTarget",
    "setGoalOrder",
    "talkeoTurn",
    "attachArtefact",
    "setScope",
    "reportView",
    "editPlanCard",
  ];

  it("exposes the catalog and nothing else", () => {
    expect(Object.keys(createMockCore()).sort()).toEqual([...CATALOG].sort());
  });

  it("has one method per call the service catalogs", () => {
    const camel = (name: string) =>
      name.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

    expect(TOOL_NAMES.map(camel).sort()).toEqual([...CATALOG].sort());
  });

  it("does not report whether an answer was right", async () => {
    resetMockStore();
    const core = createMockCore();
    const { session_id } = await openRun(core, FULL_CLIENT);
    await sitThroughTheInterview(core, session_id);

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

  it("reports a mission as done, never a sentence as correct", async () => {
    resetMockStore();
    const core = createMockCore();
    const { session_id } = await reachThePlan(core);
    await answerEveryItem(core, session_id);

    const turn = await core.roleplayTurn({ session_id, artefact: SPOKEN });

    expect(Object.keys(turn).sort()).toEqual([
      "flow",
      "mission_progress",
      "reply",
      "schema_version",
    ]);
    for (const progress of turn.mission_progress) {
      expect(Object.keys(progress).sort()).toEqual(["done", "mission_id"]);
    }
  });
});
