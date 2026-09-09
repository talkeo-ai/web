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
      const played = event.data as {
        kind: string;
        frames: number;
        buffered: number;
        drained: boolean;
      };
      if (played.kind !== "played") return;
      heardMs = (played.frames / sampleRate) * 1000;
      anchorAt = performance.now();
      playing = played.buffered > 0;
      isDrained = played.drained;
    };
    context = ctx;
    node = worklet;
    gain = volume;
    rate = sampleRate;
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
      // The turn starts from zero, and so does its clock.
      heardMs = 0;
      anchorAt = performance.now();
      if (gain) gain.gain.value = 1;
    },

    push(turnId, frame) {
      if (turnId !== turn || !node) return;
      const samples = new Int16Array(frame);
      const floats = new Float32Array(samples.length);
      // 16-bit signed to the -1..1 the graph works in. 32768 and not 32767: the
      // negative end is what would clip.
      for (let i = 0; i < samples.length; i += 1) floats[i] = samples[i]! / 32768;
      node.port.postMessage({ kind: "frames", samples: floats }, [floats.buffer]);
    },

    ends(turnId) {
      if (turnId !== turn) return;
      node?.port.postMessage({ kind: "flush" });
    },

    stop() {
      if (!node || !gain || !context) return;
      // Faded rather than cut: stopping a voice mid-word is a pop, and this is
      // what happens every time somebody answers before it has finished.
      const now = context.currentTime;
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + FADE_MS / 1000);
      setTimeout(() => node?.port.postMessage({ kind: "stop" }), FADE_MS);
      playing = false;
      isDrained = true;
    },

    currentTimeMs() {
      if (!playing) return null;
      return heardMs + (performance.now() - anchorAt);
    },

    drained: () => isDrained,

    close() {
      node?.port.postMessage({ kind: "stop" });
      void context?.close();
      context = null;
      node = null;
      gain = null;
    },
  };
}
