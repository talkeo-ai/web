"use client";

/**
 * The voice, streamed.
 *
 * The service sends raw 16-bit PCM in binary frames at the rate it announces, so
 * there is no file for an `<audio>` element to load — which is the premise the
 * old one was built on. What a gesture unlocks here is an `AudioContext`, and
 * the same one serves every turn.
 *
 * **The context is built at the service's rate**, so the browser resamples on
 * output and nothing here has to. It is the one place a resampler could live and
 * the browser's is better than one written to avoid it.
 *
 * What comes out of this is also the play clock. It counts frames that have been
 * heard rather than frames that were sent, so an underrun slows the words down
 * with the voice instead of letting them run ahead of it.
 *
 * **The queue lives here, and the ring in the worklet is only a jitter buffer.**
 * The worklet says how much room it has and this sends no more than that, topping
 * it up as it drains. The alternative — hand the worklet everything and let it
 * cope — loses whatever does not fit, which is most of a turn whenever the audio
 * arrives faster than it plays: from a cache on re-entry, always, and from a fast
 * provider, sooner or later.
 */

const WORKLET_URL = "/pcm-playback.worklet.js";

/** What `use-turn-playback` needs from whatever is speaking. */
export type Playhead = {
  /** Milliseconds into the current turn, or null when nothing is playing. */
  currentTimeMs(): number | null;
};

export type Playback = Playhead & {
  /**
   * Claim the right to make a sound, from inside a gesture handler.
   *
   * A context built outside one starts suspended and stays suspended, so the
   * first turn is silent and nothing says why. It is claimed at the press that
   * enters the onboarding, which is the last gesture before Talkeo speaks first.
   */
  unlock(): Promise<void>;
  /** Prepare for a turn's audio in this format. Idempotent per turn. */
  begins(turnId: string, format: { sampleRate: number }): Promise<void>;
  /** One frame, exactly as it came off the socket: interleaved 16-bit LE mono. */
  push(turnId: string, frame: ArrayBuffer): void;
  /** No more is coming for this turn. What is buffered still plays. */
  ends(turnId: string): void;
  /** Cut it off now. Used when they send while it is still speaking. */
  stop(): void;
  /** Whether the last turn's audio has finished being heard. */
  drained(): boolean;
  close(): void;
};

/** A turn cut short fades rather than clipping: a hard stop mid-word is a pop. */
const FADE_MS = 150;

/**
 * What to build the context at before the service has said.
 *
 * The gesture that claims it happens before the first turn exists, so a rate has
 * to be picked; this is the one the service uses. If it turns out to be wrong the
 * context is rebuilt and the claim is lost, which costs one silent turn and is
 * still better than a context built at the wrong rate and resampled for ever.
 */
const LIKELY_RATE = 24000;

export function createPlayback(): Playback {
  let context: AudioContext | null = null;
  let node: AudioWorkletNode | null = null;
  let gain: GainNode | null = null;
  let rate = 0;
  let turn = "";
  let ready: Promise<void> | null = null;

  // The clock, anchored on what the worklet reports and interpolated between
  // reports so a reveal does not step. `anchorAt` is when we were told.
  let heardMs = 0;
  let anchorAt = 0;
  let playing = false;
  let isDrained = true;

  // What has not been handed to the worklet yet, and how much of the head of the
  // queue has. Audio arrives in whatever size the socket delivers; it leaves in
  // whatever size there is room for, so the two do not line up.
  let pending: Float32Array[] = [];
  let sentOfHead = 0;
  // Room in the ring, as last reported. Spent as frames go out and refilled by
  // every report, so it is never an over-estimate between them.
  let room = 0;
  // A turn said everything it had. The worklet is told once the queue is empty,
  // because until then there is more coming even though the socket is done.
  let finishing = false;

  /** As much of the queue as there is room for, and the end if that was all. */
  const feed = () => {
    if (!node) return;
    while (pending.length > 0 && room > 0) {
      const head = pending[0]!;
      const take = Math.min(head.length - sentOfHead, room);
      // Copied rather than transferred out of the queue: a subarray shares the
      // buffer, and transferring it would detach the frames still waiting.
      const chunk = head.slice(sentOfHead, sentOfHead + take);
      node.port.postMessage({ kind: "frames", samples: chunk }, [chunk.buffer]);
      room -= take;
      sentOfHead += take;
      if (sentOfHead >= head.length) {
        pending.shift();
        sentOfHead = 0;
      }
    }
    if (pending.length === 0 && finishing) {
      finishing = false;
      node.port.postMessage({ kind: "flush" });
    }
  };

  const build = async (sampleRate: number) => {
    const ctx = new AudioContext({ sampleRate });
    await ctx.audioWorklet.addModule(WORKLET_URL);
    const worklet = new AudioWorkletNode(ctx, "pcm-playback", {
      numberOfInputs: 0,
      outputChannelCount: [1],
    });
    const volume = ctx.createGain();
    worklet.connect(volume).connect(ctx.destination);
    worklet.port.onmessage = (event: MessageEvent<unknown>) => {
      const report = event.data as {
        kind: string;
        frames: number;
        buffered: number;
        room: number;
        drained: boolean;
      };
      if (report.kind === "ready") {
        room = report.room;
        feed();
        return;
      }
      if (report.kind !== "played") return;
      heardMs = (report.frames / sampleRate) * 1000;
      anchorAt = performance.now();
      playing = report.buffered > 0;
      isDrained = report.drained;
      room = report.room;
      feed();
    };
    context = ctx;
    node = worklet;
    gain = volume;
    rate = sampleRate;
    feed();
  };

  return {
    async unlock() {
      ready ??= build(LIKELY_RATE);
      await ready;
      if (context?.state === "suspended") await context.resume();
    },

    async begins(turnId, format) {
      if (turnId === turn && context) return;
      turn = turnId;
      isDrained = false;
      // Whatever the turn before it left unplayed is not this turn's.
      pending = [];
      sentOfHead = 0;
      finishing = false;
      if (!context || rate !== format.sampleRate) {
        // A rate change means a different voice configuration, which is a
        // deployment change and not something to handle mid-turn — but rebuilding
        // is cheaper than being wrong about it.
        await context?.close();
        context = null;
        ready = build(format.sampleRate);
      }
      await ready;
      // The gesture may have happened before this context existed.
      if (context?.state === "suspended") await context.resume();
      // The turn starts from zero, and so does its clock — on both sides. The
      // worklet counts what it has played and that count is what the screen
      // reads as how far into THIS turn the voice is, so a count carried over
      // from the turn before puts the reveal past the end before a word is said.
      node?.port.postMessage({ kind: "begins" });
      heardMs = 0;
      anchorAt = performance.now();
      // ⚠ Cancelled, not assigned. `stop()` leaves a ramp to zero on the
      // timeline, and assigning `.value` while automation is scheduled does
      // nothing — the timeline wins and its last value is zero. So the gain
      // stayed shut for the rest of the session: the greeting was heard, the
      // person answered, and every turn after it was silent. Heard 9/sep.
      if (gain && context) {
        gain.gain.cancelScheduledValues(context.currentTime);
        gain.gain.setValueAtTime(1, context.currentTime);
      }
      feed();
    },

    push(turnId, frame) {
      // No `node` check: the frames of the first turn arrive while the worklet
      // module is still being fetched, and dropping them there took the opening
      // of every conversation. They wait in the queue instead, and `build` feeds
      // them the moment there is somewhere to feed them to.
      if (turnId !== turn) return;
      const samples = new Int16Array(frame);
      const floats = new Float32Array(samples.length);
      // 16-bit signed to the -1..1 the graph works in. 32768 and not 32767: the
      // negative end is what would clip.
      for (let i = 0; i < samples.length; i += 1) floats[i] = samples[i]! / 32768;
      pending.push(floats);
      feed();
    },

    ends(turnId) {
      if (turnId !== turn) return;
      // Not passed straight through: the socket being done is not the audio
      // being done, and a flush that overtook the queue would end the turn on
      // screen while the rest of it was still waiting to be heard.
      finishing = true;
      feed();
    },

    stop() {
      if (!node || !gain || !context) return;
      // Faded rather than cut: stopping a voice mid-word is a pop, and this is
      // what happens every time somebody answers before it has finished.
      const now = context.currentTime;
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + FADE_MS / 1000);
      // The queue goes first: it is on this thread, so anything still in it
      // would otherwise be fed to the worklet after it had been told to stop.
      pending = [];
      sentOfHead = 0;
      finishing = false;
      // Only if this is still the turn being cut. The fade is 150 ms and the
      // answer that caused it is what makes the next turn start, so the next
      // turn's first frames can already be in the ring when this lands — and
      // clearing then takes the opening of the reply rather than the end of the
      // question.
      const cutting = turn;
      setTimeout(() => {
        if (turn !== cutting) return;
        node?.port.postMessage({ kind: "stop" });
      }, FADE_MS);
      playing = false;
      isDrained = true;
    },

    currentTimeMs() {
      if (!playing) return null;
      return heardMs + (performance.now() - anchorAt);
    },

    // What is still queued here has not been heard either, and the caller asking
    // is asking whether the turn is over.
    drained: () => isDrained && pending.length === 0,

    close() {
      node?.port.postMessage({ kind: "stop" });
      void context?.close();
      context = null;
      node = null;
      gain = null;
      pending = [];
      sentOfHead = 0;
      finishing = false;
    },
  };
}
