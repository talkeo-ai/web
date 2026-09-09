/**
 * Plays raw PCM as it arrives, without gaps.
 *
 * The service streams audio as binary frames rather than a file, so there is
 * nothing for an `<audio>` element to load. The obvious alternative — one
 * `AudioBufferSourceNode` per frame, scheduled back to back — clicks: each node
 * is scheduled against a clock that drifts from the one the frames arrive on,
 * and every seam is a discontinuity. A worklet pulls from a ring instead, so
 * playback is continuous by construction and a late frame is silence rather than
 * a click.
 *
 * ⚠ **The ring is a jitter buffer, not a queue.** It holds enough to ride out a
 * slow frame and no more, so the side that has the audio has to feed it at the
 * rate it drains. That is why every report carries `room`: it is a credit, and
 * the sender spends it. Treating the ring as the queue is what made a turn
 * replayed from cache lose three quarters of itself — 8 s pushed in one call
 * into 2 s of ring, oldest-sample-first, so only the tail survived.
 *
 * Plain JavaScript and in `public/` because a worklet is fetched by URL and
 * compiled in its own scope, not bundled.
 *
 * ⚠ Not a module: `addModule` evaluates this in the audio worklet global scope,
 * which has no imports and no `window`.
 */

/** Two seconds at 24 kHz. Enough to ride out a slow frame, small enough to drop. */
const RING_SECONDS = 2;

/** How often the consumed count goes back, in render quanta of 128 frames. */
const REPORT_EVERY = 8;

class PcmPlayback extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const seconds = options?.processorOptions?.ringSeconds ?? RING_SECONDS;
    this.ring = new Float32Array(Math.ceil(sampleRate * seconds));
    this.writeAt = 0;
    this.readAt = 0;
    this.filled = 0;
    this.consumed = 0;
    this.sinceReport = 0;
    this.draining = false;

    this.port.onmessage = (event) => {
      const message = event.data;
      if (message.kind === "frames") this.write(message.samples);
      // A turn beginning. The count is what the screen reads as "how far into
      // this turn the voice is", so it belongs to the turn and not to the
      // context — left running, every turn after the first started its reveal
      // already finished.
      else if (message.kind === "begins") this.clear();
      // `flush` is a turn ending: what is in the ring still plays, and the ring
      // is not cleared. `stop` is somebody cutting it off, and it is.
      else if (message.kind === "flush") this.draining = true;
      else if (message.kind === "stop") this.clear();
    };

    // The first credit, so the sender does not have to wait a report to know
    // how much the ring holds — and so nothing here is a number the other side
    // has to guess.
    this.port.postMessage({ kind: "ready", room: this.ring.length });
  }

  clear() {
    this.writeAt = 0;
    this.readAt = 0;
    this.filled = 0;
    this.consumed = 0;
    this.draining = false;
  }

  write(samples) {
    this.draining = false;
    for (let i = 0; i < samples.length; i += 1) {
      // A sender that spends its credit never gets here. It stays as the last
      // guard against a caller that does not: dropping the OLDEST keeps the
      // most recent sound, which is the right choice for live audio and the
      // wrong one for a whole turn arriving at once — hence the credit.
      if (this.filled === this.ring.length) {
        this.readAt = (this.readAt + 1) % this.ring.length;
        this.filled -= 1;
      }
      this.ring[this.writeAt] = samples[i];
      this.writeAt = (this.writeAt + 1) % this.ring.length;
      this.filled += 1;
    }
  }

  process(_inputs, outputs) {
    const channel = outputs[0]?.[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i += 1) {
      if (this.filled === 0) {
        channel[i] = 0;
        continue;
      }
      channel[i] = this.ring[this.readAt];
      this.readAt = (this.readAt + 1) % this.ring.length;
      this.filled -= 1;
      this.consumed += 1;
    }

    this.sinceReport += 1;
    if (this.sinceReport >= REPORT_EVERY) {
      this.sinceReport = 0;
      // The play clock, and the only honest one: it counts what has actually
      // been heard, so an underrun does not make the words run ahead of the
      // voice.
      this.port.postMessage({
        kind: "played",
        frames: this.consumed,
        buffered: this.filled,
        // How much more will fit. The sender spends this rather than pushing
        // what it has.
        room: this.ring.length - this.filled,
        // Said once, when the last of a turn has been heard, so the screen knows
        // the turn is over rather than guessing from the clock.
        drained: this.draining && this.filled === 0,
      });
    }

    return true;
  }
}

registerProcessor("pcm-playback", PcmPlayback);
