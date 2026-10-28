/**
 * The screen as one reduction, and mostly: when the surface is allowed up.
 *
 * ⚠ This file did not exist, and the hole is exactly where the defect was. The
 * surface's gate — `surfaceReady` — had no test at all, so nothing noticed it
 * being raised before Talkeo had finished speaking. What a browser showed on
 * 9/sep was the surface at two seconds and the words at nine, together.
 *
 * The rule this pins: a turn starting takes the surface off, and only the beat
 * after that turn has been SAID puts it back. Nothing here can see the voice —
 * that half is the effect in `use-interview.ts` — so what is held here is that
 * the flag is lowered when it must be and never raises itself.
 */

import { describe, expect, it } from "vitest";

import type { InterviewMessage } from "@/core/channel";

import { nothingYet, step, type Onboarding } from "./machine";

const started: InterviewMessage = {
  kind: "turn_started",
  turn_id: "tt_1",
  stage: 1,
  stage_name: "entrance",
  stages_total: 7,
};

/** A session picked back up: a name still to give, so a surface to put up. */
const restored = {
  kind: "restored" as const,
  thread: [{ id: "tt_0", from: "talkeo" as const, text: "¿Cómo te llamás?" }],
  cards: [],
  stage: 1,
  stagesTotal: 7,
  closed: false,
  name: "",
};

function through(
  actions: Parameters<typeof step>[1][],
  from: Onboarding = nothingYet,
): Onboarding {
  return actions.reduce(step, from);
}

describe("the surface's gate", () => {
  it("is shut until somebody says it has been said", () => {
    const state = through([{ kind: "message", message: started }]);

    expect(state.surface).not.toBeNull();
    expect(state.surfaceReady).toBe(false);
  });

  it("is shut when a session is picked back up, not open", () => {
    // The last turn replays "as if it had just been produced", so it has to be
    // heard out before the surface takes its place — the same as a live one.
    const state = through([restored]);

    expect(state.surface).not.toBeNull();
    expect(state.surfaceReady).toBe(false);
  });

  it("opens only on being told the beat has passed", () => {
    const state = through([
      { kind: "message", message: started },
      { kind: "surface ready" },
    ]);

    expect(state.surfaceReady).toBe(true);
  });

  it("shuts again the moment the next turn starts", () => {
    const state = through([
      { kind: "message", message: started },
      { kind: "surface ready" },
      { kind: "message", message: { ...started, turn_id: "tt_2" } },
    ]);

    expect(state.surfaceReady).toBe(false);
  });

  it("stays open where there is no surface, so nothing waits for one that is not coming", () => {
    // The close puts nothing up. A gate left shut there would be holding a beat
    // for a surface that never arrives.
    const closed = through([{ ...restored, stage: 7, closed: true }]);

    expect(closed.surface).toBeNull();
    expect(closed.surfaceReady).toBe(true);
  });

  it("is shut by a turn starting even where there is nothing up yet", () => {
    // Deliberate, and the order in `step` is what does it: a card can land
    // mid-turn and bring a surface with it, and that surface has to wait out the
    // turn like any other rather than inheriting an open gate from before it.
    const state = through([
      { ...restored, stage: 7, closed: true },
      { kind: "message", message: started },
    ]);

    expect(state.surfaceReady).toBe(false);
  });
});

describe("where a surface stays", () => {
  it("comes up under the message that asked for it", () => {
    const state = through([restored, { kind: "surface ready" }]);

    expect(state.anchored).toHaveLength(1);
    expect(state.anchored[0]!.after).toBe("tt_0");
  });

  it("is not there before its beat", () => {
    expect(through([restored]).anchored).toHaveLength(0);
  });

  it("stays when they answer and the next turn starts", () => {
    const state = through([
      restored,
      { kind: "surface ready" },
      { kind: "said", text: "Ana" },
      { kind: "message", message: started },
    ]);

    expect(state.surfaceReady).toBe(false);
    expect(state.anchored).toHaveLength(1);
    expect(state.anchored[0]!.after).toBe("tt_0");
  });

  it("the next card waits for the message that asks for it", () => {
    // The name answered on its card: the next turn opens the areas, whose card
    // must not come up under the first message.
    const answered = through([
      restored,
      { kind: "surface ready" },
      { kind: "named", name: "Ana" },
      { kind: "confirmed", card: "name" },
      { kind: "said", text: "Ana" },
      { kind: "message", message: { ...started, stage: 2 } },
    ]);
    expect(answered.surface?.kind).toBe("scope");
    expect(answered.surfaceReady).toBe(false);
    expect(answered.anchored.map((entry) => entry.key)).toEqual(["name:name"]);

    const asked = through([{ kind: "surface ready" }], answered);
    expect(asked.anchored.at(-1)!.key).toBe("scope:scope_options");
  });

  it("settles the card before once the next one comes up, with what was understood", () => {
    const state = through([
      restored,
      { kind: "surface ready" },
      { kind: "said", text: "Ana" },
      // What the service's turn does with a name said in the chat: it takes it
      // and the next stage opens in the same turn, so the name's own anchored
      // card never saw itself settle.
      { kind: "named", name: "Ana" },
      { kind: "confirmed", card: "name" },
      { kind: "message", message: { ...started, stage: 2 } },
      { kind: "surface ready" },
    ]);

    expect(state.anchored.map((entry) => entry.key)).toEqual([
      "name:name",
      "scope:scope_options",
    ]);
    expect(state.anchored[0]!.surface.state).toBe("settled");
    expect(state.anchored[0]!.surface.body).toEqual({ name: "Ana" });
    expect(state.anchored[1]!.surface.state).not.toBe("settled");
  });

  it("reads as confirmed on the press, before Talkeo has answered", () => {
    const state = through([
      restored,
      { kind: "surface ready" },
      { kind: "named", name: "Ana" },
      { kind: "confirmed", card: "name" },
    ]);

    expect(state.anchored).toHaveLength(1);
    expect(state.anchored[0]!.surface.state).toBe("settled");
  });

  const confirmedBy = (card: string) => ({
    kind: "message" as const,
    message: {
      kind: "event" as const,
      turn_id: "tt_1",
      event: {
        event_id: `ev_${card}`,
        kind: "card_updated" as const,
        origin: "inferred" as const,
        payload: { card, state: "confirmed", body: {} },
      },
    },
  });

  it("waits for the Core to confirm a card, not the press", () => {
    const state = through([
      { ...restored, stage: 5, name: "Ana" },
      { kind: "surface ready" },
      { kind: "confirmed", card: "starting_point" },
    ]);
    expect(state.anchored[0]!.surface.state).not.toBe("settled");

    const after = step(state, confirmedBy("starting_point"));
    expect(after.anchored[0]!.surface.state).toBe("settled");
  });

  it("keeps the first objective taken until the objectives stage closes", () => {
    const goalStage = (stage: number) => ({
      kind: "message" as const,
      message: { ...started, turn_id: `tt_${stage}`, stage },
    });
    const at4 = through([
      { ...restored, stage: 3, name: "Ana" },
      { kind: "surface ready" },
      confirmedBy("first_goal"),
      goalStage(4),
    ]);
    expect(at4.anchored[0]!.surface.state).toBe("taken");

    const at5 = step(at4, goalStage(5));
    expect(at5.anchored[0]!.surface.state).toBe("settled");
  });

  it("moves on when Talkeo takes the name in the chat", () => {
    const state = through([
      restored,
      { kind: "surface ready" },
      { kind: "said", text: "Ana" },
      { kind: "named", name: "Ana" },
      {
        kind: "message",
        message: {
          kind: "event",
          turn_id: "tt_1",
          event: {
            event_id: "ev_1",
            kind: "card_updated",
            origin: "inferred",
            payload: { card: "entrance", state: "confirmed", body: { name: "Ana" } },
          },
        },
      },
      { kind: "message", message: { ...started, stage: 2 } },
      { kind: "surface ready" },
    ]);

    expect(state.anchored.map((entry) => entry.key)).toEqual([
      "name:name",
      "scope:scope_options",
    ]);
    expect(state.anchored[0]!.surface.state).toBe("settled");
  });

  it("still comes up when they answer in the chat before its beat", () => {
    const state = through([
      restored,
      { kind: "said", text: "Ana" },
      { kind: "message", message: started },
    ]);

    expect(state.anchored).toHaveLength(1);
    expect(state.anchored[0]!.after).toBe("tt_0");
  });
});
