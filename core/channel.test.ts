/**
 * The interview channel, against the recording.
 *
 * What is held here is the shape of the stream rather than what the recording
 * says — the wording is the service's business. The two properties that matter
 * are the ones a screen written against a friendlier fixture gets wrong: that a
 * turn's last message is the whole turn, and that some turns say nothing before
 * it.
 */

import { describe, expect, it, vi } from "vitest";

import type { InterviewChannel, InterviewMessage } from "./channel";
import { openMockInterview } from "./mock/interview-channel";

/** Everything up to and including the end of one turn. */
async function throughOneTurn(
  channel: InterviewChannel,
  start: () => void,
): Promise<InterviewMessage[]> {
  const seen: InterviewMessage[] = [];
  const reading = (async () => {
    for await (const message of channel.messages()) {
      seen.push(message);
      if (message.kind === "turn_done") return;
    }
  })();
  start();
  await vi.advanceTimersByTimeAsync(30_000);
  await reading;
  return seen;
}

describe("the recorded interview channel", () => {
  it("opens the turn before it says anything, and closes it with the whole turn", async () => {
    vi.useFakeTimers();
    const channel = openMockInterview();
    const seen = await throughOneTurn(channel, () => channel.resume());
    vi.useRealTimers();

    expect(seen[0]?.kind).toBe("turn_started");
    const last = seen.at(-1);
    expect(last?.kind).toBe("turn_done");
    if (last?.kind !== "turn_done") throw new Error("unreachable");
    expect(last.result.turn.text).not.toBe("");
  });

  it("says how many stages there are, so nothing downstream has to guess", async () => {
    vi.useFakeTimers();
    const channel = openMockInterview();
    const [first] = await throughOneTurn(channel, () => channel.resume());
    vi.useRealTimers();

    if (first?.kind !== "turn_started") throw new Error("unreachable");
    expect(first.stages_total).toBeGreaterThan(0);
    expect(first.stage).toBe(1);
  });

  it("streams no text for the entrance, whose words are only in the result", async () => {
    // Stage 1 is fixed copy and never reaches a model, so it has no fragments to
    // stream. A screen that appends deltas and never renders `turn_done` shows a
    // blank screen here — which is the first thing anybody sees.
    vi.useFakeTimers();
    const channel = openMockInterview();
    const seen = await throughOneTurn(channel, () => channel.resume());
    vi.useRealTimers();

    expect(seen.filter((m) => m.kind === "text")).toHaveLength(0);
    const last = seen.at(-1);
    if (last?.kind !== "turn_done") throw new Error("unreachable");
    expect(last.result.turn.text.length).toBeGreaterThan(10);
  });

  it("streams a generated turn a fragment at a time, and they add up to the turn", async () => {
    vi.useFakeTimers();
    const channel = openMockInterview();
    // Past the two fixed-copy turns of the entrance.
    await throughOneTurn(channel, () => channel.resume());
    await throughOneTurn(channel, () => channel.say("Ana"));
    const seen = await throughOneTurn(channel, () => channel.say("escribir"));
    vi.useRealTimers();

    const fragments = seen.filter((m) => m.kind === "text");
    expect(fragments.length).toBeGreaterThan(1);
    const last = seen.at(-1);
    if (last?.kind !== "turn_done") throw new Error("unreachable");
    expect(fragments.map((m) => m.delta).join("")).toBe(last.result.turn.text);
  });

  it("never puts a delivery tag in what the person reads", async () => {
    vi.useFakeTimers();
    const channel = openMockInterview();
    const seen = await throughOneTurn(channel, () => channel.resume());
    vi.useRealTimers();

    const last = seen.at(-1);
    if (last?.kind !== "turn_done") throw new Error("unreachable");
    expect(last.result.turn.text).not.toMatch(/\[[a-z_]+\]/);
  });

  it("hands an edit back as the card it produced, not as an acknowledgement", async () => {
    vi.useFakeTimers();
    const channel = openMockInterview();
    channel.cardEdited({
      card: "first_goal",
      field: "goal",
      value: "seguir las reuniones enteras",
      confirms: true,
    });
    const seen = await throughOneTurn(channel, () => channel.resume());
    vi.useRealTimers();

    const cards = seen.filter(
      (m) => m.kind === "event" && m.event.kind === "card_updated",
    );
    expect(cards).toHaveLength(1);
  });

  it("ends the listening itself, the way the transcription does", async () => {
    // `listen_stop` is the screen giving up on a turn, not how one normally
    // ends: a screen that waits to be asked would wait for ever.
    vi.useFakeTimers();
    const channel = openMockInterview();
    const seen = await throughOneTurn(channel, () => channel.listenStart({
      mime: "audio/pcm",
      sampleRate: 16000,
    }));
    vi.useRealTimers();

    const settled = seen.filter((m) => m.kind === "transcript" && m.is_final);
    expect(settled).toHaveLength(1);
    expect(seen.at(-1)?.kind).toBe("turn_done");
  });

  it("says it heard nothing when the screen gives up, so nobody waits on a turn", async () => {
    vi.useFakeTimers();
    const channel = openMockInterview();
    const seen: InterviewMessage[] = [];
    const reading = (async () => {
      for await (const message of channel.messages()) {
        seen.push(message);
        if (message.kind === "nothing_heard") return;
      }
    })();
    channel.listenStart({ mime: "audio/pcm", sampleRate: 16000 });
    channel.listenStop();
    await vi.advanceTimersByTimeAsync(1000);
    await reading;
    vi.useRealTimers();

    expect(seen.at(-1)?.kind).toBe("nothing_heard");
  });
});
