/**
 * The conversation folded out of the stream.
 *
 * The sequences here are the shapes the service actually produces, including the
 * two that a screen written against a friendlier fixture gets wrong: a turn that
 * streams nothing, and a turn whose words are taken back after they were sent.
 */

import { describe, expect, it } from "vitest";

import type { InterviewMessage } from "@/core/channel";

import {
  advance,
  heardSoFar,
  noConversation,
  type Conversation,
} from "./conversation";

const started: InterviewMessage = {
  kind: "turn_started",
  turn_id: "tt_1",
  stage: 2,
  stage_name: "scope",
  mode: "text",
  stages_total: 7,
};

function done(text: string, closing = false): InterviewMessage {
  return {
    kind: "turn_done",
    result: {
      schema_version: 1,
      turn: {
        turn_id: "tt_1",
        text,
        marks: [],
        word_timings: [],
        events: [],
        closing,
      },
      flow: {
        step: "talkeo_interview",
        mode: "standard",
        mic_granted: false,
        display_name: null,
      },
    },
  };
}

function through(messages: InterviewMessage[]): Conversation {
  return messages.reduce(
    (state, message) => advance(state, { kind: "message", message }),
    noConversation,
  );
}

describe("a turn", () => {
  it("is settled by its result and not by the fragments", () => {
    const state = through([
      started,
      { kind: "text", turn_id: "tt_1", delta: "Hola " },
      { kind: "text", turn_id: "tt_1", delta: "y algo más" },
      done("Hola"),
    ]);

    // Two guards cut a turn AFTER it has been said, so what was streamed is not
    // what they end up reading.
    expect(state.thread.at(-1)?.text).toBe("Hola");
    expect(state.turn).toBeNull();
  });

  it("that streams nothing still lands, whole", () => {
    // The entrance is fixed copy and never reaches a model, so it arrives as a
    // start and an end with nothing in between. This is the first thing anybody
    // sees, so getting it wrong is two blank screens at the top of every run.
    const state = through([started, done("¿Cómo te llamás?")]);
    expect(state.thread).toHaveLength(1);
    expect(state.thread[0]?.text).toBe("¿Cómo te llamás?");
  });

  it("taken off the screen mid-way is taken off, not appended to", () => {
    const state = through([
      started,
      { kind: "text", turn_id: "tt_1", delta: "media fra" },
      { kind: "text_amended", turn_id: "tt_1", text: "" },
      { kind: "text", turn_id: "tt_1", delta: "la frase entera" },
    ]);
    expect(state.turn?.text).toBe("la frase entera");
  });

  it("ignores fragments addressed to a turn that is not the live one", () => {
    const state = through([
      started,
      { kind: "text", turn_id: "tt_OLD", delta: "de otro turno" },
    ]);
    expect(state.turn?.text).toBe("");
  });

  it("closes the send gate while it is being written, and opens it after", () => {
    const writing = through([started]);
    expect(writing.answering).toBe(true);
    expect(through([started, done("listo")]).answering).toBe(false);
  });

  it("carries the stage and how many there are", () => {
    const state = through([started]);
    expect(state.stage).toBe(2);
    expect(state.stagesTotal).toBe(7);
  });
});

describe("what the person says", () => {
  it("settles a word at a time, with the guess replaced rather than appended", () => {
    const state = through([
      { kind: "transcript", delta: "quiero ", is_final: true },
      { kind: "transcript", delta: "hab", is_final: false },
      { kind: "transcript", delta: "hablar", is_final: false },
    ]);
    expect(heardSoFar(state.transcript)).toBe("quiero hablar");
  });

  it("becomes their own bubble when the answer to it starts", () => {
    const state = through([
      { kind: "transcript", delta: "quiero hablar mejor", is_final: true },
      started,
    ]);
    expect(state.thread).toHaveLength(1);
    expect(state.thread[0]).toMatchObject({
      from: "you",
      text: "quiero hablar mejor",
    });
    expect(heardSoFar(state.transcript)).toBe("");
  });

  it("leaves nothing behind when they were listened to and said nothing", () => {
    // Whose turn it is does not change, so the screen has to be able to offer
    // to listen again rather than wait for a turn nobody is generating.
    const state = through([
      { kind: "transcript", delta: "mmm", is_final: false },
      { kind: "nothing_heard", reason: "" },
    ]);
    expect(state.thread).toHaveLength(0);
    expect(state.listening).toBe(false);
    expect(state.answering).toBe(false);
  });

  it("says so when the listening itself failed, rather than blaming them", () => {
    const state = through([{ kind: "nothing_heard", reason: "socket closed" }]);
    expect(state.failed).toBe("socket closed");
  });
});

describe("the cards", () => {
  const updated = (
    body: Record<string, unknown>,
    state = "draft",
  ): InterviewMessage => ({
    kind: "event",
    turn_id: "tt_1",
    event: {
      event_id: "ev_1",
      kind: "card_updated",
      origin: "inferred",
      payload: { card: "first_goal", state, body },
    },
  });

  it("fill up over several turns instead of replacing each other", () => {
    const state = through([
      updated({ goal: "seguir reuniones" }),
      updated({ work_on: ["escuchar"] }),
    ]);
    expect(state.cards.first_goal?.body).toEqual({
      goal: "seguir reuniones",
      work_on: ["escuchar"],
    });
  });

  it("keep the latest state of each", () => {
    const state = through([
      updated({ goal: "algo" }),
      updated({ goal: "algo" }, "confirmed"),
    ]);
    expect(state.cards.first_goal?.state).toBe("confirmed");
  });
});

describe("what a screen that just opened is told", () => {
  it("takes the stage, the total and the cards from the service", () => {
    const state = advance(noConversation, {
      kind: "restored",
      thread: [{ id: "tt_1", from: "talkeo", text: "hola" }],
      cards: [{ card: "first_goal", state: "confirmed", body: { goal: "x" } }],
      stage: 4,
      stagesTotal: 7,
      closed: false,
      name: "Ana",
    });
    expect(state.stage).toBe(4);
    expect(state.name).toBe("Ana");
    expect(state.stagesTotal).toBe(7);
    expect(state.cards.first_goal?.state).toBe("confirmed");
    expect(state.thread).toHaveLength(1);
  });
});

describe("audio", () => {
  it("never reaches the conversation", () => {
    // A turn's worth of it is hundreds of kilobytes and has no business in a
    // render. It goes to the player, straight off the channel.
    const state = through([
      started,
      { kind: "audio_format", turn_id: "tt_1", mime: "audio/pcm", sample_rate: 24000 },
      { kind: "audio", turn_id: "tt_1", data: new ArrayBuffer(8) },
    ]);
    expect(state.turn?.text).toBe("");
  });
});
