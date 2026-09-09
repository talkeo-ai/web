import { describe, expect, it } from "vitest";

import {
  canSend,
  composerAction,
  flush,
  nothingPending,
  queueEdit,
} from "./outbox";

const edit = (field: string, value: string) => ({
  card: "first_goal",
  field,
  value,
  confirms: false,
});

describe("the queue for what they changed on a card", () => {
  it("keeps only the last version of a line they rewrote", () => {
    // Two versions of the same line would reach the model as two changes of
    // mind, and only the second one is true.
    const twice = queueEdit(
      queueEdit(nothingPending, edit("goal", "primero")),
      edit("goal", "después"),
    );
    expect(twice.pending).toHaveLength(1);
    expect(twice.pending[0]?.value).toBe("después");
  });

  it("keeps edits to different lines apart", () => {
    const both = queueEdit(
      queueEdit(nothingPending, edit("goal", "x")),
      edit("work_on", "y"),
    );
    expect(both.pending).toHaveLength(2);
  });

  it("empties when their turn goes out", () => {
    const { edits, rest } = flush(queueEdit(nothingPending, edit("goal", "x")));
    expect(edits).toHaveLength(1);
    expect(rest.pending).toHaveLength(0);
  });
});

describe("whether their turn can go", () => {
  it("waits while Talkeo is still writing", () => {
    expect(canSend({ text: "listo", answering: true })).toBe(false);
    expect(canSend({ text: "listo", answering: false })).toBe(true);
  });

  it("never sends nothing", () => {
    expect(canSend({ text: "   ", answering: false })).toBe(false);
  });
});

describe("the one control at the end of the composer", () => {
  it("offers the call when there is nothing to send", () => {
    expect(composerAction({ text: "", inCall: false })).toBe("call");
  });

  it("offers to send as soon as there is something, even in a call", () => {
    // In a call you can still type instead of speaking, and with a sentence
    // written, speaking would throw it away.
    expect(composerAction({ text: "hola", inCall: false })).toBe("send");
    expect(composerAction({ text: "hola", inCall: true })).toBe("send");
  });

  it("offers to leave the call when there is nothing written", () => {
    expect(composerAction({ text: "", inCall: true })).toBe("hang up");
  });
});
