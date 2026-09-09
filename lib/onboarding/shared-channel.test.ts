import { afterEach, describe, expect, it, vi } from "vitest";

import type { InterviewMessage } from "@/core/channel";
import { MessageQueue } from "@/core/message-queue";

import { forgetInterviews, readInterview } from "./shared-channel";

/**
 * Nothing the service says is lost between the socket and the screen.
 *
 * Held because one message per remount was. `MessageQueue` gives every iterator
 * the same buffer, so a second loop over one channel does not see everything —
 * it splits it with the first. And the loop on its way out checks whether it is
 * still wanted only after taking a message off the queue, so it leaves with one.
 *
 * The lost one is `turn_started`, and without it the reducer has no live turn
 * and drops every `text` after it: Talkeo spoke to a blank screen and the words
 * appeared once it had stopped. Every first entry, measured 9/sep.
 */

/**
 * The open channel's queue, replaced per channel exactly as the socket's is.
 *
 * ⚠ And `close()` finishes it, which the real socket does too
 * (`interview-socket.ts:62-67`). Without that the pump never ends, and a pump
 * from a closed channel stays parked on the queue and eats the next message —
 * which is the very defect under test, reproduced by accident in the harness.
 */
let sent = new MessageQueue<InterviewMessage>();
let closed = 0;

vi.mock("@/core/channel", async () => {
  const actual = await vi.importActual<object>("@/core/channel");
  return {
    ...actual,
    openInterview: () => {
      const queue = sent;
      return {
        messages: () => queue.iterate(),
        resume: () => {},
        say: () => {},
        cardEdited: () => {},
        choseMode: () => {},
        setVoice: () => {},
        listenStart: () => {},
        sendAudio: () => {},
        listenStop: () => {},
        close: () => {
          closed += 1;
          queue.finish();
        },
      };
    },
  };
});

function said(id: string): InterviewMessage {
  return { kind: "text", turn_id: id, delta: id };
}

/** Let the pump's `for await` run. */
const settle = () => new Promise((done) => setTimeout(done, 0));

afterEach(() => {
  vi.useRealTimers();
  forgetInterviews();
  sent = new MessageQueue<InterviewMessage>();
  closed = 0;
});

describe("reading one session's channel", () => {
  it("loses nothing when a reader is replaced by another", async () => {
    const first: InterviewMessage[] = [];
    const second: InterviewMessage[] = [];

    // A mount, its teardown, and the mount after it — in that order and without
    // a tick in between, which is what React does.
    const one = readInterview("se_1", (m) => first.push(m));
    one.release();
    const two = readInterview("se_1", (m) => second.push(m));

    sent.push(said("tt_0"));
    sent.push(said("tt_1"));
    await settle();

    expect(two.channel).toBe(one.channel);
    // The one that left takes nothing with it, and the one that arrived gets
    // everything — including whatever landed in the gap.
    expect(first).toEqual([]);
    expect(second).toEqual([said("tt_0"), said("tt_1")]);
  });

  it("holds what lands between one reader leaving and the next arriving", async () => {
    // The gap is shorter than the tick the close is deferred by, so the timers
    // are frozen: what is under test is the window, not the close.
    vi.useFakeTimers();
    const seen: InterviewMessage[] = [];
    const one = readInterview("se_1", () => {});
    one.release();

    sent.push(said("tt_0"));
    // Microtasks only — enough for the pump's `for await` to take the message
    // with nobody listening for it, and not enough for the close to fire.
    for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();

    readInterview("se_1", (m) => seen.push(m));
    vi.useRealTimers();

    expect(seen).toEqual([said("tt_0")]);
  });

  it("says which reader opened it, so the turn is asked for once", async () => {
    const one = readInterview("se_1", () => {});
    const two = readInterview("se_1", () => {});

    expect(one.opened).toBe(true);
    // Asking twice walks the conversation forward twice.
    expect(two.opened).toBe(false);
  });

  it("keeps the channel open across a remount and closes it when they all go", async () => {
    const one = readInterview("se_1", () => {});
    one.release();
    const two = readInterview("se_1", () => {});
    await settle();

    expect(closed).toBe(0);

    two.release();
    await settle();
    expect(closed).toBe(1);
  });
});
