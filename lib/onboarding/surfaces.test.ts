import { describe, expect, it } from "vitest";

import type { InterviewCard } from "@/core/contracts";

import { surfaceFor } from "./surfaces";

const noCards: Record<string, InterviewCard> = {};

function at(
  stage: number,
  cards: Record<string, InterviewCard> = noCards,
) {
  return surfaceFor({ stage, cards });
}

function card(name: string, state: string): InterviewCard {
  return { card: name, state, body: {} };
}

describe("the entrance", () => {
  it("asks the name first, and how they want to answer after it", () => {
    expect(at(1)?.kind).toBe("name");
    expect(at(1, { name: card("name", "confirmed") })?.kind).toBe("mode");
    // Both settled: the last one stays up as the record it is, the same as any
    // other stage whose card is agreed to.
    const done = at(1, {
      name: card("name", "confirmed"),
      mode: card("mode", "confirmed"),
    });
    expect(done?.kind).toBe("mode");
    expect(done?.state).toBe("settled");
  });

  it("is decided by the same rule as every other stage", () => {
    // ⚠ A name that arrived from the CHAT used to make its surface disappear:
    // the entrance was written as "if there is no name, ask for it", so having
    // one meant there was nothing to show. It comes up proposed instead, with
    // what Talkeo understood in it, for them to confirm — which is §3.4, and
    // which is what stages 2 to 6 have always done.
    const read = at(1, { name: card("name", "draft") });
    expect(read?.kind).toBe("name");
    expect(read?.state).toBe("proposed");
  });
});

describe("which surface a stage puts up", () => {
  it("is decided by the stage and the state, never by what the turn said", () => {
    expect(at(2)?.kind).toBe("scope");
    expect(at(3)?.kind).toBe("goal");
    expect(at(4)?.kind).toBe("goals");
    expect(at(5)?.kind).toBe("starting_point");
    expect(at(6)?.kind).toBe("about_you");
  });

  it("puts nothing up at the close", () => {
    expect(at(7)).toBeNull();
  });
});

describe("what a surface offers", () => {
  it("reads as answering while its card is still empty", () => {
    expect(at(3)?.state).toBe("asking");
  });

  it("reads as something to check once Talkeo has filled it", () => {
    const cards = {
      first_goal: { card: "first_goal", state: "draft", body: { goal: "x" } },
    };
    expect(at(3, cards)?.state).toBe("proposed");
  });

  it("is a record once it is confirmed", () => {
    const cards = {
      first_goal: { card: "first_goal", state: "confirmed", body: {} },
    };
    expect(at(3, cards)?.state).toBe("settled");
  });

  it("has a confirm on every card", () => {
    // Every card is edited by hand or by Talkeo and confirmed by hand or by
    // Talkeo (Joaquin, 17/oct). The two that used to autosave had no confirm,
    // and were the only cards that did not look like the rest.
    for (const stage of [3, 4, 5, 6]) {
      expect(at(stage)?.confirmable).toBe(true);
    }
  });
});
