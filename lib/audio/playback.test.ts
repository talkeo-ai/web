import { beforeEach, describe, expect, it } from "vitest";

import { createPlayback } from "./playback";

/**
 * Nothing a turn says is lost between the socket and the speaker.
 *
 * Held because three quarters of a turn was. The ring in the worklet is two
 * seconds and the code handed it whole turns, so a turn replayed from cache —
 * pushed in one call rather than streamed — overran it by 6 s and the ring
 * dropped the oldest sample every time. Only the tail was ever heard.
 *
 * The fake below is faithful on the one point that matters: it drops the way the
 * real worklet drops. A test against a fake that simply accepted everything
 * would have passed on the broken code.
 */

/** Two seconds at 24 kHz, the same ring the worklet builds. */
const RING = 48_000;
const RATE = 24_000;
/** One report's worth of playing: eight render quanta of 128 frames. */
const QUANTA = 128 * 8;

class FakeWorklet {
  ring: number[] = [];
  heard: number[] = [];
  consumed = 0;
  draining = false;
  /** What the ring threw away. Zero is the point of the whole exercise. */
  dropped = 0;
  port = {
    onmessage: null as ((event: MessageEvent) => void) | null,
    postMessage: (data: unknown) => this.take(data as { kind: string; samples?: Float32Array }),
  };

  connect<T>(next: T): T {
    return next;
  }

  take(message: { kind: string; samples?: Float32Array }): void {
    if (message.kind === "frames") {
      this.draining = false;
      for (const sample of message.samples ?? []) {
        if (this.ring.length === RING) {
          this.ring.shift();
          this.dropped += 1;
        }
        this.ring.push(sample);
      }
      return;
    }
    if (message.kind === "begins" || message.kind === "stop") {
      this.ring = [];
      this.consumed = 0;
      this.draining = false;
      return;
    }
    if (message.kind === "flush") this.draining = true;
  }

  /** The first credit, the way a port delivers what was posted before it started. */
  ready(): void {
    this.report("ready");
  }

  /** One report's worth of audio played, and the report that follows it. */
  tick(): void {
    const played = this.ring.splice(0, QUANTA);
    this.heard.push(...played);
    this.consumed += played.length;
    this.report("played");
  }

  private report(kind: string): void {
    this.port.onmessage?.({
      data: {
        kind,
        frames: this.consumed,
        buffered: this.ring.length,
        room: RING - this.ring.length,
        drained: this.draining && this.ring.length === 0,
      },
    } as MessageEvent);
  }
}

let worklet: FakeWorklet;

class FakeContext {
  state = "running";
  currentTime = 0;
  destination = {};
  audioWorklet = { addModule: async () => {} };
  createGain() {
    return {
      gain: {
        value: 1,
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
      },
      connect: <T>(next: T) => next,
    };
  }
  async resume(): Promise<void> {}
  async close(): Promise<void> {}
}

beforeEach(() => {
  Object.assign(globalThis, {
    AudioContext: FakeContext,
    AudioWorkletNode: class {
      constructor() {
        worklet = new FakeWorklet();
        return worklet;
      }
    },
  });
});

/** `seconds` of PCM whose every sample is distinguishable from every other. */
function tone(seconds: number): ArrayBuffer {
  const samples = new Int16Array(RATE * seconds);
  for (let i = 0; i < samples.length; i += 1) samples[i] = (i % 30_000) - 15_000;
  return samples.buffer;
}

/** Play until the turn has been heard out, or give up rather than hang. */
function playOut(player: { drained(): boolean }): void {
  for (let ticks = 0; ticks < 5_000 && !player.drained(); ticks += 1) worklet.tick();
}

describe("the voice, streamed", () => {
  it("plays a whole turn handed to it at once, not the last two seconds of it", async () => {
    const player = createPlayback();
    await player.begins("tt_0000", { sampleRate: RATE });
    worklet.ready();

    // A turn replayed from cache arrives as one buffer, which is four times the
    // ring. This is the case that lost 6 s of every 8.
    player.push("tt_0000", tone(8));
    player.ends("tt_0000");
    playOut(player);

    expect(worklet.dropped).toBe(0);
    expect(worklet.heard).toHaveLength(RATE * 8);
    expect(player.drained()).toBe(true);
  });

  it("keeps the frames that arrive before the worklet exists", async () => {
    const player = createPlayback();
    const starting = player.begins("tt_0000", { sampleRate: RATE });
    // The module is still being fetched. These used to be dropped in silence,
    // which took the opening of every conversation.
    player.push("tt_0000", tone(1));
    await starting;
    worklet.ready();
    player.ends("tt_0000");
    playOut(player);

    expect(worklet.heard).toHaveLength(RATE);
  });

  it("counts a turn from the start of that turn and not of the session", async () => {
    const player = createPlayback();
    await player.begins("tt_0000", { sampleRate: RATE });
    worklet.ready();
    player.push("tt_0000", tone(1));
    player.ends("tt_0000");
    playOut(player);

    // The clock the reveal reads. Left running across turns, every turn after
    // the first begins with its words already written out.
    await player.begins("tt_0001", { sampleRate: RATE });
    expect(worklet.consumed).toBe(0);
    expect(player.currentTimeMs()).toBeNull();
  });

  it("does not cut the turn that replaced the one being cut", async () => {
    const player = createPlayback();
    await player.begins("tt_0000", { sampleRate: RATE });
    worklet.ready();
    player.push("tt_0000", tone(1));

    // Answering is what cuts the voice, and answering is also what makes the
    // next turn start — so the fade's tail lands after it has begun.
    player.stop();
    await player.begins("tt_0001", { sampleRate: RATE });
    worklet.ready();
    player.push("tt_0001", tone(1));
    player.ends("tt_0001");
    await new Promise((done) => setTimeout(done, 200));
    playOut(player);

    expect(worklet.heard).toHaveLength(RATE);
  });

  it("says a turn is over only once the queue behind it is empty too", async () => {
    const player = createPlayback();
    await player.begins("tt_0000", { sampleRate: RATE });
    worklet.ready();
    player.push("tt_0000", tone(8));
    player.ends("tt_0000");

    // The socket is done and the screen must not be: seven of those eight
    // seconds have not left this thread yet.
    expect(player.drained()).toBe(false);
    playOut(player);
    expect(player.drained()).toBe(true);
  });
});
