/**
 * The interview socket, against a socket that records what it is sent.
 *
 * Two things are held here. What goes UP: a call is a separate room now, so the
 * socket must have no way to start listening or to carry microphone audio, and
 * the one thing a screen says on it is typed. And what comes DOWN: whether a
 * room is attached arrives as its own message and an unknown one is dropped
 * rather than taking the conversation with it.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { InterviewMessage } from "./channel";
import { talkeoStreamInSchema } from "./contracts/stream";
import { openInterviewSocket } from "./http/interview-socket";

class FakeSocket {
  static OPEN = 1;
  static last: FakeSocket;
  readyState = FakeSocket.OPEN;
  binaryType = "";
  sent: unknown[] = [];
  private listeners = new Map<string, ((event: never) => void)[]>();

  constructor(readonly url: string) {
    FakeSocket.last = this;
  }
  addEventListener(name: string, handler: (event: never) => void) {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), handler]);
  }
  send(frame: unknown) {
    this.sent.push(frame);
  }
  close() {}
  /** Test-side: the service says something. */
  says(data: unknown) {
    const frame = typeof data === "string" ? data : JSON.stringify(data);
    this.listeners.get("message")?.forEach((fn) => fn({ data: frame } as never));
  }
}

beforeEach(() => {
  vi.stubGlobal("WebSocket", FakeSocket);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("what goes up the socket", () => {
  it("marks what they said as typed", () => {
    const channel = openInterviewSocket("wss://core.test", "s1");

    channel.say("hola");

    expect(JSON.parse(FakeSocket.last.sent[0] as string)).toEqual({
      kind: "say",
      text: "hola",
      via: "typed",
    });
  });

  it("has no way to start listening or to send microphone audio", () => {
    const channel = openInterviewSocket("wss://core.test", "s1");

    expect(Object.keys(channel).sort()).toEqual([
      "cardEdited",
      "close",
      "messages",
      "resume",
      "say",
      "setVoice",
    ]);
  });

  it.each(["chose_mode", "listen_start", "listen_stop"])(
    "does not accept %s as something the screen can send",
    (kind) => {
      expect(talkeoStreamInSchema.safeParse({ kind }).success).toBe(false);
    },
  );

  it("accepts a spoken say, because the Core's side of the contract has one", () => {
    expect(
      talkeoStreamInSchema.safeParse({ kind: "say", text: "x", via: "spoken" })
        .success,
    ).toBe(true);
  });

  it("sends every card edit, in order, ahead of the say", () => {
    const channel = openInterviewSocket("wss://core.test", "s1");

    channel.cardEdited({ card: "a", field: "f", value: "1", confirms: false });
    channel.cardEdited({ card: "b", field: "f", value: "2", confirms: false });
    channel.say("listo");

    const kinds = FakeSocket.last.sent.map(
      (frame) => JSON.parse(frame as string) as { kind: string; edit?: { card: string } },
    );
    expect(kinds.map((m) => m.kind)).toEqual(["card_edited", "card_edited", "say"]);
    expect(kinds.slice(0, 2).map((m) => m.edit?.card)).toEqual(["a", "b"]);
  });
});

describe("what comes down the socket", () => {
  async function firstOf(count: number, speak: (s: FakeSocket) => void) {
    const channel = openInterviewSocket("wss://core.test", "s1");
    const seen: InterviewMessage[] = [];
    const reading = (async () => {
      for await (const message of channel.messages()) {
        seen.push(message);
        if (seen.length === count) return;
      }
    })();
    speak(FakeSocket.last);
    await reading;
    channel.close();
    return seen;
  }

  it("delivers whether a room is attached", async () => {
    const seen = await firstOf(2, (socket) => {
      socket.says({ kind: "call_state", live: true });
      socket.says({ kind: "call_state", live: false });
    });

    expect(seen).toEqual([
      { kind: "call_state", live: true },
      { kind: "call_state", live: false },
    ]);
  });

  it("drops a kind it does not know without losing the ones around it", async () => {
    // The Core also sends the room its own kinds; one that reaches this screen
    // is the service being ahead of it, and must not end the conversation.
    const seen = await firstOf(2, (socket) => {
      socket.says({ kind: "call_state", live: true });
      socket.says({ kind: "speakable", text: "hola" });
      socket.says({ kind: "turn_timing", ms: 12 });
      socket.says({ kind: "call_state", live: false });
    });

    expect(seen.map((m) => m.kind)).toEqual(["call_state", "call_state"]);
  });

  it("reads a turn that no longer says what mode it is in", async () => {
    const seen = await firstOf(1, (socket) => {
      socket.says({
        kind: "turn_started",
        turn_id: "t1",
        stage: 1,
        stage_name: "entrance",
        stages_total: 7,
      });
    });

    expect(seen[0]).toMatchObject({ kind: "turn_started", stages_total: 7 });
    expect(seen[0]).not.toHaveProperty("mode");
  });
});
