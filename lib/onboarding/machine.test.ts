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
  mode: "",
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

describe("what a surface does to the view", () => {
  it("pulls somebody in the chat over to it", () => {
    const inChat = through([
      { kind: "view", event: { kind: "asked for", view: "chat" } },
    ]);
    const pulled = through([restored], inChat);

    expect(pulled.view.view).toBe("focus");
    expect(pulled.view.shows).toBe("the surface");
  });

  it("leaves somebody who is already in focus where they are", () => {
    const state = through([restored]);

    expect(state.view.view).toBe("focus");
    expect(state.view.shows).toBe("the turn");
  });
});
