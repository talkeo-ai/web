import { describe, expect, it } from "vitest";

import type { TalkeoTurn } from "@/core/contracts";
import { chatHolds, entryScreenFor, worksBesideChat } from "@/lib/onboarding/entry";
import { INTERVIEW_STAGES, stageOf } from "@/lib/onboarding/stage";

describe("which screen an answer belongs on", () => {
  it("asks for the name first", () => {
    expect(entryScreenFor({ name: null, mode: null })).toBe("name");
  });

  it("does not let a mode chosen without a name skip the question", () => {
    expect(entryScreenFor({ name: null, mode: "voice" })).toBe("name");
  });

  it("asks how they want to answer once it has a name", () => {
    expect(entryScreenFor({ name: "Ana", mode: null })).toBe("mode");
  });

  it("hands over to the conversation once both are answered", () => {
    expect(entryScreenFor({ name: "Ana", mode: "text" })).toBe("chat");
  });
});

describe("where the conversation still stands", () => {
  it("holds every step the assistant can be spoken to in", () => {
    expect(chatHolds("talkeo_interview")).toBe(true);
    expect(chatHolds("items")).toBe(true);
    expect(chatHolds("verification")).toBe(true);
  });

  it("lets go of the steps the run only arrives at", () => {
    expect(chatHolds("verdict")).toBe(false);
    expect(chatHolds("email")).toBe(false);
    expect(chatHolds("home")).toBe(false);
  });

  it("counts the interview as the conversation and not as work beside it", () => {
    expect(worksBesideChat("talkeo_interview")).toBe(false);
    expect(worksBesideChat("items")).toBe(true);
  });
});

function turn(events: TalkeoTurn["events"]): TalkeoTurn {
  return {
    turn_id: "tt_test",
    text: "Seguimos.",
    marks: [],
    word_timings: [],
    events,
    closing: false,
  };
}

function stageEvent(stage: unknown) {
  return {
    event_id: `ev_${String(stage)}`,
    kind: "stage_entered" as const,
    origin: "inferred" as const,
    payload: { stage },
  };
}

describe("reading the stage off a turn", () => {
  it("says nothing when the turn says nothing", () => {
    expect(stageOf(null)).toBeNull();
    expect(stageOf(turn([]))).toBeNull();
  });

  it("takes the stage the turn entered", () => {
    expect(stageOf(turn([stageEvent(3)]))).toBe(3);
  });

  it("takes the last one, for a turn that crossed two", () => {
    expect(stageOf(turn([stageEvent(3), stageEvent(4)]))).toBe(4);
  });

  it("ignores a stage that is not a number, rather than drawing one", () => {
    expect(stageOf(turn([stageEvent("cuatro")]))).toBeNull();
    expect(stageOf(turn([stageEvent(0)]))).toBeNull();
  });

  it("keeps the interview to the number of stages it has", () => {
    expect(INTERVIEW_STAGES).toBe(7);
  });
});
